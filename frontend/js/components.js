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
      <div class="receipt-card" data-id="${receipt.id}" onclick="if(window.Components) Components.viewReceiptDetail(${receipt.id})">
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
      <div class="receipt-card" data-id="${exportItem.id}" onclick="if(window.Components) Components.viewExportDetail(${exportItem.id})">
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
    Utils.showLoading(true, "Đang tải chi tiết...");
    try {
      const receipt = await window.API.receipt.getById(id);
      console.log("📦 Receipt data received:", receipt);
      const modal = document.getElementById("receiptDetailModal");
      const body = document.getElementById("receiptDetailBody");
      const footer = document.querySelector(
        "#receiptDetailModal .modal-footer",
      );
      const currentUser = Auth.getCurrentUser();

      if (body) {
        // Xác định trạng thái
        const statusMap = {
          pending: { class: "status-pending", text: "⏳ Chờ duyệt" },
          approved: { class: "status-approved", text: "✅ Đã xác nhận" },
          rejected: { class: "status-rejected", text: "❌ Từ chối" },
        };
        const status = statusMap[receipt.status] || statusMap["pending"];

        body.innerHTML = `
          <div class="detail-section">
            <h4>Thông tin phiếu</h4>
            <div class="detail-grid">
              <div><strong>Số phiếu:</strong> ${Utils.escapeHtml(receipt.receiptNo)}</div>
              <div><strong>Ngày tạo:</strong> ${Utils.formatDate(receipt.createdAt)}</div>
              <div><strong>Ngày nhập:</strong> ${Utils.formatDate(receipt.receiptDate)}</div>
              <div><strong>Trạng thái:</strong> <span class="status-badge ${status.class}">${status.text}</span></div>
              <div><strong>Nhà cung cấp:</strong> ${Utils.escapeHtml(receipt.supplierName || "—")}</div>
              <div><strong>Địa chỉ:</strong> ${Utils.escapeHtml(receipt.supplierAddress || "—")}</div>
              <div><strong>MST NCC:</strong> ${Utils.escapeHtml(receipt.supplierTax || "—")}</div>
              <div><strong>Người tạo:</strong> ${Utils.escapeHtml(receipt.creatorName || "—")}</div>
              <div><strong>Khách hàng:</strong> ${Utils.escapeHtml(receipt.customerName || "—")}</div>
              <div><strong>Địa chỉ KH:</strong> ${Utils.escapeHtml(receipt.customerAddress || "—")}</div>
              <div><strong>Số HĐ KH:</strong> ${Utils.escapeHtml(receipt.customerContract || "—")}</div>
            </div>
          </div>
          <div class="detail-section">
            <h4>Danh sách sản phẩm</h4>
            <table class="detail-table">
              <thead>
                <tr><th>STT</th><th>Tên sản phẩm</th><th>Mã hàng</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr>
              </thead>
              <tbody>
                ${(receipt.items || [])
                  .map(
                    (item, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${Utils.escapeHtml(item.tenThuongMai)}</td>
                      <td>${Utils.escapeHtml(item.maHang)}</td>
                      <td>${item.soLuongNhap || 0}</td>
                      <td class="text-right">${Utils.formatCurrency(item.giaNhap)}</td>
                      <td class="text-right">${Utils.formatCurrency(item.thanhTien)}</td>
                    </tr>
                  `,
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr><td colspan="5" class="text-right"><strong>Tổng cộng:</strong></td><td class="text-right"><strong>${Utils.formatCurrency(receipt.total)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
        `;
      }

      // THÊM NÚT DUYỆT CHO ADMIN
      if (footer && currentUser && currentUser.roleId === "admin") {
        const existingBtns = footer.querySelectorAll(
          ".btn-approve, .btn-reject",
        );
        existingBtns.forEach((btn) => btn.remove());

        // Chỉ hiển thị nút nếu phiếu đang ở trạng thái chờ duyệt
        if (receipt.status === "pending") {
          const approveBtn = document.createElement("button");
          approveBtn.className = "btn btn-success btn-approve";
          approveBtn.innerHTML = '<i class="fas fa-check"></i> Duyệt phiếu';
          approveBtn.onclick = () => approveReceipt(receipt.id);

          const rejectBtn = document.createElement("button");
          rejectBtn.className = "btn btn-danger btn-reject";
          rejectBtn.innerHTML = '<i class="fas fa-times"></i> Từ chối';
          rejectBtn.onclick = () => rejectReceipt(receipt.id);

          footer.insertBefore(rejectBtn, footer.firstChild);
          footer.insertBefore(approveBtn, footer.firstChild);
        }
      }

      if (modal) modal.style.display = "block";
    } catch (error) {
      console.error("❌ Error loading receipt:", error);
      Utils.showToast("Lỗi khi tải chi tiết phiếu", "error");
    } finally {
      Utils.showLoading(false);
    }
  },

  // ========== XEM CHI TIẾT PHIẾU XUẤT ==========
  viewExportDetail: async (id) => {
    console.log("📋 viewExportDetail called with id:", id);
    Utils.showLoading(true, "Đang tải chi tiết...");
    try {
      const exportItem = await window.API.export.getById(id);
      console.log("📦 Export data received:", exportItem);
      const modal = document.getElementById("exportDetailModal");
      const body = document.getElementById("exportDetailBody");
      const footer = document.querySelector("#exportDetailModal .modal-footer");
      const currentUser = Auth.getCurrentUser();

      if (body) {
        const statusMap = {
          pending: { class: "status-pending", text: "⏳ Chờ duyệt" },
          approved: { class: "status-approved", text: "✅ Đã xác nhận" },
          rejected: { class: "status-rejected", text: "❌ Từ chối" },
        };
        const status = statusMap[exportItem.status] || statusMap["pending"];

        body.innerHTML = `
          <div class="detail-section">
            <h4>Thông tin phiếu</h4>
            <div class="detail-grid">
              <div><strong>Số phiếu:</strong> ${Utils.escapeHtml(exportItem.exportNo)}</div>
              <div><strong>Ngày tạo:</strong> ${Utils.formatDate(exportItem.createdAt)}</div>
              <div><strong>Ngày xuất:</strong> ${Utils.formatDate(exportItem.exportDate)}</div>
              <div><strong>Trạng thái:</strong> <span class="status-badge ${status.class}">${status.text}</span></div>
              <div><strong>Người nhận:</strong> ${Utils.escapeHtml(exportItem.receiverName || "—")}</div>
              <div><strong>Lý do xuất:</strong> ${Utils.escapeHtml(exportItem.exportReason || "—")}</div>
              <div><strong>Người tạo:</strong> ${Utils.escapeHtml(exportItem.creatorName || "—")}</div>
              <div><strong>Khách hàng:</strong> ${Utils.escapeHtml(exportItem.customerName || "—")}</div>
              <div><strong>Địa chỉ KH:</strong> ${Utils.escapeHtml(exportItem.customerAddress || "—")}</div>
              <div><strong>Số HĐ KH:</strong> ${Utils.escapeHtml(exportItem.customerContract || "—")}</div>
            </div>
          </div>
          <div class="detail-section">
            <h4>Danh sách sản phẩm</h4>
            <table class="detail-table">
              <thead>
                <tr><th>STT</th><th>Tên sản phẩm</th><th>Mã hàng</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr>
              </thead>
              <tbody>
                ${(exportItem.items || [])
                  .map(
                    (item, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${Utils.escapeHtml(item.tenThuongMai)}</td>
                      <td>${Utils.escapeHtml(item.maHang)}</td>
                      <td>${item.soLuong || 0}</td>
                      <td class="text-right">${Utils.formatCurrency(item.donGia)}</td>
                      <td class="text-right">${Utils.formatCurrency(item.thanhTien)}</td>
                    </tr>
                  `,
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr><td colspan="5" class="text-right"><strong>Tổng cộng:</strong></td><td class="text-right"><strong>${Utils.formatCurrency(exportItem.total)}</strong></td></tr>
              </tfoot>
            </table>
          </div>
        `;
      }

      // THÊM NÚT DUYỆT CHO ADMIN
      if (footer && currentUser && currentUser.roleId === "admin") {
        const existingBtns = footer.querySelectorAll(
          ".btn-approve, .btn-reject",
        );
        existingBtns.forEach((btn) => btn.remove());

        if (exportItem.status === "pending") {
          const approveBtn = document.createElement("button");
          approveBtn.className = "btn btn-success btn-approve";
          approveBtn.innerHTML = '<i class="fas fa-check"></i> Duyệt phiếu';
          approveBtn.onclick = () => approveExport(exportItem.id);

          const rejectBtn = document.createElement("button");
          rejectBtn.className = "btn btn-danger btn-reject";
          rejectBtn.innerHTML = '<i class="fas fa-times"></i> Từ chối';
          rejectBtn.onclick = () => rejectExport(exportItem.id);

          footer.insertBefore(rejectBtn, footer.firstChild);
          footer.insertBefore(approveBtn, footer.firstChild);
        }
      }

      if (modal) modal.style.display = "block";
    } catch (error) {
      console.error("❌ Error loading export detail:", error);
      Utils.showToast("Lỗi khi tải chi tiết phiếu", "error");
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
      await updateInventoryFromReceipt(id);
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

// ========== CẬP NHẬT TỒN KHO TỪ PHIẾU NHẬP ==========
async function updateInventoryFromReceipt(receiptId) {
  try {
    const receipt = await window.API.receipt.getById(receiptId);
    if (!receipt || !receipt.items) return;

    for (const item of receipt.items) {
      const existing = await window.API.inventory.getByMaHang(item.maHang);
      if (existing) {
        await window.API.inventory.update(existing.id, {
          tonKho: (existing.tonKho || 0) + (item.soLuongNhap || 0),
        });
      } else {
        await window.API.inventory.create({
          tenThuongMai: item.tenThuongMai,
          maHang: item.maHang,
          quyCach: item.quyCach || "",
          hangSX: item.hangSX || "",
          dvt: item.dvt || "",
          phanLoai: item.phanLoai || "",
          giaNhap: item.giaNhap || 0,
          giaXuat: 0,
          tonKho: item.soLuongNhap || 0,
          soLuongNhap: item.soLuongNhap || 0,
          soLuongXuat: 0,
          ngayHetHan: null,
        });
      }
    }
    Utils.showToast("✅ Đã cập nhật tồn kho!", "success");
  } catch (error) {
    console.error("Update inventory error:", error);
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
