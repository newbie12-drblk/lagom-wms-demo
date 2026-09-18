/**
 * ==================== INVENTORY MODULE ====================
 * Quản lý tồn kho
 * ✅ Search tất cả trường + tiếng Việt không dấu
 * ✅ Sort theo Tên thương mại A→Z
 * ✅ 10 SP/trang
 * ✅ Phân trang hoạt động đúng
 * ✅ Sum đúng cột (SL nhập, SL xuất, Tồn cuối)
 * ✅ Công nợ: Tồn = 0 → "⛔ Hết hàng"
 * ✅ 3 cột sticky: STT + Tên TM + Mã hàng
 * ✅ Căn giữa các cột dữ liệu (trừ cột số căn phải, tên TM căn trái)
 */

(function () {
  "use strict";

  let currentPage = 1;
  const rowsPerPage = 10;
  let filteredInventoryData = [];
  let inventoryData = [];
  let requestType = "add";

  // DOM Elements
  const tbody = document.getElementById("inv-tbody");

  // Sum elements
  const sumSLNhapEl = document.getElementById("sumSLNhap");
  const sumSLXuatEl = document.getElementById("sumSLXuat");
  const sumTonCuoiEl = document.getElementById("sumTonCuoi");

  // ==================== HELPER: CHUẨN HÓA TIẾNG VIỆT ====================
  function normalizeVN(str) {
    if (!str) return "";
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d");
  }

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
    if (remainingDays === 0)
      return `<span class="debt-badge expired">Đến hạn hôm nay</span>`;
    if (remainingDays <= 7)
      return `<span class="debt-badge critical">Còn ${remainingDays} ngày (KHẨN CẤP)</span>`;
    if (remainingDays <= 30)
      return `<span class="debt-badge warning">Còn ${remainingDays} ngày</span>`;
    if (remainingDays <= 90)
      return `<span class="debt-badge normal">Còn ${remainingDays} ngày</span>`;
    return `<span class="debt-badge safe">Còn ${remainingDays} ngày</span>`;
  }

  function getStockStatusBadge(item) {
    const tonKho = Number(item.tonKho) || 0;

    if (tonKho === 0) {
      return '<span class="debt-badge out-of-stock-badge">⛔ Hết hàng</span>';
    }

    const remainingDays = getRemainingDays(item);
    return getDebtBadge(remainingDays);
  }

  // ==================== TÍNH STATS ====================
  function computeStats(data) {
    const totalItems = data.length;
    let totalStock = 0;
    let totalValue = 0;

    for (const item of data) {
      const tonKho = Number(item.tonKho) || 0;
      const giaNhap = Number(item.giaNhap) || 0;

      totalStock += tonKho;
      totalValue += giaNhap * tonKho;
    }

    return { totalItems, totalStock, totalValue };
  }

  function updateInventoryStats(data) {
    const stats = computeStats(data);

    const elTotalItems = document.getElementById("statTotalItems");
    const elTotalStock = document.getElementById("statTotalStock");
    const elTotalValue = document.getElementById("statTotalValue");
    const elExpiringSoon = document.getElementById("statExpiringSoon");
    const elExpired = document.getElementById("statExpired");

    if (elTotalItems) elTotalItems.textContent = stats.totalItems;
    if (elTotalStock) elTotalStock.textContent = formatNumber(stats.totalStock);
    if (elTotalValue)
      elTotalValue.textContent = formatCurrency(stats.totalValue);

    let critical = 0;
    let expired = 0;
    for (const item of data) {
      const remaining = getRemainingDays(item);
      if (remaining !== null) {
        if (remaining < 0) expired++;
        else if (remaining <= 7) critical++;
      }
    }

    if (elExpiringSoon) elExpiringSoon.textContent = critical;
    if (elExpired) elExpired.textContent = expired;
  }

  // ==================== TÍNH SUM ====================
  function updateSums(data) {
    let totalSLNhap = 0;
    let totalSLXuat = 0;
    let totalTonCuoi = 0;

    for (const item of data) {
      totalSLNhap += Number(item.soLuongNhap) || 0;
      totalSLXuat += Number(item.soLuongXuat) || 0;
      totalTonCuoi += Number(item.tonKho) || 0;
    }

    if (sumSLNhapEl) sumSLNhapEl.textContent = formatNumber(totalSLNhap);
    if (sumSLXuatEl) sumSLXuatEl.textContent = formatNumber(totalSLXuat);
    if (sumTonCuoiEl) sumTonCuoiEl.textContent = formatNumber(totalTonCuoi);
  }

  // ==================== RENDER TABLE ====================
  function renderInventoryTable(data) {
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="21" style="text-align:center;padding:60px;color:#6b82a0;">
        <i class="fas fa-box-open" style="font-size:48px;display:block;margin-bottom:16px;opacity:0.4;"></i>
        Không có dữ liệu tồn kho
      </td></tr>`;
      updatePaginationControls(0);
      updateSums([]);
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

        const formatDateDisplay = (dateStr) => {
          if (!dateStr || dateStr === "" || dateStr === "—") return "—";
          try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("vi-VN");
          } catch (e) {
            return dateStr;
          }
        };

        return `
          <tr class="${isOutOfStock ? "out-of-stock" : ""}">
            <td style="position: sticky; left: 0; z-index: 100; background: #0f172a; color: #ffffff; min-width: 45px; width: 45px; max-width: 45px; text-align: center; border-bottom: 1px solid #1e2d45; padding: 8px 6px;">${globalIdx}</td>
            <td style="position: sticky; left: 45px; z-index: 100; background: #0f172a; min-width: 180px; width: 180px; max-width: 180px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; text-align: left;">
              <strong style="color: #60a5fa; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${escapeHtml(item.tenThuongMai || "—")}</strong>
            </td>
            <td style="position: sticky; left: 225px; z-index: 100; background: #0f172a; min-width: 120px; width: 120px; max-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff; border-right: 2px solid rgba(59, 130, 246, 0.3); text-align: center;">${escapeHtml(item.maHang || "—")}</td>
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff; text-align: center;">${escapeHtml(item.quyCach || "—")}</td>
            <td style="min-width: 150px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff; text-align: center;">${escapeHtml(item.hangSX || "—")}</td>
            <td style="min-width: 50px; text-align: center; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${escapeHtml(item.dvt || "—")}</td>
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff; text-align: center;">${escapeHtml(item.phanLoai || "—")}</td>
            <td class="text-right" style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #93c5fd; font-family: monospace; text-align: right;">${formatCurrency(item.giaNhap || 0)}</td>
            <td class="text-right" style="min-width: 80px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #86efac; font-weight: 600; text-align: right;">${formatNumber(item.soLuongNhap || 0)}</td>
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff; text-align: center;">${escapeHtml(item.soHopDongNhap || "—")}</td>
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #fbbf24; font-weight: 500; text-align: center;">${escapeHtml(item.soHoaDonNhap || "—")}</td>
            <td style="min-width: 110px; text-align: center; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${formatDateDisplay(item.ngayNhapHD)}</td>
            <td style="min-width: 100px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff; font-family: monospace; text-align: center;">${escapeHtml(item.soLot || "—")}</td>
            <td style="min-width: 110px; text-align: center; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: ${item.ngayHetHan && new Date(item.ngayHetHan) < new Date() ? "#f87171" : "#ffffff"};">${formatDateDisplay(item.ngayHetHan)}</td>
            <td class="text-right" style="min-width: 80px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff; text-align: right;">${formatNumber(item.soLuongXuat || 0)}</td>
            <td class="text-right" style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #93c5fd; font-family: monospace; text-align: right;">${formatCurrency(item.giaXuat || 0)}</td>
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff; text-align: center;">${escapeHtml(item.soHopDongXuat || "—")}</td>
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #fbbf24; font-weight: 500; text-align: center;">${escapeHtml(item.soHoaDonXuat || "—")}</td>
            <td style="min-width: 110px; text-align: center; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${formatDateDisplay(item.ngayXuatHD)}</td>
            <td class="text-right" style="min-width: 80px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; text-align: right;">
              <strong style="${isOutOfStock ? "color: #f87171;" : "color: #4ade80;"}">${formatNumber(item.tonKho || 0)}</strong>
            </td>
            <td style="min-width: 150px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; text-align: center;">${getStockStatusBadge(item)}</td>
          </tr>
        `;
      })
      .join("");

    updatePaginationControls(data.length);
    updateSums(data);
  }

  // ==================== PHÂN TRANG ====================
  function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const pageInfoEl = document.getElementById("pageInfo");
    const prevPageBtnEl = document.getElementById("prevPage");
    const nextPageBtnEl = document.getElementById("nextPage");

    if (pageInfoEl) {
      pageInfoEl.textContent = `Trang ${currentPage} / ${totalPages}`;
    }

    if (prevPageBtnEl) {
      prevPageBtnEl.disabled = currentPage <= 1;
      prevPageBtnEl.style.opacity = currentPage <= 1 ? "0.5" : "1";
      prevPageBtnEl.style.cursor = currentPage <= 1 ? "not-allowed" : "pointer";
    }
    if (nextPageBtnEl) {
      nextPageBtnEl.disabled = currentPage >= totalPages;
      nextPageBtnEl.style.opacity = currentPage >= totalPages ? "0.5" : "1";
      nextPageBtnEl.style.cursor =
        currentPage >= totalPages ? "not-allowed" : "pointer";
    }
  }

  window.goToPrevPage = function () {
    if (currentPage <= 1) return;
    currentPage--;
    renderInventoryTable(filteredInventoryData);
  };

  window.goToNextPage = function () {
    const totalPages = Math.ceil(filteredInventoryData.length / rowsPerPage);
    if (currentPage >= totalPages) return;
    currentPage++;
    renderInventoryTable(filteredInventoryData);
  };

  // ==================== REFRESH ====================
  async function refreshInventoryData() {
    Utils.showLoading(true, "Đang làm mới dữ liệu tồn kho...");
    try {
      localStorage.removeItem("lagom_inventory");

      const freshData = await window.API.inventory.getAll();
      inventoryData = freshData;
      window.inventoryData = freshData;

      await populateCategoryFilter();
      applyInventoryFilters(freshData);

      Utils.showToast("✅ Đã làm mới dữ liệu tồn kho");
    } catch (error) {
      console.error("Refresh inventory error:", error);
      Utils.showToast("❌ Lỗi khi làm mới dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ==================== FILTER + SORT ====================
  function applyInventoryFilters(data) {
    inventoryData = data;
    if (!data || data.length === 0) {
      filteredInventoryData = [];
      renderInventoryTable([]);
      updateInventoryStats([]);
      return;
    }

    const searchInputEl = document.getElementById("inv-search");
    const catFilterEl = document.getElementById("inv-cat-filter");
    const statusFilterEl = document.getElementById("inv-status-filter");

    const searchTermRaw = (searchInputEl?.value || "").trim();
    const searchTerm = normalizeVN(searchTermRaw);
    const category = catFilterEl?.value || "";
    const status = statusFilterEl?.value || "";

    let filtered = [...data];

    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const searchableFields = [
          item.tenThuongMai,
          item.maHang,
          item.quyCach,
          item.hangSX,
          item.dvt,
          item.phanLoai,
          item.soHopDongNhap,
          item.soHoaDonNhap,
          item.soHoaDonXuat,
          item.soHopDongXuat,
          item.soLot,
          item.ghiChu,
          item.ngayNhapHD ? formatDate(item.ngayNhapHD) : "",
          item.ngayXuatHD ? formatDate(item.ngayXuatHD) : "",
          item.ngayHetHan ? formatDate(item.ngayHetHan) : "",
          String(item.giaNhap || ""),
          String(item.giaXuat || ""),
          String(item.soLuongNhap || ""),
          String(item.soLuongXuat || ""),
          String(item.tonKho || ""),
        ];
        return searchableFields.some(
          (field) =>
            field && normalizeVN(field.toString()).includes(searchTerm),
        );
      });
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

    filtered.sort((a, b) =>
      (a.tenThuongMai || "").localeCompare(b.tenThuongMai || "", "vi"),
    );

    filteredInventoryData = filtered;
    currentPage = 1;
    renderInventoryTable(filteredInventoryData);
    updateInventoryStats(filteredInventoryData);
  }

  async function populateCategoryFilter() {
    try {
      const categories = await window.API.inventory.getCategories();
      const catFilterEl = document.getElementById("inv-cat-filter");
      if (catFilterEl) {
        catFilterEl.innerHTML =
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

  function exportInventoryToExcel() {
    if (!filteredInventoryData || filteredInventoryData.length === 0) {
      Utils.showToast("Không có dữ liệu để xuất!", "error");
      return;
    }

    const exportData = filteredInventoryData.map((item, idx) => ({
      STT: idx + 1,
      "Tên thương mại": item.tenThuongMai || "",
      "Mã hàng": item.maHang || "",
      "Quy cách": item.quyCach || "",
      "Hãng SX": item.hangSX || "",
      ĐVT: item.dvt || "",
      "Phân loại": item.phanLoai || "",
      "Giá nhập": item.giaNhap || 0,
      "Số lượng nhập": item.soLuongNhap || 0,
      "Số hợp đồng": item.soHopDongNhap || "",
      "Số hóa đơn nhập": item.soHoaDonNhap || "",
      "Ngày nhập HĐ": item.ngayNhapHD || "",
      "Số lot": item.soLot || "",
      "Ngày hết hạn": item.ngayHetHan || "",
      "Số lượng xuất": item.soLuongXuat || 0,
      "Giá xuất": item.giaXuat || 0,
      "Số hợp đồng xuất": item.soHopDongXuat || "",
      "Số hóa đơn xuất": item.soHoaDonXuat || "",
      "Ngày xuất": item.ngayXuatHD || "",
      "Tồn cuối": item.tonKho || 0,
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

  // ==================== MODAL YÊU CẦU ====================
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
          <button class="btn btn-outline" data-type="edit" onclick="window.setRequestType('edit')">
            <i class="fas fa-edit"></i> Sửa sản phẩm
          </button>
          <button class="btn btn-outline" data-type="delete" onclick="window.setRequestType('delete')">
            <i class="fas fa-trash"></i> Xóa sản phẩm
          </button>
        </div>

        <div id="requestContent"></div>

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
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-outline");
    });

    document.querySelectorAll(".request-options .btn").forEach((btn) => {
      if (btn.dataset.type === type) {
        btn.classList.remove("btn-outline");
        btn.classList.add("btn-primary");
        btn.classList.add("active");
      }
    });

    const titles = {
      add: "📝 Thêm sản phẩm mới",
      edit: "✏️ Sửa sản phẩm",
      delete: "🗑️ Xóa sản phẩm",
    };
    const titleEl = document.getElementById("requestModalTitle");
    if (titleEl) titleEl.textContent = titles[type] || "📋 Tạo yêu cầu";

    renderRequestContent(type);
  };

  function renderRequestContent(type) {
    const container = document.getElementById("requestContent");
    if (!container) return;

    if (type === "add") {
      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">
          <i class="fas fa-info-circle"></i> Điền thông tin sản phẩm mới (các trường có <span style="color: #ef4444;">*</span> là bắt buộc):
        </p>
        <div class="request-table-wrap">
          <table class="request-table">
            <thead>
              <tr>
                <th style="text-align: center; width: 45px;">STT</th>
                <th>TÊN THƯƠNG MẠI <span style="color:#ef4444;">*</span></th>
                <th>MÃ HÀNG <span style="color:#ef4444;">*</span></th>
                <th>QUY CÁCH</th>
                <th style="text-align: center;">ĐVT</th>
                <th>HÃNG/NƯỚC SX</th>
                <th>PHÂN LOẠI MÁY</th>
                <th style="text-align: right;">GIÁ NHẬP</th>
                <th>SỐ HĐ</th>
              </tr>
            </thead>
            <tbody id="addProductBody">
              <tr>
                <td style="text-align: center; background: #0a0f1a; font-weight: 600;">1</td>
                <td><input type="text" class="add-tenThuongMai" placeholder="Tên thương mại *"></td>
                <td><input type="text" class="add-maHang" placeholder="Mã hàng *"></td>
                <td><input type="text" class="add-quyCach" placeholder="Quy cách"></td>
                <td style="text-align: center;"><input type="text" class="add-dvt" placeholder="ĐVT" style="text-align:center;"></td>
                <td><input type="text" class="add-hangSX" placeholder="Hãng/Nước SX"></td>
                <td><input type="text" class="add-phanLoai" placeholder="Phân loại máy"></td>
                <td style="text-align: right;"><input type="text" class="add-giaNhap" placeholder="Giá nhập" style="text-align:right;"></td>
                <td><input type="text" class="add-soHopDong" placeholder="Số HĐ"></td>
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
            <strong>Lưu ý:</strong> Nhập đầy đủ 9 trường. Các trường có <span style="color:#ef4444;">*</span> là bắt buộc. Số lượng sẽ được nhập khi Quản lý duyệt yêu cầu.
          </p>
        </div>
      `;
    } else if (type === "edit") {
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
            <td class="checkbox-cell" style="text-align: center; width: 40px;">
              <input type="checkbox" class="edit-checkbox" data-id="${item.id}" onchange="window.onEditSelect(this)" style="width:18px; height:18px; accent-color:#3b82f6; cursor:pointer;">
            </td>
            <td style="text-align: center;">${idx + 1}</td>
            <td>${escapeHtml(item.tenThuongMai || "")}</td>
            <td>${escapeHtml(item.maHang || "")}</td>
            <td>${escapeHtml(item.quyCach || "")}</td>
            <td>${escapeHtml(item.dvt || "")}</td>
            <td>${escapeHtml(item.hangSX || "")}</td>
            <td>${escapeHtml(item.phanLoai || "")}</td>
            <td style="text-align: right;">${formatCurrency(item.giaNhap || 0)}</td>
            <td>${escapeHtml(item.soHopDongNhap || "")}</td>
          </tr>
        `,
        )
        .join("");

      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">
          <i class="fas fa-info-circle"></i> 
          <strong>Chọn sản phẩm cần sửa</strong> (sửa được 8 trường):
        </p>
        <div class="request-table-wrap">
          <table class="request-table">
            <thead>
              <tr>
                <th style="text-align: center; width: 40px;">Chọn</th>
                <th style="text-align: center; width: 40px;">STT</th>
                <th>TÊN THƯƠNG MẠI</th>
                <th>MÃ HÀNG</th>
                <th>QUY CÁCH</th>
                <th style="text-align: center;">ĐVT</th>
                <th>HÃNG/NƯỚC SX</th>
                <th>PHÂN LOẠI MÁY</th>
                <th style="text-align: right;">GIÁ NHẬP</th>
                <th>SỐ HĐ</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        <div id="editFormContainer" style="margin-top:16px; display:none;">
          <p style="color: #fbbf24; margin-bottom: 8px;">✏️ Nhập thông tin mới cho sản phẩm đã chọn (8 trường):</p>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #1e2d45;">
            <div><label class="edit-label">Tên thương mại</label><input type="text" id="edit-tenThuongMai" class="edit-field"></div>
            <div><label class="edit-label">Mã hàng</label><input type="text" id="edit-maHang" class="edit-field"></div>
            <div><label class="edit-label">Quy cách</label><input type="text" id="edit-quyCach" class="edit-field"></div>
            <div><label class="edit-label">ĐVT</label><input type="text" id="edit-dvt" class="edit-field"></div>
            <div><label class="edit-label">Hãng/Nước SX</label><input type="text" id="edit-hangSX" class="edit-field"></div>
            <div><label class="edit-label">Phân loại máy</label><input type="text" id="edit-phanLoai" class="edit-field"></div>
            <div><label class="edit-label">Giá nhập</label><input type="text" id="edit-giaNhap" class="edit-field"></div>
            <div><label class="edit-label">Số HĐ</label><input type="text" id="edit-soHopDong" class="edit-field"></div>
          </div>
        </div>
      `;
    } else if (type === "delete") {
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
            <td class="checkbox-cell" style="text-align: center; width: 40px;">
              <input type="checkbox" class="delete-checkbox" data-id="${item.id}" data-maHang="${escapeHtml(item.maHang || "")}" style="width:18px; height:18px; accent-color:#3b82f6; cursor:pointer;">
            </td>
            <td style="text-align: center;">${idx + 1}</td>
            <td>${escapeHtml(item.tenThuongMai || "")}</td>
            <td>${escapeHtml(item.maHang || "")}</td>
            <td>${escapeHtml(item.quyCach || "")}</td>
            <td>${escapeHtml(item.hangSX || "")}</td>
            <td>${escapeHtml(item.dvt || "")}</td>
            <td>${escapeHtml(item.phanLoai || "")}</td>
            <td style="text-align: right;">${formatCurrency(item.giaNhap || 0)}</td>
            <td>${escapeHtml(item.soHopDongNhap || "")}</td>
            <td style="text-align: center;">${item.soLuongNhap || 0}</td>
            <td>${escapeHtml(item.soLot || "")}</td>
            <td style="text-align: center; color: ${item.ngayHetHan && new Date(item.ngayHetHan) < new Date() ? "#f87171" : "#e2eaf5"};">${formatDate(item.ngayHetHan)}</td>
            <td style="text-align: right; color: ${(item.tonKho || 0) === 0 ? "#f87171" : "#4ade80"}; font-weight: 600;">${item.tonKho || 0}</td>
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
                <th style="text-align: center; width: 40px;"><input type="checkbox" id="selectAllDelete" onchange="window.toggleAllDelete(this)" style="width:18px; height:18px; accent-color:#3b82f6; cursor:pointer;"></th>
                <th style="text-align: center; width: 40px;">STT</th>
                <th>TÊN THƯƠNG MẠI</th>
                <th>MÃ HÀNG</th>
                <th>QUY CÁCH</th>
                <th>HÃNG/NƯỚC SX</th>
                <th style="text-align: center;">ĐVT</th>
                <th>PHÂN LOẠI MÁY</th>
                <th style="text-align: right;">GIÁ NHẬP</th>
                <th>SỐ HĐ</th>
                <th style="text-align: center;">SL NHẬP</th>
                <th>SỐ LOT</th>
                <th style="text-align: center;">NGÀY HẾT HẠN</th>
                <th style="text-align: right;">TỒN KHO</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;
    }
  }

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

    if (checkbox.checked) {
      const id = parseInt(checkbox.dataset.id);
      const product = inventoryData.find((p) => p.id === id);
      if (product) {
        document.getElementById("edit-tenThuongMai").value =
          product.tenThuongMai || "";
        document.getElementById("edit-maHang").value = product.maHang || "";
        document.getElementById("edit-quyCach").value = product.quyCach || "";
        document.getElementById("edit-dvt").value = product.dvt || "";
        document.getElementById("edit-hangSX").value = product.hangSX || "";
        document.getElementById("edit-phanLoai").value = product.phanLoai || "";
        document.getElementById("edit-giaNhap").value = product.giaNhap || "";
        document.getElementById("edit-soHopDong").value =
          product.soHopDongNhap || "";
      }
    }
  };

  window.addNewAddRow = function () {
    const tbodyEl = document.getElementById("addProductBody");
    if (!tbodyEl) return;
    const rowCount = tbodyEl.querySelectorAll("tr").length + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: center; background: #0a0f1a; font-weight: 600;">${rowCount}</td>
      <td><input type="text" class="add-tenThuongMai" placeholder="Tên thương mại *"></td>
      <td><input type="text" class="add-maHang" placeholder="Mã hàng *"></td>
      <td><input type="text" class="add-quyCach" placeholder="Quy cách"></td>
      <td style="text-align: center;"><input type="text" class="add-dvt" placeholder="ĐVT" style="text-align:center;"></td>
      <td><input type="text" class="add-hangSX" placeholder="Hãng/Nước SX"></td>
      <td><input type="text" class="add-phanLoai" placeholder="Phân loại máy"></td>
      <td style="text-align: right;"><input type="text" class="add-giaNhap" placeholder="Giá nhập" style="text-align:right;"></td>
      <td><input type="text" class="add-soHopDong" placeholder="Số HĐ"></td>
    `;
    tbodyEl.appendChild(tr);
  };

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
        dvt: row.querySelector(".add-dvt")?.value || "",
        hangSX: row.querySelector(".add-hangSX")?.value || "",
        phanLoai: row.querySelector(".add-phanLoai")?.value || "",
        giaNhap: parseFloat(
          row.querySelector(".add-giaNhap")?.value?.replace(/[^0-9]/g, "") || 0,
        ),
        soHopDongNhap: row.querySelector(".add-soHopDong")?.value || "",
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
            document.getElementById("edit-soHopDong")?.value ||
            oldProduct.soHopDongNhap,
        };

        const changedFields = {};
        const allFields = [
          "tenThuongMai",
          "maHang",
          "quyCach",
          "dvt",
          "hangSX",
          "phanLoai",
          "giaNhap",
          "soHopDongNhap",
        ];

        let hasChange = false;
        for (const field of allFields) {
          const oldVal =
            oldProduct[field] !== undefined ? oldProduct[field] : "";
          const newVal = newData[field] !== undefined ? newData[field] : "";
          if (String(oldVal).trim() !== String(newVal).trim()) {
            changedFields[field] = newData[field];
            hasChange = true;
          }
        }

        if (!hasChange) {
          Utils.showToast("⚠️ Không có trường nào được thay đổi!", "warning");
          Utils.showLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/edits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: id,
            updatedData: changedFields,
          }),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ " + result.message);
          closeRequestModal();
        } else {
          Utils.showToast("❌ " + result.message, "error");
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
          const id = parseInt(cb.dataset.id);
          if (!isNaN(id) && id > 0) productIds.push(id);
        });

        if (productIds.length === 0) {
          Utils.showToast("❌ Không tìm thấy ID sản phẩm hợp lệ!", "error");
          Utils.showLoading(false);
          return;
        }

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
    localStorage.removeItem("lagom_inventory");

    const data = inventoryDataFromMain || (await window.API.inventory.getAll());
    inventoryData = data;
    window.inventoryData = data;

    await populateCategoryFilter();
    applyInventoryFilters(data);

    const searchEl = document.getElementById("inv-search");
    if (searchEl) {
      searchEl.oninput = function () {
        currentPage = 1;
        applyInventoryFilters(inventoryData);
      };
    }

    const catEl = document.getElementById("inv-cat-filter");
    if (catEl) {
      catEl.onchange = function () {
        currentPage = 1;
        applyInventoryFilters(inventoryData);
      };
    }

    const statusEl = document.getElementById("inv-status-filter");
    if (statusEl) {
      statusEl.onchange = function () {
        currentPage = 1;
        applyInventoryFilters(inventoryData);
      };
    }

    const prevPageBtnEl = document.getElementById("prevPage");
    if (prevPageBtnEl) {
      prevPageBtnEl.onclick = window.goToPrevPage;
    }
    const nextPageBtnEl = document.getElementById("nextPage");
    if (nextPageBtnEl) {
      nextPageBtnEl.onclick = window.goToNextPage;
    }

    const createRequestBtnEl = document.getElementById("btnCreateRequest");
    if (createRequestBtnEl && isAdmin()) {
      createRequestBtnEl.style.display = "inline-flex";
      createRequestBtnEl.onclick = showRequestModal;
    } else if (createRequestBtnEl) {
      createRequestBtnEl.style.display = "none";
    }

    const exportBtnEl = document.getElementById("btnExport");
    if (exportBtnEl) {
      exportBtnEl.onclick = exportInventoryToExcel;
    }

    const refreshBtnEl = document.getElementById("btnRefreshInventory");
    if (refreshBtnEl) {
      refreshBtnEl.onclick = refreshInventoryData;
    }
  }

  window.initInventory = initInventory;
  window.showRequestModal = showRequestModal;
  window.closeRequestModal = closeRequestModal;
  window.submitRequest = submitRequest;
  window.setRequestType = setRequestType;
  window.toggleAllDelete = toggleAllDelete;
  window.onEditSelect = onEditSelect;
  window.addNewAddRow = addNewAddRow;
  window.inventoryData = inventoryData;
  window.isAdmin = isAdmin;
  window.isQuanLy = isQuanLy;
  window.refreshInventoryData = refreshInventoryData;
})();
