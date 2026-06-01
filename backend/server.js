const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Import routes
const authRoutes = require("./routes/authRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const exportRoutes = require("./routes/exportRoutes");
const fileRoutes = require("./routes/fileRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const historyRoutes = require("./routes/historyRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const deletionRoutes = require("./routes/deletionRoutes");
const editRoutes = require("./routes/editRoutes");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/deletions", deletionRoutes);
app.use("/api/edits", editRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "LAGOM WMS Backend is running" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
