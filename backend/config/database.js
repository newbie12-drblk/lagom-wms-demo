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
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "defaultdb",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: sslConfig,
});

const promisePool = pool.promise();

// Kiểm tra kết nối
(async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log("✅ Database connected successfully");
    connection.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
})();

module.exports = promisePool;
