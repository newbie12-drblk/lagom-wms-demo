// ==================== TRANG CHỦ ====================
// Gọi API trực tiếp, KHÔNG DÙNG CACHE

let homeInventoryData = [];
let homeReceiptsData = [];
let homeExportsData = [];

// ============================================================
// LOAD DỮ LIỆU TỪ API - LUÔN MỚI
// ============================================================
async function loadHomeData() {
  try {
    const [inventory, receipts, exports] = await Promise.all([
      window.API.inventory.getAll(),
      window.API.receipt.getAll(),
      window.API.export.getAll(),
    ]);

    homeInventoryData = inventory || [];
    homeReceiptsData = receipts || [];
    homeExportsData = exports || [];

    console.log(
      `✅ Loaded: ${homeInventoryData.length} products, ${homeReceiptsData.length} receipts, ${homeExportsData.length} exports`,
    );

    // Log chi tiết phiếu nhập để debug công nợ
    console.log("📋 Chi tiết phiếu nhập:");
    homeReceiptsData.forEach((r) => {
      console.log(
        `  - ${r.receiptNo}: status=${r.status}, total=${r.total}, ngayNhapHD=${r.ngayNhapHD}, receiptDate=${r.receiptDate}`,
      );
    });

    return true;
  } catch (error) {
    console.error("❌ Load home data error:", error);
    homeInventoryData = [];
    homeReceiptsData = [];
    homeExportsData = [];
    return false;
  }
}

