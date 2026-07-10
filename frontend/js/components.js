/**
 * ==================== COMPONENTS ====================
 * Tạo các component UI động bằng JavaScript
 */
console.log("🔧 COMPONENTS.JS LOADED SUCCESSFULLY");

const Components = {
  // ========== TẠO CARD PHIẾU NHẬP ==========
  createReceiptCard: (receipt) => {
    const statusMap = {
      pending: { class: "status-pending", text: "⏳ Chờ duyệt" },
      awaiting_confirmation: {
        class: "status-awaiting",
        text: "🔄 Chờ xác nhận",
      },
      approved: { class: "status-approved", text: "✅ Đã xác nhận" },
      rejected: { class: "status-rejected", text: "❌ Từ chối" },
    };
    const status = statusMap[receipt.status] || statusMap["pending"];

    return `
      <div class="receipt-card" data-id="${receipt.id}" onclick="Components.viewReceiptDetail(${receipt.id})">
        <div class="receipt-card-header">
          <div class="receipt-card-id">
            <i class="fas fa-file-invoice"></i> ${Utils.escapeHtml(receipt.receiptNo || "PN-" + receipt.id)}
          </div>
          <div class="receipt-card-date">
            <i class="far fa-calendar-alt"></i> ${Utils.formatDate(receipt.receiptDate || receipt.createdAt)}
          </div>
          <span class="status-badge ${status.class}">${status.text}</span>
        </div>
        <div class="receipt-card-body">
          <div class="receipt-card-info">
            <div class="label">Nhà cung cấp</div>
            <div class="value">${Utils.escapeHtml(receipt.supplierName || "Chưa có")}</div>
          </div>
          <div class="receipt-card-info">
            <div class="label">Số sản phẩm</div>
            <div class="value">${receipt.items?.length || 0}</div>
          </div>
          <div class="receipt-card-total">
            <div class="label">Tổng tiền</div>
            <div class="value">${Utils.formatCurrency(receipt.total || 0)}</div>
          </div>
        </div>
        <div class="receipt-card-footer">
          <i class="fas fa-eye"></i> Xem chi tiết
        </div>
      </div>
    `;
  },

  // ========== TẠO CARD PHIẾU XUẤT ==========
  createExportCard: (exportItem) => {
    const statusMap = {
      pending: { class: "status-pending", text: "⏳ Chờ duyệt" },
      awaiting_confirmation: {
        class: "status-awaiting",
        text: "🔄 Chờ xác nhận",
      },
      approved: { class: "status-approved", text: "✅ Đã xác nhận" },
      rejected: { class: "status-rejected", text: "❌ Từ chối" },
    };
    const status = statusMap[exportItem.status] || statusMap["pending"];

    return `
      <div class="receipt-card" data-id="${exportItem.id}" onclick="Components.viewExportDetail(${exportItem.id})">
        <div class="receipt-card-header">
          <div class="receipt-card-id">
            <i class="fas fa-file-export"></i> ${Utils.escapeHtml(exportItem.exportNo || "PX-" + exportItem.id)}
          </div>
          <div class="receipt-card-date">
            <i class="far fa-calendar-alt"></i> ${Utils.formatDate(exportItem.exportDate || exportItem.createdAt)}
          </div>
          <span class="status-badge ${status.class}">${status.text}</span>
        </div>
        <div class="receipt-card-body">
          <div class="receipt-card-info">
            <div class="label">Người nhận</div>
            <div class="value">${Utils.escapeHtml(exportItem.receiverName || "Chưa có")}</div>
          </div>
          <div class="receipt-card-info">
            <div class="label">Số sản phẩm</div>
            <div class="value">${exportItem.items?.length || 0}</div>
          </div>
          <div class="receipt-card-total">
            <div class="label">Tổng tiền</div>
            <div class="value">${Utils.formatCurrency(exportItem.total || 0)}</div>
          </div>
        </div>
        <div class="receipt-card-footer">
          <i class="fas fa-eye"></i> Xem chi tiết
        </div>
      </div>
    `;
  },

  // ========== XEM CHI TIẾT PHIẾU NHẬP ==========
  viewReceiptDetail: async (id) => {
    console.log("📋 viewReceiptDetail called with id:", id);

    const modal = document.getElementById("receiptDetailModal");
    if (!modal) {
      console.error("❌ Modal receiptDetailModal not found!");
      Utils.showToast("Lỗi: Không tìm thấy modal", "error");
      return;
    }

    Utils.showLoading(true, "Đang tải chi tiết...");
    try {
      const receipt = await window.API.receipt.getById(id);
      console.log("📦 Receipt data received:", receipt);

      if (!receipt) {
        Utils.showToast("Không tìm thấy phiếu", "error");
        Utils.showLoading(false);
        return;
      }

      const body = document.getElementById("receiptDetailBody");
      if (!body) {
        console.error("❌ receiptDetailBody not found!");
        Utils.showLoading(false);
        return;
      }

      const statusMap = {
        pending: { class: "status-pending", text: "⏳ Chờ duyệt" },
        awaiting_confirmation: {
          class: "status-awaiting",
          text: "🔄 Chờ xác nhận",
        },
        approved: { class: "status-approved", text: "✅ Đã xác nhận" },
        rejected: { class: "status-rejected", text: "❌ Từ chối" },
      };
      const status = statusMap[receipt.status] || statusMap["pending"];

      // BẢNG CHI TIẾT - GIỮ NGUYÊN TẤT CẢ CỘT
      let itemsTableHtml = "";
      if (receipt.items && receipt.items.length > 0) {
        itemsTableHtml = `
          <div style="margin-top: 20px;">
            <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📦 Danh sách sản phẩm</h4>
            <div style="overflow-x: auto; border: 1px solid #1e2d45; border-radius: 8px;">
              <table style="width:100%; border-collapse: collapse; font-size: 13px; background: #0f172a;">
                <thead>
                  <tr style="background: #1a2235; border-bottom: 2px solid #3b82f6;">
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">STT</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 150px;">TÊN THƯƠNG MẠI</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 100px;">MÃ HÀNG</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">QUY CÁCH</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">HÃNG/NƯỚC SX</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">ĐVT</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">PHÂN LOẠI MÁY</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">GIÁ NHẬP</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">SL NHẬP</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">THÀNH TIỀN</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">SỐ HĐ</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">SỐ HĐƠN NHẬP</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">NGÀY NHẬP HĐ</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">SỐ LOT</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">NGÀY HẾT HẠN</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">GHI CHÚ</th>
                  </tr>
                </thead>
                <tbody>
                  ${receipt.items
                    .map((item, idx) => {
                      const expiryColor =
                        item.ngayHetHan &&
                        new Date(item.ngayHetHan) < new Date()
                          ? "#f87171"
                          : "#e2eaf5";
                      return `
                        <tr style="border-bottom: 1px solid #1e2d45; transition: background 0.15s;">
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5; background: #0a0f1a;">${idx + 1}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5; font-weight: 600;">${Utils.escapeHtml(item.tenThuongMai)}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #93c5fd; font-family: monospace;">${Utils.escapeHtml(item.maHang)}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.quyCach || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.phanLoai || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: right; color: #93c5fd; font-family: monospace;">${Utils.formatCurrency(item.giaNhap)}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: right; color: #86efac; font-weight: 600;">${item.soLuongNhap || 0}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: right; color: #fbbf24; font-weight: 700; font-family: monospace;">${Utils.formatCurrency(item.thanhTien)}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.soHopDongNhap || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.soHoaDonNhap || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.formatDate(item.ngayNhapHD)}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5; font-family: monospace;">${Utils.escapeHtml(item.soLot || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: center; color: ${expiryColor};">${Utils.formatDate(item.ngayHetHan)}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #6b82a0; font-style: italic;">${Utils.escapeHtml(item.ghiChu || "—")}</td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
                <tfoot>
                  <tr style="background: #0f172a; border-top: 2px solid #3b82f6;">
                    <td colspan="9" style="padding: 12px 16px; text-align: right; font-size: 15px; font-weight: 700; color: #e2eaf5;">TỔNG CỘNG:</td>
                    <td style="padding: 12px 16px; text-align: right; font-size: 16px; font-weight: 700; color: #fbbf24; font-family: monospace;">${Utils.formatCurrency(receipt.total)}</td>
                    <td colspan="6" style="padding: 12px 16px;"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        `;
      } else {
        itemsTableHtml = `
          <div style="margin-top: 20px;">
            <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📦 Danh sách sản phẩm</h4>
            <div style="padding: 30px; text-align: center; color: #6b82a0; background: #0f172a; border-radius: 8px; border: 1px solid #1e2d45;">
              <i class="fas fa-box" style="font-size: 24px; opacity: 0.4; display: block; margin-bottom: 8px;"></i>
              Không có sản phẩm trong phiếu này
            </div>
          </div>
        `;
      }

      body.innerHTML = `
        <div>
          <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📋 Thông tin phiếu nhập</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; background: #0f172a; padding: 14px 18px; border-radius: 8px; border: 1px solid #1e2d45;">
            <div><strong style="color: #6b82a0;">Số phiếu:</strong> <span style="color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(receipt.receiptNo)}</span></div>
            <div><strong style="color: #6b82a0;">Trạng thái:</strong> <span class="status-badge ${status.class}" style="padding: 3px 12px;">${status.text}</span></div>
            <div><strong style="color: #6b82a0;">Người tạo:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.creatorName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Ngày tạo:</strong> <span style="color: #e2eaf5;">${Utils.formatDate(receipt.createdAt)}</span></div>
            <div><strong style="color: #6b82a0;">Ngày nhập:</strong> <span style="color: #e2eaf5;">${Utils.formatDate(receipt.receiptDate)}</span></div>
            <div><strong style="color: #6b82a0;">Nhà cung cấp:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.supplierName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Địa chỉ NCC:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.supplierAddress || "—")}</span></div>
            <div><strong style="color: #6b82a0;">MST NCC:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.supplierTax || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Khách hàng:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Địa chỉ KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerAddress || "—")}</span></div>
            <div><strong style="color: #6b82a0;">MST KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerTax || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Số HĐ KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerContract || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Tổng tiền:</strong> <span style="color: #fbbf24; font-weight: 700; font-family: monospace;">${Utils.formatCurrency(receipt.total)}</span></div>
          </div>
        </div>
        ${itemsTableHtml}
      `;

      showModal(modal);
      console.log("✅ Modal displayed successfully");
    } catch (error) {
      console.error("❌ Error loading receipt:", error);
      Utils.showToast("Lỗi khi tải chi tiết phiếu: " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  },

  // ========== XEM CHI TIẾT PHIẾU XUẤT ==========
  viewExportDetail: async (id) => {
    console.log("📋 viewExportDetail called with id:", id);

    const modal = document.getElementById("exportDetailModal");
    if (!modal) {
      console.error("❌ Modal exportDetailModal not found!");
      Utils.showToast("Lỗi: Không tìm thấy modal", "error");
      return;
    }

    Utils.showLoading(true, "Đang tải chi tiết...");
    try {
      const exportItem = await window.API.export.getById(id);
      console.log("📦 Export data received:", exportItem);

      if (!exportItem) {
        Utils.showToast("Không tìm thấy phiếu", "error");
        Utils.showLoading(false);
        return;
      }

      const body = document.getElementById("exportDetailBody");
      if (!body) {
        console.error("❌ exportDetailBody not found!");
        Utils.showLoading(false);
        return;
      }

      const statusMap = {
        pending: { class: "status-pending", text: "⏳ Chờ duyệt" },
        awaiting_confirmation: {
          class: "status-awaiting",
          text: "🔄 Chờ xác nhận",
        },
        approved: { class: "status-approved", text: "✅ Đã xác nhận" },
        rejected: { class: "status-rejected", text: "❌ Từ chối" },
      };
      const status = statusMap[exportItem.status] || statusMap["pending"];

      // BẢNG CHI TIẾT - GIỮ NGUYÊN TẤT CẢ CỘT
      let itemsTableHtml = "";
      if (exportItem.items && exportItem.items.length > 0) {
        itemsTableHtml = `
          <div style="margin-top: 20px;">
            <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📦 Danh sách sản phẩm xuất</h4>
            <div style="overflow-x: auto; border: 1px solid #1e2d45; border-radius: 8px;">
              <table style="width:100%; border-collapse: collapse; font-size: 13px; background: #0f172a;">
                <thead>
                  <tr style="background: #1a2235; border-bottom: 2px solid #3b82f6;">
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">STT</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 150px;">TÊN THƯƠNG MẠI</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 100px;">MÃ HÀNG</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">QUY CÁCH</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">HÃNG/NƯỚC SX</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">ĐVT</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">PHÂN LOẠI MÁY</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">ĐƠN GIÁ</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">SỐ LƯỢNG</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">THÀNH TIỀN</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">SỐ LOT</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">NGÀY HẾT HẠN</th>
                    <th style="padding: 10px 12px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">GHI CHÚ</th>
                  </tr>
                </thead>
                <tbody>
                  ${exportItem.items
                    .map((item, idx) => {
                      const expiryColor =
                        item.ngayHetHan &&
                        new Date(item.ngayHetHan) < new Date()
                          ? "#f87171"
                          : "#e2eaf5";
                      return `
                        <tr style="border-bottom: 1px solid #1e2d45;">
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5; background: #0a0f1a;">${idx + 1}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5; font-weight: 600;">${Utils.escapeHtml(item.tenThuongMai)}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #93c5fd; font-family: monospace;">${Utils.escapeHtml(item.maHang)}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.quyCach || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.phanLoai || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: right; color: #93c5fd; font-family: monospace;">${Utils.formatCurrency(item.donGia)}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: right; color: #86efac; font-weight: 600;">${item.soLuong || 0}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: right; color: #fbbf24; font-weight: 700; font-family: monospace;">${Utils.formatCurrency(item.thanhTien)}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #e2eaf5; font-family: monospace;">${Utils.escapeHtml(item.soLot || "—")}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; text-align: center; color: ${expiryColor};">${Utils.formatDate(item.ngayHetHan)}</td>
                          <td style="padding: 8px 12px; border: 1px solid #1e2d45; color: #6b82a0; font-style: italic;">${Utils.escapeHtml(item.ghiChu || "—")}</td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
                <tfoot>
                  <tr style="background: #0f172a; border-top: 2px solid #3b82f6;">
                    <td colspan="9" style="padding: 12px 16px; text-align: right; font-size: 15px; font-weight: 700; color: #e2eaf5;">TỔNG CỘNG:</td>
                    <td style="padding: 12px 16px; text-align: right; font-size: 16px; font-weight: 700; color: #fbbf24; font-family: monospace;">${Utils.formatCurrency(exportItem.total)}</td>
                    <td colspan="3" style="padding: 12px 16px;"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        `;
      } else {
        itemsTableHtml = `
          <div style="margin-top: 20px;">
            <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📦 Danh sách sản phẩm xuất</h4>
            <div style="padding: 30px; text-align: center; color: #6b82a0; background: #0f172a; border-radius: 8px; border: 1px solid #1e2d45;">
              <i class="fas fa-box" style="font-size: 24px; opacity: 0.4; display: block; margin-bottom: 8px;"></i>
              Không có sản phẩm trong phiếu này
            </div>
          </div>
        `;
      }

      body.innerHTML = `
        <div>
          <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📋 Thông tin phiếu xuất</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; background: #0f172a; padding: 14px 18px; border-radius: 8px; border: 1px solid #1e2d45;">
            <div><strong style="color: #6b82a0;">Số phiếu:</strong> <span style="color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(exportItem.exportNo)}</span></div>
            <div><strong style="color: #6b82a0;">Trạng thái:</strong> <span class="status-badge ${status.class}" style="padding: 3px 12px;">${status.text}</span></div>
            <div><strong style="color: #6b82a0;">Người tạo:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.creatorName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Ngày tạo:</strong> <span style="color: #e2eaf5;">${Utils.formatDate(exportItem.createdAt)}</span></div>
            <div><strong style="color: #6b82a0;">Ngày xuất:</strong> <span style="color: #e2eaf5;">${Utils.formatDate(exportItem.exportDate)}</span></div>
            <div><strong style="color: #6b82a0;">Người nhận:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.receiverName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Khách hàng:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Địa chỉ KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerAddress || "—")}</span></div>
            <div><strong style="color: #6b82a0;">MST KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerTax || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Số HĐ KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerContract || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Lý do xuất:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.exportReason || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Tổng tiền:</strong> <span style="color: #fbbf24; font-weight: 700; font-family: monospace;">${Utils.formatCurrency(exportItem.total)}</span></div>
          </div>
        </div>
        ${itemsTableHtml}
      `;

      showModal(modal);
      console.log("✅ Export Modal displayed successfully");
    } catch (error) {
      console.error("❌ Error loading export detail:", error);
      Utils.showToast("Lỗi khi tải chi tiết phiếu: " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  },
};

// ========== HIỂN THỊ MODAL ==========
function showModal(modal) {
  if (!modal) return;

  modal.style.cssText = `
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: fixed !important;
    z-index: 99999 !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0, 0, 0, 0.8) !important;
    backdrop-filter: blur(4px) !important;
  `;

  document.body.style.overflow = "hidden";

  modal.onclick = function (e) {
    if (e.target === modal) {
      closeModal(modal.id);
    }
  };

  document.onkeydown = function (e) {
    if (e.key === "Escape") {
      closeModal(modal.id);
    }
  };
}

// ========== ĐÓNG MODAL ==========
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
    document.onkeydown = null;
  }
}

