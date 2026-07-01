/**
 * ==================== EXPORT LIST MODULE ====================
 * Hiển thị danh sách phiếu xuất - FIXED
 */

(function () {
  "use strict";

  let currentPage = 1;
  const rowsPerPage = 10;
  let allExports = [];

  // DOM Elements
  const container = document.getElementById("exportsList");
  const searchInput = document.getElementById("searchExport");
  const filterDate = document.getElementById("exportFilterDate");
  const refreshBtn = document.getElementById("btnRefreshExports");
  const createBtn = document.getElementById("btnCreateNewExport");
  const prevPageBtn = document.getElementById("exportPrevPage");
  const nextPageBtn = document.getElementById("exportNextPage");
  const pageInfo = document.getElementById("exportPageInfo");
  const totalCountSpan = document.getElementById("exportTotalCount");
  const totalValueSpan = document.getElementById("exportTotalValue");

  // Load exports
  async function loadExports() {
    Utils.showLoading(true, "Đang tải danh sách phiếu...");
    try {
      allExports = await window.API.export.getAll();
      console.log("📥 Danh sách phiếu xuất:", allExports);
      filterAndRender();
    } catch (error) {
      Utils.showToast("Lỗi khi tải danh sách phiếu", "error");
      allExports = [];
    } finally {
      Utils.showLoading(false);
    }
  }

  function filterAndRender() {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const days =
      filterDate?.value === "all" ? 0 : parseInt(filterDate?.value || "0");
    const cutoff = days ? new Date(Date.now() - days * 86400000) : null;

    let filtered = [...allExports];

    if (cutoff) {
      filtered = filtered.filter((item) => new Date(item.createdAt) >= cutoff);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          (item.exportNo || "").toLowerCase().includes(searchTerm) ||
          (item.receiverName || "").toLowerCase().includes(searchTerm),
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    updateStats(filtered);
    renderExports(filtered);
  }

  function updateStats(filtered) {
    const total = filtered.length;

    // ĐƠN GIẢN: Cộng tất cả total của các phiếu
    let totalValue = 0;
    for (const r of filtered) {
      const val = parseFloat(r.total) || 0;
      totalValue += val;
    }

    if (totalCountSpan) totalCountSpan.textContent = total;
    if (totalValueSpan) {
      totalValueSpan.textContent = Utils.formatCurrency(totalValue);
    }
  }

  function renderExports(filtered) {
    if (!container) return;

    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);

    if (pageInfo) {
      pageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
    }

    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;

    if (pageData.length === 0) {
      container.innerHTML = `
        <div class="empty-receipts">
          <i class="fas fa-inbox"></i>
          <p>Chưa có phiếu xuất nào</p>
          <small>Nhấn "Tạo phiếu xuất mới" để thêm phiếu</small>
        </div>
      `;
      return;
    }

    container.innerHTML = pageData
      .map((exportItem) => {
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
      })
      .join("");
  }

  function changePage(delta) {
    const totalPages = Math.ceil(allExports.length / rowsPerPage);
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      filterAndRender();
    }
  }

  function goToCreatePage() {
    window.open("export.html", "_blank");
  }

  function bindEvents() {
    if (searchInput)
      searchInput.addEventListener("input", () => {
        currentPage = 1;
        filterAndRender();
      });
    if (filterDate)
      filterDate.addEventListener("change", () => {
        currentPage = 1;
        filterAndRender();
      });
    if (refreshBtn)
      refreshBtn.addEventListener("click", () => {
        currentPage = 1;
        if (searchInput) searchInput.value = "";
        if (filterDate) filterDate.value = "all";
        loadExports();
      });
    if (createBtn) createBtn.addEventListener("click", goToCreatePage);
    if (prevPageBtn)
      prevPageBtn.addEventListener("click", () => changePage(-1));
    if (nextPageBtn) nextPageBtn.addEventListener("click", () => changePage(1));
  }

  function init() {
    loadExports();
    bindEvents();
  }

  init();
})();
