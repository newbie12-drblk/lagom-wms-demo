/**
 * ==================== INVENTORY MODULE ====================
 * Quản lý tồn kho (chế độ xem)
 * CHỈ MỞ 7 TRƯỜNG CHO ADMIN TẠO YÊU CẦU
 */

(function () {
  "use strict";

  let currentPage = 1;
  const rowsPerPage = 20;
  let filteredInventoryData = [];
  let inventoryData = [];
  let requestType = "add"; // 'add', 'receipt', 'export', 'edit', 'delete'

  // DOM Elements
  const tbody = document.getElementById("inv-tbody");
  const searchInput = document.getElementById("inv-search");
  const catFilter = document.getElementById("inv-cat-filter");
  const statusFilter = document.getElementById("inv-status-filter");
  const createRequestBtn = document.getElementById("btnCreateRequest");
  const exportBtn = document.getElementById("btnExport");
  const refreshBtn = document.getElementById("btnRefreshInventory");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");

  // ==================== KIỂM TRA ROLE ====================
  function isAdmin() {
    const user = Auth.getCurrentUser();
    return user && user.roleId === "admin";
  }

  function isQuanLy() {
    const user = Auth.getCurrentUser();
    return user && user.roleId === "quan_ly";
  }

  // Helper functions
  function formatCurrency(num) {
    return Utils.formatCurrency(num);
  }

  function formatNumber(num) {
    return Utils.formatNumber(num);
  }

  function formatDate(dateStr) {
    return Utils.formatDate(dateStr);
  }

  function escapeHtml(str) {
    return Utils.escapeHtml(str);
  }

  function getRemainingDays(item) {
    if (item.ngayXuatHD && item.ngayXuatHD !== "") {
      const dueDate = new Date(item.ngayXuatHD);
      if (isNaN(dueDate.getTime())) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      return Math.ceil((dueDate - today) / 86400000);
    }
    if (item.ngayNhapHD && item.ngayNhapHD !== "") {
      const importDate = new Date(item.ngayNhapHD);
      if (!isNaN(importDate.getTime())) {
        const dueDate = new Date(importDate);
        dueDate.setDate(dueDate.getDate() + 90);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return Math.ceil((dueDate - today) / 86400000);
      }
    }
    return null;
  }

  function getDebtBadge(remainingDays) {
    if (remainingDays === null)
      return '<span class="debt-badge no-debt">—</span>';
    if (remainingDays < 0)
      return `<span class="debt-badge expired">Quá hạn ${Math.abs(remainingDays)} ngày</span>`;
    if (remainingDays <= 7)
      return `<span class="debt-badge critical">Còn ${remainingDays} ngày (KHẨN CẤP)</span>`;
    if (remainingDays <= 30)
      return `<span class="debt-badge warning">Còn ${remainingDays} ngày</span>`;
    if (remainingDays <= 90)
      return `<span class="debt-badge normal">Còn ${remainingDays} ngày</span>`;
    return `<span class="debt-badge safe">Còn ${remainingDays} ngày</span>`;
  }

  function renderEditableField(value, isNumber = false) {
    if (isNumber) {
      return `<span class="readonly-field" style="color:#ffffff;">${formatNumber(value)}</span>`;
    }
    return `<span class="readonly-field" style="color:#ffffff;">${escapeHtml(String(value || "—"))}</span>`;
  }

  // Render table
  function renderInventoryTable(data) {
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="21" style="text-align:center;padding:60px;">Không có dữ liệu tồn kho</td></tr>`;
      updatePaginationControls(0);
      return;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = data.slice(start, end);

    tbody.innerHTML = pageData
      .map((item, idx) => {
        const remainingDays = getRemainingDays(item);
        const globalIdx = start + idx + 1;
        const isOutOfStock = (item.tonKho || 0) === 0;

        return `
                <tr class="${isOutOfStock ? "out-of-stock" : ""}">
                    <td class="sticky-col" style="position: sticky; left: 0; z-index: 100; background: #0f172a; color: #ffffff;">${globalIdx}</td>
                    <td class="sticky-col-2" style="position: sticky; left: 50px; z-index: 100; background: #0f172a;"><strong style="color: #60a5fa;">${renderEditableField(item.tenThuongMai)}</strong></td>
                    <td>${renderEditableField(item.maHang)}</td>
                    <td>${renderEditableField(item.quyCach)}</td>
                    <td>${renderEditableField(item.hangSX)}</td>
                    <td>${renderEditableField(item.dvt)}</td>
                    <td>${renderEditableField(item.phanLoai)}</td>
                    <td class="text-right">${renderEditableField(item.giaNhap, true)}</td>
                    <td class="text-right">${renderEditableField(item.soLuongNhap, true)}</td>
                    <td>${renderEditableField(item.soHopDongNhap)}</td>
                    <td>${renderEditableField(item.soHoaDonNhap)}</td>
                    <td>${renderEditableField(formatDate(item.ngayNhapHD))}</td>
                    <td>${renderEditableField(item.soLot)}</td>
                    <td>${renderEditableField(formatDate(item.ngayHetHan))}</td>
                    <td class="text-right">${renderEditableField(item.soLuongXuat, true)}</td>
                    <td class="text-right">${renderEditableField(item.giaXuat, true)}</td>
                    <td>${renderEditableField(item.soHopDongXuat)}</td>
                    <td>${renderEditableField(item.soHoaDonXuat)}</td>
                    <td>${renderEditableField(formatDate(item.ngayXuatHD))}</td>
                    <td class="text-right"><strong style="${isOutOfStock ? "color: #f87171;" : "color: #4ade80;"}">${renderEditableField(item.tonKho, true)}</strong></td>
                    <td>${getDebtBadge(remainingDays)}</td>
                </tr>
            `;
      })
      .join("");

    updatePaginationControls(data.length);
  }

  function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (pageInfo)
      pageInfo.textContent = `Trang ${currentPage} / ${totalPages || 1}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn)
      nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
  }

  // Update stats
  async function updateInventoryStats(data) {
    try {
      const stats = await window.API.inventory.getStats();
      document.getElementById("statTotalItems").textContent =
        stats.totalItems || 0;
      document.getElementById("statTotalStock").textContent =
        stats.totalStock || 0;
      document.getElementById("statTotalValue").textContent =
        Utils.formatCurrency(stats.totalValue || 0);
      document.getElementById("statExpiringSoon").textContent =
        stats.expiringSoon || 0;
      document.getElementById("statExpired").textContent = stats.expired || 0;
    } catch (error) {
      console.error("Update stats error:", error);
    }
  }

  // ==================== REFRESH INVENTORY DATA ====================
  async function refreshInventoryData() {
    Utils.showLoading(true, "Đang làm mới dữ liệu tồn kho...");
    try {
      localStorage.removeItem("lagom_inventory");

      const freshData = await window.API.inventory.getAll();
      inventoryData = freshData;
      window.inventoryData = freshData;

      await populateCategoryFilter();
      applyInventoryFilters(freshData);
      await updateInventoryStats(freshData);

      Utils.showToast("✅ Đã làm mới dữ liệu tồn kho");
    } catch (error) {
      console.error("Refresh inventory error:", error);
      Utils.showToast("❌ Lỗi khi làm mới dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // Apply filters
  function applyInventoryFilters(data) {
    inventoryData = data;
    if (!data || data.length === 0) {
      filteredInventoryData = [];
      renderInventoryTable([]);
      updateInventoryStats([]);
      return;
    }

    const searchTerm = searchInput?.value.toLowerCase() || "";
    const category = catFilter?.value || "";
    const status = statusFilter?.value || "";

    let filtered = [...data];

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          (item.tenThuongMai &&
            item.tenThuongMai.toLowerCase().includes(searchTerm)) ||
          (item.maHang && item.maHang.toLowerCase().includes(searchTerm)) ||
          (item.soLot && item.soLot.toLowerCase().includes(searchTerm)),
      );
    }

    if (category) {
      filtered = filtered.filter((item) => item.phanLoai === category);
    }

    if (status === "con-hang") {
      filtered = filtered.filter((item) => (item.tonKho || 0) > 0);
    } else if (status === "het-hang") {
      filtered = filtered.filter((item) => (item.tonKho || 0) === 0);
    } else if (status === "sap-het-han") {
      filtered = filtered.filter((item) => {
        const remaining = getRemainingDays(item);
        return remaining !== null && remaining > 0 && remaining <= 30;
      });
    } else if (status === "het-han") {
      filtered = filtered.filter((item) => {
        const remaining = getRemainingDays(item);
        return remaining !== null && remaining < 0;
      });
    }

    filteredInventoryData = filtered;
    currentPage = 1;
    renderInventoryTable(filteredInventoryData);
    updateInventoryStats(filteredInventoryData);
  }

  // Populate category filter
  async function populateCategoryFilter() {
    try {
      const categories = await window.API.inventory.getCategories();
      if (catFilter) {
        catFilter.innerHTML =
          '<option value="">Tất cả phân loại</option>' +
          categories
            .map(
              (cat) =>
                `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`,
            )
            .join("");
      }
    } catch (error) {
      console.error("Load categories error:", error);
    }
  }

  function resetFilters() {
    if (searchInput) searchInput.value = "";
    if (catFilter) catFilter.value = "";
    if (statusFilter) statusFilter.value = "";
    applyInventoryFilters(inventoryData);
  }

  function exportInventoryToExcel() {
    if (!filteredInventoryData || filteredInventoryData.length === 0) {
      Utils.showToast("Không có dữ liệu để xuất!", "error");
      return;
    }

    const exportData = filteredInventoryData.map((item, idx) => ({
      STT: idx + 1,
      "Tên thương mại": item.tenThuongMai,
      "Mã hàng": item.maHang,
      "Quy cách": item.quyCach,
      "Hãng SX": item.hangSX,
      ĐVT: item.dvt,
      "Phân loại": item.phanLoai,
      "Giá nhập": item.giaNhap,
      "Số lượng nhập": item.soLuongNhap,
      "Số hợp đồng": item.soHopDongNhap,
      "Số hóa đơn nhập": item.soHoaDonNhap,
      "Ngày nhập HĐ": item.ngayNhapHD,
      "Số lot": item.soLot,
      "Ngày hết hạn": item.ngayHetHan,
      "Số lượng xuất": item.soLuongXuat,
      "Giá xuất": item.giaXuat,
      "Số hợp đồng xuất": item.soHopDongXuat,
      "Số hóa đơn xuất": item.soHoaDonXuat,
      "Ngày xuất": item.ngayXuatHD,
      "Tồn cuối": item.tonKho,
    }));

    const headers = Object.keys(exportData[0]);
    const csvRows = [headers.join(",")];

    for (const row of exportData) {
      const values = headers.map((header) => {
        let val = row[header];
        if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
        return val;
      });
      csvRows.push(values.join(","));
    }

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    Utils.downloadFile(
      blob,
      `ton_kho_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`,
    );
    Utils.showToast("Đã xuất file CSV thành công");
  }

  // ==================== TẠO MODAL YÊU CẦU ====================
  function showRequestModal() {
    const overlay = document.createElement("div");
    overlay.className = "request-modal-overlay";
    overlay.id = "requestModal";
    overlay.innerHTML = `
      <div class="request-modal">
        <div class="request-modal-header">
          <h3 id="requestModalTitle">📋 Tạo yêu cầu</h3>
          <button class="request-modal-close" onclick="window.closeRequestModal()">&times;</button>
        </div>
        
        <div class="request-options">
          <button class="btn btn-primary active" data-type="add" onclick="window.setRequestType('add')">
            <i class="fas fa-plus"></i> Thêm sản phẩm
          </button>
          <button class="btn btn-outline" data-type="receipt" onclick="window.setRequestType('receipt')">
            <i class="fas fa-arrow-down"></i> Đề nghị nhập
          </button>
          <button class="btn btn-outline" data-type="export" onclick="window.setRequestType('export')">
            <i class="fas fa-arrow-up"></i> Đề nghị xuất
          </button>
          <button class="btn btn-outline" data-type="edit" onclick="window.setRequestType('edit')">
            <i class="fas fa-edit"></i> Sửa sản phẩm
          </button>
          <button class="btn btn-outline" data-type="delete" onclick="window.setRequestType('delete')">
            <i class="fas fa-trash"></i> Xóa sản phẩm
          </button>
        </div>

        <div id="requestContent">
          <!-- Nội dung sẽ được render theo loại -->
        </div>

        <div class="request-actions">
          <button class="btn btn-outline" onclick="window.closeRequestModal()">Hủy</button>
          <button class="btn btn-success" id="btnSubmitRequest" onclick="window.submitRequest()">
            <i class="fas fa-paper-plane"></i> Gửi yêu cầu
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    setRequestType("add");
  }

  window.closeRequestModal = function () {
    const modal = document.getElementById("requestModal");
    if (modal) {
      modal.remove();
      document.body.style.overflow = "";
    }
  };

  window.setRequestType = function (type) {
    requestType = type;

    document.querySelectorAll(".request-options .btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.type === type) {
        btn.classList.add("active");
      }
    });

    const titles = {
      add: "📝 Thêm sản phẩm mới",
      receipt: "📥 Đề nghị nhập hàng",
      export: "📤 Đề nghị xuất kho",
      edit: "✏️ Sửa sản phẩm",
      delete: "🗑️ Xóa sản phẩm",
    };
    const titleEl = document.getElementById("requestModalTitle");
    if (titleEl) titleEl.textContent = titles[type];

    renderRequestContent(type);
  };

  // ==================== RENDER NỘI DUNG THEO LOẠI ====================
  function renderRequestContent(type) {
    const container = document.getElementById("requestContent");
    if (!container) return;

    if (type === "add") {
      // ========== THÊM SẢN PHẨM - 7 TRƯỜNG ==========
      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">
          <i class="fas fa-info-circle"></i> Điền thông tin sản phẩm mới (các trường có <span style="color: #ef4444;">*</span> là bắt buộc):
        </p>
        <div class="request-table-wrap">
          <table class="request-table">
            <thead>
              <tr>
                <th style="width:30px;">STT</th>
                <th>TÊN THƯƠNG MẠI <span style="color:#ef4444;">*</span></th>
                <th>MÃ HÀNG <span style="color:#ef4444;">*</span></th>
                <th>ĐVT</th>
                <th>HÃNG/NƯỚC SX</th>
                <th>PHÂN LOẠI MÁY</th>
                <th>GIÁ NHẬP</th>
                <th>SỐ HĐ</th>
                <th style="width:35px;">XÓA</th>
              </tr>
            </thead>
            <tbody id="addProductBody">
              <tr>
                <td>1</td>
                <td><input type="text" class="add-tenThuongMai" placeholder="Tên thương mại *" style="border-color: #3b82f6;"></td>
                <td><input type="text" class="add-maHang" placeholder="Mã hàng *" style="border-color: #3b82f6;"></td>
                <td><input type="text" class="add-dvt" placeholder="ĐVT"></td>
                <td><input type="text" class="add-hangSX" placeholder="Hãng/Nước SX"></td>
                <td><input type="text" class="add-phanLoai" placeholder="Phân loại máy"></td>
                <td><input type="text" class="add-giaNhap" placeholder="Giá nhập"></td>
                <td><input type="text" class="add-soHopDongNhap" placeholder="Số HĐ"></td>
                <td><button class="btn-remove" onclick="window.removeAddRow(this)"><i class="fas fa-trash"></i></button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="btn-add-sm" style="margin-top:10px;" onclick="window.addNewAddRow()">
          <i class="fas fa-plus"></i> Thêm dòng
        </button>
        <div style="margin-top: 12px; padding: 10px; background: #0f172a; border-radius: 8px; border: 1px solid #1e2d45;">
          <p style="font-size: 12px; color: #6b82a0;">
            <i class="fas fa-info-circle" style="color: #60a5fa;"></i>
            <strong>Lưu ý:</strong> Chỉ cần nhập 7 trường cơ bản. Các trường khác sẽ được tự động điền khi tạo đề nghị nhập hàng.
          </p>
        </div>
      `;
    } else if (type === "receipt") {
      // ========== ĐỀ NGHỊ NHẬP HÀNG ==========
      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">
          <i class="fas fa-info-circle"></i> 
          <strong>Đề nghị nhập hàng:</strong> Nhập mã hàng để tự động lấy thông tin sản phẩm, sau đó nhập số lượng.
        </p>
        <div class="request-table-wrap">
          <table class="request-table">
            <thead>
              <tr>
                <th style="width:30px;">STT</th>
                <th>MÃ HÀNG <span style="color:#ef4444;">*</span></th>
                <th>TÊN THƯƠNG MẠI</th>
                <th>ĐVT</th>
                <th>HÃNG/NƯỚC SX</th>
                <th>PHÂN LOẠI MÁY</th>
                <th>GIÁ NHẬP</th>
                <th>SỐ HĐ</th>
                <th>SỐ LƯỢNG NHẬP <span style="color:#ef4444;">*</span></th>
                <th style="width:35px;">XÓA</th>
              </tr>
            </thead>
            <tbody id="receiptRequestBody">
              <tr>
                <td>1</td>
                <td><input type="text" class="receipt-maHang" placeholder="Mã hàng *" style="border-color: #3b82f6;"></td>
                <td><input type="text" class="receipt-tenThuongMai" placeholder="Tên thương mại" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="receipt-dvt" placeholder="ĐVT" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="receipt-hangSX" placeholder="Hãng/Nước SX" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="receipt-phanLoai" placeholder="Phân loại máy" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="receipt-giaNhap" placeholder="Giá nhập" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="receipt-soHopDongNhap" placeholder="Số HĐ" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="receipt-soLuongNhap" placeholder="Số lượng nhập *" style="border-color: #3b82f6;"></td>
                <td><button class="btn-remove" onclick="window.removeReceiptRequestRow(this)"><i class="fas fa-trash"></i></button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="btn-add-sm" style="margin-top:10px;" onclick="window.addReceiptRequestRow()">
          <i class="fas fa-plus"></i> Thêm dòng
        </button>
        <div style="margin-top: 12px; padding: 10px; background: #0f172a; border-radius: 8px; border: 1px solid #1e2d45;">
          <p style="font-size: 12px; color: #6b82a0;">
            <i class="fas fa-info-circle" style="color: #60a5fa;"></i>
            <strong>Lưu ý:</strong> Nhập mã hàng, hệ thống sẽ tự động điền thông tin sản phẩm từ kho. Sau khi Quản lý duyệt, số lượng tồn kho sẽ được cập nhật.
          </p>
        </div>
      `;

      // Bind sự kiện auto-fill cho mã hàng
      document.querySelectorAll(".receipt-maHang").forEach((input) => {
        input.addEventListener("blur", function () {
          autoFillReceiptProduct(this);
        });
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            autoFillReceiptProduct(this);
          }
        });
      });
    } else if (type === "export") {
      // ========== ĐỀ NGHỊ XUẤT KHO ==========
      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">
          <i class="fas fa-info-circle"></i> 
          <strong>Đề nghị xuất kho:</strong> Nhập mã hàng để tự động lấy thông tin sản phẩm và tồn kho, sau đó nhập thêm 5 trường.
        </p>
        <div class="request-table-wrap">
          <table class="request-table">
            <thead>
              <tr>
                <th style="width:30px;">STT</th>
                <th>MÃ HÀNG <span style="color:#ef4444;">*</span></th>
                <th>TÊN THƯƠNG MẠI</th>
                <th>ĐVT</th>
                <th>HÃNG/NƯỚC SX</th>
                <th>PHÂN LOẠI MÁY</th>
                <th>GIÁ NHẬP</th>
                <th>SỐ HĐ</th>
                <th>TỒN KHO</th>
                <th>ĐƠN GIÁ XUẤT <span style="color:#ef4444;">*</span></th>
                <th>SỐ LƯỢNG <span style="color:#ef4444;">*</span></th>
                <th>SỐ LOT <span style="color:#ef4444;">*</span></th>
                <th>HSD <span style="color:#ef4444;">*</span></th>
                <th>SỐ HĐ XUẤT <span style="color:#ef4444;">*</span></th>
                <th style="width:35px;">XÓA</th>
              </tr>
            </thead>
            <tbody id="exportRequestBody">
              <tr>
                <td>1</td>
                <td><input type="text" class="export-maHang" placeholder="Mã hàng *" style="border-color: #3b82f6;"></td>
                <td><input type="text" class="export-tenThuongMai" placeholder="Tên thương mại" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="export-dvt" placeholder="ĐVT" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="export-hangSX" placeholder="Hãng/Nước SX" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="export-phanLoai" placeholder="Phân loại máy" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="export-giaNhap" placeholder="Giá nhập" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="export-soHopDongNhap" placeholder="Số HĐ" readonly style="background:#1a2235;color:#6b82a0;"></td>
                <td><input type="text" class="export-tonKho" placeholder="Tồn kho" readonly style="background:#1a2235;color:#86efac;font-weight:600;"></td>
                <td><input type="text" class="export-donGiaXuat" placeholder="Đơn giá xuất *" style="border-color: #3b82f6;"></td>
                <td><input type="text" class="export-soLuong" placeholder="Số lượng *" style="border-color: #3b82f6;"></td>
                <td><input type="text" class="export-soLot" placeholder="Số lot *" style="border-color: #3b82f6;"></td>
                <td><input type="date" class="export-ngayHetHan" style="border-color: #3b82f6;"></td>
                <td><input type="text" class="export-soHopDongXuat" placeholder="Số HĐ xuất *" style="border-color: #3b82f6;"></td>
                <td><button class="btn-remove" onclick="window.removeExportRequestRow(this)"><i class="fas fa-trash"></i></button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="btn-add-sm" style="margin-top:10px;" onclick="window.addExportRequestRow()">
          <i class="fas fa-plus"></i> Thêm dòng
        </button>
        <div style="margin-top: 12px; padding: 10px; background: #0f172a; border-radius: 8px; border: 1px solid #1e2d45;">
          <p style="font-size: 12px; color: #6b82a0;">
            <i class="fas fa-info-circle" style="color: #60a5fa;"></i>
            <strong>Lưu ý:</strong> Nhập mã hàng, hệ thống sẽ tự động điền thông tin sản phẩm và tồn kho hiện tại. Sau khi Quản lý duyệt, số lượng tồn kho sẽ được trừ đi.
          </p>
        </div>
      `;

      // Bind sự kiện auto-fill cho mã hàng
      document.querySelectorAll(".export-maHang").forEach((input) => {
        input.addEventListener("blur", function () {
          autoFillExportProduct(this);
        });
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            autoFillExportProduct(this);
          }
        });
      });
    } else if (type === "edit") {
      // ========== SỬA SẢN PHẨM - 7 TRƯỜNG ==========
      const data =
        filteredInventoryData.length > 0
          ? filteredInventoryData
          : inventoryData || [];

      if (data.length === 0) {
        container.innerHTML = `<p style="color: #6b82a0; text-align:center; padding:40px;">Không có sản phẩm để sửa</p>`;
        return;
      }

      let tableRows = data
        .map(
          (item, idx) => `
        <tr>
          <td class="checkbox-cell"><input type="checkbox" class="edit-checkbox" data-id="${item.id}" onchange="window.onEditSelect(this)"></td>
          <td>${idx + 1}</td>
          <td>${escapeHtml(item.tenThuongMai || "")}</td>
          <td>${escapeHtml(item.maHang || "")}</td>
          <td>${escapeHtml(item.dvt || "")}</td>
          <td>${escapeHtml(item.hangSX || "")}</td>
          <td>${escapeHtml(item.phanLoai || "")}</td>
          <td>${formatCurrency(item.giaNhap || 0)}</td>
          <td>${escapeHtml(item.soHopDongNhap || "")}</td>
        </tr>
      `,
        )
        .join("");

      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">
          <i class="fas fa-info-circle"></i> 
          <strong>Chọn sản phẩm cần sửa</strong> (chỉ sửa được 7 trường cơ bản):
        </p>
        <div class="request-table-wrap">
          <table class="request-table">
            <thead>
              <tr>
                <th style="width:40px;">Chọn</th>
                <th style="width:30px;">STT</th>
                <th>TÊN THƯƠNG MẠI</th>
                <th>MÃ HÀNG</th>
                <th>ĐVT</th>
                <th>HÃNG/NƯỚC SX</th>
                <th>PHÂN LOẠI MÁY</th>
                <th>GIÁ NHẬP</th>
                <th>SỐ HĐ</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        <div id="editFormContainer" style="margin-top:16px; display:none;">
          <p style="color: #fbbf24; margin-bottom: 8px;">✏️ Nhập thông tin mới cho sản phẩm đã chọn (7 trường):</p>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; background: #0f172a; padding: 16px; border-radius: 8px;">
            <div><label style="color:#6b82a0;font-size:11px;">Tên thương mại</label><input type="text" id="edit-tenThuongMai" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Mã hàng</label><input type="text" id="edit-maHang" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">ĐVT</label><input type="text" id="edit-dvt" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Hãng/Nước SX</label><input type="text" id="edit-hangSX" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Phân loại máy</label><input type="text" id="edit-phanLoai" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Giá nhập</label><input type="text" id="edit-giaNhap" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Số HĐ</label><input type="text" id="edit-soHopDongNhap" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
          </div>
        </div>
        <div style="margin-top: 12px; padding: 10px; background: #0f172a; border-radius: 8px; border: 1px solid #1e2d45;">
          <p style="font-size: 12px; color: #6b82a0;">
            <i class="fas fa-info-circle" style="color: #60a5fa;"></i>
            <strong>Lưu ý:</strong> Chỉ sửa được 7 trường cơ bản. Các trường khác sẽ được cập nhật qua đề nghị nhập/xuất.
          </p>
        </div>
      `;
    } else if (type === "delete") {
      // ========== XÓA SẢN PHẨM ==========
      const data =
        filteredInventoryData.length > 0
          ? filteredInventoryData
          : inventoryData || [];

      if (data.length === 0) {
        container.innerHTML = `<p style="color: #6b82a0; text-align:center; padding:40px;">Không có sản phẩm để xóa</p>`;
        return;
      }

      let tableRows = data
        .map(
          (item, idx) => `
        <tr>
          <td class="checkbox-cell"><input type="checkbox" class="delete-checkbox" data-id="${item.id}" data-maHang="${escapeHtml(item.maHang || "")}"></td>
          <td>${idx + 1}</td>
          <td>${escapeHtml(item.tenThuongMai || "")}</td>
          <td>${escapeHtml(item.maHang || "")}</td>
          <td>${escapeHtml(item.quyCach || "")}</td>
          <td>${escapeHtml(item.hangSX || "")}</td>
          <td>${escapeHtml(item.dvt || "")}</td>
          <td>${escapeHtml(item.phanLoai || "")}</td>
          <td>${formatCurrency(item.giaNhap || 0)}</td>
          <td>${item.soLuongNhap || 0}</td>
          <td>${escapeHtml(item.soLot || "")}</td>
          <td>${formatDate(item.ngayHetHan)}</td>
          <td>${item.tonKho || 0}</td>
        </tr>
      `,
        )
        .join("");

      container.innerHTML = `
        <p style="color: #f87171; margin-bottom: 12px;">
          <i class="fas fa-exclamation-triangle"></i> 
          <strong>Chọn sản phẩm cần xóa:</strong> Hành động này KHÔNG thể hoàn tác!
        </p>
        <div class="request-table-wrap">
          <table class="request-table">
            <thead>
              <tr>
                <th style="width:40px;"><input type="checkbox" id="selectAllDelete" onchange="window.toggleAllDelete(this)"></th>
                <th style="width:30px;">STT</th>
                <th>TÊN THƯƠNG MẠI</th>
                <th>MÃ HÀNG</th>
                <th>QUY CÁCH</th>
                <th>HÃNG/NƯỚC SX</th>
                <th>ĐVT</th>
                <th>PHÂN LOẠI MÁY</th>
                <th>GIÁ NHẬP</th>
                <th>SL NHẬP</th>
                <th>SỐ LOT</th>
                <th>NGÀY HẾT HẠN</th>
                <th>TỒN KHO</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        <div style="margin-top: 12px; padding: 10px; background: #0f172a; border-radius: 8px; border: 1px solid #1e2d45;">
          <p style="font-size: 12px; color: #6b82a0;">
            <i class="fas fa-info-circle" style="color: #60a5fa;"></i>
            <strong>Lưu ý:</strong> Yêu cầu xóa sẽ được gửi đến Quản lý để duyệt.
          </p>
        </div>
      `;
    }
  }

  // ==================== AUTO-FILL CHO ĐỀ NGHỊ NHẬP ====================
  async function autoFillReceiptProduct(input) {
    const row = input.closest("tr");
    const maHang = input.value.trim();
    if (!maHang) return;

    try {
      const product = await window.API.inventory.getByMaHang(maHang);
      if (product) {
        row.querySelector(".receipt-tenThuongMai").value =
          product.tenThuongMai || "";
        row.querySelector(".receipt-dvt").value = product.dvt || "";
        row.querySelector(".receipt-hangSX").value = product.hangSX || "";
        row.querySelector(".receipt-phanLoai").value = product.phanLoai || "";
        row.querySelector(".receipt-giaNhap").value = formatCurrency(
          product.giaNhap || 0,
        );
        row.querySelector(".receipt-soHopDongNhap").value =
          product.soHopDongNhap || "";
        input.style.borderColor = "#4ade80";
        Utils.showToast("✅ Đã tìm thấy sản phẩm!");
      } else {
        input.style.borderColor = "#ef4444";
        Utils.showToast(
          "❌ Không tìm thấy sản phẩm với mã: " + maHang,
          "error",
        );
      }
    } catch (error) {
      input.style.borderColor = "#ef4444";
    }
    setTimeout(() => {
      input.style.borderColor = "";
    }, 3000);
  }

  // ==================== AUTO-FILL CHO ĐỀ NGHỊ XUẤT ====================
  async function autoFillExportProduct(input) {
    const row = input.closest("tr");
    const maHang = input.value.trim();
    if (!maHang) return;

    try {
      const product = await window.API.inventory.getByMaHang(maHang);
      if (product) {
        row.querySelector(".export-tenThuongMai").value =
          product.tenThuongMai || "";
        row.querySelector(".export-dvt").value = product.dvt || "";
        row.querySelector(".export-hangSX").value = product.hangSX || "";
        row.querySelector(".export-phanLoai").value = product.phanLoai || "";
        row.querySelector(".export-giaNhap").value = formatCurrency(
          product.giaNhap || 0,
        );
        row.querySelector(".export-soHopDongNhap").value =
          product.soHopDongNhap || "";
        row.querySelector(".export-tonKho").value = product.tonKho || 0;
        input.style.borderColor = "#4ade80";
        Utils.showToast(
          "✅ Đã tìm thấy sản phẩm! Tồn kho: " + (product.tonKho || 0),
        );
      } else {
        input.style.borderColor = "#ef4444";
        Utils.showToast(
          "❌ Không tìm thấy sản phẩm với mã: " + maHang,
          "error",
        );
      }
    } catch (error) {
      input.style.borderColor = "#ef4444";
    }
    setTimeout(() => {
      input.style.borderColor = "";
    }, 3000);
  }

  // ==================== HÀM THÊM/XÓA DÒNG ====================
  window.removeAddRow = function (btn) {
    const row = btn.closest("tr");
    if (document.querySelectorAll("#addProductBody tr").length <= 1) {
      alert("⚠️ Phải có ít nhất một dòng sản phẩm!");
      return;
    }
    row.remove();
    renumberRows("#addProductBody");
  };

  window.addNewAddRow = function () {
    const tbody = document.getElementById("addProductBody");
    if (!tbody) return;
    const rowCount = tbody.querySelectorAll("tr").length + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rowCount}</td>
      <td><input type="text" class="add-tenThuongMai" placeholder="Tên thương mại *" style="border-color: #3b82f6;"></td>
      <td><input type="text" class="add-maHang" placeholder="Mã hàng *" style="border-color: #3b82f6;"></td>
      <td><input type="text" class="add-dvt" placeholder="ĐVT"></td>
      <td><input type="text" class="add-hangSX" placeholder="Hãng/Nước SX"></td>
      <td><input type="text" class="add-phanLoai" placeholder="Phân loại máy"></td>
      <td><input type="text" class="add-giaNhap" placeholder="Giá nhập"></td>
      <td><input type="text" class="add-soHopDongNhap" placeholder="Số HĐ"></td>
      <td><button class="btn-remove" onclick="window.removeAddRow(this)"><i class="fas fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
  };

  window.removeReceiptRequestRow = function (btn) {
    const row = btn.closest("tr");
    if (document.querySelectorAll("#receiptRequestBody tr").length <= 1) {
      alert("⚠️ Phải có ít nhất một dòng!");
      return;
    }
    row.remove();
    renumberRows("#receiptRequestBody");
  };

  window.addReceiptRequestRow = function () {
    const tbody = document.getElementById("receiptRequestBody");
    if (!tbody) return;
    const rowCount = tbody.querySelectorAll("tr").length + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rowCount}</td>
      <td><input type="text" class="receipt-maHang" placeholder="Mã hàng *" style="border-color: #3b82f6;"></td>
      <td><input type="text" class="receipt-tenThuongMai" placeholder="Tên thương mại" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="receipt-dvt" placeholder="ĐVT" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="receipt-hangSX" placeholder="Hãng/Nước SX" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="receipt-phanLoai" placeholder="Phân loại máy" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="receipt-giaNhap" placeholder="Giá nhập" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="receipt-soHopDongNhap" placeholder="Số HĐ" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="receipt-soLuongNhap" placeholder="Số lượng nhập *" style="border-color: #3b82f6;"></td>
      <td><button class="btn-remove" onclick="window.removeReceiptRequestRow(this)"><i class="fas fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);

    // Bind auto-fill cho dòng mới
    const maHangInput = tr.querySelector(".receipt-maHang");
    maHangInput.addEventListener("blur", function () {
      autoFillReceiptProduct(this);
    });
    maHangInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        autoFillReceiptProduct(this);
      }
    });
  };

  window.removeExportRequestRow = function (btn) {
    const row = btn.closest("tr");
    if (document.querySelectorAll("#exportRequestBody tr").length <= 1) {
      alert("⚠️ Phải có ít nhất một dòng!");
      return;
    }
    row.remove();
    renumberRows("#exportRequestBody");
  };

  window.addExportRequestRow = function () {
    const tbody = document.getElementById("exportRequestBody");
    if (!tbody) return;
    const rowCount = tbody.querySelectorAll("tr").length + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rowCount}</td>
      <td><input type="text" class="export-maHang" placeholder="Mã hàng *" style="border-color: #3b82f6;"></td>
      <td><input type="text" class="export-tenThuongMai" placeholder="Tên thương mại" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="export-dvt" placeholder="ĐVT" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="export-hangSX" placeholder="Hãng/Nước SX" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="export-phanLoai" placeholder="Phân loại máy" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="export-giaNhap" placeholder="Giá nhập" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="export-soHopDongNhap" placeholder="Số HĐ" readonly style="background:#1a2235;color:#6b82a0;"></td>
      <td><input type="text" class="export-tonKho" placeholder="Tồn kho" readonly style="background:#1a2235;color:#86efac;font-weight:600;"></td>
      <td><input type="text" class="export-donGiaXuat" placeholder="Đơn giá xuất *" style="border-color: #3b82f6;"></td>
      <td><input type="text" class="export-soLuong" placeholder="Số lượng *" style="border-color: #3b82f6;"></td>
      <td><input type="text" class="export-soLot" placeholder="Số lot *" style="border-color: #3b82f6;"></td>
      <td><input type="date" class="export-ngayHetHan" style="border-color: #3b82f6;"></td>
      <td><input type="text" class="export-soHopDongXuat" placeholder="Số HĐ xuất *" style="border-color: #3b82f6;"></td>
      <td><button class="btn-remove" onclick="window.removeExportRequestRow(this)"><i class="fas fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);

    // Bind auto-fill cho dòng mới
    const maHangInput = tr.querySelector(".export-maHang");
    maHangInput.addEventListener("blur", function () {
      autoFillExportProduct(this);
    });
    maHangInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        autoFillExportProduct(this);
      }
    });
  };

  function renumberRows(tbodyId) {
    const rows = document.querySelectorAll(`${tbodyId} tr`);
    rows.forEach((row, idx) => {
      const firstTd = row.querySelector("td:first-child");
      if (firstTd) firstTd.textContent = idx + 1;
    });
  }

  // ==================== LẤY DỮ LIỆU THÊM SẢN PHẨM (7 TRƯỜNG) ====================
  function getAddProductsData() {
    const rows = document.querySelectorAll("#addProductBody tr");
    const products = [];
    let hasError = false;

    rows.forEach((row) => {
      const tenThuongMai = row.querySelector(".add-tenThuongMai")?.value.trim();
      const maHang = row.querySelector(".add-maHang")?.value.trim();

      if (!tenThuongMai || !maHang) {
        hasError = true;
        return;
      }

      products.push({
        tenThuongMai: tenThuongMai,
        maHang: maHang,
        dvt: row.querySelector(".add-dvt")?.value || "",
        hangSX: row.querySelector(".add-hangSX")?.value || "",
        phanLoai: row.querySelector(".add-phanLoai")?.value || "",
        giaNhap: parseFloat(
          row.querySelector(".add-giaNhap")?.value?.replace(/[^0-9]/g, "") || 0,
        ),
        soHopDongNhap: row.querySelector(".add-soHopDongNhap")?.value || "",
      });
    });

    return { products, hasError };
  }

  // ==================== LẤY DỮ LIỆU ĐỀ NGHỊ NHẬP ====================
  function getReceiptRequestData() {
    const rows = document.querySelectorAll("#receiptRequestBody tr");
    const items = [];
    let hasError = false;

    for (const row of rows) {
      const maHang = row.querySelector(".receipt-maHang")?.value.trim();
      const soLuongNhap = parseInt(
        row.querySelector(".receipt-soLuongNhap")?.value || "0",
      );

      if (!maHang) {
        hasError = true;
        Utils.showToast("⚠️ Vui lòng nhập mã hàng!", "warning");
        return { items: [], hasError: true };
      }
      if (soLuongNhap <= 0) {
        hasError = true;
        Utils.showToast("⚠️ Vui lòng nhập số lượng nhập hợp lệ!", "warning");
        return { items: [], hasError: true };
      }

      items.push({
        maHang: maHang,
        tenThuongMai: row.querySelector(".receipt-tenThuongMai")?.value || "",
        dvt: row.querySelector(".receipt-dvt")?.value || "",
        hangSX: row.querySelector(".receipt-hangSX")?.value || "",
        phanLoai: row.querySelector(".receipt-phanLoai")?.value || "",
        giaNhap: parseFloat(
          row
            .querySelector(".receipt-giaNhap")
            ?.value?.replace(/[^0-9]/g, "") || 0,
        ),
        soHopDongNhap: row.querySelector(".receipt-soHopDongNhap")?.value || "",
        soLuongNhap: soLuongNhap,
      });
    }

    return { items, hasError };
  }

  // ==================== LẤY DỮ LIỆU ĐỀ NGHỊ XUẤT ====================
  function getExportRequestData() {
    const rows = document.querySelectorAll("#exportRequestBody tr");
    const items = [];
    let hasError = false;

    for (const row of rows) {
      const maHang = row.querySelector(".export-maHang")?.value.trim();
      const donGiaXuat = parseFloat(
        row
          .querySelector(".export-donGiaXuat")
          ?.value?.replace(/[^0-9]/g, "") || 0,
      );
      const soLuong = parseInt(
        row.querySelector(".export-soLuong")?.value || "0",
      );
      const soLot = row.querySelector(".export-soLot")?.value.trim();
      const ngayHetHan = row.querySelector(".export-ngayHetHan")?.value;
      const soHopDongXuat = row
        .querySelector(".export-soHopDongXuat")
        ?.value.trim();

      if (!maHang) {
        hasError = true;
        Utils.showToast("⚠️ Vui lòng nhập mã hàng!", "warning");
        return { items: [], hasError: true };
      }
      if (!donGiaXuat || donGiaXuat <= 0) {
        hasError = true;
        Utils.showToast("⚠️ Vui lòng nhập đơn giá xuất hợp lệ!", "warning");
        return { items: [], hasError: true };
      }
      if (!soLuong || soLuong <= 0) {
        hasError = true;
        Utils.showToast("⚠️ Vui lòng nhập số lượng hợp lệ!", "warning");
        return { items: [], hasError: true };
      }
      if (!soLot) {
        hasError = true;
        Utils.showToast("⚠️ Vui lòng nhập số lot!", "warning");
        return { items: [], hasError: true };
      }
      if (!ngayHetHan) {
        hasError = true;
        Utils.showToast("⚠️ Vui lòng chọn HSD!", "warning");
        return { items: [], hasError: true };
      }
      if (!soHopDongXuat) {
        hasError = true;
        Utils.showToast("⚠️ Vui lòng nhập số hợp đồng xuất!", "warning");
        return { items: [], hasError: true };
      }

      items.push({
        maHang: maHang,
        tenThuongMai: row.querySelector(".export-tenThuongMai")?.value || "",
        dvt: row.querySelector(".export-dvt")?.value || "",
        hangSX: row.querySelector(".export-hangSX")?.value || "",
        phanLoai: row.querySelector(".export-phanLoai")?.value || "",
        giaNhap: parseFloat(
          row.querySelector(".export-giaNhap")?.value?.replace(/[^0-9]/g, "") ||
            0,
        ),
        soHopDongNhap: row.querySelector(".export-soHopDongNhap")?.value || "",
        donGiaXuat: donGiaXuat,
        soLuong: soLuong,
        soLot: soLot,
        ngayHetHan: ngayHetHan,
        soHopDongXuat: soHopDongXuat,
      });
    }

    return { items, hasError };
  }

  // ==================== GỬI YÊU CẦU ====================
  window.submitRequest = async function () {
    if (requestType === "add") {
      // ========== THÊM SẢN PHẨM ==========
      const { products, hasError } = getAddProductsData();

      if (hasError || products.length === 0) {
        Utils.showToast(
          "⚠️ Vui lòng điền đầy đủ Tên thương mại và Mã hàng!",
          "warning",
        );
        return;
      }

      Utils.showLoading(true, "Đang gửi yêu cầu thêm sản phẩm...");
      try {
        const token = API.getToken();
        const response = await fetch(`${API_BASE_URL}/approvals`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ products: products }),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ " + result.message);
          closeRequestModal();
        } else {
          Utils.showToast("❌ " + result.message, "error");
        }
      } catch (error) {
        Utils.showToast("❌ " + error.message, "error");
      } finally {
        Utils.showLoading(false);
      }
    } else if (requestType === "receipt") {
      // ========== ĐỀ NGHỊ NHẬP HÀNG ==========
      const { items, hasError } = getReceiptRequestData();
      if (hasError || items.length === 0) return;

      Utils.showLoading(true, "Đang gửi đề nghị nhập hàng...");
      try {
        const token = API.getToken();
        const response = await fetch(`${API_BASE_URL}/receipt-requests`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(items.length === 1 ? items[0] : items),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ " + result.message);
          closeRequestModal();
        } else {
          Utils.showToast("❌ " + result.message, "error");
        }
      } catch (error) {
        Utils.showToast("❌ " + error.message, "error");
      } finally {
        Utils.showLoading(false);
      }
    } else if (requestType === "export") {
      // ========== ĐỀ NGHỊ XUẤT KHO ==========
      const { items, hasError } = getExportRequestData();
      if (hasError || items.length === 0) return;

      Utils.showLoading(true, "Đang gửi đề nghị xuất kho...");
      try {
        const token = API.getToken();
        const response = await fetch(`${API_BASE_URL}/export-requests`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(items.length === 1 ? items[0] : items),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ " + result.message);
          closeRequestModal();
        } else {
          Utils.showToast("❌ " + result.message, "error");
        }
      } catch (error) {
        Utils.showToast("❌ " + error.message, "error");
      } finally {
        Utils.showLoading(false);
      }
    } else if (requestType === "edit") {
      // ========== SỬA SẢN PHẨM ==========
      const checked = document.querySelectorAll(".edit-checkbox:checked");
      if (checked.length === 0) {
        Utils.showToast("⚠️ Vui lòng chọn một sản phẩm để sửa!", "warning");
        return;
      }

      const id = parseInt(checked[0].dataset.id);
      const oldProduct =
        filteredInventoryData.find((p) => p.id === id) ||
        inventoryData.find((p) => p.id === id);

      if (!oldProduct) {
        Utils.showToast("❌ Không tìm thấy sản phẩm!", "error");
        return;
      }

      const newData = {
        tenThuongMai:
          document.getElementById("edit-tenThuongMai")?.value ||
          oldProduct.tenThuongMai,
        maHang:
          document.getElementById("edit-maHang")?.value || oldProduct.maHang,
        dvt: document.getElementById("edit-dvt")?.value || oldProduct.dvt,
        hangSX:
          document.getElementById("edit-hangSX")?.value || oldProduct.hangSX,
        phanLoai:
          document.getElementById("edit-phanLoai")?.value ||
          oldProduct.phanLoai,
        giaNhap: parseFloat(
          document
            .getElementById("edit-giaNhap")
            ?.value?.replace(/[^0-9]/g, "") || oldProduct.giaNhap,
        ),
        soHopDongNhap:
          document.getElementById("edit-soHopDongNhap")?.value ||
          oldProduct.soHopDongNhap,
      };

      Utils.showLoading(true, "Đang gửi yêu cầu chỉnh sửa...");
      try {
        const token = API.getToken();
        const response = await fetch(`${API_BASE_URL}/edits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId: id, updatedData: newData }),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ " + result.message);
          closeRequestModal();
        } else {
          Utils.showToast("❌ " + result.message, "error");
        }
      } catch (error) {
        Utils.showToast("❌ " + error.message, "error");
      } finally {
        Utils.showLoading(false);
      }
    } else if (requestType === "delete") {
      // ========== XÓA SẢN PHẨM ==========
      const checked = document.querySelectorAll(".delete-checkbox:checked");

      if (checked.length === 0) {
        Utils.showToast(
          "⚠️ Vui lòng chọn ít nhất một sản phẩm để xóa!",
          "warning",
        );
        return;
      }

      const productIds = [];
      checked.forEach((cb) => {
        const id = parseInt(cb.dataset.id);
        if (!isNaN(id) && id > 0) productIds.push(id);
      });

      if (productIds.length === 0) {
        Utils.showToast("❌ Không tìm thấy ID sản phẩm hợp lệ!", "error");
        return;
      }

      Utils.showLoading(true, "Đang gửi yêu cầu xóa...");
      try {
        const token = API.getToken();
        const response = await fetch(`${API_BASE_URL}/deletions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productIds: productIds }),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ " + result.message);
          closeRequestModal();
          if (typeof refreshInventoryData === "function") {
            setTimeout(() => refreshInventoryData(), 1000);
          }
        } else {
          Utils.showToast("❌ " + result.message, "error");
        }
      } catch (error) {
        Utils.showToast("❌ " + error.message, "error");
      } finally {
        Utils.showLoading(false);
      }
    }
  };

  // ==================== HÀM HỖ TRỢ KHÁC ====================
  window.toggleAllDelete = function (checkbox) {
    document.querySelectorAll(".delete-checkbox").forEach((cb) => {
      cb.checked = checkbox.checked;
    });
  };

  window.onEditSelect = function (checkbox) {
    const container = document.getElementById("editFormContainer");
    if (container) {
      container.style.display = checkbox.checked ? "block" : "none";
    }
    document.querySelectorAll(".edit-checkbox").forEach((cb) => {
      if (cb !== checkbox) cb.checked = false;
    });
  };

  // ==================== INIT ====================
  async function initInventory(inventoryDataFromMain) {
    localStorage.removeItem("lagom_inventory");

    const data = inventoryDataFromMain || (await window.API.inventory.getAll());
    inventoryData = data;
    window.inventoryData = data;

    await populateCategoryFilter();
    applyInventoryFilters(data);

    const applyFilters = () => applyInventoryFilters(data);

    if (searchInput) {
      const newSearch = searchInput.cloneNode(true);
      searchInput.parentNode.replaceChild(newSearch, searchInput);
      document
        .getElementById("inv-search")
        ?.addEventListener("input", applyFilters);
    }

    if (catFilter) {
      const newCat = catFilter.cloneNode(true);
      catFilter.parentNode.replaceChild(newCat, catFilter);
      document
        .getElementById("inv-cat-filter")
        ?.addEventListener("change", applyFilters);
    }

    if (statusFilter) {
      const newStatus = statusFilter.cloneNode(true);
      statusFilter.parentNode.replaceChild(newStatus, statusFilter);
      document
        .getElementById("inv-status-filter")
        ?.addEventListener("change", applyFilters);
    }

    // CHỈ ADMIN MỚI THẤY NÚT "Tạo yêu cầu"
    const createRequestBtn = document.getElementById("btnCreateRequest");
    if (createRequestBtn) {
      if (isAdmin()) {
        createRequestBtn.style.display = "inline-flex";
        const newBtn = createRequestBtn.cloneNode(true);
        createRequestBtn.parentNode.replaceChild(newBtn, createRequestBtn);
        newBtn.addEventListener("click", showRequestModal);
      } else {
        createRequestBtn.style.display = "none";
      }
    }

    if (exportBtn) exportBtn.addEventListener("click", exportInventoryToExcel);
    if (refreshBtn) refreshBtn.addEventListener("click", refreshInventoryData);

    if (prevPageBtn)
      prevPageBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          renderInventoryTable(filteredInventoryData);
        }
      });
    if (nextPageBtn)
      nextPageBtn.addEventListener("click", () => {
        const total = Math.ceil(filteredInventoryData.length / rowsPerPage);
        if (currentPage < total) {
          currentPage++;
          renderInventoryTable(filteredInventoryData);
        }
      });
  }

  // Expose functions
  window.initInventory = initInventory;
  window.showRequestModal = showRequestModal;
  window.closeRequestModal = closeRequestModal;
  window.submitRequest = submitRequest;
  window.setRequestType = setRequestType;
  window.toggleAllDelete = toggleAllDelete;
  window.onEditSelect = onEditSelect;
  window.removeAddRow = removeAddRow;
  window.addNewAddRow = addNewAddRow;
  window.removeReceiptRequestRow = removeReceiptRequestRow;
  window.addReceiptRequestRow = addReceiptRequestRow;
  window.removeExportRequestRow = removeExportRequestRow;
  window.addExportRequestRow = addExportRequestRow;
  window.inventoryData = inventoryData;
  window.isAdmin = isAdmin;
  window.isQuanLy = isQuanLy;
  window.refreshInventoryData = refreshInventoryData;
})();
