// ==================== TRANG CHỦ ====================
// Gọi API trực tiếp, KHÔNG DÙNG CACHE

let homeInventoryData = [];
let homeReceiptsData = [];
let homeExportsData = [];
let isHomeLoading = false;

// ============================================================
// LOAD DỮ LIỆU TỪ API - LUÔN MỚI
// ============================================================
async function loadHomeData() {
  // Tránh gọi nhiều lần cùng lúc
  if (isHomeLoading) return;
  isHomeLoading = true;

  // Xóa cache cũ
  localStorage.removeItem("lagom_inventory");
  localStorage.removeItem("lagom_receipts");
  localStorage.removeItem("lagom_exports");
  localStorage.removeItem("lagom_home_cache");

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

    return true;
  } catch (error) {
    console.error("❌ Load home data error:", error);
    homeInventoryData = [];
    homeReceiptsData = [];
    homeExportsData = [];
    return false;
  } finally {
    isHomeLoading = false;
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

  if (type === "supplier") {
    const expiryDate = new Date(dueDate);
    expiryDate.setDate(expiryDate.getDate() + 90);
    return Math.ceil((expiryDate - today) / 86400000);
  }

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

// ============================================================
// LOAD HOME STATS - TÍNH TOÁN CHÍNH XÁC
// ============================================================
function loadHomeStats() {
  // Lấy element
  const totalItemsEl = document.getElementById("homeTotalItems");
  const totalStockEl = document.getElementById("homeTotalStock");
  const expiringSoonEl = document.getElementById("homeExpiringSoon");
  const expiredEl = document.getElementById("homeExpired");

  if (!totalItemsEl) {
    console.warn("⚠️ homeTotalItems not found, skipping stats");
    return;
  }

  if (!homeInventoryData || homeInventoryData.length === 0) {
    totalItemsEl.textContent = "0";
    if (totalStockEl) totalStockEl.textContent = "0";
    if (expiringSoonEl) expiringSoonEl.textContent = "0";
    if (expiredEl) expiredEl.textContent = "0";
    return;
  }

  // ✅ Tổng số mặt hàng (unique)
  const totalItems = homeInventoryData.length;

  // ✅ Tổng số lượng nhập
  let totalImported = 0;
  for (const item of homeInventoryData) {
    totalImported += item.soLuongNhap || 0;
  }

  // ✅ Đếm khẩn cấp và quá hạn
  let critical = 0;
  let expired = 0;

  for (const item of homeInventoryData) {
    const remaining = getRemainingDays(item);
    if (remaining !== null) {
      if (remaining < 0) {
        expired++;
      } else if (remaining <= 7) {
        critical++;
      }
    }
  }

  // ✅ Cập nhật DOM
  totalItemsEl.textContent = totalItems;
  if (totalStockEl) totalStockEl.textContent = totalImported;
  if (expiringSoonEl) expiringSoonEl.textContent = critical;
  if (expiredEl) expiredEl.textContent = expired;
}

// ============================================================
// LOAD SUPPLIER DEBT ALERTS
// ============================================================
function loadSupplierDebtAlerts() {
  const container = document.getElementById("supplierAlertList");
  const countEl = document.getElementById("supplierAlertCount");

  if (!container) return;

  if (!homeReceiptsData || homeReceiptsData.length === 0) {
    container.innerHTML = `
      <div style="padding: 25px; text-align: center; color: #6b82a0; font-size: 13px;">
        <i class="fas fa-inbox" style="font-size: 22px; display: block; margin-bottom: 6px; opacity: 0.4;"></i>
        Chưa có dữ liệu phiếu nhập
      </div>
    `;
    if (countEl) countEl.textContent = "0";
    return;
  }

  const alerts = [];
  const approvedReceipts = homeReceiptsData.filter(
    (r) => r.status === "approved",
  );

  for (const receipt of approvedReceipts) {
    let invoiceDate =
      receipt.ngayNhapHD || receipt.receiptDate || receipt.createdAt;
    if (!invoiceDate) continue;

    const remaining = getRemainingDaysForDebt(invoiceDate, "supplier");

    if (remaining !== null && remaining <= 30) {
      const total = receipt.total || 0;
      if (total === 0) continue;

      alerts.push({
        name: receipt.supplierName || "Nhà cung cấp",
        receiptNo: receipt.receiptNo || `PN-${receipt.id}`,
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
  }

  alerts.sort((a, b) => a.remaining - b.remaining);

  if (countEl) countEl.textContent = alerts.length;

  if (alerts.length === 0) {
    container.innerHTML = `
      <div style="padding: 25px; text-align: center; color: #4ade80; font-size: 13px;">
        <i class="fas fa-check-circle" style="font-size: 22px; display: block; margin-bottom: 6px;"></i>
        Không có công nợ nào sắp đến hạn
      </div>
    `;
    return;
  }

  const displayAlerts = alerts.slice(0, 10);

  container.innerHTML = displayAlerts
    .map((a) => {
      const isExpired = a.remaining < 0;
      return `
      <div class="alert-row" style="padding: 6px 12px; border-bottom: 1px solid #1e2d45; display: flex; gap: 10px; align-items: flex-start;">
        <div class="alert-indicator ${isExpired ? "ind-red" : "ind-yellow"}" 
             style="width: 3px; min-height: 30px; border-radius: 2px; flex-shrink: 0; background: ${isExpired ? "#ef4444" : "#f59e0b"};"></div>
        <div class="alert-body" style="flex: 1;">
          <div class="alert-name" style="font-size: 12px; font-weight: 600; color: #e2eaf5;">
            <strong>${escapeHtml(a.name)}</strong> 
            <span style="color: #60a5fa; font-weight: 400; font-size: 11px;">- ${escapeHtml(a.receiptNo)}</span>
          </div>
          <div class="alert-meta" style="font-size: 10px; color: #6b82a0; margin-top: 2px;">
            <span>Ngày nhập HĐ: ${formatDate(a.invoiceDate)}</span>
            <span style="margin: 0 6px;">|</span>
            <strong style="color: ${isExpired ? "#f87171" : "#fbbf24"};">${a.label}</strong>
          </div>
          <div class="alert-meta" style="font-size: 11px; color: #fbbf24; font-weight: 600; margin-top: 2px;">
            Giá trị: ${formatCurrency(a.total)}
          </div>
        </div>
        <div class="alert-tag ${isExpired ? "tag-red" : "tag-yellow"}" 
             style="font-size: 8px; font-weight: 700; padding: 2px 8px; border-radius: 4px; align-self: center; flex-shrink: 0; 
                    background: ${isExpired ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}; 
                    color: ${isExpired ? "#f87171" : "#fbbf24"}; 
                    border: 1px solid ${isExpired ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"};">
          ${isExpired ? "QUÁ HẠN" : "CẢNH BÁO"}
        </div>
      </div>
    `;
    })
    .join("");

  if (alerts.length > 10) {
    container.innerHTML += `
      <div style="padding: 6px 12px; text-align: center; color: #6b82a0; font-size: 11px; border-top: 1px solid #1e2d45;">
        <i class="fas fa-ellipsis-h"></i> Còn ${alerts.length - 10} cảnh báo khác
      </div>
    `;
  }
}

// ============================================================
// LOAD CUSTOMER DEBT ALERTS
// ============================================================
function loadCustomerDebtAlerts() {
  const container = document.getElementById("customerAlertList");
  const countEl = document.getElementById("customerAlertCount");

  if (!container) return;

  if (!homeExportsData || homeExportsData.length === 0) {
    container.innerHTML = `
      <div style="padding: 25px; text-align: center; color: #6b82a0; font-size: 13px;">
        <i class="fas fa-inbox" style="font-size: 22px; display: block; margin-bottom: 6px; opacity: 0.4;"></i>
        Chưa có dữ liệu phiếu xuất
      </div>
    `;
    if (countEl) countEl.textContent = "0";
    return;
  }

  const alerts = [];
  for (const exportItem of homeExportsData) {
    // Chỉ lấy phiếu đã duyệt
    if (exportItem.status !== "approved") continue;

    let invoiceDate = exportItem.ngayXuatHD || exportItem.exportDate;
    if (!invoiceDate) continue;

    const remaining = getRemainingDaysForDebt(invoiceDate, "customer");

    if (remaining !== null && remaining <= 30) {
      const total = exportItem.total || 0;
      if (total === 0) continue;

      alerts.push({
        name: exportItem.receiverName || "Khách hàng",
        exportNo: exportItem.exportNo || `PX-${exportItem.id}`,
        remaining: remaining,
        invoiceDate: invoiceDate,
        label:
          remaining < 0
            ? `Quá hạn ${Math.abs(remaining)} ngày`
            : `Còn ${remaining} ngày`,
        total: total,
      });
    }
  }

  alerts.sort((a, b) => a.remaining - b.remaining);

  if (countEl) countEl.textContent = alerts.length;

  if (alerts.length === 0) {
    container.innerHTML = `
      <div style="padding: 25px; text-align: center; color: #4ade80; font-size: 13px;">
        <i class="fas fa-check-circle" style="font-size: 22px; display: block; margin-bottom: 6px;"></i>
        Không có công nợ nào sắp đến hạn
      </div>
    `;
    return;
  }

  const displayAlerts = alerts.slice(0, 10);

  container.innerHTML = displayAlerts
    .map((a) => {
      const isExpired = a.remaining < 0;
      return `
        <div class="alert-row" style="padding: 6px 12px; border-bottom: 1px solid #1e2d45; display: flex; gap: 10px; align-items: flex-start;">
          <div class="alert-indicator ${isExpired ? "ind-red" : "ind-yellow"}" 
               style="width: 3px; min-height: 30px; border-radius: 2px; flex-shrink: 0; background: ${isExpired ? "#ef4444" : "#f59e0b"};"></div>
          <div class="alert-body" style="flex: 1;">
            <div class="alert-name" style="font-size: 12px; font-weight: 600; color: #e2eaf5;">
              <strong>${escapeHtml(a.name)}</strong> 
              <span style="color: #60a5fa; font-weight: 400; font-size: 11px;">- ${escapeHtml(a.exportNo)}</span>
            </div>
            <div class="alert-meta" style="font-size: 10px; color: #6b82a0; margin-top: 2px;">
              <span>Ngày xuất HĐ: ${formatDate(a.invoiceDate)}</span>
              <span style="margin: 0 6px;">|</span>
              <strong style="color: ${isExpired ? "#f87171" : "#fbbf24"};">${a.label}</strong>
            </div>
            <div class="alert-meta" style="font-size: 11px; color: #fbbf24; font-weight: 600; margin-top: 2px;">
              Giá trị: ${formatCurrency(a.total)}
            </div>
          </div>
          <div class="alert-tag ${isExpired ? "tag-red" : "tag-yellow"}" 
               style="font-size: 8px; font-weight: 700; padding: 2px 8px; border-radius: 4px; align-self: center; flex-shrink: 0; 
                      background: ${isExpired ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}; 
                      color: ${isExpired ? "#f87171" : "#fbbf24"}; 
                      border: 1px solid ${isExpired ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"};">
            ${isExpired ? "QUÁ HẠN" : "CẢNH BÁO"}
          </div>
        </div>
      `;
    })
    .join("");

  if (alerts.length > 10) {
    container.innerHTML += `
      <div style="padding: 6px 12px; text-align: center; color: #6b82a0; font-size: 11px; border-top: 1px solid #1e2d45;">
        <i class="fas fa-ellipsis-h"></i> Còn ${alerts.length - 10} cảnh báo khác
      </div>
    `;
  }
}

// ============================================================
// LOAD CATEGORIES
// ============================================================
function loadCategories() {
  const container = document.getElementById("categoryList");
  const countEl = document.getElementById("categoryCount");

  if (!container) return;

  if (!homeInventoryData || homeInventoryData.length === 0) {
    container.innerHTML =
      '<div style="padding:15px;text-align:center;color:#6b82a0;font-size:13px;">Đang tải dữ liệu...</div>';
    if (countEl) countEl.textContent = "0 nhóm";
    return;
  }

  const catMap = new Map();
  for (const item of homeInventoryData) {
    const cat = item.phanLoai || "Chưa phân loại";
    catMap.set(cat, (catMap.get(cat) || 0) + 1);
  }

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

  if (countEl)
    countEl.textContent = `${categories.length} nhóm · ${total} mặt hàng`;

  container.innerHTML = categories
    .map(
      (cat, i) => `
        <div class="cat-row" style="margin-bottom: 6px;">
          <div class="cat-row-head">
            <span class="cat-name" style="font-size: 12px;">${escapeHtml(cat.n)}</span>
            <span class="cat-val" style="font-size: 11px; color:${colors[i % colors.length]}">${cat.c} mặt hàng</span>
          </div>
          <div class="cat-bar-wrap" style="height: 4px; background: var(--border); border-radius: 2px; overflow: hidden;">
            <div class="cat-bar-fill" style="width:${(cat.c / total) * 100}%; height: 100%; background:linear-gradient(90deg,${colors[i % colors.length]},${colors[i % colors.length]}aa); border-radius: 2px;"></div>
          </div>
        </div>
      `,
    )
    .join("");
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
// RESET ALL DATA
// ============================================================
async function resetAllData() {
  Utils.showLoading(true, "Đang làm mới toàn bộ dữ liệu...");
  try {
    localStorage.removeItem("lagom_inventory");
    localStorage.removeItem("lagom_receipts");
    localStorage.removeItem("lagom_exports");
    localStorage.removeItem("lagom_home_cache");

    await loadHomeData();
    loadHomeStats();
    loadSupplierDebtAlerts();
    loadCustomerDebtAlerts();
    loadCategories();

    if (
      typeof initInventory === "function" &&
      window.inventoryData !== undefined
    ) {
      const freshData = await window.API.inventory.getAll();
      window.inventoryData = freshData;
      initInventory(freshData);
    }

    Utils.showToast("✅ Đã làm mới toàn bộ dữ liệu!");
  } catch (error) {
    console.error("Reset error:", error);
    Utils.showToast("❌ Lỗi khi làm mới dữ liệu", "error");
  } finally {
    Utils.showLoading(false);
  }
}

// ============================================================
// INIT HOME
// ============================================================
async function initHome() {
  console.log("🟢 initHome started - Loading fresh data...");

  localStorage.removeItem("lagom_inventory");
  localStorage.removeItem("lagom_receipts");
  localStorage.removeItem("lagom_exports");
  localStorage.removeItem("lagom_home_cache");

  await loadHomeData();
  loadHomeStats();
  loadSupplierDebtAlerts();
  loadCustomerDebtAlerts();
  loadCategories();

  console.log("✅ Home page loaded successfully!");
}

// ============================================================
// EXPORT
// ============================================================
window.initHome = initHome;
window.resetAllData = resetAllData;
window.loadHomeData = loadHomeData;
window.loadSupplierDebtAlerts = loadSupplierDebtAlerts;
window.loadCustomerDebtAlerts = loadCustomerDebtAlerts;
window.loadCategories = loadCategories;
window.loadHomeStats = loadHomeStats;

console.log("✅ home.js loaded successfully!");
