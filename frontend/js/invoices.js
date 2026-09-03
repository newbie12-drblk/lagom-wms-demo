/**
 * ==================== INVOICES MODULE ====================
 * Quản lý hóa đơn - Admin nhập, Quản lý duyệt
 */

(function () {
  "use strict";

  let allData = [];

  // DOM Elements
  const container = document.getElementById("invoicesList");
  const searchInput = document.getElementById("searchInvoice");
  const statusFilter = document.getElementById("invoiceFilterStatus");
  const refreshBtn = document.getElementById("btnRefreshInvoices");
  const clearBtn = document.getElementById("btnClearInvoiceFilters");
  const badge = document.getElementById("invoiceBadge");

  // Stats elements
  const noInvoiceEl = document.getElementById("invoiceNoInvoice");
  const pendingEl = document.getElementById("invoicePending");
  const approvedEl = document.getElementById("invoiceApproved");
  const rejectedEl = document.getElementById("invoiceRejected");

  // ==================== LOAD DATA ====================
  async function loadData() {
    Utils.showLoading(true, "Đang tải...");
    try {
      const token = API.getToken();

      // Lấy phiếu xuất chưa có hóa đơn
      const noInvoiceRes = await fetch(
        API_BASE_URL + "/invoice/exports-without-invoice",
        { headers: { Authorization: "Bearer " + token } },
      );
      const noInvoiceResult = await noInvoiceRes.json();

      // Lấy yêu cầu hóa đơn
      const requestsRes = await fetch(API_BASE_URL + "/invoice/requests", {
        headers: { Authorization: "Bearer " + token },
      });
      const requestsResult = await requestsRes.json();

      const noInvoice = noInvoiceResult.success ? noInvoiceResult.data : [];
      const requests = requestsResult.success ? requestsResult.data : [];

      allData = [];

      noInvoice.forEach((item) => {
        allData.push({ ...item, invoiceStatus: "no-invoice" });
      });

      requests.forEach((item) => {
        allData.push({ ...item, invoiceStatus: item.status });
      });

      // Sắp xếp: chưa nhập → chờ duyệt → hoàn thành → từ chối
      allData.sort((a, b) => {
        const order = { "no-invoice": 0, pending: 1, approved: 2, rejected: 3 };
        return (order[a.invoiceStatus] || 99) - (order[b.invoiceStatus] || 99);
      });

      updateStats();
      render();
    } catch (error) {
      console.error("Load error:", error);
      Utils.showToast("Lỗi tải dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ==================== UPDATE STATS ====================
  function updateStats() {
    const noInvoice = allData.filter((d) => d.invoiceStatus === "no-invoice");
    const pending = allData.filter((d) => d.invoiceStatus === "pending");
    const approved = allData.filter((d) => d.invoiceStatus === "approved");
    const rejected = allData.filter((d) => d.invoiceStatus === "rejected");

    if (noInvoiceEl) noInvoiceEl.textContent = noInvoice.length;
    if (pendingEl) pendingEl.textContent = pending.length;
    if (approvedEl) approvedEl.textContent = approved.length;
    if (rejectedEl) rejectedEl.textContent = rejected.length;

    const total = pending.length + noInvoice.length;
    if (badge) {
      badge.style.display = total > 0 ? "inline" : "none";
      badge.textContent = total;
    }
  }

  // ==================== TOGGLE FORM ====================
  function toggleForm(exportId) {
    const form = document.getElementById("invoiceForm_" + exportId);
    if (!form) return;

    // Đóng các form khác
    document.querySelectorAll(".invoice-form-container").forEach((el) => {
      if (el.id !== "invoiceForm_" + exportId) {
        el.style.display = "none";
      }
    });

    form.style.display = form.style.display === "none" ? "block" : "none";
  }

  // ==================== SUBMIT INVOICE ====================
  async function submitInvoice(exportId) {
    const soHoaDonNhap = document
      .getElementById("soHoaDonNhap_" + exportId)
      ?.value.trim();
    const ngayNhapHD = document.getElementById("ngayNhapHD_" + exportId)?.value;
    const soHoaDonXuat = document
      .getElementById("soHoaDonXuat_" + exportId)
      ?.value.trim();
    const ngayXuatHD = document.getElementById("ngayXuatHD_" + exportId)?.value;

    if (!soHoaDonNhap || !ngayNhapHD || !soHoaDonXuat || !ngayXuatHD) {
      Utils.showToast("⚠️ Nhập đủ 4 trường!", "warning");
      return;
    }

    Utils.showLoading(true, "Đang gửi...");
    try {
      const token = API.getToken();
      const res = await fetch(API_BASE_URL + "/invoice/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          exportId,
          soHoaDonNhap,
          ngayNhapHD,
          soHoaDonXuat,
          ngayXuatHD,
        }),
      });
      const result = await res.json();

      if (result.success) {
        Utils.showToast("✅ " + result.message);
        document.getElementById("invoiceForm_" + exportId).style.display =
          "none";
        loadData();
      } else {
        Utils.showToast("❌ " + result.message, "error");
      }
    } catch (error) {
      Utils.showToast("❌ Lỗi server", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ==================== RENDER ====================
  function render() {
    if (!container) return;

    const search = searchInput?.value.toLowerCase() || "";
    const status = statusFilter?.value || "all";

    let filtered = [...allData];

    if (status !== "all") {
      filtered = filtered.filter((item) => item.invoiceStatus === status);
    }

    if (search) {
      filtered = filtered.filter(
        (item) =>
          (item.exportNo || "").toLowerCase().includes(search) ||
          (item.customerName || "").toLowerCase().includes(search) ||
          (item.receiverName || "").toLowerCase().includes(search),
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-receipts">
          <i class="fas fa-file-invoice"></i>
          <p>Không có dữ liệu hóa đơn</p>
          <small>Phiếu xuất đã duyệt sẽ hiển thị tại đây</small>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map((item) => {
        const isNo = item.invoiceStatus === "no-invoice";
        const isPending = item.invoiceStatus === "pending";
        const isApproved = item.invoiceStatus === "approved";
        const isRejected = item.invoiceStatus === "rejected";

        let color = "#6b82a0";
        let badgeText = "";
        let badgeClass = "";

        if (isNo) {
          color = "#f87171";
          badgeText = "🔴 Chưa nhập";
          badgeClass = "status-pending";
        } else if (isPending) {
          color = "#fbbf24";
          badgeText = "🟡 Chờ duyệt";
          badgeClass = "status-pending";
        } else if (isApproved) {
          color = "#4ade80";
          badgeText = "🟢 Hoàn thành";
          badgeClass = "status-approved";
        } else if (isRejected) {
          color = "#ef4444";
          badgeText = "🔴 Từ chối";
          badgeClass = "status-rejected";
        }

        // Nút hành động
        let actions = "";
        if (isNo) {
          actions = `
          <button class="btn-create-invoice" onclick="window.toggleInvoiceForm(${item.id})">
            <i class="fas fa-plus-circle"></i> Tạo hóa đơn
          </button>
        `;
        } else if (isPending) {
          actions = `<span style="color:#fbbf24;font-size:12px;"><i class="fas fa-spinner fa-spin"></i> Đang chờ</span>`;
        } else if (isApproved) {
          actions = `<span style="color:#4ade80;font-size:12px;"><i class="fas fa-check-circle"></i> Hoàn thành</span>`;
        } else if (isRejected) {
          actions = `<span style="color:#f87171;font-size:12px;"><i class="fas fa-times-circle"></i> Từ chối</span>`;
        }

        // Form nhập 4 trường (chỉ hiện khi chưa có)
        let formHtml = "";
        if (isNo) {
          formHtml = `
          <div class="invoice-form-container" id="invoiceForm_${item.id}" style="display:none;">
            <div class="invoice-form-grid">
              <div class="invoice-form-group">
                <label><span class="required">*</span> Số hóa đơn nhập</label>
                <input type="text" id="soHoaDonNhap_${item.id}" placeholder="VD: HD001/2026">
              </div>
              <div class="invoice-form-group">
                <label><span class="required">*</span> Ngày hóa đơn nhập</label>
                <input type="date" id="ngayNhapHD_${item.id}">
              </div>
              <div class="invoice-form-group">
                <label><span class="required">*</span> Số hóa đơn xuất</label>
                <input type="text" id="soHoaDonXuat_${item.id}" placeholder="VD: HDX001/2026">
              </div>
              <div class="invoice-form-group">
                <label><span class="required">*</span> Ngày hóa đơn xuất</label>
                <input type="date" id="ngayXuatHD_${item.id}">
              </div>
            </div>
            <div class="invoice-form-actions">
              <button class="btn-cancel-invoice" onclick="window.toggleInvoiceForm(${item.id})">
                <i class="fas fa-times"></i> Hủy
              </button>
              <button class="btn-submit-invoice" onclick="window.submitInvoice(${item.id})">
                <i class="fas fa-paper-plane"></i> Gửi duyệt
              </button>
            </div>
            <div class="invoice-form-note">
              <p><i class="fas fa-exclamation-triangle"></i> Sau khi gửi, Quản lý sẽ duyệt và lưu vào tồn kho.</p>
            </div>
          </div>
        `;
        }

        // Thông tin hóa đơn (nếu đã có)
        let infoHtml = "";
        if (isPending || isApproved || isRejected) {
          infoHtml = `
          <div class="invoice-info">
            <div><span class="label">Số HĐ nhập:</span> <span class="value highlight">${Utils.escapeHtml(item.soHoaDonNhap || "—")}</span></div>
            <div><span class="label">Ngày HĐ nhập:</span> <span class="value">${Utils.formatDate(item.ngayNhapHD)}</span></div>
            <div><span class="label">Số HĐ xuất:</span> <span class="value highlight">${Utils.escapeHtml(item.soHoaDonXuat || "—")}</span></div>
            <div><span class="label">Ngày HĐ xuất:</span> <span class="value">${Utils.formatDate(item.ngayXuatHD)}</span></div>
          </div>
        `;
        }

        return `
        <div class="receipt-card invoice-card" style="border-left:4px solid ${color};">
          <div class="receipt-card-header">
            <div class="receipt-card-id">
              <i class="fas fa-file-export"></i> ${Utils.escapeHtml(item.exportNo || "PX-" + item.id)}
            </div>
            <div class="receipt-card-date">
              <i class="far fa-calendar-alt"></i> ${Utils.formatDate(item.exportDate || item.createdAt)}
            </div>
            <span class="status-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="receipt-card-body">
            <div class="receipt-card-info">
              <div class="label">Khách hàng</div>
              <div class="value">${Utils.escapeHtml(item.customerName || item.receiverName || "—")}</div>
            </div>
            <div class="receipt-card-info">
              <div class="label">Người nhận</div>
              <div class="value">${Utils.escapeHtml(item.receiverName || "—")}</div>
            </div>
            <div class="receipt-card-total">
              <div class="label">Tổng tiền</div>
              <div class="value">${Utils.formatCurrency(item.total || 0)}</div>
            </div>
          </div>
          <div class="receipt-card-footer">
            <div class="status-text">
              ${isNo ? "🔴 Chưa có thông tin hóa đơn" : ""}
              ${isPending ? "🟡 Đã nhập, chờ duyệt" : ""}
              ${isApproved ? "🟢 Đã có đầy đủ thông tin" : ""}
              ${isRejected ? "🔴 Bị từ chối" : ""}
            </div>
            <div class="actions">${actions}</div>
          </div>
          ${infoHtml}
          ${formHtml}
        </div>
      `;
      })
      .join("");
  }

  // ==================== BIND EVENTS ====================
  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener("input", render);
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", render);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadData);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (statusFilter) statusFilter.value = "all";
        render();
      });
    }
  }

  // ==================== EXPOSE ====================
  window.loadInvoiceData = loadData;
  window.toggleInvoiceForm = toggleForm;
  window.submitInvoice = submitInvoice;

  // ==================== INIT ====================
  function init() {
    loadData();
    bindEvents();
  }

  init();
})();
