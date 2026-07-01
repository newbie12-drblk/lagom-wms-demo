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
        approved: { class: "status-approved", text: "✅ Đã xác nhận" },
        rejected: { class: "status-rejected", text: "❌ Từ chối" },
      };
      const status = statusMap[receipt.status] || statusMap["pending"];

      let itemsTableHtml = "";
      if (receipt.items && receipt.items.length > 0) {
        itemsTableHtml = `
          <div class="detail-section" style="margin-top: 20px;">
            <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📦 Danh sách sản phẩm</h4>
            <div style="overflow-x: auto;">
              <table style="width:100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="background: #1a2235;">
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa;">STT</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">Tên thương mại</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">Mã hàng</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">Quy cách</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">Hãng SX</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa;">ĐVT</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">Phân loại</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa;">Đơn giá</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa;">Số lượng</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa;">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${receipt.items
                    .map(
                      (item, idx) => `
                    <tr style="border-bottom: 1px solid #1e2d45;">
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${idx + 1}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; color: #e2eaf5;"><strong>${Utils.escapeHtml(item.tenThuongMai)}</strong></td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; color: #93c5fd;">${Utils.escapeHtml(item.maHang)}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.quyCach || "—")}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.phanLoai || "—")}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: right; color: #93c5fd;">${Utils.formatCurrency(item.giaNhap)}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: right; color: #86efac;">${item.soLuongNhap || 0}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: right; color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(item.thanhTien)}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
                <tfoot>
                  <tr style="background: #0f172a; border-top: 2px solid #3b82f6;">
                    <td colspan="9" style="padding: 12px 8px; text-align: right; font-size: 15px; font-weight: 700; color: #e2eaf5;">TỔNG CỘNG:</td>
                    <td style="padding: 12px 8px; text-align: right; font-size: 16px; font-weight: 700; color: #fbbf24;">${Utils.formatCurrency(receipt.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        `;
      } else {
        itemsTableHtml = `
          <div class="detail-section" style="margin-top: 20px;">
            <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📦 Danh sách sản phẩm</h4>
            <div style="padding: 20px; text-align: center; color: #6b82a0;">Không có sản phẩm trong phiếu này</div>
          </div>
        `;
      }

      body.innerHTML = `
        <div class="detail-section">
          <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📋 Thông tin phiếu nhập</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #1e2d45;">
            <div><strong style="color: #6b82a0;">Số phiếu:</strong> <span style="color: #60a5fa;">${Utils.escapeHtml(receipt.receiptNo)}</span></div>
            <div><strong style="color: #6b82a0;">Trạng thái:</strong> <span class="status-badge ${status.class}">${status.text}</span></div>
            <div><strong style="color: #6b82a0;">Ngày tạo:</strong> <span style="color: #e2eaf5;">${Utils.formatDate(receipt.createdAt)}</span></div>
            <div><strong style="color: #6b82a0;">Ngày nhập:</strong> <span style="color: #e2eaf5;">${Utils.formatDate(receipt.receiptDate)}</span></div>
            <div><strong style="color: #6b82a0;">Người tạo:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.creatorName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Nhà cung cấp:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.supplierName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Địa chỉ NCC:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.supplierAddress || "—")}</span></div>
            <div><strong style="color: #6b82a0;">MST NCC:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.supplierTax || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Khách hàng:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Địa chỉ KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerAddress || "—")}</span></div>
            <div><strong style="color: #6b82a0;">MST KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerTax || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Số HĐ KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerContract || "—")}</span></div>
          </div>
        </div>
        ${itemsTableHtml}
      `;

      modal.style.display = "flex";
      modal.style.alignItems = "center";
      modal.style.justifyContent = "center";

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
        approved: { class: "status-approved", text: "✅ Đã xác nhận" },
        rejected: { class: "status-rejected", text: "❌ Từ chối" },
      };
      const status = statusMap[exportItem.status] || statusMap["pending"];

      let itemsTableHtml = "";
      if (exportItem.items && exportItem.items.length > 0) {
        itemsTableHtml = `
          <div class="detail-section" style="margin-top: 20px;">
            <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📦 Danh sách sản phẩm xuất</h4>
            <div style="overflow-x: auto;">
              <table style="width:100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="background: #1a2235;">
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa;">STT</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">Tên thương mại</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">Mã hàng</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">Quy cách</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">Hãng SX</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa;">ĐVT</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">Phân loại</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa;">Đơn giá</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa;">Số lượng</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa;">Thành tiền</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa;">Số lot</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa;">HSD</th>
                    <th style="padding: 10px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  ${exportItem.items
                    .map(
                      (item, idx) => `
                    <tr style="border-bottom: 1px solid #1e2d45;">
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${idx + 1}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; color: #e2eaf5;"><strong>${Utils.escapeHtml(item.tenThuongMai)}</strong></td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; color: #93c5fd;">${Utils.escapeHtml(item.maHang)}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.quyCach || "—")}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.phanLoai || "—")}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: right; color: #93c5fd;">${Utils.formatCurrency(item.donGia)}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: right; color: #86efac;">${item.soLuong || 0}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: right; color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(item.thanhTien)}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.soLot || "—")}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.formatDate(item.ngayHetHan)}</td>
                      <td style="padding: 8px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.ghiChu || "—")}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
                <tfoot>
                  <tr style="background: #0f172a; border-top: 2px solid #3b82f6;">
                    <td colspan="9" style="padding: 12px 8px; text-align: right; font-size: 15px; font-weight: 700; color: #e2eaf5;">TỔNG CỘNG:</td>
                    <td style="padding: 12px 8px; text-align: right; font-size: 16px; font-weight: 700; color: #fbbf24;">${Utils.formatCurrency(exportItem.total)}</td>
                    <td colspan="3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        `;
      } else {
        itemsTableHtml = `
          <div class="detail-section" style="margin-top: 20px;">
            <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📦 Danh sách sản phẩm xuất</h4>
            <div style="padding: 20px; text-align: center; color: #6b82a0;">Không có sản phẩm trong phiếu này</div>
          </div>
        `;
      }

      body.innerHTML = `
        <div class="detail-section">
          <h4 style="color: #60a5fa; margin-bottom: 12px; font-size: 15px;">📋 Thông tin phiếu xuất</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #1e2d45;">
            <div><strong style="color: #6b82a0;">Số phiếu:</strong> <span style="color: #60a5fa;">${Utils.escapeHtml(exportItem.exportNo)}</span></div>
            <div><strong style="color: #6b82a0;">Trạng thái:</strong> <span class="status-badge ${status.class}">${status.text}</span></div>
            <div><strong style="color: #6b82a0;">Ngày tạo:</strong> <span style="color: #e2eaf5;">${Utils.formatDate(exportItem.createdAt)}</span></div>
            <div><strong style="color: #6b82a0;">Ngày xuất:</strong> <span style="color: #e2eaf5;">${Utils.formatDate(exportItem.exportDate)}</span></div>
            <div><strong style="color: #6b82a0;">Người tạo:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.creatorName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Người nhận:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.receiverName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Lý do xuất:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.exportReason || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Khách hàng:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerName || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Địa chỉ KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerAddress || "—")}</span></div>
            <div><strong style="color: #6b82a0;">MST KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerTax || "—")}</span></div>
            <div><strong style="color: #6b82a0;">Số HĐ KH:</strong> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerContract || "—")}</span></div>
          </div>
        </div>
        ${itemsTableHtml}
      `;

      modal.style.display = "flex";
      modal.style.alignItems = "center";
      modal.style.justifyContent = "center";

      console.log("✅ Export Modal displayed successfully");
    } catch (error) {
      console.error("❌ Error loading export detail:", error);
      Utils.showToast("Lỗi khi tải chi tiết phiếu: " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  },
};

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

// ========== ĐÓNG MODAL ==========
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
}

// ========== EXPORT ==========
window.Components = Components;
window.closeModal = closeModal;
window.approveReceipt = approveReceipt;
window.rejectReceipt = rejectReceipt;
window.approveExport = approveExport;
window.rejectExport = rejectExport;

console.log("✅ Components exported successfully!");
