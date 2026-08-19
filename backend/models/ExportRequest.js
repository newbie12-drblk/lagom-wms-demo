const db = require("../config/database");
const Inventory = require("./Inventory");

const ExportRequest = {
  create: async (data, createdBy) => {
    const [last] = await db.execute(
      "SELECT requestNo FROM export_requests ORDER BY id DESC LIMIT 1",
    );
    let num = 1;
    if (last.length > 0) {
      const match = last[0].requestNo.match(/\d+$/);
      if (match) num = parseInt(match[0]) + 1;
    }
    const requestNo = `EX-${new Date().getFullYear()}-${String(num).padStart(3, "0")}`;

    const product = await Inventory.findByMaHang(data.maHang);

    let matchStatus = "unmatched";
    let matchDetails = [];
    let currentStock = 0;

    if (product) {
      currentStock = product.tonKho || 0;
      // ✅ ĐÃ XÓA soHoaDonXuat khỏi fields
      const fields = [
        "tenThuongMai",
        "dvt",
        "hangSX",
        "phanLoai",
        "giaNhap",
        "soHopDongNhap",
        "soHoaDonNhap",
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

    // ✅ ĐÃ XÓA soHoaDonXuat khỏi INSERT
    const [result] = await db.execute(
      `INSERT INTO export_requests 
        (requestNo, tenThuongMai, maHang, dvt, hangSX, phanLoai,
         giaNhap, soHopDongNhap, soHoaDonNhap,
         ngayNhapHD, ngayXuatHD, ghiChu,
         donGiaXuat, soLuong, soLot, ngayHetHan, soHopDongXuat,
         tonKho, matchStatus, status, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        requestNo,
        data.tenThuongMai || "",
        data.maHang || "",
        data.dvt || "",
        data.hangSX || "",
        data.phanLoai || "",
        data.giaNhap || 0,
        data.soHopDongNhap || "",
        data.soHoaDonNhap || "",
        data.ngayNhapHD || null,
        data.ngayXuatHD || null,
        data.ghiChu || "",
        data.donGiaXuat || 0,
        data.soLuong || 0,
        data.soLot || "",
        data.ngayHetHan || null,
        data.soHopDongXuat || "",
        currentStock,
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
      currentStock,
    };
  },

  findById: async (id) => {
    const [rows] = await db.execute(
      `SELECT r.*, u.fullName as creatorName, a.fullName as approverName
       FROM export_requests r
       LEFT JOIN users u ON r.createdBy = u.id
       LEFT JOIN users a ON r.approvedBy = a.id
       WHERE r.id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  getAll: async (status = null) => {
    let query = `
      SELECT r.*, u.fullName as creatorName
      FROM export_requests r
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
       FROM export_requests r
       LEFT JOIN users u ON r.createdBy = u.id
       WHERE r.status IN ('pending', 'awaiting_confirmation')
       ORDER BY r.createdAt ASC`,
    );
    return rows;
  },

  approve: async (id, approvedBy, extraData = {}) => {
    const request = await ExportRequest.findById(id);
    if (!request) return false;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      if (request.matchStatus === "matched") {
        const { donGiaXuat, soLuong, soLot, ngayHetHan, soHopDongXuat } =
          extraData;

        await conn.execute(
          `UPDATE export_requests 
           SET donGiaXuat = ?, soLuong = ?, soLot = ?, 
               ngayHetHan = ?, soHopDongXuat = ?,
               status = 'approved', approvedBy = ?, approvedAt = NOW()
           WHERE id = ?`,
          [
            donGiaXuat || request.donGiaXuat || 0,
            soLuong || request.soLuong || 0,
            soLot || request.soLot || "",
            ngayHetHan || request.ngayHetHan || null,
            soHopDongXuat || request.soHopDongXuat || "",
            approvedBy,
            id,
          ],
        );

        const finalQuantity = soLuong || request.soLuong || 0;
        await conn.execute(
          `UPDATE inventory 
           SET tonKho = tonKho - ? 
           WHERE maHang = ?`,
          [finalQuantity, request.maHang],
        );
      } else {
        const { donGiaXuat, soLuong, soLot, ngayHetHan, soHopDongXuat } =
          extraData;

        await conn.execute(
          `UPDATE export_requests 
           SET donGiaXuat = ?, soLuong = ?, soLot = ?, 
               ngayHetHan = ?, soHopDongXuat = ?,
               status = 'approved', approvedBy = ?, approvedAt = NOW()
           WHERE id = ?`,
          [
            donGiaXuat || request.donGiaXuat || 0,
            soLuong || request.soLuong || 0,
            soLot || request.soLot || "",
            ngayHetHan || request.ngayHetHan || null,
            soHopDongXuat || request.soHopDongXuat || "",
            approvedBy,
            id,
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
      `UPDATE export_requests 
       SET status = 'rejected', approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [approvedBy, reason, id],
    );
    return true;
  },

  delete: async (id) => {
    const [result] = await db.execute(
      "DELETE FROM export_requests WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};

module.exports = ExportRequest;
