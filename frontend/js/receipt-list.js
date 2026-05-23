/**
 * ==================== RECEIPT LIST MODULE ====================
 * Hiển thị danh sách phiếu nhập
 */

(function () {
  "use strict";

  let currentPage = 1;
  const rowsPerPage = 10;
  let allReceipts = [];

  // DOM Elements
  const container = document.getElementById("receiptsList");
  const searchInput = document.getElementById("searchReceipt");
  const filterDate = document.getElementById("receiptFilterDate");
  const refreshBtn = document.getElementById("btnRefreshReceipts");
  const createBtn = document.getElementById("btnCreateNewReceipt");
  const prevPageBtn = document.getElementById("receiptPrevPage");
  const nextPageBtn = document.getElementById("receiptNextPage");
  const pageInfo = document.getElementById("receiptPageInfo");
  const totalCountSpan = document.getElementById("receiptTotalCount");
  const totalValueSpan = document.getElementById("receiptTotalValue");

  // Load receipts
  async function loadReceipts() {
    Utils.showLoading(true, "Đang tải danh sách phiếu...");
    try {
      allReceipts = await window.API.receipt.getAll();
      filterAndRender();
    } catch (error) {
      Utils.showToast("Lỗi khi tải danh sách phiếu", "error");
      allReceipts = [];
    } finally {
      Utils.showLoading(false);
    }
  }

  function filterAndRender() {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const days =
      filterDate?.value === "all" ? 0 : parseInt(filterDate?.value || "0");
    const cutoff = days ? new Date(Date.now() - days * 86400000) : null;

    let filtered = [...allReceipts];

    if (cutoff) {
      filtered = filtered.filter((item) => new Date(item.createdAt) >= cutoff);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          (item.receiptNo || "").toLowerCase().includes(searchTerm) ||
          (item.supplierName || "").toLowerCase().includes(searchTerm),
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    updateStats(filtered);
    renderReceipts(filtered);
  }

  function updateStats(filtered) {
    const total = filtered.length;
    const totalValue = filtered.reduce((sum, r) => sum + (r.total || 0), 0);

    if (totalCountSpan) totalCountSpan.textContent = total;
    if (totalValueSpan)
      totalValueSpan.textContent = Utils.formatCurrency(totalValue);
  }

  function renderReceipts(filtered) {
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
                    <p>Chưa có phiếu nhập nào</p>
                    <small>Nhấn "Tạo phiếu nhập mới" để thêm phiếu</small>
                </div>
            `;
      return;
    }

    container.innerHTML = pageData
      .map((receipt) => Components.createReceiptCard(receipt))
      .join("");
  }

  function changePage(delta) {
    const totalPages = Math.ceil(allReceipts.length / rowsPerPage);
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      filterAndRender();
    }
  }

  function goToCreatePage() {
    window.open("receipt.html", "_blank");
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
        loadReceipts();
      });
    if (createBtn) createBtn.addEventListener("click", goToCreatePage);
    if (prevPageBtn)
      prevPageBtn.addEventListener("click", () => changePage(-1));
    if (nextPageBtn) nextPageBtn.addEventListener("click", () => changePage(1));
  }

  function init() {
    loadReceipts();
    bindEvents();
  }

  init();
})();
