const { usrahdd, em2 } = require('../config/db');
const { tokenize } = require('../services/tokenizationService');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');

async function hibahSummary(req, res) {
  try {
    const { format = 'json' } = req.query;

    // 1. Applicant info (customer + account number) - Filter by product_id = 77
    const [applicantRows] = await usrahdd.query(`
      SELECT c.id as customer_id, c.name, c.nric as ic,
        af.value as account_number
      FROM doc d
      JOIN customer c ON d.customer_id = c.id
      JOIN JSON_TABLE(d.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
      JOIN asset a ON a.id = doc_assets.asset_id
      LEFT JOIN asset_field af ON af.asset_id = a.id AND af.name = 'kategoriHarta'
      JOIN (
        SELECT DISTINCT ci.quotation_id, ci.product_id
        FROM em2.cart_item ci
        WHERE ci.product_id = 77
      ) AS em2_products ON em2_products.quotation_id = a.quotation_id
      GROUP BY c.id, af.value
      LIMIT 20
    `);

    const applicants = [];
    for (const applicant of applicantRows) {
      // Total applications for this applicant - Filter by product_id = 77
      const [totalRows] = await usrahdd.query(
        `SELECT COUNT(*) as total 
         FROM doc d
         JOIN JSON_TABLE(d.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
         JOIN asset a ON a.id = doc_assets.asset_id
         JOIN (
           SELECT DISTINCT ci.quotation_id, ci.product_id
           FROM em2.cart_item ci
           WHERE ci.product_id = 77
         ) AS em2_products ON em2_products.quotation_id = a.quotation_id
         WHERE d.customer_id = ?`,
        [applicant.customer_id]
      );
      const total_applications = totalRows[0]?.total || 0;

      // Valid hibah for this applicant - Filter by product_id = 77
      const [validRows] = await usrahdd.query(
        `SELECT COUNT(*) as valid 
         FROM doc d
         JOIN JSON_TABLE(d.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
         JOIN asset a ON a.id = doc_assets.asset_id
         JOIN (
           SELECT DISTINCT ci.quotation_id, ci.product_id
           FROM em2.cart_item ci
           WHERE ci.product_id = 77
         ) AS em2_products ON em2_products.quotation_id = a.quotation_id
         WHERE d.customer_id = ? AND d.status = '0001'`,
        [applicant.customer_id]
      );
      const valid_hibah = validRows[0]?.valid || 0;
      const incomplete_hibah = total_applications - valid_hibah;

      // Validation dates/status for this applicant - Filter by product_id = 77
      const [validationRows] = await usrahdd.query(
        `SELECT d.id as doc_id, d.created_at as date, d.status,
          JSON_UNQUOTE(JSON_EXTRACT(d.assets, '$[0].title')) AS title
        FROM doc d
        JOIN JSON_TABLE(d.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
        JOIN asset a ON a.id = doc_assets.asset_id
        JOIN (
          SELECT DISTINCT ci.quotation_id, ci.product_id
          FROM em2.cart_item ci
          WHERE ci.product_id = 77
        ) AS em2_products ON em2_products.quotation_id = a.quotation_id
        WHERE d.customer_id = ?
        ORDER BY d.created_at DESC LIMIT 20`,
        [applicant.customer_id]
      );
      const validation_dates = validationRows.map(row => ({
        doc_id: row.doc_id,
        title: row.title || '',
        date: row.date,
        status: row.status
      }));

      // Beneficiaries for this applicant (via their assets) - Filter by product_id = 77
      const [beneficiaryRows] = await usrahdd.query(`
        SELECT h.name, h.nric as ic, h.relationship, h.phone
        FROM doc d
        JOIN JSON_TABLE(d.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
        JOIN asset a ON a.id = doc_assets.asset_id
        JOIN asset_allocation aa ON aa.asset_id = a.id
        JOIN heir h ON h.id = aa.heir_id
        JOIN (
          SELECT DISTINCT ci.quotation_id, ci.product_id
          FROM em2.cart_item ci
          WHERE ci.product_id = 77
        ) AS em2_products ON em2_products.quotation_id = a.quotation_id
        WHERE d.customer_id = ?
        GROUP BY h.id
        LIMIT 20
      `, [applicant.customer_id]);
      const beneficiaries = beneficiaryRows.map(row => ({
        name: row.name,
        ic: row.ic ? tokenize(row.ic) : '',
        relationship: row.relationship,
        phone: row.phone ? tokenize(row.phone) : ''
      }));

      // Next of kin for this applicant
      const [kinRows] = await usrahdd.query(
        `SELECT name, title, email, phone, relationship FROM customer_next_of_kin WHERE customer_id = ?`,
        [applicant.customer_id]
      );
      const next_of_kin = kinRows.map(kin => ({
        name: kin.name,
        title: kin.title,
        email: kin.email,
        phone: kin.phone ? tokenize(kin.phone) : '',
        relationship: kin.relationship
      }));

      applicants.push({
        total_applications,
        valid_hibah,
        incomplete_hibah,
        name: applicant.name,
        ic: applicant.ic ? tokenize(applicant.ic) : '',
        account_number: applicant.account_number || '',
        validation_dates,
        beneficiaries,
        next_of_kin
      });
    }

    // Handle different export formats
    if (format === 'csv') {
      // Flatten data for CSV
      const flattenedData = [];
      applicants.forEach(applicant => {
        // Main applicant data
        const baseRow = {
          total_applications: applicant.total_applications,
          valid_hibah: applicant.valid_hibah,
          incomplete_hibah: applicant.incomplete_hibah,
          name: applicant.name,
          ic: applicant.ic,
          account_number: applicant.account_number
        };

        // Add validation dates
        if (applicant.validation_dates.length > 0) {
          applicant.validation_dates.forEach((vd, index) => {
            const row = {
              ...baseRow,
              validation_doc_id: vd.doc_id,
              validation_title: vd.title,
              validation_date: vd.date,
              validation_status: vd.status
            };
            flattenedData.push(row);
          });
        } else {
          flattenedData.push(baseRow);
        }
      });

      const parser = new Parser();
      const csv = parser.parse(flattenedData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=hibah-summary.csv');
      res.send(csv);
    } else if (format === 'xlsx') {
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Hibah Summary');

      // Add headers
      worksheet.columns = [
        { header: 'Total Applications', key: 'total_applications' },
        { header: 'Valid Hibah', key: 'valid_hibah' },
        { header: 'Incomplete Hibah', key: 'incomplete_hibah' },
        { header: 'Name', key: 'name' },
        { header: 'IC', key: 'ic' },
        { header: 'Account Number', key: 'account_number' }
      ];

      // Add data
      applicants.forEach(applicant => {
        worksheet.addRow({
          total_applications: applicant.total_applications,
          valid_hibah: applicant.valid_hibah,
          incomplete_hibah: applicant.incomplete_hibah,
          name: applicant.name,
          ic: applicant.ic,
          account_number: applicant.account_number
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=hibah-summary.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Default JSON format
      const summary = {
        applicants
      };
      res.json(summary);
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

module.exports = {
  hibahSummary,
}; 