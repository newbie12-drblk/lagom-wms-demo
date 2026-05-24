const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

let sslConfig = null;

// Nếu có DB_SSL_CA thì cấu hình SSL
if (process.env.DB_SSL_CA) {
  sslConfig = {
    ca: process.env.DB_SSL_CA,
  };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: sslConfig,
});

const promisePool = pool.promise();

module.exports = promisePool;
