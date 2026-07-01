const db = require("../config/database");

const Receipt = {
  // Lấy tất cả phiếu nhập
  getAll: async () => {
    const [rows] = await db.execute(
      `SELECT r.*, u.fullName as creatorName 
       FROM receipts r 
       LEFT JOIN users u ON r.createdBy = u.id 
       ORDER BY r.createdAt DESC`,
    );
    return rows;
  },

  // Lấy phiếu nhập theo ID kèm items
  findById: async (id) => {
    const [receipts] = await db.execute(
      `SELECT r.*, u.fullName as creatorName, a.fullName as approverName
       FROM receipts r 
       LEFT JOIN users u ON r.createdBy = u.id 
       LEFT JOIN users a ON r.approvedBy = a.id 
       WHERE r.id = ?`,
      [id],
    );

    if (receipts.length === 0) return null;

    const receipt = receipts[0];
    const [items] = await db.execute(
      "SELECT * FROM receipt_items WHERE receiptId = ?",
      [id],
    );

    return { ...receipt, items };
  },

  // Tạo phiếu nhập mới
  create: async (data, createdBy) => {
    // Tạo số phiếu tự động
    const [lastReceipt] = await db.execute(
      "SELECT receiptNo FROM receipts ORDER BY id DESC LIMIT 1",
    );
    let newNumber = 1;
    if (lastReceipt.length > 0) {
      const match = lastReceipt[0].receiptNo.match(/\d+$/);
      if (match) newNumber = parseInt(match[0]) + 1;
    }
    const receiptNo = `PN-${new Date().getFullYear()}-${String(newNumber).padStart(3, "0")}`;

    // ÉP KIỂU total THÀNH NUMBER
    const total = parseFloat(data.total) || 0;

    const [result] = await db.execute(
      `INSERT INTO receipts 
        (receiptNo, receiptDate, supplierName, supplierAddress, supplierTax, 
         customerName, customerAddress, customerTax, customerContract,
         total, notes, status, createdBy) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receiptNo,
        data.receiptDate || new Date().toISOString().split("T")[0],
        data.supplierName || "",
        data.supplierAddress || "",
        data.supplierTax || "",
        data.customerName || "",
        data.customerAddress || "",
        data.customerTax || "",
        data.customerContract || "",
        total, // ← ĐÃ ÉP KIỂU NUMBER
        data.notes || "",
        "pending",
        createdBy,
      ],
    );
    const receiptId = result.insertId;

    // Thêm items
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        await db.execute(
          `INSERT INTO receipt_items 
            (receiptId, tenThuongMai, maHang, quyCach, hangSX, dvt, 
             phanLoai, giaNhap, soLuongNhap, thanhTien) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            receiptId,
            item.tenThuongMai || "",
            item.maHang || "",
            item.quyCach || "",
            item.hangSX || "",
            item.dvt || "",
            item.phanLoai || "",
            item.giaNhap || 0,
            item.soLuongNhap || 0,
            item.thanhTien || 0,
          ],
        );
      }
    }

    return receiptId;
  },

  // Cập nhật trạng thái duyệt
  updateStatus: async (id, status, approvedBy, rejectedReason = null) => {
    await db.execute(
      `UPDATE receipts 
       SET status = ?, approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [status, approvedBy, rejectedReason, id],
    );
    return true;
  },

  // Lấy danh sách phiếu chờ duyệt
  getPendingApprovals: async () => {
    const [rows] = await db.execute(
      `SELECT r.*, u.fullName as creatorName 
       FROM receipts r 
       LEFT JOIN users u ON r.createdBy = u.id 
       WHERE r.status = 'pending'
       ORDER BY r.createdAt ASC`,
    );
    return rows;
  },

  // Xóa phiếu nhập
  delete: async (id) => {
    const [result] = await db.execute("DELETE FROM receipts WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  },
};

module.exports = Receipt;
