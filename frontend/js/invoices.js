/**
 * ==================== INVOICES MODULE ====================
 * Quản lý hóa đơn - Admin nhập, Quản lý duyệt
 */

(function () {
  "use strict";

  let currentPage = 1;
  const rowsPerPage = 10;
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
    Utils.showLoading(true, "Đang tải dữ liệu...");
    try {
      const token = API.getToken();

      // Lấy danh sách phiếu xuất đã duyệt chưa có hóa đơn
      const noInvoiceResponse = await fetch(
        API_BASE_URL + "/invoice/exports-without-invoice",
        {
          headers: { Authorization: "Bearer " + token },
        },
      );
      const noInvoiceResult = await noInvoiceResponse.json();

      // Lấy danh sách yêu cầu hóa đơn
      const requestsResponse = await fetch(API_BASE_URL + "/invoice/requests", {
        headers: { Authorization: "Bearer " + token },
      });
      const requestsResult = await requestsResponse.json();

      // Gộp dữ liệu
      const noInvoice = noInvoiceResult.success ? noInvoiceResult.data : [];
      const requests = requestsResult.success ? requestsResult.data : [];

      allData = [];

      // Thêm phiếu chưa có hóa đơn
      noInvoice.forEach((item) => {
        allData.push({
          ...item,
          _type: "no-invoice",
          invoiceStatus: "no-invoice",
        });
      });

      // Thêm yêu cầu hóa đơn
      requests.forEach((item) => {
        allData.push({
          ...item,
          _type: "request",
          invoiceStatus: item.status,
        });
      });

      // Sắp xếp: chưa có hóa đơn lên đầu, sau đó là pending
      allData.sort((a, b) => {
        const order = { "no-invoice": 0, pending: 1, approved: 2, rejected: 3 };
        return (order[a.invoiceStatus] || 99) - (order[b.invoiceStatus] || 99);
      });

      updateStats();
      filterAndRender();
    } catch (error) {
      console.error("❌ Load invoice data error:", error);
      Utils.showToast("Lỗi khi tải dữ liệu", "error");
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

    // Badge trên sidebar
    const totalPending = pending.length + noInvoice.length;
    if (badge) {
      if (totalPending > 0) {
        badge.style.display = "inline";
        badge.textContent = totalPending;
      } else {
        badge.style.display = "none";
      }
    }
  }

  // ==================== FILTER & RENDER ====================
  function filterAndRender() {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const status = statusFilter?.value || "all";

    let filtered = [...allData];

    if (status !== "all") {
      filtered = filtered.filter((item) => item.invoiceStatus === status);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          (item.exportNo || "").toLowerCase().includes(searchTerm) ||
          (item.receiverName || "").toLowerCase().includes(searchTerm) ||
          (item.customerName || "").toLowerCase().includes(searchTerm),
      );
    }

    renderList(filtered);
  }

  // ==================== RENDER LIST ====================
  function renderList(data) {
    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = `
        <div class="empty-receipts">
          <i class="fas fa-file-invoice"></i>
          <p>Không có dữ liệu hóa đơn</p>
          <small>Phiếu xuất đã duyệt sẽ hiển thị tại đây</small>
        </div>
      `;
      return;
    }

    container.innerHTML = data
      .map((item) => {
        const isNoInvoice = item.invoiceStatus === "no-invoice";
        const isPending = item.invoiceStatus === "pending";
        const isApproved = item.invoiceStatus === "approved";
        const isRejected = item.invoiceStatus === "rejected";

        let statusBadge = "";
        let statusClass = "";
        let statusText = "";

        if (isNoInvoice) {
          statusBadge = `<span class="status-badge status-pending">🔴 Chưa nhập hóa đơn</span>`;
          statusClass = "no-invoice";
        } else if (isPending) {
          statusBadge = `<span class="status-badge status-pending">🟡 Chờ duyệt</span>`;
          statusClass = "pending";
        } else if (isApproved) {
          statusBadge = `<span class="status-badge status-approved">🟢 Đã hoàn thành</span>`;
          statusClass = "approved";
        } else if (isRejected) {
          statusBadge = `<span class="status-badge status-rejected">🔴 Bị từ chối</span>`;
          statusClass = "rejected";
        }

        // Button actions
        let actionButton = "";
        if (isNoInvoice) {
          actionButton = `
            <button class="btn btn-primary btn-sm" onclick="window.openInvoiceModal(${item.id})" style="font-size:12px; padding:4px 14px;">
              <i class="fas fa-pen"></i> Nhập hóa đơn
            </button>
          `;
        } else if (isPending) {
          actionButton = `
            <span style="color: #fbbf24; font-size: 12px;">
              <i class="fas fa-spinner fa-spin"></i> Đang chờ duyệt
            </span>
          `;
        } else if (isApproved) {
          actionButton = `
            <span style="color: #4ade80; font-size: 12px;">
              <i class="fas fa-check-circle"></i> Đã hoàn thành
            </span>
          `;
        }

        return `
          <div class="receipt-card invoice-card ${statusClass}" data-id="${item.id}" style="border-left: 4px solid ${
            isNoInvoice
              ? "#f87171"
              : isPending
                ? "#fbbf24"
                : isApproved
                  ? "#4ade80"
                  : "#ef4444"
          };">
            <div class="receipt-card-header">
              <div class="receipt-card-id">
                <i class="fas fa-file-export"></i> ${Utils.escapeHtml(item.exportNo || "PX-" + item.id)}
              </div>
              <div class="receipt-card-date">
                <i class="far fa-calendar-alt"></i> ${Utils.formatDate(item.exportDate || item.createdAt)}
              </div>
              ${statusBadge}
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
            <div class="receipt-card-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="font-size: 11px; color: #6b82a0;">
                ${isNoInvoice ? "🔴 Chưa có thông tin hóa đơn" : ""}
                ${isPending ? "🟡 Đã nhập hóa đơn, chờ Quản lý duyệt" : ""}
                ${isApproved ? "🟢 Đã có đầy đủ thông tin hóa đơn" : ""}
                ${isRejected ? "🔴 Bị từ chối" : ""}
              </div>
              <div>
                ${actionButton}
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // ==================== OPEN INVOICE MODAL ====================
  window.openInvoiceModal = function (exportId) {
    const item = allData.find((d) => d.id === exportId);
    if (!item) {
      Utils.showToast("Không tìm thấy phiếu xuất", "error");
      return;
    }

    // Tạo modal
    const overlay = document.createElement("div");
    overlay.className = "request-modal-overlay";
    overlay.id = "invoiceModal";
    overlay.innerHTML = `
      <div class="request-modal" style="max-width: 700px;">
        <div class="request-modal-header">
          <h3 style="color: #60a5fa;">📄 Nhập thông tin hóa đơn</h3>
          <button class="request-modal-close" onclick="window.closeInvoiceModal()">&times;</button>
        </div>

        <div style="background: #0f172a; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #1e2d45;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 13px;">
            <div><span style="color: #6b82a0;">Số phiếu:</span> <span style="color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(item.exportNo)}</span></div>
            <div><span style="color: #6b82a0;">Ngày xuất:</span> <span style="color: #e2eaf5;">${Utils.formatDate(item.exportDate)}</span></div>
            <div><span style="color: #6b82a0;">Khách hàng:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(item.customerName || item.receiverName || "—")}</span></div>
            <div><span style="color: #6b82a0;">Tổng tiền:</span> <span style="color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(item.total)}</span></div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #60a5fa; margin-bottom: 8px;">
            📄 Thông tin hóa đơn nhập
          </label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="font-size: 12px; color: #6b82a0; display: block; margin-bottom: 4px;">Số hóa đơn nhập *</label>
              <input type="text" id="invoiceSoHoaDonNhap" placeholder="VD: HD001/2026" style="width:100%; padding:8px 12px; background:#1a2235; border:1px solid #1e2d45; border-radius:6px; color:#e2eaf5; font-size:13px;">
            </div>
            <div>
              <label style="font-size: 12px; color: #6b82a0; display: block; margin-bottom: 4px;">Ngày hóa đơn nhập *</label>
              <input type="date" id="invoiceNgayNhapHD" style="width:100%; padding:8px 12px; background:#1a2235; border:1px solid #1e2d45; border-radius:6px; color:#e2eaf5; font-size:13px;">
            </div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #60a5fa; margin-bottom: 8px;">
            📄 Thông tin hóa đơn xuất
          </label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="font-size: 12px; color: #6b82a0; display: block; margin-bottom: 4px;">Số hóa đơn xuất *</label>
              <input type="text" id="invoiceSoHoaDonXuat" placeholder="VD: HDX001/2026" style="width:100%; padding:8px 12px; background:#1a2235; border:1px solid #1e2d45; border-radius:6px; color:#e2eaf5; font-size:13px;">
            </div>
            <div>
              <label style="font-size: 12px; color: #6b82a0; display: block; margin-bottom: 4px;">Ngày hóa đơn xuất *</label>
              <input type="date" id="invoiceNgayXuatHD" style="width:100%; padding:8px 12px; background:#1a2235; border:1px solid #1e2d45; border-radius:6px; color:#e2eaf5; font-size:13px;">
            </div>
          </div>
        </div>

        <div style="padding: 8px 12px; background: rgba(239, 68, 68, 0.08); border-radius: 6px; margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.15);">
          <p style="font-size: 12px; color: #f87171; margin: 0;">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Lưu ý:</strong> Sau khi gửi, Quản lý sẽ duyệt và lưu vào tồn kho. KHÔNG cộng dồn hàng hóa.
          </p>
        </div>

        <div class="request-actions" style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 16px; border-top: 1px solid #1e2d45;">
          <button class="btn btn-outline" onclick="window.closeInvoiceModal()">Hủy</button>
          <button class="btn btn-success" onclick="window.submitInvoice(${exportId})">
            <i class="fas fa-paper-plane"></i> Gửi duyệt
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
  };

  // ==================== CLOSE INVOICE MODAL ====================
  window.closeInvoiceModal = function () {
    const modal = document.getElementById("invoiceModal");
    if (modal) {
      modal.remove();
      document.body.style.overflow = "";
    }
  };

  // ==================== SUBMIT INVOICE ====================
  window.submitInvoice = async function (exportId) {
    const soHoaDonNhap = document
      .getElementById("invoiceSoHoaDonNhap")
      ?.value.trim();
    const ngayNhapHD = document.getElementById("invoiceNgayNhapHD")?.value;
    const soHoaDonXuat = document
      .getElementById("invoiceSoHoaDonXuat")
      ?.value.trim();
    const ngayXuatHD = document.getElementById("invoiceNgayXuatHD")?.value;

    if (!soHoaDonNhap || !ngayNhapHD || !soHoaDonXuat || !ngayXuatHD) {
      Utils.showToast("⚠️ Vui lòng nhập đầy đủ 4 trường hóa đơn!", "warning");
      return;
    }

    Utils.showLoading(true, "Đang gửi yêu cầu...");
    try {
      const token = API.getToken();
      const response = await fetch(API_BASE_URL + "/invoice/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          exportId: exportId,
          soHoaDonNhap: soHoaDonNhap,
          ngayNhapHD: ngayNhapHD,
          soHoaDonXuat: soHoaDonXuat,
          ngayXuatHD: ngayXuatHD,
        }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ " + result.message);
        closeInvoiceModal();
        loadData();
      } else {
        Utils.showToast("❌ " + result.message, "error");
      }
    } catch (error) {
      console.error("Submit invoice error:", error);
      Utils.showToast("❌ " + (error.message || "Lỗi server"), "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ==================== BIND EVENTS ====================
  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        filterAndRender();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        filterAndRender();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadData);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (statusFilter) statusFilter.value = "all";
        filterAndRender();
      });
    }
  }

  // ==================== INIT ====================
  function init() {
    loadData();
    bindEvents();
  }

  window.loadInvoiceData = loadData;
  window.openInvoiceModal = openInvoiceModal;
  window.closeInvoiceModal = closeInvoiceModal;
  window.submitInvoice = submitInvoice;

  init();
})();
