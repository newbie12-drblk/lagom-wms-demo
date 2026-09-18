// js/invoices.js
/**
 * ==================== INVOICES MODULE ====================
 * Quản lý hóa đơn — Module ĐỘC LẬP
 *
 * Flow:
 *   1. Admin bấm "Tạo hóa đơn mới" → chuyển sang màn hình tạo
 *   2. Nhập Mã hàng VÀ/HOẶC Ngày xuất kho → Hệ thống show danh sách SP
 *   3. Chọn 1 dòng SP → hiện form nhập 4 trường HĐ
 *   4. Gửi Quản lý duyệt → sinh mã HD-YYYY-NNN
 *   5. Quản lý duyệt → cập nhật 4 trường vào ĐÚNG dòng inventory
 */

(function () {
  "use strict";

  let allData = [];
  let currentUser = null;
  let selectedInventory = null;

  // ============================================================
  // DOM ELEMENTS
  // ============================================================
  const listView = document.getElementById("invoiceListView");
  const createView = document.getElementById("invoiceCreateView");
  const container = document.getElementById("invoicesList");
  const searchInput = document.getElementById("searchInvoice");
  const statusFilter = document.getElementById("invoiceFilterStatus");
  const refreshBtn = document.getElementById("btnRefreshInvoices");
  const clearBtn = document.getElementById("btnClearInvoiceFilters");

  const noInvoiceEl = document.getElementById("invoiceNoInvoice");
  const pendingEl = document.getElementById("invoicePending");
  const approvedEl = document.getElementById("invoiceApproved");
  const rejectedEl = document.getElementById("invoiceRejected");

  // ============================================================
  // USER
  // ============================================================
  function getCurrentUser() {
    if (currentUser) return currentUser;
    const session = localStorage.getItem("lagom_session");
    if (session) {
      try {
        currentUser = JSON.parse(session);
        return currentUser;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function isAdmin() {
    const user = getCurrentUser();
    return user && user.roleId === "admin";
  }

  function isManager() {
    const user = getCurrentUser();
    return user && user.roleId === "quan_ly";
  }

  // ============================================================
  // LOAD DATA — Admin gọi /requests/my, Quản lý gọi /requests
  // ============================================================
  async function loadData() {
    Utils.showLoading(true, "Đang tải...");
    try {
      const token = API.getToken();
      const user = getCurrentUser();

      let url;
      if (user && user.roleId === "admin") {
        url = API_BASE_URL + "/invoice/requests/my";
      } else {
        url = API_BASE_URL + "/invoice/requests";
      }

      const res = await fetch(url, {
        headers: { Authorization: "Bearer " + token },
      });
      const result = await res.json();

      if (result.success) {
        allData = result.data || [];
        updateStats();
        renderList();
      } else {
        Utils.showToast("Lỗi: " + (result.message || ""), "error");
      }
    } catch (error) {
      console.error("❌ Load error:", error);
      Utils.showToast("Lỗi tải dữ liệu: " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // STATS
  // ============================================================
  function updateStats() {
    const pending = allData.filter((d) => d.status === "pending").length;
    const approved = allData.filter((d) => d.status === "approved").length;
    const rejected = allData.filter((d) => d.status === "rejected").length;

    if (noInvoiceEl) noInvoiceEl.textContent = allData.length;
    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (rejectedEl) rejectedEl.textContent = rejected;
  }

  // ============================================================
  // RENDER LIST (MÀN HÌNH 1)
  // ============================================================
  function renderList() {
    if (!container) return;

    const search = searchInput?.value.toLowerCase() || "";
    const status = statusFilter?.value || "all";

    let filtered = [...allData];

    if (status !== "all") {
      filtered = filtered.filter((item) => item.status === status);
    }

    if (search) {
      filtered = filtered.filter(
        (item) =>
          (item.soHoaDonCode || "").toLowerCase().includes(search) ||
          (item.maHang || "").toLowerCase().includes(search) ||
          (item.tenThuongMai || "").toLowerCase().includes(search) ||
          (item.soHoaDonNhap || "").toLowerCase().includes(search) ||
          (item.soHoaDonXuat || "").toLowerCase().includes(search),
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-receipts">
          <i class="fas fa-file-invoice" style="font-size:48px;display:block;margin-bottom:16px;opacity:0.4;"></i>
          <p>Không có hóa đơn nào</p>
          <small>Nhấn "Tạo hóa đơn mới" để bắt đầu</small>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map((item) => renderInvoiceCard(item))
      .join("");
  }

  function renderInvoiceCard(item) {
    let badgeText = "";
    let badgeClass = "";
    let borderColor = "";

    if (item.status === "pending") {
      badgeText = "⏳ Chờ duyệt";
      badgeClass = "status-pending";
      borderColor = "#fbbf24";
    } else if (item.status === "approved") {
      badgeText = "✅ Đã duyệt";
      badgeClass = "status-approved";
      borderColor = "#4ade80";
    } else if (item.status === "rejected") {
      badgeText = "❌ Từ chối";
      badgeClass = "status-rejected";
      borderColor = "#f87171";
    }

    return `
      <div class="receipt-card invoice-card" style="border-left:4px solid ${borderColor}; margin-bottom: 14px;">
        <div class="receipt-card-header">
          <div class="receipt-card-id" style="display:flex; align-items:center; gap:8px;">
            <i class="fas fa-file-invoice" style="color:${borderColor};"></i>
            <strong style="color: #60a5fa; font-size: 16px;">${Utils.escapeHtml(item.soHoaDonCode || "—")}</strong>
          </div>
          <div class="receipt-card-date">
            <i class="far fa-calendar-alt"></i> ${Utils.formatDate(item.createdAt)}
          </div>
          <span class="status-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="receipt-card-body" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
          <div class="receipt-card-info">
            <div class="label">Sản phẩm</div>
            <div class="value" style="color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(item.tenThuongMai || "—")}</div>
          </div>
          <div class="receipt-card-info">
            <div class="label">Mã hàng</div>
            <div class="value" style="color: #93c5fd; font-family: monospace;">${Utils.escapeHtml(item.maHang || "—")}</div>
          </div>
          <div class="receipt-card-info">
            <div class="label">Số lô</div>
            <div class="value">${Utils.escapeHtml(item.soLot || "—")}</div>
          </div>
          <div class="receipt-card-info">
            <div class="label">Số HĐ nhập</div>
            <div class="value">${Utils.escapeHtml(item.soHoaDonNhap || "—")}</div>
          </div>
          <div class="receipt-card-info">
            <div class="label">Ngày HĐ nhập</div>
            <div class="value">${Utils.formatDate(item.ngayNhapHD)}</div>
          </div>
          <div class="receipt-card-info">
            <div class="label">Số HĐ xuất</div>
            <div class="value">${Utils.escapeHtml(item.soHoaDonXuat || "—")}</div>
          </div>
          <div class="receipt-card-info">
            <div class="label">Ngày HĐ xuất</div>
            <div class="value">${Utils.formatDate(item.ngayXuatHD)}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // CHUYỂN MÀN HÌNH
  // ============================================================
  function showCreateView() {
    if (!isAdmin()) {
      Utils.showToast("Chỉ Admin mới có quyền tạo hóa đơn", "warning");
      return;
    }

    if (listView) listView.style.display = "none";
    if (createView) {
      createView.style.display = "block";
      resetCreateForm();
    }
  }

  function hideCreateView() {
    if (createView) createView.style.display = "none";
    if (listView) listView.style.display = "block";
    loadData();
  }

  // ============================================================
  // RESET FORM TẠO
  // ============================================================
  function resetCreateForm() {
    selectedInventory = null;

    const maHangInput = document.getElementById("createMaHang");
    const ngayXuatInput = document.getElementById("createNgayXuat");
    const resultsSection = document.getElementById("searchResultsSection");
    const invoiceFormSection = document.getElementById("invoiceFormSection");

    if (maHangInput) maHangInput.value = "";
    if (ngayXuatInput) ngayXuatInput.value = "";
    if (resultsSection) resultsSection.style.display = "none";
    if (invoiceFormSection) invoiceFormSection.style.display = "none";

    const inputs = [
      "createSoHoaDonNhap",
      "createNgayNhapHD",
      "createSoHoaDonXuat",
      "createNgayXuatHD",
    ];
    inputs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    if (maHangInput) maHangInput.focus();
  }

  // ============================================================
  // TÌM SẢN PHẨM — Gửi CẢ 2 key nếu có
  // ============================================================
  async function searchProduct() {
    const maHang = document.getElementById("createMaHang")?.value.trim() || "";
    const ngayXuatHD =
      document.getElementById("createNgayXuat")?.value.trim() || "";

    if (!maHang && !ngayXuatHD) {
      Utils.showToast(
        "⚠️ Vui lòng nhập Mã hàng hoặc Ngày xuất để tìm",
        "warning",
      );
      return;
    }

    Utils.showLoading(true, "Đang tìm sản phẩm...");
    try {
      const token = API.getToken();

      const params = new URLSearchParams();
      if (maHang) params.append("maHang", maHang);
      if (ngayXuatHD) params.append("ngayXuatHD", ngayXuatHD);

      const url = `${API_BASE_URL}/invoice/search-product?${params.toString()}`;

      const res = await fetch(url, {
        headers: { Authorization: "Bearer " + token },
      });
      const result = await res.json();

      if (result.success) {
        renderSearchResults(result.data || []);
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi tìm kiếm"), "error");
      }
    } catch (error) {
      console.error("❌ Search error:", error);
      Utils.showToast("❌ Lỗi: " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderSearchResults(items) {
    const resultsSection = document.getElementById("searchResultsSection");
    const resultsBody = document.getElementById("searchResultsBody");
    const resultsCount = document.getElementById("searchResultsCount");

    if (!resultsSection || !resultsBody) return;

    resultsSection.style.display = "block";

    if (items.length === 0) {
      if (resultsCount) resultsCount.textContent = "0";
      resultsBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding: 40px; color: #6b82a0;">
            <i class="fas fa-search" style="font-size: 32px; display: block; margin-bottom: 12px; opacity: 0.4;"></i>
            Không tìm thấy sản phẩm nào
          </td>
        </tr>
      `;
      return;
    }

    if (resultsCount) resultsCount.textContent = items.length;

    resultsBody.innerHTML = items
      .map(
        (it, idx) => `
      <tr style="border-bottom: 1px solid #1e2d45;">
        <td style="padding: 8px; text-align: center; color: #e2eaf5;">${idx + 1}</td>
        <td style="padding: 8px; color: #93c5fd; font-family: monospace;">${Utils.escapeHtml(it.maHang || "—")}</td>
        <td style="padding: 8px; color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(it.tenThuongMai || "—")}</td>
        <td style="padding: 8px; color: #e2eaf5;">${Utils.escapeHtml(it.soLot || "—")}</td>
        <td style="padding: 8px; color: #e2eaf5;">${Utils.escapeHtml(it.soHopDongNhap || "—")}</td>
        <td style="padding: 8px; text-align: center; color: #e2eaf5;">${Utils.formatDate(it.ngayNhapHD)}</td>
        <td style="padding: 8px; text-align: center; color: #e2eaf5;">${Utils.formatDate(it.ngayXuatHD)}</td>
        <td style="padding: 8px; text-align: right; color: #86efac; font-weight: 600;">${it.tonKho || 0}</td>
        <td style="padding: 8px; text-align: center; color: ${it.ngayHetHan && new Date(it.ngayHetHan) < new Date() ? "#f87171" : "#e2eaf5"};">${Utils.formatDate(it.ngayHetHan)}</td>
        <td style="padding: 8px; text-align: center;">
          <button onclick="window.selectProduct(${it.id})" 
                  style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
            <i class="fas fa-check"></i> Chọn
          </button>
        </td>
      </tr>
    `,
      )
      .join("");

    window._searchResults = items;
  }

  // ============================================================
  // CHỌN SẢN PHẨM
  // ============================================================
  function selectProduct(inventoryId) {
    const items = window._searchResults || [];
    const item = items.find((it) => it.id === inventoryId);

    if (!item) {
      Utils.showToast("❌ Không tìm thấy sản phẩm", "error");
      return;
    }

    selectedInventory = item;

    const invoiceFormSection = document.getElementById("invoiceFormSection");
    if (invoiceFormSection) invoiceFormSection.style.display = "block";

    const infoEl = document.getElementById("selectedProductInfo");
    if (infoEl) {
      infoEl.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px 16px;">
          <div><span style="color: #6b82a0; font-size: 11px;">Mã hàng:</span><br><strong style="color: #93c5fd; font-family: monospace;">${Utils.escapeHtml(item.maHang || "—")}</strong></div>
          <div><span style="color: #6b82a0; font-size: 11px;">Tên SP:</span><br><strong style="color: #60a5fa;">${Utils.escapeHtml(item.tenThuongMai || "—")}</strong></div>
          <div><span style="color: #6b82a0; font-size: 11px;">Số lô:</span><br><strong style="color: #e2eaf5;">${Utils.escapeHtml(item.soLot || "—")}</strong></div>
          <div><span style="color: #6b82a0; font-size: 11px;">Số HĐ nhập:</span><br><strong style="color: #e2eaf5;">${Utils.escapeHtml(item.soHopDongNhap || "—")}</strong></div>
          <div><span style="color: #6b82a0; font-size: 11px;">Ngày nhập:</span><br><strong style="color: #e2eaf5;">${Utils.formatDate(item.ngayNhapHD)}</strong></div>
          <div><span style="color: #6b82a0; font-size: 11px;">Ngày xuất:</span><br><strong style="color: #e2eaf5;">${Utils.formatDate(item.ngayXuatHD)}</strong></div>
          <div><span style="color: #6b82a0; font-size: 11px;">Tồn kho:</span><br><strong style="color: #86efac; font-size: 16px;">${item.tonKho || 0}</strong></div>
        </div>
      `;
    }

    const soHDNhapEl = document.getElementById("createSoHoaDonNhap");
    if (soHDNhapEl && !soHDNhapEl.value) {
      soHDNhapEl.value = item.soHoaDonNhap || item.soHopDongNhap || "";
    }

    if (invoiceFormSection) {
      invoiceFormSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ============================================================
  // SUBMIT TẠO HĐ
  // ============================================================
  async function submitCreateInvoice() {
    if (!selectedInventory) {
      Utils.showToast("⚠️ Vui lòng chọn sản phẩm trước", "warning");
      return;
    }

    const soHoaDonNhap = document
      .getElementById("createSoHoaDonNhap")
      ?.value.trim();
    const ngayNhapHD = document.getElementById("createNgayNhapHD")?.value;
    const soHoaDonXuat = document
      .getElementById("createSoHoaDonXuat")
      ?.value.trim();
    const ngayXuatHD = document.getElementById("createNgayXuatHD")?.value;

    if (!soHoaDonNhap || !ngayNhapHD) {
      Utils.showToast("⚠️ Vui lòng nhập Số HĐ nhập và Ngày HĐ nhập", "warning");
      return;
    }
    if (!soHoaDonXuat || !ngayXuatHD) {
      Utils.showToast("⚠️ Vui lòng nhập Số HĐ xuất và Ngày HĐ xuất", "warning");
      return;
    }

    if (
      !confirm(
        `Bạn có chắc muốn gửi yêu cầu hóa đơn cho sản phẩm "${selectedInventory.tenThuongMai}"?`,
      )
    )
      return;

    Utils.showLoading(true, "Đang gửi yêu cầu...");
    try {
      const token = API.getToken();
      const res = await fetch(API_BASE_URL + "/invoice/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          inventoryId: selectedInventory.id,
          maHang: selectedInventory.maHang,
          soHopDongNhap: selectedInventory.soHopDongNhap,
          soLot: selectedInventory.soLot,
          tenThuongMai: selectedInventory.tenThuongMai,
          soHoaDonNhap,
          ngayNhapHD,
          soHoaDonXuat,
          ngayXuatHD,
        }),
      });
      const result = await res.json();

      if (result.success) {
        Utils.showToast("✅ " + result.message);
        hideCreateView();
      } else {
        Utils.showToast(
          "❌ " + (result.message || "Không thể gửi yêu cầu"),
          "error",
        );
      }
    } catch (error) {
      console.error("❌ Submit error:", error);
      Utils.showToast("❌ Lỗi: " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // BIND EVENTS
  // ============================================================
  function bindEvents() {
    if (searchInput) searchInput.addEventListener("input", renderList);
    if (statusFilter) statusFilter.addEventListener("change", renderList);
    if (refreshBtn) refreshBtn.addEventListener("click", loadData);
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (statusFilter) statusFilter.value = "all";
        renderList();
      });
    }
  }

  // ============================================================
  // EXPOSE
  // ============================================================
  window.loadInvoiceData = loadData;
  window.showCreateInvoiceForm = showCreateView;
  window.hideCreateInvoiceForm = hideCreateView;
  window.searchProductForInvoice = searchProduct;
  window.selectProduct = selectProduct;
  window.submitCreateInvoice = submitCreateInvoice;

  function init() {
    console.log("🚀 Invoices module initialized");
    loadData();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
