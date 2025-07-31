const { usrahdd, em2 } = require('../config/db');

// Helper function to build date filter SQL
function buildDateFilter(dateType, dateFrom, dateTo, tableAlias = '') {
  let dateFilter = '';
  let groupBy = '';
  
  const dateColumn = tableAlias ? `${tableAlias}.created_at` : 'created_at';
  
  switch (dateType) {
    case 'daily':
      dateFilter = `DATE(${dateColumn}) as date`;
      groupBy = `GROUP BY DATE(${dateColumn}) ORDER BY DATE(${dateColumn}) DESC`;
      break;
    case 'monthly':
      dateFilter = `DATE_FORMAT(${dateColumn}, "%Y-%m") as date`;
      groupBy = `GROUP BY DATE_FORMAT(${dateColumn}, "%Y-%m") ORDER BY DATE_FORMAT(${dateColumn}, "%Y-%m") DESC`;
      break;
    case 'yearly':
      dateFilter = `YEAR(${dateColumn}) as date`;
      groupBy = `GROUP BY YEAR(${dateColumn}) ORDER BY YEAR(${dateColumn}) DESC`;
      break;
    case 'custom':
      if (dateFrom && dateTo) {
        dateFilter = `${dateColumn} as date`;
        groupBy = `ORDER BY ${dateColumn} DESC`;
      }
      break;
    default:
      dateFilter = `${dateColumn} as date`;
      groupBy = `ORDER BY ${dateColumn} DESC`;
  }
  
  return { dateFilter, groupBy };
}

// 1. Tarikh Pendaftaran Hibah SSPN - Count customers by date from UsraHDD asset table
//date-tracking/registration?dateType=monthly
async function getRegistrationDates(req, res) {
  try {
    const { dateType = 'monthly', dateFrom, dateTo, product_id = 100 } = req.query;
    const { dateFilter, groupBy } = buildDateFilter(dateType, dateFrom, dateTo);
    
    let sql = `
      SELECT 
        ${dateFilter},
        COUNT(DISTINCT customer_id) as customer_count
      FROM asset 
      WHERE product_id = ?
    `;
    
    const params = [product_id];
    
    if (dateFrom && dateTo && dateType === 'custom') {
      sql += ' AND created_at BETWEEN ? AND ?';
      params.push(dateFrom, dateTo);
    }
    
    sql += ` ${groupBy}`;
    
    const [rows] = await usrahdd.query(sql, params);
    
    res.json({
      endpoint: 'registration',
      dateType,
      product_id,
      data: rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// 2. Tarikh Bayaran Caj Pendaftaran - Count closed quotations from EM2
//date-tracking/payment?dateType=monthly
async function getPaymentDates(req, res) {
  try {
    const { dateType = 'monthly', dateFrom, dateTo, product_id = 100 } = req.query;
    const { dateFilter, groupBy } = buildDateFilter(dateType, dateFrom, dateTo, 'q');
    
    let sql = `
      SELECT 
        ${dateFilter},
        COUNT(DISTINCT q.id) as quotation_count
      FROM quotation q
      JOIN cart_item ci ON ci.quotation_id = q.id
      WHERE ci.product_id = ? AND q.status = '0024'
    `;
    
    const params = [product_id];
    
    if (dateFrom && dateTo && dateType === 'custom') {
      sql += ' AND q.closed_at BETWEEN ? AND ?';
      params.push(dateFrom, dateTo);
    }
    
    sql += ` ${groupBy}`;
    
    const [rows] = await em2.query(sql, params);
    
    res.json({
      endpoint: 'payment',
      dateType,
      product_id,
      data: rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// 3. Tarikh Akad Dokumen - Filter documents with doc.name starting DPP or DPH
//date-tracking/akad?dateType=monthly
async function getAkadDates(req, res) {
  try {
    const { dateType = 'monthly', dateFrom, dateTo, product_id = 46 } = req.query;
    const { dateFilter, groupBy } = buildDateFilter(dateType, dateFrom, dateTo, 'doc');
    
    // First, let's check what document names exist for this product_id
    const debugSql = `
      SELECT DISTINCT doc.name, doc.status, doc.created_at
      FROM doc
      JOIN JSON_TABLE(doc.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
      JOIN asset a ON a.id = doc_assets.asset_id
      WHERE a.product_id = ?
      ORDER BY doc.created_at DESC
      LIMIT 10
    `;
    
    const [debugRows] = await usrahdd.query(debugSql, [product_id]);
    
    let sql = `
      SELECT 
        ${dateFilter},
        COUNT(*) as document_count
      FROM doc
      JOIN JSON_TABLE(doc.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
      JOIN asset a ON a.id = doc_assets.asset_id
      WHERE a.product_id = ? AND (doc.name LIKE 'DPP%' OR doc.name LIKE 'DPH%')
    `;
    
    const params = [product_id];
    
    if (dateFrom && dateTo && dateType === 'custom') {
      sql += ' AND doc.created_at BETWEEN ? AND ?';
      params.push(dateFrom, dateTo);
    }
    
    sql += ` ${groupBy}`;
    
    const [rows] = await usrahdd.query(sql, params);
    
    res.json({
      endpoint: 'akad',
      dateType,
      product_id,
      data: rows,
      debug: {
        available_document_names: debugRows.map(row => row.name),
        total_documents_for_product: debugRows.length
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// 4. Tarikh Surat Ikatan Amanah (SIA) - Filter documents with doc.name starting SIA
//date-tracking/sia?dateType=monthly
async function getSiaDates(req, res) {
  try {
    const { dateType = 'monthly', dateFrom, dateTo, product_id = 49 } = req.query;
    const { dateFilter, groupBy } = buildDateFilter(dateType, dateFrom, dateTo, 'doc');
    
    let sql = `
      SELECT 
        ${dateFilter},
        COUNT(*) as document_count
      FROM doc
      JOIN JSON_TABLE(doc.assets, '$[*]' COLUMNS(asset_id BIGINT PATH '$.id')) AS doc_assets ON 1=1
      JOIN asset a ON a.id = doc_assets.asset_id
      WHERE a.product_id = ? AND doc.name LIKE 'SIA%'
    `;
    
    const params = [product_id];
    
    if (dateFrom && dateTo && dateType === 'custom') {
      sql += ' AND doc.created_at BETWEEN ? AND ?';
      params.push(dateFrom, dateTo);
    }
    
    sql += ` ${groupBy}`;
    
    const [rows] = await usrahdd.query(sql, params);
    
    res.json({
      endpoint: 'sia',
      dateType,
      product_id,
      data: rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// 5. Tarikh Bayaran Hibah (Selepas Kematian) - Future feature
async function getDeathPaymentDates(req, res) {
  try {
    res.json({
      endpoint: 'death-payment',
      message: 'Feature not yet implemented. Will be triggered by customer death.',
      data: []
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

module.exports = {
  getRegistrationDates,
  getPaymentDates,
  getAkadDates,
  getSiaDates,
  getDeathPaymentDates
}; 