// ========== HÀM DUYỆT PHIẾU NHẬP ==========
async function approveReceipt(id) {
  if (!confirm("Bạn có chắc muốn duyệt phiếu nhập này?")) return;

  Utils.showLoading(true, "Đang xử lý...");
  try {
    const result = await window.API.receipt.updateStatus(id, "approved");
    if (result.success) {
      Utils.showToast("✅ Đã duyệt phiếu nhập thành công!");
      closeModal("receiptDetailModal");
      if (typeof loadReceipts === "function") loadReceipts();
    } else {
      Utils.showToast(
        "❌ Lỗi: " + (result.message || "Không thể duyệt"),
        "error",
      );
    }
  } catch (error) {
    Utils.showToast("❌ " + (error.message || "Có lỗi xảy ra"), "error");
  } finally {
    Utils.showLoading(false);
  }
}

async function rejectReceipt(id) {
  const reason = prompt("Nhập lý do từ chối:");
  if (reason === null) return;

  Utils.showLoading(true, "Đang xử lý...");
  try {
    const result = await window.API.receipt.updateStatus(
      id,
      "rejected",
      reason,
    );
    if (result.success) {
      Utils.showToast("✅ Đã từ chối phiếu nhập!");
      closeModal("receiptDetailModal");
      if (typeof loadReceipts === "function") loadReceipts();
    } else {
      Utils.showToast(
        "❌ Lỗi: " + (result.message || "Không thể từ chối"),
        "error",
      );
    }
  } catch (error) {
    Utils.showToast("❌ " + (error.message || "Có lỗi xảy ra"), "error");
  } finally {
    Utils.showLoading(false);
  }
}

