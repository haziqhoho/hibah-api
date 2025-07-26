const db = require('../config/db');
const { tokenize } = require('../services/tokenizationService');

async function hibahSummary(req, res) {
  try {
    // 1. Total applications
    const [totalRows] = await db.query('SELECT COUNT(*) as total FROM doc');
    const total_applications = totalRows[0]?.total || 0;

    // 2. Valid/incomplete hibah (assuming status '0001' = valid, others = incomplete)
    const [validRows] = await db.query("SELECT COUNT(*) as valid FROM doc WHERE status = '0001'");
    const valid_hibah = validRows[0]?.valid || 0;
    const incomplete_hibah = total_applications - valid_hibah;

    // 3. Donor info (customer + account number) // kategoriHarta for now sbb noAkaun tiada data
    const [donorRows] = await db.query(`
      SELECT c.id as customer_id, c.name, c.nric as ic,
        af.value as account_number
      FROM doc d
      JOIN customer c ON d.customer_id = c.id
      JOIN JSON_TABLE(d.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
      JOIN asset a ON a.id = doc_assets.asset_id
      LEFT JOIN asset_field af ON af.asset_id = a.id AND af.name = 'kategoriHarta'
      GROUP BY c.id, af.value
      LIMIT 20
    `);

    const donors = [];
    for (const donor of donorRows) {
      // Validation dates/status for this donor
      const [validationRows] = await db.query(
        `SELECT id as doc_id, created_at as date, status FROM doc WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20`,
        [donor.customer_id]
      );
      const validation_dates = validationRows.map(row => ({
        doc_id: row.doc_id,
        date: row.date,
        status: row.status
      }));

      // Beneficiaries for this donor (via their assets)
      const [beneficiaryRows] = await db.query(`
        SELECT h.name, h.nric as ic, h.relationship, h.phone
        FROM doc d
        JOIN JSON_TABLE(d.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
        JOIN asset a ON a.id = doc_assets.asset_id
        JOIN asset_allocation aa ON aa.asset_id = a.id
        JOIN heir h ON h.id = aa.heir_id
        WHERE d.customer_id = ?
        GROUP BY h.id
        LIMIT 20
      `, [donor.customer_id]);
      const beneficiaries = beneficiaryRows.map(row => ({
        name: row.name,
        ic: row.ic ? tokenize(row.ic) : '',
        relationship: row.relationship,
        phone: row.phone ? tokenize(row.phone) : ''
      }));

      // Next of kin for this donor
      const [kinRows] = await db.query(
        `SELECT name, title, email, phone, relationship FROM customer_next_of_kin WHERE customer_id = ?`,
        [donor.customer_id]
      );
      const next_of_kin = kinRows.map(kin => ({
        name: kin.name,
        title: kin.title,
        email: kin.email,
        phone: kin.phone ? tokenize(kin.phone) : '',
        relationship: kin.relationship
      }));

      donors.push({
        name: donor.name,
        ic: donor.ic ? tokenize(donor.ic) : '',
        account_number: donor.account_number || '',
        validation_dates,
        beneficiaries,
        next_of_kin
      });
    }

    // Compose summary
    const summary = {
      total_applications,
      valid_hibah,
      incomplete_hibah,
      donors
    };
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

module.exports = {
  hibahSummary,
}; 