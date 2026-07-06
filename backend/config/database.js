const mysql = require("mysql2");
const dotenv = require("dotenv");
const path = require("path");

// Load .env từ thư mục gốc backend
dotenv.config({ path: path.join(__dirname, "..", ".env") });

console.log("🔍 DATABASE CONFIG:");
console.log("  Host:", process.env.DB_HOST);
console.log("  User:", process.env.DB_USER);
console.log("  Database:", process.env.DB_NAME);
console.log("  Port:", process.env.DB_PORT);

// Kiểm tra xem có đang chạy trên môi trường production (Render) không
const isProduction =
  process.env.NODE_ENV === "production" || process.env.RENDER;

let poolConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "defaultdb",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
};

// Chỉ thêm SSL nếu đang chạy trên production (Render, Aiven, v.v.)
if (isProduction) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
  console.log("🔒 SSL enabled (production mode)");
} else {
  console.log("🔓 SSL disabled (local development)");
}

const pool = mysql.createPool(poolConfig);
const promisePool = pool.promise();

// Kiểm tra kết nối
(async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log("✅ Database connected successfully!");
    connection.release();
  } catch (error) {
    console.error("❌ Database connection failed!");
    console.error("  Code:", error.code);
    console.error("  Message:", error.message);
    console.error("  Please check your .env file and database configuration.");
  }
})();

module.exports = promisePool;
