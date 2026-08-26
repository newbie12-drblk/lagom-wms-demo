const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// Import routes
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

// Use routes
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

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "LAGOM WMS Backend v2.0 is running",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
