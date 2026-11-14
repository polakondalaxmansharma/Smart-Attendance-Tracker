require('dotenv').config();
const mysql = require('mysql2/promise');
const options = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'smart_attendance',
  waitForConnections: true,
  connectionLimit: 5
};
// For Aiven: download CA certificate and encode it with the documented command.
// Never disable certificate validation for production databases.
if (process.env.DB_SSL_CA_B64) {
  options.ssl = {
    ca: Buffer.from(process.env.DB_SSL_CA_B64, 'base64').toString('utf8'),
    rejectUnauthorized: true
  };
}
module.exports = mysql.createPool(options);
