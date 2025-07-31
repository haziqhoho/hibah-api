const mysql = require('mysql2/promise');
require('dotenv').config();

// UsraHDD database connection (original)
const usrahddPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ptptn',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// EM2 database connection
const em2Pool = mysql.createPool({
  host: process.env.EM2_DB_HOST || 'localhost',
  user: process.env.EM2_DB_USER || 'root',
  password: process.env.EM2_DB_PASSWORD || '',
  database: process.env.EM2_DB_NAME || 'em2-ptptn',
  port: process.env.EM2_DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = {
  usrahdd: usrahddPool,
  em2: em2Pool
}; 