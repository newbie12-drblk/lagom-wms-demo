/**
 * ==================== INVENTORY MODULE ====================
 * Quản lý tồn kho (chế độ xem)
 * ĐÃ THÊM: Tạo yêu cầu thêm/xóa/sửa sản phẩm
 * CHỈ ADMIN MỚI THẤY NÚT "Tạo yêu cầu"
 */

(function () {
  "use strict";

  let currentPage = 1;
  const rowsPerPage = 20;
  let filteredInventoryData = [];
  let inventoryData = [];
  let requestType = "add"; // 'add', 'delete', 'edit'

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

  // ==================== KIỂM TRA ROLE (CHỈ 2 ROLE) ====================
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
    Utils.showLoading(true, "Đang làm mới dữ liệu...");
    try {
      // Xóa cache
      localStorage.removeItem("lagom_inventory");

      const freshData = await window.API.inventory.getAll();
      inventoryData = freshData;
      window.inventoryData = freshData;
      applyInventoryFilters(freshData);
      Utils.showToast("✅ Đã làm mới dữ liệu tồn kho");
    } catch (error) {
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
    // Tạo modal overlay
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
          <button class="btn btn-outline" data-type="delete" onclick="window.setRequestType('delete')">
            <i class="fas fa-trash"></i> Xóa sản phẩm
          </button>
          <button class="btn btn-outline" data-type="edit" onclick="window.setRequestType('edit')">
            <i class="fas fa-edit"></i> Sửa sản phẩm
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

    // Mặc định hiển thị "Thêm sản phẩm"
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

    // Cập nhật active button
    document.querySelectorAll(".request-options .btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.type === type) {
        btn.classList.add("active");
      }
    });

    // Cập nhật title
    const titles = {
      add: "📝 Thêm sản phẩm mới",
      delete: "🗑️ Xóa sản phẩm",
      edit: "✏️ Sửa sản phẩm",
    };
    const titleEl = document.getElementById("requestModalTitle");
    if (titleEl) titleEl.textContent = titles[type];

    renderRequestContent(type);
  };

  function renderRequestContent(type) {
    const container = document.getElementById("requestContent");
    if (!container) return;

    if (type === "add") {
      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">Điền thông tin sản phẩm mới:</p>
        <div class="request-table-wrap">
          <table class="request-table">
            <thead>
              <tr>
                <th style="width:30px;">STT</th>
                <th>TÊN THƯƠNG MẠI</th>
                <th>MÃ HÀNG</th>
                <th>QUY CÁCH</th>
                <th>HÃNG/NƯỚC SX</th>
                <th>ĐVT</th>
                <th>PHÂN LOẠI MÁY</th>
                <th>GIÁ NHẬP</th>
                <th>SL NHẬP</th>
                <th>SỐ HĐ</th>
                <th>SỐ HĐƠN NHẬP</th>
                <th>NGÀY NHẬP HĐ</th>
                <th>SỐ LOT</th>
                <th>NGÀY HẾT HẠN</th>
              </tr>
            </thead>
            <tbody id="addProductBody">
              <tr>
                <td>1</td>
                <td><input type="text" class="add-tenThuongMai" placeholder="Tên thương mại"></td>
                <td><input type="text" class="add-maHang" placeholder="Mã hàng"></td>
                <td><input type="text" class="add-quyCach" placeholder="Quy cách"></td>
                <td><input type="text" class="add-hangSX" placeholder="Hãng SX"></td>
                <td><input type="text" class="add-dvt" placeholder="ĐVT"></td>
                <td><input type="text" class="add-phanLoai" placeholder="Phân loại"></td>
                <td><input type="text" class="add-giaNhap" placeholder="Giá nhập"></td>
                <td><input type="text" class="add-soLuongNhap" placeholder="SL"></td>
                <td><input type="text" class="add-soHopDongNhap" placeholder="Số HĐ"></td>
                <td><input type="text" class="add-soHoaDonNhap" placeholder="Số HĐơn"></td>
                <td><input type="date" class="add-ngayNhapHD"></td>
                <td><input type="text" class="add-soLot" placeholder="Số lot"></td>
                <td><input type="date" class="add-ngayHetHan"></td>
                <td><button class="btn-remove" onclick="window.removeAddRow(this)"><i class="fas fa-trash"></i></button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="btn-add-sm" style="margin-top:10px;" onclick="window.addNewAddRow()">
          <i class="fas fa-plus"></i> Thêm dòng
        </button>
      `;
    } else if (type === "delete") {
      // Hiển thị danh sách sản phẩm để chọn xóa
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
          <td class="checkbox-cell"><input type="checkbox" class="delete-checkbox" data-id="${item.id}"></td>
          <td>${idx + 1}</td>
          <td>${escapeHtml(item.tenThuongMai || "")}</td>
          <td>${escapeHtml(item.maHang || "")}</td>
          <td>${escapeHtml(item.quyCach || "")}</td>
          <td>${escapeHtml(item.hangSX || "")}</td>
          <td>${escapeHtml(item.dvt || "")}</td>
          <td>${escapeHtml(item.phanLoai || "")}</td>
          <td>${formatCurrency(item.giaNhap || 0)}</td>
          <td>${item.soLuongNhap || 0}</td>
          <td>${escapeHtml(item.soHopDongNhap || "")}</td>
          <td>${escapeHtml(item.soHoaDonNhap || "")}</td>
          <td>${formatDate(item.ngayNhapHD)}</td>
          <td>${escapeHtml(item.soLot || "")}</td>
          <td>${formatDate(item.ngayHetHan)}</td>
        </tr>
      `,
        )
        .join("");

      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">Chọn sản phẩm cần xóa:</p>
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
                <th>SỐ HĐ</th>
                <th>SỐ HĐƠN NHẬP</th>
                <th>NGÀY NHẬP HĐ</th>
                <th>SỐ LOT</th>
                <th>NGÀY HẾT HẠN</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;
    } else if (type === "edit") {
      // Hiển thị danh sách sản phẩm để chọn sửa
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
          <td>${escapeHtml(item.quyCach || "")}</td>
          <td>${escapeHtml(item.hangSX || "")}</td>
          <td>${escapeHtml(item.dvt || "")}</td>
          <td>${escapeHtml(item.phanLoai || "")}</td>
          <td>${formatCurrency(item.giaNhap || 0)}</td>
          <td>${item.soLuongNhap || 0}</td>
          <td>${escapeHtml(item.soHopDongNhap || "")}</td>
          <td>${escapeHtml(item.soHoaDonNhap || "")}</td>
          <td>${formatDate(item.ngayNhapHD)}</td>
          <td>${escapeHtml(item.soLot || "")}</td>
          <td>${formatDate(item.ngayHetHan)}</td>
        </tr>
      `,
        )
        .join("");

      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">Chọn sản phẩm cần sửa và điền thông tin mới:</p>
        <div class="request-table-wrap">
          <table class="request-table">
            <thead>
              <tr>
                <th style="width:40px;">Chọn</th>
                <th style="width:30px;">STT</th>
                <th>TÊN THƯƠNG MẠI</th>
                <th>MÃ HÀNG</th>
                <th>QUY CÁCH</th>
                <th>HÃNG/NƯỚC SX</th>
                <th>ĐVT</th>
                <th>PHÂN LOẠI MÁY</th>
                <th>GIÁ NHẬP</th>
                <th>SL NHẬP</th>
                <th>SỐ HĐ</th>
                <th>SỐ HĐƠN NHẬP</th>
                <th>NGÀY NHẬP HĐ</th>
                <th>SỐ LOT</th>
                <th>NGÀY HẾT HẠN</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        <div id="editFormContainer" style="margin-top:16px; display:none;">
          <p style="color: #fbbf24; margin-bottom: 8px;">✏️ Nhập thông tin mới cho sản phẩm đã chọn:</p>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; background: #0f172a; padding: 16px; border-radius: 8px;">
            <div><label style="color:#6b82a0;font-size:11px;">Tên thương mại</label><input type="text" id="edit-tenThuongMai" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Mã hàng</label><input type="text" id="edit-maHang" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Quy cách</label><input type="text" id="edit-quyCach" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Hãng SX</label><input type="text" id="edit-hangSX" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">ĐVT</label><input type="text" id="edit-dvt" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Phân loại</label><input type="text" id="edit-phanLoai" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Giá nhập</label><input type="text" id="edit-giaNhap" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">SL nhập</label><input type="text" id="edit-soLuongNhap" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Số HĐ</label><input type="text" id="edit-soHopDongNhap" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Số HĐơn nhập</label><input type="text" id="edit-soHoaDonNhap" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Ngày nhập HĐ</label><input type="date" id="edit-ngayNhapHD" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Số lot</label><input type="text" id="edit-soLot" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;">Ngày hết hạn</label><input type="date" id="edit-ngayHetHan" class="edit-field" style="width:100%;padding:6px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
          </div>
        </div>
      `;
    }
  }

  // ==================== HÀM HỖ TRỢ CHO MODAL ====================
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
    // Nếu có nhiều checkbox, chỉ cho phép chọn 1
    document.querySelectorAll(".edit-checkbox").forEach((cb) => {
      if (cb !== checkbox) cb.checked = false;
    });
  };

  window.removeAddRow = function (btn) {
    const row = btn.closest("tr");
    if (document.querySelectorAll("#addProductBody tr").length <= 1) {
      alert("⚠️ Phải có ít nhất một dòng sản phẩm!");
      return;
    }
    row.remove();
    renumberAddRows();
  };

  window.addNewAddRow = function () {
    const tbody = document.getElementById("addProductBody");
    if (!tbody) return;
    const rowCount = tbody.querySelectorAll("tr").length + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rowCount}</td>
      <td><input type="text" class="add-tenThuongMai" placeholder="Tên thương mại"></td>
      <td><input type="text" class="add-maHang" placeholder="Mã hàng"></td>
      <td><input type="text" class="add-quyCach" placeholder="Quy cách"></td>
      <td><input type="text" class="add-hangSX" placeholder="Hãng SX"></td>
      <td><input type="text" class="add-dvt" placeholder="ĐVT"></td>
      <td><input type="text" class="add-phanLoai" placeholder="Phân loại"></td>
      <td><input type="text" class="add-giaNhap" placeholder="Giá nhập"></td>
      <td><input type="text" class="add-soLuongNhap" placeholder="SL"></td>
      <td><input type="text" class="add-soHopDongNhap" placeholder="Số HĐ"></td>
      <td><input type="text" class="add-soHoaDonNhap" placeholder="Số HĐơn"></td>
      <td><input type="date" class="add-ngayNhapHD"></td>
      <td><input type="text" class="add-soLot" placeholder="Số lot"></td>
      <td><input type="date" class="add-ngayHetHan"></td>
    `;
    tbody.appendChild(tr);
  };

  function renumberAddRows() {
    const rows = document.querySelectorAll("#addProductBody tr");
    rows.forEach((row, idx) => {
      const firstTd = row.querySelector("td:first-child");
      if (firstTd) firstTd.textContent = idx + 1;
    });
  }

  // ==================== LẤY DỮ LIỆU TỪ FORM THÊM ====================
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
        quyCach: row.querySelector(".add-quyCach")?.value || "",
        hangSX: row.querySelector(".add-hangSX")?.value || "",
        dvt: row.querySelector(".add-dvt")?.value || "",
        phanLoai: row.querySelector(".add-phanLoai")?.value || "",
        giaNhap: parseFloat(
          row.querySelector(".add-giaNhap")?.value?.replace(/[^0-9]/g, "") || 0,
        ),
        soLuongNhap: parseInt(
          row.querySelector(".add-soLuongNhap")?.value || 0,
        ),
        soHopDongNhap: row.querySelector(".add-soHopDongNhap")?.value || "",
        soHoaDonNhap: row.querySelector(".add-soHoaDonNhap")?.value || "",
        ngayNhapHD: row.querySelector(".add-ngayNhapHD")?.value || null,
        soLot: row.querySelector(".add-soLot")?.value || "",
        ngayHetHan: row.querySelector(".add-ngayHetHan")?.value || null,
        tonKho: parseInt(row.querySelector(".add-soLuongNhap")?.value || 0),
      });
    });

    return { products, hasError };
  }

  // ==================== GỬI YÊU CẦU ====================
  window.submitRequest = async function () {
    Utils.showLoading(true, "Đang gửi yêu cầu...");

    try {
      const token = API.getToken();

      if (requestType === "add") {
        const { products, hasError } = getAddProductsData();

        if (hasError || products.length === 0) {
          Utils.showToast(
            "⚠️ Vui lòng điền đầy đủ Tên thương mại và Mã hàng!",
            "warning",
          );
          Utils.showLoading(false);
          return;
        }

        console.log("📦 Gửi yêu cầu thêm sản phẩm:", products);

        const response = await fetch(`${API_BASE_URL}/approvals`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ products: products }),
        });

        const result = await response.json();
        console.log("📥 Kết quả:", result);

        if (result.success) {
          Utils.showToast(
            "✅ Đã gửi yêu cầu thêm sản phẩm! Chờ Quản lý duyệt.",
          );
          closeRequestModal();
        } else {
          Utils.showToast(
            "❌ " + (result.message || "Lỗi gửi yêu cầu"),
            "error",
          );
        }
      } else if (requestType === "delete") {
        const checked = document.querySelectorAll(".delete-checkbox:checked");
        if (checked.length === 0) {
          Utils.showToast(
            "⚠️ Vui lòng chọn ít nhất một sản phẩm để xóa!",
            "warning",
          );
          Utils.showLoading(false);
          return;
        }

        const productIds = [];
        checked.forEach((cb) => {
          productIds.push(parseInt(cb.dataset.id));
        });

        const response = await fetch(`${API_BASE_URL}/deletions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productIds: productIds,
          }),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ Đã gửi yêu cầu xóa sản phẩm! Chờ Quản lý duyệt.");
          closeRequestModal();
        } else {
          Utils.showToast(
            "❌ " + (result.message || "Lỗi gửi yêu cầu"),
            "error",
          );
        }
      } else if (requestType === "edit") {
        const checked = document.querySelectorAll(".edit-checkbox:checked");
        if (checked.length === 0) {
          Utils.showToast("⚠️ Vui lòng chọn một sản phẩm để sửa!", "warning");
          Utils.showLoading(false);
          return;
        }

        const id = parseInt(checked[0].dataset.id);
        const oldProduct =
          filteredInventoryData.find((p) => p.id === id) ||
          inventoryData.find((p) => p.id === id);

        if (!oldProduct) {
          Utils.showToast("❌ Không tìm thấy sản phẩm!", "error");
          Utils.showLoading(false);
          return;
        }

        const newData = {
          tenThuongMai:
            document.getElementById("edit-tenThuongMai")?.value ||
            oldProduct.tenThuongMai,
          maHang:
            document.getElementById("edit-maHang")?.value || oldProduct.maHang,
          quyCach:
            document.getElementById("edit-quyCach")?.value ||
            oldProduct.quyCach,
          hangSX:
            document.getElementById("edit-hangSX")?.value || oldProduct.hangSX,
          dvt: document.getElementById("edit-dvt")?.value || oldProduct.dvt,
          phanLoai:
            document.getElementById("edit-phanLoai")?.value ||
            oldProduct.phanLoai,
          giaNhap: parseFloat(
            document
              .getElementById("edit-giaNhap")
              ?.value?.replace(/[^0-9]/g, "") || oldProduct.giaNhap,
          ),
          soLuongNhap: parseInt(
            document.getElementById("edit-soLuongNhap")?.value ||
              oldProduct.soLuongNhap,
          ),
          soHopDongNhap:
            document.getElementById("edit-soHopDongNhap")?.value ||
            oldProduct.soHopDongNhap,
          soHoaDonNhap:
            document.getElementById("edit-soHoaDonNhap")?.value ||
            oldProduct.soHoaDonNhap,
          ngayNhapHD:
            document.getElementById("edit-ngayNhapHD")?.value ||
            oldProduct.ngayNhapHD,
          soLot:
            document.getElementById("edit-soLot")?.value || oldProduct.soLot,
          ngayHetHan:
            document.getElementById("edit-ngayHetHan")?.value ||
            oldProduct.ngayHetHan,
        };

        const response = await fetch(`${API_BASE_URL}/edits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: id,
            updatedData: newData,
          }),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ Đã gửi yêu cầu chỉnh sửa! Chờ Quản lý duyệt.");
          closeRequestModal();
        } else {
          Utils.showToast(
            "❌ " + (result.message || "Lỗi gửi yêu cầu"),
            "error",
          );
        }
      }
    } catch (error) {
      console.error("❌ Submit request error:", error);
      Utils.showToast("❌ " + (error.message || "Có lỗi xảy ra"), "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ==================== INIT ====================
  async function initInventory(inventoryDataFromMain) {
    // Xóa cache
    localStorage.removeItem("lagom_inventory");

    const data = inventoryDataFromMain || (await window.API.inventory.getAll());
    inventoryData = data;
    window.inventoryData = data;

    await populateCategoryFilter();
    applyInventoryFilters(data);

    // Bind events
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

  // Expose functions to window
  window.initInventory = initInventory;
  window.showRequestModal = showRequestModal;
  window.closeRequestModal = closeRequestModal;
  window.submitRequest = submitRequest;
  window.setRequestType = setRequestType;
  window.toggleAllDelete = toggleAllDelete;
  window.onEditSelect = onEditSelect;
  window.removeAddRow = removeAddRow;
  window.addNewAddRow = addNewAddRow;
  window.inventoryData = inventoryData;
  window.isAdmin = isAdmin;
  window.isQuanLy = isQuanLy;
  window.refreshInventoryData = refreshInventoryData;
})();
// Thêm vào cuối file inventory.js, trước phần export

// ==================== REFRESH INVENTORY DATA ====================
async function refreshInventoryData() {
  Utils.showLoading(true, "Đang làm mới dữ liệu tồn kho...");
  try {
    // Xóa cache
    localStorage.removeItem("lagom_inventory");

    const freshData = await window.API.inventory.getAll();
    inventoryData = freshData;
    window.inventoryData = freshData;

    // Cập nhật filter và render
    await populateCategoryFilter();
    applyInventoryFilters(freshData);

    // Cập nhật stats
    await updateInventoryStats(freshData);

    Utils.showToast("✅ Đã làm mới dữ liệu tồn kho");
  } catch (error) {
    console.error("Refresh inventory error:", error);
    Utils.showToast("❌ Lỗi khi làm mới dữ liệu", "error");
  } finally {
    Utils.showLoading(false);
  }
}

// Export hàm refresh
window.refreshInventoryData = refreshInventoryData;
