/**
 * ==================== COMPONENTS ====================
 * Tạo các component UI động bằng JavaScript
 */

const Components = {
  // Tạo bảng sản phẩm trong phiếu nhập
  createReceiptItemRow: (data = null, index = 1) => {
    return `
            <tr data-row-index="${index}">
                <td class="stt-cell">${index}</td>
                <td><input type="text" class="product-name" value="${Utils.escapeHtml(data?.tenThuongMai || "")}" placeholder="Tên thương mại"></td>
                <td><input type="text" class="product-code" value="${Utils.escapeHtml(data?.maHang || "")}" placeholder="Mã hàng"></td>
                <td><input type="text" class="packing" value="${Utils.escapeHtml(data?.quyCach || "")}" placeholder="Quy cách"></td>
                <td><input type="text" class="manufacturer" value="${Utils.escapeHtml(data?.hangSX || "")}" placeholder="Hãng SX"></td>
                <td><input type="text" class="unit" value="${Utils.escapeHtml(data?.dvt || "")}" placeholder="ĐVT"></td>
                <td><input type="text" class="category" value="${Utils.escapeHtml(data?.phanLoai || "")}" placeholder="Phân loại"></td>
                <td><input type="text" class="price-input" value="${data?.giaNhap ? Utils.formatNumber(data.giaNhap) : "0"}"></td>
                <td><input type="text" class="qty-input" value="${data?.soLuongNhap || "0"}"></td>
                <td class="row-total" data-total="0">0</td>
                <td class="text-center"><button class="btn-remove" type="button"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
  },

  // Tạo bảng sản phẩm trong phiếu xuất
  createExportItemRow: (data = null, index = 1) => {
    return `
            <tr data-row-index="${index}">
                <td class="stt-cell">${index}</td>
                <td><input type="text" class="product-name" value="${Utils.escapeHtml(data?.tenThuongMai || "")}" placeholder="Tên sản phẩm"></td>
                <td><input type="text" class="product-code" value="${Utils.escapeHtml(data?.maHang || "")}" placeholder="Mã hàng"></td>
                <td><input type="text" class="packing" value="${Utils.escapeHtml(data?.quyCach || "")}" placeholder="Quy cách"></td>
                <td><input type="text" class="manufacturer" value="${Utils.escapeHtml(data?.hangSX || "")}" placeholder="Hãng SX"></td>
                <td><input type="text" class="unit" value="${Utils.escapeHtml(data?.dvt || "")}" placeholder="ĐVT"></td>
                <td><input type="text" class="category" value="${Utils.escapeHtml(data?.phanLoai || "")}" placeholder="Phân loại"></td>
                <td><input type="text" class="price-input" value="${data?.donGia ? Utils.formatNumber(data.donGia) : "0"}"></td>
                <td><input type="text" class="qty-input" value="${data?.soLuong || "0"}"></td>
                <td class="row-total" data-total="0">0</td>
                <td><input type="text" class="lot-input" placeholder="Số lot" value="${Utils.escapeHtml(data?.soLot || "")}"></td>
                <td><input type="date" class="expiry-input" value="${data?.ngayHetHan || ""}"></td>
                <td><input type="text" class="note-input" placeholder="Ghi chú" value="${Utils.escapeHtml(data?.ghiChu || "")}"></td>
                <td class="text-center"><button class="btn-remove" type="button"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
  },

  // Tạo card hiển thị phiếu nhập
  createReceiptCard: (receipt) => {
    return `
            <div class="receipt-card" data-id="${receipt.id}" onclick="Components.viewReceiptDetail(${receipt.id})">
                <div class="receipt-card-header">
                    <div class="receipt-card-id">
                        <i class="fas fa-file-invoice"></i> ${Utils.escapeHtml(receipt.receiptNo || "PN-" + receipt.id)}
                    </div>
                    <div class="receipt-card-date">
                        <i class="far fa-calendar-alt"></i> ${Utils.formatDate(receipt.receiptDate || receipt.createdAt)}
                    </div>
                    <span class="status-badge status-${receipt.status}">${receipt.status === "pending" ? "Chờ duyệt" : receipt.status === "approved" ? "Đã duyệt" : "Từ chối"}</span>
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

  // Tạo card hiển thị phiếu xuất
  createExportCard: (exportItem) => {
    return `
            <div class="receipt-card" data-id="${exportItem.id}" onclick="Components.viewExportDetail(${exportItem.id})">
                <div class="receipt-card-header">
                    <div class="receipt-card-id">
                        <i class="fas fa-file-export"></i> ${Utils.escapeHtml(exportItem.exportNo || "PX-" + exportItem.id)}
                    </div>
                    <div class="receipt-card-date">
                        <i class="far fa-calendar-alt"></i> ${Utils.formatDate(exportItem.exportDate || exportItem.createdAt)}
                    </div>
                    <span class="status-badge status-${exportItem.status}">${exportItem.status === "pending" ? "Chờ duyệt" : exportItem.status === "approved" ? "Đã duyệt" : "Từ chối"}</span>
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

  // Xem chi tiết phiếu nhập
  viewReceiptDetail: async (id) => {
    Utils.showLoading(true, "Đang tải chi tiết...");
    try {
      const receipt = await window.API.receipt.getById(id);
      const modal = document.getElementById("receiptDetailModal");
      const body = document.getElementById("receiptDetailBody");

      if (body) {
        body.innerHTML = `
                    <div class="detail-section">
                        <h4>Thông tin phiếu</h4>
                        <div class="detail-grid">
                            <div><strong>Số phiếu:</strong> ${Utils.escapeHtml(receipt.receiptNo)}</div>
                            <div><strong>Ngày tạo:</strong> ${Utils.formatDate(receipt.createdAt)}</div>
                            <div><strong>Ngày nhập:</strong> ${Utils.formatDate(receipt.receiptDate)}</div>
                            <div><strong>Trạng thái:</strong> <span class="status-badge status-${receipt.status}">${receipt.status}</span></div>
                            <div><strong>Nhà cung cấp:</strong> ${Utils.escapeHtml(receipt.supplierName || "—")}</div>
                            <div><strong>Địa chỉ:</strong> ${Utils.escapeHtml(receipt.supplierAddress || "—")}</div>
                            <div><strong>MST NCC:</strong> ${Utils.escapeHtml(receipt.supplierTax || "—")}</div>
                            <div><strong>Người tạo:</strong> ${Utils.escapeHtml(receipt.creatorName || "—")}</div>
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
      if (modal) modal.style.display = "block";
    } catch (error) {
      Utils.showToast("Lỗi khi tải chi tiết phiếu", "error");
    } finally {
      Utils.showLoading(false);
    }
  },

  // Xem chi tiết phiếu xuất
  viewExportDetail: async (id) => {
    Utils.showLoading(true, "Đang tải chi tiết...");
    try {
      const exportItem = await window.API.export.getById(id);
      const modal = document.getElementById("exportDetailModal");
      const body = document.getElementById("exportDetailBody");

      if (body) {
        body.innerHTML = `
                    <div class="detail-section">
                        <h4>Thông tin phiếu</h4>
                        <div class="detail-grid">
                            <div><strong>Số phiếu:</strong> ${Utils.escapeHtml(exportItem.exportNo)}</div>
                            <div><strong>Ngày tạo:</strong> ${Utils.formatDate(exportItem.createdAt)}</div>
                            <div><strong>Ngày xuất:</strong> ${Utils.formatDate(exportItem.exportDate)}</div>
                            <div><strong>Trạng thái:</strong> <span class="status-badge status-${exportItem.status}">${exportItem.status}</span></div>
                            <div><strong>Người nhận:</strong> ${Utils.escapeHtml(exportItem.receiverName || "—")}</div>
                            <div><strong>Lý do xuất:</strong> ${Utils.escapeHtml(exportItem.exportReason || "—")}</div>
                            <div><strong>Người tạo:</strong> ${Utils.escapeHtml(exportItem.creatorName || "—")}</div>
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
      if (modal) modal.style.display = "block";
    } catch (error) {
      Utils.showToast("Lỗi khi tải chi tiết phiếu", "error");
    } finally {
      Utils.showLoading(false);
    }
  },
};

// Export
window.Components = Components;
