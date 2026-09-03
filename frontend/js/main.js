/**
 * ==================== MAIN MODULE ====================
 * Trang chủ cho role xem (index.html)
 */

(function () {
  "use strict";

  let inventoryData = [];
  let isInitialized = false;

  // Check auth
  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  // ============================================================
  // SIDEBAR MOBILE - FULL MÀN HÌNH
  // ============================================================

  window.showSidebar = function () {
    var sidebar = document.getElementById("sidebar");
    var backBtn = document.getElementById("btnBackMobile");

    if (sidebar) {
      sidebar.classList.remove("hidden");
    }
    if (backBtn) {
      backBtn.classList.remove("visible");
    }
    document.body.style.overflow = "hidden";
  };

  window.hideSidebar = function () {
    var sidebar = document.getElementById("sidebar");
    var backBtn = document.getElementById("btnBackMobile");

    if (sidebar) {
      sidebar.classList.add("hidden");
    }
    if (backBtn) {
      backBtn.classList.add("visible");
      backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Quay lại';
    }
    document.body.style.overflow = "";
  };

  function isMobile() {
    return window.innerWidth <= 768;
  }

  // Update topbar user
  function updateTopbarUser() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const topbarRight = document.querySelector(".topbar-right");
    if (!topbarRight) return;

    let userBar = document.querySelector(".user-info");
    if (!userBar) {
      userBar = document.createElement("div");
      userBar.className = "user-info";
      topbarRight.insertBefore(userBar, topbarRight.firstChild);
    }

    userBar.innerHTML = `
      <div class="user-avatar"><i class="fas fa-user-circle"></i></div>
      <div class="user-details">
        <span class="user-name">${Utils.escapeHtml(user.fullName)}</span>
        <span class="user-role role-${user.roleId}">${user.roleName}</span>
      </div>
      <button class="logout-btn" id="topbarLogoutBtn" title="Đăng xuất"><i class="fas fa-sign-out-alt"></i></button>
    `;

    document
      .getElementById("topbarLogoutBtn")
      ?.addEventListener("click", () => {
        Auth.logout();
        window.location.href = "login.html";
      });
  }

  // Load inventory
  async function loadInventory() {
    try {
      localStorage.removeItem("lagom_inventory");
      inventoryData = await window.API.inventory.getAll();
      window.inventoryData = inventoryData;
      return inventoryData;
    } catch (error) {
      console.error("Load inventory error:", error);
      return [];
    }
  }

  // Load receipts
  async function loadReceipts() {
    try {
      return await window.API.receipt.getAll();
    } catch (error) {
      console.error("Load receipts error:", error);
      return [];
    }
  }

  // Load exports
  async function loadExports() {
    try {
      return await window.API.export.getAll();
    } catch (error) {
      console.error("Load exports error:", error);
      return [];
    }
  }

  // ==================== RESET ALL DATA ====================
  async function resetAllData() {
    Utils.showLoading(true, "Đang làm mới toàn bộ dữ liệu...");
    try {
      localStorage.removeItem("lagom_inventory");
      localStorage.removeItem("lagom_receipts");
      localStorage.removeItem("lagom_exports");
      localStorage.removeItem("lagom_home_cache");

      await loadInventory();
      if (typeof initHome === "function") {
        await initHome();
      }
      if (typeof initInventory === "function") {
        const data = await window.API.inventory.getAll();
        initInventory(data);
      }

      Utils.showToast("✅ Đã làm mới toàn bộ dữ liệu!");
    } catch (error) {
      console.error("Reset error:", error);
      Utils.showToast("❌ Lỗi khi làm mới dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // Render receipts list
  async function renderReceiptsList() {
    const container = document.getElementById("receiptsList");
    if (!container) return;

    localStorage.removeItem("lagom_receipts");

    const receipts = await loadReceipts();
    const searchTerm =
      document.getElementById("searchReceipt")?.value.toLowerCase() || "";
    const days =
      document.getElementById("receiptFilterDate")?.value === "all"
        ? 0
        : parseInt(document.getElementById("receiptFilterDate")?.value || "0");
    const cutoff = days ? new Date(Date.now() - days * 86400000) : null;

    let filtered = receipts.filter(
      (item) => !cutoff || new Date(item.createdAt) >= cutoff,
    );
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          (item.receiptNo || "").toLowerCase().includes(searchTerm) ||
          (item.supplierName || "").toLowerCase().includes(searchTerm),
      );
    }
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = filtered.length;
    let totalValue = 0;
    for (const r of filtered) {
      totalValue += parseFloat(r.total) || 0;
    }

    document.getElementById("receiptTotalCount").textContent = total;
    document.getElementById("receiptTotalValue").textContent =
      Utils.formatCurrency(totalValue);

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-receipts"><i class="fas fa-inbox"></i><p>Chưa có phiếu nhập nào</p><small>Nhấn "Tạo phiếu nhập mới" để thêm phiếu</small></div>`;
      return;
    }

    container.innerHTML = filtered
      .map((item) => Components.createReceiptCard(item))
      .join("");
  }

  // Render exports list
  async function renderExportsList() {
    const container = document.getElementById("exportsList");
    if (!container) return;

    localStorage.removeItem("lagom_exports");

    const exports = await loadExports();
    const searchTerm =
      document.getElementById("searchExport")?.value.toLowerCase() || "";
    const days =
      document.getElementById("exportFilterDate")?.value === "all"
        ? 0
        : parseInt(document.getElementById("exportFilterDate")?.value || "0");
    const cutoff = days ? new Date(Date.now() - days * 86400000) : null;

    let filtered = exports.filter(
      (item) => !cutoff || new Date(item.createdAt) >= cutoff,
    );
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          (item.exportNo || "").toLowerCase().includes(searchTerm) ||
          (item.receiverName || "").toLowerCase().includes(searchTerm),
      );
    }
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = filtered.length;
    let totalValue = 0;
    for (const r of filtered) {
      totalValue += parseFloat(r.total) || 0;
    }

    document.getElementById("exportTotalCount").textContent = total;
    document.getElementById("exportTotalValue").textContent =
      Utils.formatCurrency(totalValue);

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-receipts"><i class="fas fa-inbox"></i><p>Chưa có phiếu xuất nào</p><small>Nhấn "Tạo phiếu xuất mới" để thêm phiếu</small></div>`;
      return;
    }

    container.innerHTML = filtered
      .map((item) => Components.createExportCard(item))
      .join("");
  }

  // ==================== SWITCH VIEW ====================
  async function switchView(viewName) {
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    document.getElementById(`view-${viewName}`)?.classList.add("active");

    document.querySelectorAll(".nav-item").forEach((item) => {
      if (item.dataset.view === viewName) item.classList.add("active");
      else item.classList.remove("active");
    });

    if (isMobile()) {
      window.hideSidebar();
    }

    localStorage.removeItem("lagom_inventory");
    localStorage.removeItem("lagom_receipts");
    localStorage.removeItem("lagom_exports");

    if (viewName === "inventory" && typeof initInventory === "function") {
      await loadInventory();
      initInventory(inventoryData);
    } else if (viewName === "home" && typeof initHome === "function") {
      if (!isInitialized) {
        await loadInventory();
        await initHome();
        isInitialized = true;
      }
    } else if (viewName === "receipts") {
      await renderReceiptsList();
      document
        .getElementById("searchReceipt")
        ?.addEventListener("input", () => renderReceiptsList());
      document
        .getElementById("receiptFilterDate")
        ?.addEventListener("change", () => renderReceiptsList());
      document
        .getElementById("btnRefreshReceipts")
        ?.addEventListener("click", () => {
          document.getElementById("searchReceipt").value = "";
          document.getElementById("receiptFilterDate").value = "all";
          renderReceiptsList();
        });
    } else if (viewName === "exports") {
      await renderExportsList();
      document
        .getElementById("searchExport")
        ?.addEventListener("input", () => renderExportsList());
      document
        .getElementById("exportFilterDate")
        ?.addEventListener("change", () => renderExportsList());
      document
        .getElementById("btnRefreshExports")
        ?.addEventListener("click", () => {
          document.getElementById("searchExport").value = "";
          document.getElementById("exportFilterDate").value = "all";
          renderExportsList();
        });
    } else if (
      viewName === "invoices" &&
      typeof window.loadInvoiceData === "function"
    ) {
      // ✅ MỚI: Load dữ liệu hóa đơn
      window.loadInvoiceData();
    }
  }

  // ==================== INIT ====================
  async function init() {
    updateTopbarUser();

    document.getElementById("currentDate").textContent =
      new Date().toLocaleDateString("vi-VN");

    document.querySelectorAll(".nav-item").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        switchView(link.getAttribute("data-view"));
      });
    });

    document.querySelectorAll(".quick-tile").forEach((tile) => {
      tile.addEventListener("click", (e) => {
        e.preventDefault();
        switchView(tile.getAttribute("data-nav"));
      });
    });

    document
      .getElementById("btnCreateNewReceipt")
      ?.addEventListener("click", () => window.open("receipt.html", "_blank"));
    document
      .getElementById("btnCreateNewExport")
      ?.addEventListener("click", () => window.open("export.html", "_blank"));

    document.getElementById("receiptTile")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchView("receipts");
    });
    document.getElementById("exportTile")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchView("exports");
    });

    await loadInventory();
    if (typeof initHome === "function") {
      await initHome();
      isInitialized = true;
    }

    if (isMobile()) {
      window.showSidebar();
    }

    switchView("home");
  }

  window.loadInventoryData = loadInventory;
  window.loadReceiptsData = loadReceipts;
  window.loadExportsData = loadExports;
  window.resetAllData = resetAllData;

  init();
})();
