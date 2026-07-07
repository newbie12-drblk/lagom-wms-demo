const db = require("../config/database");
const Inventory = require("./Inventory");

const ReceiptRequest = {
  create: async (data, createdBy) => {
    const [last] = await db.execute(
      "SELECT requestNo FROM receipt_requests ORDER BY id DESC LIMIT 1",
    );
    let num = 1;
    if (last.length > 0) {
      const match = last[0].requestNo.match(/\d+$/);
      if (match) num = parseInt(match[0]) + 1;
    }
    const requestNo = `RN-${new Date().getFullYear()}-${String(num).padStart(3, "0")}`;

    const product = await Inventory.findByMaHang(data.maHang);

    let matchStatus = "unmatched";
    let matchDetails = [];

    if (product) {
      const fields = [
        "tenThuongMai",
        "dvt",
        "hangSX",
        "phanLoai",
        "giaNhap",
        "soHopDongNhap",
        "soHoaDonNhap",
        "soHoaDonXuat",
        "ngayNhapHD",
        "ngayXuatHD",
        "ghiChu",
      ];
      let allMatch = true;
      for (const field of fields) {
        const oldVal = product[field] || "";
        const newVal = data[field] || "";
        if (String(oldVal).trim() !== String(newVal).trim()) {
          allMatch = false;
          matchDetails.push(`${field}: "${oldVal}" → "${newVal}"`);
        }
      }
      if (allMatch) {
        matchStatus = "matched";
      }
    }

    const [result] = await db.execute(
      `INSERT INTO receipt_requests 
        (requestNo, tenThuongMai, maHang, dvt, hangSX, phanLoai,
         giaNhap, soHopDongNhap, soHoaDonNhap, soHoaDonXuat,
         ngayNhapHD, ngayXuatHD, ghiChu, soLuongNhap,
         matchStatus, status, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        requestNo,
        data.tenThuongMai,
        data.maHang,
        data.dvt || "",
        data.hangSX || "",
        data.phanLoai || "",
        data.giaNhap || 0,
        data.soHopDongNhap || "",
        data.soHoaDonNhap || "",
        data.soHoaDonXuat || "",
        data.ngayNhapHD || null,
        data.ngayXuatHD || null,
        data.ghiChu || "",
        data.soLuongNhap || 0,
        matchStatus,
        createdBy,
      ],
    );

    return {
      id: result.insertId,
      requestNo,
      matchStatus,
      matchDetails,
      isMatched: matchStatus === "matched",
    };
  },

  findById: async (id) => {
    const [rows] = await db.execute(
      `SELECT r.*, u.fullName as creatorName, a.fullName as approverName
       FROM receipt_requests r
       LEFT JOIN users u ON r.createdBy = u.id
       LEFT JOIN users a ON r.approvedBy = a.id
       WHERE r.id = ?`,
      [id],
    );
    return rows[0];
  },

  getAll: async (status = null) => {
    let query = `
      SELECT r.*, u.fullName as creatorName
      FROM receipt_requests r
      LEFT JOIN users u ON r.createdBy = u.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE r.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY r.createdAt DESC`;
    const [rows] = await db.execute(query, params);
    return rows;
  },

  getPending: async () => {
    const [rows] = await db.execute(
      `SELECT r.*, u.fullName as creatorName
       FROM receipt_requests r
       LEFT JOIN users u ON r.createdBy = u.id
       WHERE r.status IN ('pending', 'awaiting_confirmation')
       ORDER BY r.createdAt ASC`,
    );
    return rows;
  },

  approve: async (id, approvedBy, soLuongNhap = null) => {
    const request = await ReceiptRequest.findById(id);
    if (!request) return false;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      if (request.matchStatus === "matched") {
        const finalQuantity = soLuongNhap || request.soLuongNhap || 0;

        await conn.execute(
          `UPDATE receipt_requests 
           SET soLuongNhap = ?, status = 'approved', approvedBy = ?, approvedAt = NOW()
           WHERE id = ?`,
          [finalQuantity, approvedBy, id],
        );

        await conn.execute(
          `UPDATE inventory 
           SET tonKho = tonKho + ? 
           WHERE maHang = ?`,
          [finalQuantity, request.maHang],
        );
      } else {
        const finalQuantity = soLuongNhap || request.soLuongNhap || 0;

        await conn.execute(
          `UPDATE receipt_requests 
           SET status = 'approved', approvedBy = ?, approvedAt = NOW()
           WHERE id = ?`,
          [approvedBy, id],
        );

        const [maxStt] = await conn.execute(
          "SELECT MAX(stt) as maxStt FROM inventory",
        );
        const newStt = (maxStt[0].maxStt || 0) + 1;

        await conn.execute(
          `INSERT INTO inventory 
            (stt, tenThuongMai, maHang, dvt, hangSX, phanLoai,
             giaNhap, soHopDongNhap, soHoaDonNhap, soHoaDonXuat,
             ngayNhapHD, ngayXuatHD, ghiChu, tonKho, status, createdBy, approvedBy, approvedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, NOW())`,
          [
            newStt,
            request.tenThuongMai,
            request.maHang,
            request.dvt || "",
            request.hangSX || "",
            request.phanLoai || "",
            request.giaNhap || 0,
            request.soHopDongNhap || "",
            request.soHoaDonNhap || "",
            request.soHoaDonXuat || "",
            request.ngayNhapHD || null,
            request.ngayXuatHD || null,
            request.ghiChu || "",
            finalQuantity,
            request.createdBy,
            approvedBy,
          ],
        );
      }

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  reject: async (id, approvedBy, reason) => {
    await db.execute(
      `UPDATE receipt_requests 
       SET status = 'rejected', approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [approvedBy, reason, id],
    );
    return true;
  },

  delete: async (id) => {
    const [result] = await db.execute(
      "DELETE FROM receipt_requests WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};

module.exports = ReceiptRequest;
