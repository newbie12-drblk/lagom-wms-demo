const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ============================================================
// IMPORT ROUTES
// ============================================================
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
const invoiceRoutes = require("./routes/invoiceRoutes"); // ✅ MỚI

// ============================================================
// USE ROUTES
// ============================================================
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
app.use("/api/invoice", invoiceRoutes); // ✅ MỚI

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "LAGOM WMS Backend v2.0 is running",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
});