// ========== HÀM DUYỆT PHIẾU XUẤT ==========
async function approveExport(id) {
  if (!confirm("Bạn có chắc muốn duyệt phiếu xuất này?")) return;

  Utils.showLoading(true, "Đang xử lý...");
  try {
    const result = await window.API.export.updateStatus(id, "approved");
    if (result.success) {
      Utils.showToast("✅ Đã duyệt phiếu xuất thành công!");
      closeModal("exportDetailModal");
      if (typeof loadExports === "function") loadExports();
    } else {
      Utils.showToast(
        "❌ Lỗi: " + (result.message || "Không thể duyệt"),
        "error",
      );
    }
  } catch (error) {
    Utils.showToast("❌ " + (error.message || "Có lỗi xảy ra"), "error");
  } finally {
    Utils.showLoading(false);
  }
}

async function rejectExport(id) {
  const reason = prompt("Nhập lý do từ chối:");
  if (reason === null) return;

  Utils.showLoading(true, "Đang xử lý...");
  try {
    const result = await window.API.export.updateStatus(id, "rejected", reason);
    if (result.success) {
      Utils.showToast("✅ Đã từ chối phiếu xuất!");
      closeModal("exportDetailModal");
      if (typeof loadExports === "function") loadExports();
    } else {
      Utils.showToast(
        "❌ Lỗi: " + (result.message || "Không thể từ chối"),
        "error",
      );
    }
  } catch (error) {
    Utils.showToast("❌ " + (error.message || "Có lỗi xảy ra"), "error");
  } finally {
    Utils.showLoading(false);
  }
}

// ========== EXPORT ==========
window.Components = Components;
window.closeModal = closeModal;
window.approveReceipt = approveReceipt;
window.rejectReceipt = rejectReceipt;
window.approveExport = approveExport;
window.rejectExport = rejectExport;

console.log("✅ Components exported successfully!");
