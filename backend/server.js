const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CORS - CHO PHÉP CẢ origin = null (file://)
// ============================================
const allowedOrigins = [
  "https://lagom-wms-demo.onrender.com",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "null", // 👈 THÊM DÒNG NÀY CHO file://
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Cho phép request không có origin (như Postman, curl)
      if (!origin) return callback(null, true);

      // Cho phép nếu origin nằm trong danh sách hoặc là null
      if (allowedOrigins.indexOf(origin) !== -1 || origin === "null") {
        callback(null, true);
      } else {
        console.log(`❌ CORS blocked: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Headers",
      "Access-Control-Allow-Methods",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Xử lý preflight requests
app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Log requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("📦 Body:", JSON.stringify(req.body, null, 2));
  }
  next();
});

// ============================================
// IMPORT ROUTES
// ============================================
const authRoutes = require("./routes/authRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const receiptRequestRoutes = require("./routes/receiptRequestRoutes");
const exportRequestRoutes = require("./routes/exportRequestRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const exportRoutes = require("./routes/exportRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const managerRoutes = require("./routes/managerRoutes");
const historyRoutes = require("./routes/historyRoutes");
const fileRoutes = require("./routes/fileRoutes");
const editRoutes = require("./routes/editRoutes");
const deletionRoutes = require("./routes/deletionRoutes");

// ============================================
// USE ROUTES
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/receipt-requests", receiptRequestRoutes);
app.use("/api/export-requests", exportRequestRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/edits", editRoutes);
app.use("/api/deletions", deletionRoutes);

// ============================================
// HEALTH CHECK
// ============================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "LAGOM WMS Backend v2.0 is running",
  });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
