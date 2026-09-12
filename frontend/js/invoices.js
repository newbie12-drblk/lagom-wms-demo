/**
 * ==================== INVOICES MODULE ====================
 * Quản lý hóa đơn - Admin nhập 4 trường HĐ CHO TỪNG ITEM
 */

(function () {
  "use strict";

  let allData = [];
  let currentUser = null;
  let exportItemsCache = {};

  const container = document.getElementById("invoicesList");
  const searchInput = document.getElementById("searchInvoice");
  const statusFilter = document.getElementById("invoiceFilterStatus");
  const refreshBtn = document.getElementById("btnRefreshInvoices");
  const clearBtn = document.getElementById("btnClearInvoiceFilters");
  const badge = document.getElementById("invoiceBadge");

  const noInvoiceEl = document.getElementById("invoiceNoInvoice");
  const pendingEl = document.getElementById("invoicePending");
  const approvedEl = document.getElementById("invoiceApproved");
  const rejectedEl = document.getElementById("invoiceRejected");

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

  async function loadData() {
    Utils.showLoading(true, "Đang tải...");
    try {
      const token = API.getToken();

      const noInvoiceRes = await fetch(
        API_BASE_URL + "/invoice/exports-without-invoice",
        { headers: { Authorization: "Bearer " + token } },
      );
      const noInvoiceResult = await noInvoiceRes.json();

      const requestsRes = await fetch(API_BASE_URL + "/invoice/requests", {
        headers: { Authorization: "Bearer " + token },
      });
      const requestsResult = await requestsRes.json();

      let noInvoiceExports = [];
      let requests = [];

      if (noInvoiceResult.success && noInvoiceResult.data) {
        noInvoiceExports = noInvoiceResult.data;
        for (const exp of noInvoiceExports) {
          exportItemsCache[exp.id] = exp.items || [];
        }
      }

      if (requestsResult.success && requestsResult.data) {
        requests = requestsResult.data;
      }

      allData = [];

      for (const exp of noInvoiceExports) {
        const items = exportItemsCache[exp.id] || [];
        const requestsForExp = requests.filter((r) => r.exportId === exp.id);
        const approvedItemIds = requestsForExp
          .filter((r) => r.status === "approved")
          .map((r) => r.exportItemId);
        const pendingItemIds = requestsForExp
          .filter((r) => r.status === "pending")
          .map((r) => r.exportItemId);

        const availableItems = items.filter(
          (it) =>
            !approvedItemIds.includes(it.id) && !pendingItemIds.includes(it.id),
        );

        if (availableItems.length > 0) {
          allData.push({
            ...exp,
            invoiceStatus: "no-invoice",
            availableItems,
            pendingItemIds,
            approvedItemIds,
            allItems: items,
          });
        }
      }

      const groupedByExport = {};
      for (const req of requests) {
        if (!groupedByExport[req.exportId]) {
          groupedByExport[req.exportId] = {
            exportId: req.exportId,
            exportNo: req.exportNo,
            exportDate: req.exportDate,
            receiverName: req.receiverName,
            customerName: req.customerName,
            total: req.total,
            requests: [],
          };
        }
        groupedByExport[req.exportId].requests.push(req);
      }

      for (const expId in groupedByExport) {
        const group = groupedByExport[expId];
        const statuses = group.requests.map((r) => r.status);
        let groupStatus = "pending";
        if (statuses.every((s) => s === "approved")) groupStatus = "approved";
        else if (statuses.some((s) => s === "pending")) groupStatus = "pending";
        else if (statuses.every((s) => s === "rejected"))
          groupStatus = "rejected";

        allData.push({
          ...group,
          invoiceStatus: groupStatus,
        });
      }

      allData.sort((a, b) => {
        const order = { "no-invoice": 0, pending: 1, approved: 2, rejected: 3 };
        return (order[a.invoiceStatus] || 99) - (order[b.invoiceStatus] || 99);
      });

      updateStats();
      render();
    } catch (error) {
      console.error("❌ Load error:", error);
      Utils.showToast("Lỗi tải dữ liệu: " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  }

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

  function toggleForm(exportId) {
    const form = document.getElementById("invoiceForm_" + exportId);
    if (!form) return;

    document.querySelectorAll(".invoice-form-container").forEach((el) => {
      if (el.id !== "invoiceForm_" + exportId) {
        el.style.display = "none";
      }
    });

    form.style.display = form.style.display === "none" ? "block" : "none";
  }

  async function submitInvoice(exportId) {
    const items = [];
    const rows = document.querySelectorAll(`.invoice-item-row-${exportId}`);

    for (const row of rows) {
      const exportItemId = parseInt(row.dataset.itemId);
      const soHoaDonNhap = row.querySelector(".inv-soHoaDonNhap")?.value.trim();
      const ngayNhapHD = row.querySelector(".inv-ngayNhapHD")?.value;
      const soHoaDonXuat = row.querySelector(".inv-soHoaDonXuat")?.value.trim();
      const ngayXuatHD = row.querySelector(".inv-ngayXuatHD")?.value;

      if (!soHoaDonNhap || !ngayNhapHD || !soHoaDonXuat || !ngayXuatHD) {
        Utils.showToast(
          `⚠️ Vui lòng nhập đủ 4 trường cho TẤT CẢ sản phẩm!`,
          "warning",
        );
        return;
      }

      items.push({
        exportItemId,
        soHoaDonNhap,
        ngayNhapHD,
        soHoaDonXuat,
        ngayXuatHD,
      });
    }

    if (items.length === 0) {
      Utils.showToast("⚠️ Không có sản phẩm nào để nhập hóa đơn", "warning");
      return;
    }

    Utils.showLoading(true, `Đang gửi ${items.length} yêu cầu...`);
    try {
      const token = API.getToken();
      const res = await fetch(API_BASE_URL + "/invoice/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ exportId, items }),
      });
      const result = await res.json();

      if (result.success) {
        Utils.showToast("✅ " + result.message);
        const form = document.getElementById("invoiceForm_" + exportId);
        if (form) form.style.display = "none";
        await loadData();
      } else {
        Utils.showToast(
          "❌ " + (result.message || "Không thể gửi yêu cầu"),
          "error",
        );
      }
    } catch (error) {
      console.error("❌ Submit invoice error:", error);
      Utils.showToast("❌ Lỗi server: " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  }

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
          <i class="fas fa-file-invoice" style="font-size:48px;display:block;margin-bottom:16px;opacity:0.4;"></i>
          <p>Không có dữ liệu hóa đơn</p>
          <small>Phiếu xuất đã duyệt sẽ hiển thị tại đây</small>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(renderInvoiceCard).join("");
  }

  function renderInvoiceCard(item) {
    const isNo = item.invoiceStatus === "no-invoice";
    const isPending = item.invoiceStatus === "pending";
    const isApproved = item.invoiceStatus === "approved";
    const isRejected = item.invoiceStatus === "rejected";

    let badgeText = "";
    let badgeClass = "";
    if (isNo) {
      badgeText = "🔴 Chưa nhập";
      badgeClass = "status-pending";
    } else if (isPending) {
      badgeText = "⏳ Chờ duyệt";
      badgeClass = "status-pending";
    } else if (isApproved) {
      badgeText = "✅ Hoàn thành";
      badgeClass = "status-approved";
    } else if (isRejected) {
      badgeText = "❌ Từ chối";
      badgeClass = "status-rejected";
    }

    let actions = "";
    if (isNo && isAdmin()) {
      actions = `
        <button class="btn-create-invoice" onclick="window.toggleInvoiceForm(${item.id})">
          <i class="fas fa-plus-circle"></i> Nhập hóa đơn
        </button>
      `;
    } else if (isNo && !isAdmin()) {
      actions = `<span style="color:#6b82a0;font-size:12px;">Chỉ Admin mới được nhập</span>`;
    } else if (isPending) {
      actions = `<span style="color:#6b82a0;font-size:12px;"><i class="fas fa-spinner fa-spin"></i> Đang chờ Quản lý</span>`;
    } else if (isApproved) {
      actions = `<span style="color:#6b82a0;font-size:12px;"><i class="fas fa-check-circle"></i> Hoàn thành</span>`;
    } else if (isRejected) {
      actions = `<span style="color:#6b82a0;font-size:12px;"><i class="fas fa-times-circle"></i> Bị từ chối</span>`;
    }

    let itemsHtml = "";

    if (isNo && isAdmin()) {
      itemsHtml = `
        <div class="invoice-form-container" id="invoiceForm_${item.id}" style="display:none;">
          <div style="padding: 10px 14px; background: rgba(96, 165, 250, 0.08); border-radius: 6px; margin-bottom: 12px; border: 1px solid rgba(96, 165, 250, 0.15);">
            <i class="fas fa-info-circle" style="color: #60a5fa;"></i>
            <span style="font-size: 12px; color: #60a5fa;">
              Nhập <strong>4 trường hóa đơn RIÊNG</strong> cho từng sản phẩm bên dưới
            </span>
          </div>
          <div style="overflow-x: auto; border: 1px solid #1e2d45; border-radius: 6px;">
            <table style="width:100%; border-collapse: collapse; font-size: 11px; background: #0f172a; min-width: 900px;">
              <thead>
                <tr style="background: #1a2235; border-bottom: 1px solid #3b82f6;">
                  <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 600; width: 40px;">STT</th>
                  <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 600; min-width: 120px;">SẢN PHẨM</th>
                  <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 600; min-width: 80px;">MÃ HÀNG</th>
                  <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 600; width: 60px;">SL</th>
                  <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: left; color: #fbbf24; font-weight: 600; min-width: 110px;">SỐ HĐ NHẬP <span style="color:#ef4444;">*</span></th>
                  <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: left; color: #fbbf24; font-weight: 600; min-width: 120px;">NGÀY HĐ NHẬP <span style="color:#ef4444;">*</span></th>
                  <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: left; color: #fbbf24; font-weight: 600; min-width: 110px;">SỐ HĐ XUẤT <span style="color:#ef4444;">*</span></th>
                  <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: left; color: #fbbf24; font-weight: 600; min-width: 120px;">NGÀY HĐ XUẤT <span style="color:#ef4444;">*</span></th>
                </tr>
              </thead>
              <tbody>
                ${item.availableItems
                  .map(
                    (it, idx) => `
                  <tr class="invoice-item-row-${item.id}" data-item-id="${it.id}" style="border-bottom: 1px solid #1e2d45;">
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${idx + 1}</td>
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(it.tenThuongMai || "—")}</td>
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; color: #93c5fd; font-family: monospace;">${Utils.escapeHtml(it.maHang || "—")}</td>
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; text-align: right; color: #86efac; font-weight: 600;">${it.soLuong || 0}</td>
                    <td style="padding: 4px 6px; border: 1px solid #1e2d45;">
                      <input type="text" class="inv-soHoaDonNhap" placeholder="VD: HD001" style="width:100%; padding:5px 6px; background:#1a2235; border:1px solid #3b82f6; border-radius:4px; color:#e2eaf5; font-size:11px;">
                    </td>
                    <td style="padding: 4px 6px; border: 1px solid #1e2d45;">
                      <input type="date" class="inv-ngayNhapHD" style="width:100%; padding:5px 6px; background:#1a2235; border:1px solid #3b82f6; border-radius:4px; color:#e2eaf5; font-size:11px;">
                    </td>
                    <td style="padding: 4px 6px; border: 1px solid #1e2d45;">
                      <input type="text" class="inv-soHoaDonXuat" placeholder="VD: HDX001" style="width:100%; padding:5px 6px; background:#1a2235; border:1px solid #3b82f6; border-radius:4px; color:#e2eaf5; font-size:11px;">
                    </td>
                    <td style="padding: 4px 6px; border: 1px solid #1e2d45;">
                      <input type="date" class="inv-ngayXuatHD" style="width:100%; padding:5px 6px; background:#1a2235; border:1px solid #3b82f6; border-radius:4px; color:#e2eaf5; font-size:11px;">
                    </td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          <div class="invoice-form-actions" style="margin-top: 12px;">
            <button class="btn-cancel-invoice" onclick="window.toggleInvoiceForm(${item.id})">
              <i class="fas fa-times"></i> Hủy
            </button>
            <button class="btn-submit-invoice" onclick="window.submitInvoice(${item.id})">
              <i class="fas fa-paper-plane"></i> Gửi ${item.availableItems.length} hóa đơn
            </button>
          </div>
        </div>
      `;
    } else {
      const itemsToShow = item.requests ? item.requests : item.allItems || [];

      itemsHtml = `
        <div style="margin-top: 10px; overflow-x: auto; border: 1px solid #1e2d45; border-radius: 6px;">
          <table style="width:100%; border-collapse: collapse; font-size: 11px; background: #0f172a; min-width: 800px;">
            <thead>
              <tr style="background: #1a2235; border-bottom: 1px solid #3b82f6;">
                <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; width: 40px;">STT</th>
                <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; min-width: 120px;">SẢN PHẨM</th>
                <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; min-width: 80px;">MÃ HÀNG</th>
                <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; width: 60px;">SL</th>
                <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">SỐ HĐ NHẬP</th>
                <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa;">NGÀY HĐ NHẬP</th>
                <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">SỐ HĐ XUẤT</th>
                <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa;">NGÀY HĐ XUẤT</th>
                <th style="padding: 6px 8px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; width: 80px;">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              ${itemsToShow
                .map((it, idx) => {
                  let stCls = "status-pending";
                  let stTxt = "Chờ";
                  if (it.status === "approved") {
                    stCls = "status-approved";
                    stTxt = "✓ Duyệt";
                  } else if (it.status === "rejected") {
                    stCls = "status-rejected";
                    stTxt = "✗ Từ chối";
                  }
                  return `
                  <tr style="border-bottom: 1px solid #1e2d45;">
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${idx + 1}</td>
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(it.tenThuongMai || "—")}</td>
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; color: #93c5fd; font-family: monospace;">${Utils.escapeHtml(it.maHang || "—")}</td>
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; text-align: right; color: #86efac;">${it.soLuong || 0}</td>
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(it.soHoaDonNhap || "—")}</td>
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.formatDate(it.ngayNhapHD)}</td>
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(it.soHoaDonXuat || "—")}</td>
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.formatDate(it.ngayXuatHD)}</td>
                    <td style="padding: 4px 8px; border: 1px solid #1e2d45; text-align: center;">
                      <span class="status-badge ${stCls}" style="font-size: 9px; padding: 2px 6px;">${stTxt}</span>
                    </td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    return `
      <div class="receipt-card invoice-card ${isNo ? "no-invoice" : ""}" style="${isNo ? "border-left:4px solid #f87171;" : "border-left:1px solid var(--border);"}">
        <div class="receipt-card-header">
          <div class="receipt-card-id">
            <i class="fas fa-file-export"></i> ${Utils.escapeHtml(item.exportNo || "PX-" + (item.exportId || item.id))}
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
          <div class="receipt-card-info">
            <div class="label">Số sản phẩm</div>
            <div class="value">${isNo ? item.availableItems?.length || 0 : item.requests?.length || 0}</div>
          </div>
          <div class="receipt-card-total">
            <div class="label">Tổng tiền</div>
            <div class="value">${Utils.formatCurrency(item.total || 0)}</div>
          </div>
        </div>
        <div class="receipt-card-footer">
          <div class="status-text">
            ${isNo ? "🔴 Chưa có thông tin hóa đơn" : ""}
            ${isPending ? "⏳ Đã nhập, chờ duyệt" : ""}
            ${isApproved ? "✅ Đã có đầy đủ thông tin" : ""}
            ${isRejected ? "❌ Bị từ chối" : ""}
          </div>
          <div class="actions">${actions}</div>
        </div>
        ${itemsHtml}
      </div>
    `;
  }

  function bindEvents() {
    if (searchInput) searchInput.addEventListener("input", render);
    if (statusFilter) statusFilter.addEventListener("change", render);
    if (refreshBtn) refreshBtn.addEventListener("click", loadData);
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (statusFilter) statusFilter.value = "all";
        render();
      });
    }
  }

  window.loadInvoiceData = loadData;
  window.toggleInvoiceForm = toggleForm;
  window.submitInvoice = submitInvoice;

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
