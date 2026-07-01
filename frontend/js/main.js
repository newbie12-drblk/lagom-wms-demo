/**
 * ==================== MAIN MODULE ====================
 * Trang chủ cho role xem (index.html)
 */

(function () {
  "use strict";

  let inventoryData = [];

  // Check auth
  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html";
    return;
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

  // Render receipts list
  async function renderReceiptsList() {
    const container = document.getElementById("receiptsList");
    if (!container) return;

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

    document.getElementById("receiptTotalCount").textContent = filtered.length;
    document.getElementById("receiptTotalValue").textContent =
      Utils.formatCurrency(filtered.reduce((s, r) => s + (r.total || 0), 0));

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

    document.getElementById("exportTotalCount").textContent = filtered.length;
    document.getElementById("exportTotalValue").textContent =
      Utils.formatCurrency(filtered.reduce((s, r) => s + (r.total || 0), 0));

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-receipts"><i class="fas fa-inbox"></i><p>Chưa có phiếu xuất nào</p><small>Nhấn "Tạo phiếu xuất mới" để thêm phiếu</small></div>`;
      return;
    }

    container.innerHTML = filtered
      .map((item) => Components.createExportCard(item))
      .join("");
  }

  // Switch view
  async function switchView(viewName) {
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    document.getElementById(`view-${viewName}`)?.classList.add("active");

    document.querySelectorAll(".nav-item").forEach((item) => {
      if (item.dataset.view === viewName) item.classList.add("active");
      else item.classList.remove("active");
    });

    const titles = {
      home: "Trang chủ",
      inventory: "Tồn kho",
      receipts: "Phiếu nhập hàng",
      exports: "Phiếu xuất kho",
      statistics: "Thống kê",
    };
    const breadcrumb = document.getElementById("breadcrumb-title");
    if (breadcrumb && titles[viewName])
      breadcrumb.textContent = titles[viewName];

    if (viewName === "inventory" && typeof initInventory === "function") {
      await loadInventory();
      initInventory(inventoryData);
    } else if (viewName === "home" && typeof initHome === "function") {
      await loadInventory();
      initHome();
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
    }
  }

  // Init
  async function init() {
    updateTopbarUser();

    document.getElementById("currentDate").textContent =
      new Date().toLocaleDateString("vi-VN");

    // Navigation
    document.querySelectorAll(".nav-item").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        switchView(link.getAttribute("data-view"));
      });
    });

    // Quick tiles
    document.querySelectorAll(".quick-tile").forEach((tile) => {
      tile.addEventListener("click", (e) => {
        e.preventDefault();
        switchView(tile.getAttribute("data-nav"));
      });
    });

    // Create buttons
    document
      .getElementById("btnCreateNewReceipt")
      ?.addEventListener("click", () => window.open("receipt.html", "_blank"));
    document
      .getElementById("btnCreateNewExport")
      ?.addEventListener("click", () => window.open("export.html", "_blank"));

    // Tiles
    document.getElementById("receiptTile")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchView("receipts");
    });
    document.getElementById("exportTile")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchView("exports");
    });

    // Initialize
    await loadInventory();
    if (typeof initHome === "function") initHome();
    switchView("home");
  }

  // Export for other modules
  window.loadInventoryData = loadInventory;
  window.loadReceiptsData = loadReceipts;
  window.loadExportsData = loadExports;

  init();
})();
