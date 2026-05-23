/**
 * ==================== INVENTORY MODULE ====================
 * Quản lý tồn kho (chế độ xem)
 */

(function () {
  "use strict";

  let currentPage = 1;
  const rowsPerPage = 20;
  let filteredInventoryData = [];

  // DOM Elements
  const tbody = document.getElementById("inv-tbody");
  const searchInput = document.getElementById("inv-search");
  const catFilter = document.getElementById("inv-cat-filter");
  const statusFilter = document.getElementById("inv-status-filter");
  const resetBtn = document.getElementById("btnResetFilter");
  const exportBtn = document.getElementById("btnExport");
  const refreshBtn = document.getElementById("btnRefreshInventory");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");

  // Helper functions
  function formatCurrency(num) {
    return Utils.formatCurrency(num);
  }

  function formatNumber(num) {
    return Utils.formatNumber(num);
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
    return `<span class="readonly-field" style="color:#ffffff;">${Utils.escapeHtml(String(value || "—"))}</span>`;
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
                    <td>${renderEditableField(Utils.formatDate(item.ngayNhapHD))}</td>
                    <td>${renderEditableField(item.soLot)}</td>
                    <td>${renderEditableField(Utils.formatDate(item.ngayHetHan))}</td>
                    <td class="text-right">${renderEditableField(item.soLuongXuat, true)}</td>
                    <td class="text-right">${renderEditableField(item.giaXuat, true)}</td>
                    <td>${renderEditableField(item.soHopDongXuat)}</td>
                    <td>${renderEditableField(item.soHoaDonXuat)}</td>
                    <td>${renderEditableField(Utils.formatDate(item.ngayXuatHD))}</td>
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

  // Refresh inventory
  async function refreshInventoryData() {
    Utils.showLoading(true, "Đang làm mới dữ liệu...");
    try {
      const freshData = await window.API.inventory.getAll();
      window.inventoryData = freshData;
      applyInventoryFilters(freshData);
      Utils.showToast("Đã làm mới dữ liệu tồn kho");
    } catch (error) {
      Utils.showToast("Lỗi khi làm mới dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // Apply filters
  function applyInventoryFilters(inventoryData) {
    if (!inventoryData || inventoryData.length === 0) {
      filteredInventoryData = [];
      renderInventoryTable([]);
      updateInventoryStats([]);
      return;
    }

    const searchTerm = searchInput?.value.toLowerCase() || "";
    const category = catFilter?.value || "";
    const status = statusFilter?.value || "";

    let filtered = [...inventoryData];

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
                `<option value="${Utils.escapeHtml(cat)}">${Utils.escapeHtml(cat)}</option>`,
            )
            .join("");
      }
    } catch (error) {
      console.error("Load categories error:", error);
    }
  }

  function resetFilters(inventoryData) {
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

  // Init
  async function initInventory(inventoryDataFromMain) {
    const data = inventoryDataFromMain || (await window.API.inventory.getAll());

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

    if (resetBtn) resetBtn.addEventListener("click", () => resetFilters(data));
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

  window.initInventory = initInventory;
})();