// ============================================================
// TÍNH CÔNG NỢ
// ============================================================
function getRemainingDaysForDebt(invoiceDate, type = "customer") {
  if (!invoiceDate || invoiceDate === "") return null;

  const dueDate = new Date(invoiceDate);
  if (isNaN(dueDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  // Đối với nhà cung cấp: tính từ ngày nhập HĐ + 90 ngày
  if (type === "supplier") {
    const expiryDate = new Date(dueDate);
    expiryDate.setDate(expiryDate.getDate() + 90);
    return Math.ceil((expiryDate - today) / 86400000);
  }

  // Đối với khách hàng: tính từ ngày xuất HĐ
  return Math.ceil((dueDate - today) / 86400000);
}

function getRemainingDays(item) {
  if (item.ngayXuatHD && item.ngayXuatHD !== "") {
    return getRemainingDaysForDebt(item.ngayXuatHD, "customer");
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

function getSupplierDebtRemaining(receipt) {
  const invoiceDate = receipt.ngayNhapHD || receipt.receiptDate;
  return getRemainingDaysForDebt(invoiceDate, "supplier");
}

function getCustomerDebtRemaining(exportItem) {
  const invoiceDate = exportItem.ngayXuatHD || exportItem.exportDate;
  return getRemainingDaysForDebt(invoiceDate, "customer");
}

function getDebtStatus(remaining) {
  if (remaining === null)
    return { status: "none", label: "—", badgeClass: "no-debt" };
  if (remaining < 0)
    return {
      status: "expired",
      label: `Quá hạn ${Math.abs(remaining)} ngày`,
      badgeClass: "expired",
    };
  if (remaining === 0)
    return {
      status: "expired",
      label: "Đến hạn hôm nay",
      badgeClass: "expired",
    };
  if (remaining <= 7)
    return {
      status: "critical",
      label: `Còn ${remaining} ngày (KHẨN CẤP)`,
      badgeClass: "critical",
    };
  if (remaining <= 30)
    return {
      status: "warning",
      label: `Còn ${remaining} ngày`,
      badgeClass: "warning",
    };
  if (remaining <= 90)
    return {
      status: "normal",
      label: `Còn ${remaining} ngày`,
      badgeClass: "normal",
    };
  return { status: "safe", label: `Còn ${remaining} ngày`, badgeClass: "safe" };
}

function getDebtBadge(remainingDays) {
  const status = getDebtStatus(remainingDays);
  return `<span class="debt-badge ${status.badgeClass}">${status.label}</span>`;
}

// ============================================================
// LOAD HOME STATS
// ============================================================
function loadHomeStats() {
  if (!homeInventoryData || homeInventoryData.length === 0) {
    document.getElementById("homeTotalItems").textContent = "0";
    document.getElementById("homeTotalStock").textContent = "0";
    document.getElementById("homeExpiringSoon").textContent = "0";
    document.getElementById("homeExpired").textContent = "0";
    return;
  }

  const totalItems = homeInventoryData.length;
  const totalImported = homeInventoryData.reduce(
    (s, i) => s + (i.soLuongNhap || 0),
    0,
  );
  let critical = 0,
    expired = 0;

  homeInventoryData.forEach((item) => {
    const remaining = getRemainingDays(item);
    if (remaining !== null) {
      if (remaining < 0) expired++;
      else if (remaining <= 7) critical++;
    }
  });

  document.getElementById("homeTotalItems").textContent = totalItems;
  document.getElementById("homeTotalStock").textContent = totalImported;
  document.getElementById("homeExpiringSoon").textContent = critical;
  document.getElementById("homeExpired").textContent = expired;
}

// ============================================================
// LOAD SUPPLIER DEBT ALERTS - FIX: CHỈ LẤY PHIẾU ĐÃ DUYỆT, TOTAL > 0
// ============================================================
async function loadSupplierDebtAlerts() {
  const container = document.getElementById("supplierAlertList");
  if (!container) return;

  // Luôn reload dữ liệu mới từ API
  await loadHomeData();

  if (!homeReceiptsData || homeReceiptsData.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #6b82a0;">
        <i class="fas fa-inbox" style="font-size: 28px; display: block; margin-bottom: 12px; opacity: 0.4;"></i>
        Chưa có dữ liệu phiếu nhập
      </div>
    `;
    document.getElementById("supplierAlertCount").textContent = "0 cảnh báo";
    return;
  }

  const alerts = [];

  // ✅ CHỈ LẤY PHIẾU ĐÃ DUYỆT (approved)
  const approvedReceipts = homeReceiptsData.filter(
    (r) => r.status === "approved",
  );

  console.log(
    `📋 Đang xử lý ${approvedReceipts.length} phiếu nhập đã duyệt để tính công nợ`,
  );

  approvedReceipts.forEach((receipt) => {
    // Lấy ngày nhập HĐ - ưu tiên ngayNhapHD, nếu không có thì dùng receiptDate
    let invoiceDate =
      receipt.ngayNhapHD || receipt.receiptDate || receipt.createdAt;
    if (!invoiceDate) return;

    // Tính số ngày còn lại đến hạn (mặc định 90 ngày từ ngày nhập)
    const remaining = getRemainingDaysForDebt(invoiceDate, "supplier");

    // Chỉ hiển thị cảnh báo nếu còn <= 30 ngày hoặc đã quá hạn
    if (remaining !== null && remaining <= 30) {
      const supplierName = receipt.supplierName || "Nhà cung cấp";
      const receiptNo = receipt.receiptNo || `PN-${receipt.id}`;
      const total = receipt.total || 0;

      // ✅ BỎ QUA PHIẾU CÓ TỔNG TIỀN = 0
      if (total === 0) return;

      alerts.push({
        name: supplierName,
        receiptNo: receiptNo,
        remaining: remaining,
        invoiceDate: invoiceDate,
        label:
          remaining < 0
            ? `Quá hạn ${Math.abs(remaining)} ngày`
            : remaining === 0
              ? "Đến hạn hôm nay"
              : `Còn ${remaining} ngày`,
        total: total,
        status: remaining < 0 ? "expired" : "warning",
      });
    }
  });

  // Sắp xếp: quá hạn lên đầu, sau đó đến sắp đến hạn
  alerts.sort((a, b) => a.remaining - b.remaining);

  // Cập nhật số lượng cảnh báo
  const alertCount = alerts.length;
  document.getElementById("supplierAlertCount").textContent =
    `${alertCount} cảnh báo`;

  if (alertCount === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #4ade80;">
        <i class="fas fa-check-circle" style="font-size: 28px; display: block; margin-bottom: 12px;"></i>
        Không có công nợ nào với nhà cung cấp sắp đến hạn
      </div>
    `;
    return;
  }

  // Hiển thị tối đa 10 cảnh báo
  const displayAlerts = alerts.slice(0, 10);

  container.innerHTML = displayAlerts
    .map((a) => {
      const isExpired = a.remaining < 0;
      return `
      <div class="alert-row" style="padding: 12px 16px; border-bottom: 1px solid #1e2d45; display: flex; gap: 12px; align-items: flex-start; transition: background 0.15s; cursor: default;">
        <div class="alert-indicator ${isExpired ? "ind-red" : "ind-yellow"}" 
             style="width: 3px; min-height: 40px; border-radius: 2px; flex-shrink: 0; background: ${isExpired ? "#ef4444" : "#f59e0b"};"></div>
        <div class="alert-body" style="flex: 1;">
          <div class="alert-name" style="font-size: 13px; font-weight: 600; color: #e2eaf5;">
            <strong>${escapeHtml(a.name)}</strong> 
            <span style="color: #60a5fa; font-weight: 400;">- ${escapeHtml(a.receiptNo)}</span>
          </div>
          <div class="alert-meta" style="font-size: 11px; color: #6b82a0; margin-top: 4px;">
            <span>Ngày nhập HĐ: ${formatDate(a.invoiceDate)}</span>
            <span style="margin: 0 8px;">|</span>
            <strong style="color: ${isExpired ? "#f87171" : "#fbbf24"};">${a.label}</strong>
          </div>
          <div class="alert-meta" style="font-size: 12px; color: #fbbf24; font-weight: 600; margin-top: 4px;">
            Giá trị: ${formatCurrency(a.total)}
          </div>
        </div>
        <div class="alert-tag ${isExpired ? "tag-red" : "tag-yellow"}" 
             style="font-size: 9px; font-weight: 700; padding: 3px 10px; border-radius: 4px; align-self: center; flex-shrink: 0; 
                    background: ${isExpired ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}; 
                    color: ${isExpired ? "#f87171" : "#fbbf24"}; 
                    border: 1px solid ${isExpired ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"};">
          ${isExpired ? "QUÁ HẠN" : "CẢNH BÁO"}
        </div>
      </div>
    `;
    })
    .join("");

  // Nếu có nhiều hơn 10, thêm thông báo xem thêm
  if (alerts.length > 10) {
    container.innerHTML += `
      <div style="padding: 12px 16px; text-align: center; color: #6b82a0; font-size: 12px; border-top: 1px solid #1e2d45;">
        <i class="fas fa-ellipsis-h"></i> Còn ${alerts.length - 10} cảnh báo khác
      </div>
    `;
  }
}

// ============================================================
// LOAD CUSTOMER DEBT ALERTS
// ============================================================
async function loadCustomerDebtAlerts() {
  const container = document.getElementById("customerAlertList");
  if (!container) return;

  if (!homeExportsData || homeExportsData.length === 0) {
    container.innerHTML =
      '<div style="padding:40px;text-align:center;color:#6b82a0;">Chưa có dữ liệu phiếu xuất</div>';
    document.getElementById("customerAlertCount").textContent = "0 cảnh báo";
    return;
  }

  const alerts = [];
  homeExportsData.forEach((exportItem) => {
    let invoiceDate = exportItem.ngayXuatHD || exportItem.exportDate;
    if (!invoiceDate) return;

    const remaining = getCustomerDebtRemaining(exportItem);

    if (remaining !== null && remaining <= 30) {
      const total = exportItem.total || 0;
      if (total === 0) return;

      alerts.push({
        type: "customer",
        name: exportItem.receiverName || "Khách hàng",
        exportNo: exportItem.exportNo || `PX-${exportItem.id}`,
        remaining: remaining,
        invoiceDate: invoiceDate,
        label:
          remaining < 0
            ? `Quá hạn ${Math.abs(remaining)} ngày`
            : `Còn ${remaining} ngày đến hạn xuất HĐ`,
        total: total,
      });
    }
  });

  alerts.sort((a, b) => a.remaining - b.remaining);
  document.getElementById("customerAlertCount").textContent =
    `${alerts.length} cảnh báo`;

  if (alerts.length === 0) {
    container.innerHTML =
      '<div style="padding:40px;text-align:center;color:#4ade80;">Không có công nợ nào với khách hàng sắp đến hạn</div>';
    return;
  }

  container.innerHTML = alerts
    .slice(0, 10)
    .map((a) => {
      const isExpired = a.remaining < 0;
      return `
        <div class="alert-row">
          <div class="alert-indicator ${isExpired ? "ind-red" : "ind-yellow"}"></div>
          <div class="alert-body">
            <div class="alert-name"><strong>${escapeHtml(a.name)}</strong> - ${escapeHtml(a.exportNo)}</div>
            <div class="alert-meta">Ngày xuất HĐ: ${formatDate(a.invoiceDate)} | <strong>${a.label}</strong></div>
            <div class="alert-meta">Giá trị: ${formatCurrency(a.total)}</div>
          </div>
          <div class="alert-tag ${isExpired ? "tag-red" : "tag-yellow"}">${isExpired ? "QUÁ HẠN" : "CẢNH BÁO"}</div>
        </div>
      `;
    })
    .join("");
}

// ============================================================
// LOAD CATEGORIES
// ============================================================
function loadCategories() {
  const container = document.getElementById("categoryList");
  if (!container) return;

  if (!homeInventoryData || homeInventoryData.length === 0) {
    container.innerHTML =
      '<div style="padding:20px;text-align:center;color:#6b82a0;">Đang tải dữ liệu...</div>';
    return;
  }

  const catMap = new Map();
  homeInventoryData.forEach((i) => {
    const cat = i.phanLoai || "Chưa phân loại";
    catMap.set(cat, (catMap.get(cat) || 0) + 1);
  });

  const categories = Array.from(catMap.entries())
    .map(([n, c]) => ({ n, c }))
    .sort((a, b) => b.c - a.c);
  const total = categories.reduce((s, cat) => s + cat.c, 0);
  const colors = [
    "var(--blue-light)",
    "var(--purple)",
    "var(--green)",
    "var(--yellow)",
    "var(--cyan)",
    "var(--pink)",
  ];

  document.getElementById("categoryCount").textContent =
    `${categories.length} nhóm · ${total} mặt hàng`;

  container.innerHTML = categories
    .map(
      (cat, i) => `
        <div class="cat-row">
          <div class="cat-row-head">
            <span class="cat-name">${escapeHtml(cat.n)}</span>
            <span class="cat-val" style="color:${colors[i % colors.length]}">${cat.c} mặt hàng</span>
          </div>
          <div class="cat-bar-wrap">
            <div class="cat-bar-fill" style="width:${(cat.c / total) * 100}%; background:linear-gradient(90deg,${colors[i % colors.length]},${colors[i % colors.length]}aa);"></div>
          </div>
        </div>
      `,
    )
    .join("");
}

// ============================================================
// INIT HOME - GỌI KHI TRANG LOAD
// ============================================================
async function initHome() {
  console.log("🟢 initHome started - Loading fresh data...");

  // Xóa cache cũ trong localStorage
  localStorage.removeItem("lagom_inventory");
  localStorage.removeItem("lagom_receipts");
  localStorage.removeItem("lagom_exports");
  localStorage.removeItem("lagom_home_cache");

  // Load dữ liệu mới từ API
  await loadHomeData();

  // Render các component
  loadHomeStats();
  loadSupplierDebtAlerts();
  loadCustomerDebtAlerts();
  loadCategories();

  console.log("✅ Home page loaded successfully!");
}

// ============================================================
// RESET HOME DATA - GỌI KHI CẦN LÀM MỚI
// ============================================================
function resetHomeData() {
  console.log("🔄 Resetting home data...");

  // Xóa cache
  localStorage.removeItem("lagom_inventory");
  localStorage.removeItem("lagom_receipts");
  localStorage.removeItem("lagom_exports");
  localStorage.removeItem("lagom_home_cache");

  // Reload
  initHome();

  Utils.showToast("✅ Đã làm mới dữ liệu trang chủ");
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function formatCurrency(num) {
  return new Intl.NumberFormat("vi-VN").format(num || 0) + " ₫";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("vi-VN");
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(
    /[&<>]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
  );
}

// ============================================================
// EXPORT
// ============================================================
window.initHome = initHome;
window.resetHomeData = resetHomeData;
window.loadHomeData = loadHomeData;
window.loadSupplierDebtAlerts = loadSupplierDebtAlerts;
window.loadCustomerDebtAlerts = loadCustomerDebtAlerts;
window.loadCategories = loadCategories;
window.loadHomeStats = loadHomeStats;

console.log("✅ home.js loaded successfully!");
