const mysql = require("mysql2");
const dotenv = require("dotenv");
const path = require("path");

// ⭐ QUAN TRỌNG: Load .env từ thư mục gốc backend
dotenv.config({ path: path.join(__dirname, "..", ".env") });

console.log("🔍 DATABASE CONFIG:");
console.log("  Host:", process.env.DB_HOST);
console.log("  User:", process.env.DB_USER);
console.log("  Database:", process.env.DB_NAME);
console.log("  Port:", process.env.DB_PORT);

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "defaultdb",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  ssl: {
    rejectUnauthorized: false,
  },
});

const promisePool = pool.promise();

(async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log("✅ Database connected successfully!");
    connection.release();
  } catch (error) {
    console.error("❌ Database connection failed!");
    console.error("  Code:", error.code);
    console.error("  Message:", error.message);
  }
})();

module.exports = promisePool;
