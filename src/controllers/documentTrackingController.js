const db = require('../config/db');
const { tokenize } = require('../services/tokenizationService');

function transformDocument(doc) {
  return {
    ...doc,
    type: doc.physical === 1 ? 'physical' : 'digital',
    hibah_type: doc.hibah_type,
    hibah_title: doc.hibah_title,
    physical: undefined, 
    ic: doc.ic ? tokenize(doc.ic) : '',
    // account number tokenized later
    account_number: doc.account_number || '',
    phone: doc.phone ? tokenize(doc.phone) : '',
    email: doc.email ? tokenize(doc.email) : '',
  };
}

async function getDocumentTracking(req, res) {
  try {
    const {
      status,
      product_id,
      type, // physical/digital
      date_from,
      date_to,
      account_number,
      ic,
      name,
      phone,
      email,
      page = 1,
      pageSize = 15,
      sort = 'date',
      order = 'desc',
    } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      where += ' AND doc.status = ?';
      params.push(status);
    }
    if (product_id) {
      where += ' AND asset.product_id = ?';
      params.push(product_id);
    }
    if (type === 'digital') {
      where += ' AND doc.physical = 0';
    } else if (type === 'physical') {
      where += ' AND doc.physical = 1';
    }
    if (date_from) {
      where += ' AND doc.created_at >= ?';
      params.push(date_from);
    }
    if (date_to) {
      where += ' AND doc.created_at <= ?';
      params.push(date_to);
    }
    if (account_number) {
      where += ' AND asset_field.value LIKE ?';
      params.push(`%${account_number}%`);
    }
    if (ic) {
      where += ' AND customer.nric LIKE ?';
      params.push(`%${ic}%`);
    }
    if (name) {
      where += ' AND customer.name LIKE ?';
      params.push(`%${name}%`);
    }
    if (phone) {
      where += ' AND customer.phone LIKE ?';
      params.push(`%${phone}%`);
    }
    if (email) {
      where += ' AND customer.email LIKE ?';
      params.push(`%${email}%`);
    }

    const limit = parseInt(pageSize, 10) || 15;
    const offset = ((parseInt(page, 10) || 1) - 1) * limit;

    let orderBy = 'doc.created_at DESC';
    if (sort === 'date') {
      orderBy = `doc.created_at ${order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
    }

    const sql = `
      SELECT
        doc.id AS doc_id,
        doc.status,
        doc.physical,
        doc.created_at AS date,
        customer.name,
        customer.nric AS ic,
        customer.phone,
        customer.email,
        asset.product_id,
        asset.hibah_type,
        JSON_UNQUOTE(JSON_EXTRACT(doc.assets, '$[0].title')) AS hibah_title,
        asset_field.value AS account_number
      FROM doc
      JOIN customer ON doc.customer_id = customer.id
      JOIN JSON_TABLE(doc.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
      JOIN asset ON asset.id = doc_assets.asset_id
      LEFT JOIN asset_field ON asset_field.asset_id = asset.id AND asset_field.name = 'kategoriHarta'
      ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const sqlParams = [...params, limit, offset];

    const countSql = `
      SELECT COUNT(*) as total
      FROM doc
      JOIN customer ON doc.customer_id = customer.id
      JOIN JSON_TABLE(doc.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
      JOIN asset ON asset.id = doc_assets.asset_id
      LEFT JOIN asset_field ON asset_field.asset_id = asset.id AND asset_field.name = 'kategoriHarta'
      ${where}
    `;

    const [rows] = await db.query(sql, sqlParams);
    const [countRows] = await db.query(countSql, params);
    const total = countRows[0]?.total || 0;

    const data = rows.map(transformDocument);

    res.json({
      page: Number(page),
      pageSize: Number(pageSize),
      total,
      data,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

module.exports = {
  getDocumentTracking,
}; 