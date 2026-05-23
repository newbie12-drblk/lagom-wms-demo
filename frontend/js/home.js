// ==================== TRANG CHỦ ====================
// SỬA: Gọi API thay vì localStorage

let homeInventoryData = [];
let homeReceiptsData = [];
let homeExportsData = [];

async function initHome() {
  console.log("🟢 initHome started");

  // Load dữ liệu từ API
  await loadHomeData();

  loadHomeStats();
  loadSupplierDebtAlerts();
  loadCustomerDebtAlerts();
  loadCategories();
}

async function loadHomeData() {
  try {
    const [inventory, receipts, exports] = await Promise.all([
      window.API.inventory.getAll(),
      window.API.receipt.getAll(),
      window.API.export.getAll(),
    ]);

    homeInventoryData = inventory;
    homeReceiptsData = receipts;
    homeExportsData = exports;

    console.log(
      `Loaded: ${homeInventoryData.length} products, ${homeReceiptsData.length} receipts, ${homeExportsData.length} exports`,
    );
  } catch (error) {
    console.error("Load home data error:", error);
    homeInventoryData = [];
    homeReceiptsData = [];
    homeExportsData = [];
  }
}

function getRemainingDaysForDebt(invoiceDate) {
  if (!invoiceDate || invoiceDate === "") return null;

  const dueDate = new Date(invoiceDate);
  if (isNaN(dueDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return Math.ceil((dueDate - today) / 86400000);
}

function getSupplierDebtRemaining(receipt) {
  const invoiceDate = receipt.ngayNhapHD || receipt.receiptDate;
  return getRemainingDaysForDebt(invoiceDate);
}

function getCustomerDebtRemaining(exportItem) {
  const invoiceDate = exportItem.ngayXuatHD || exportItem.exportDate;
  return getRemainingDaysForDebt(invoiceDate);
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

function getRemainingDays(item) {
  if (item.ngayXuatHD && item.ngayXuatHD !== "") {
    return getRemainingDaysForDebt(item.ngayXuatHD);
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

async function loadSupplierDebtAlerts() {
  const container = document.getElementById("supplierAlertList");
  if (!container) return;

  if (!homeReceiptsData || homeReceiptsData.length === 0) {
    container.innerHTML =
      '<div style="padding:40px;text-align:center;">Chưa có dữ liệu phiếu nhập</div>';
    document.getElementById("supplierAlertCount").textContent = "0 cảnh báo";
    return;
  }

  const alerts = [];
  homeReceiptsData.forEach((receipt) => {
    let invoiceDate = receipt.ngayNhapHD || receipt.receiptDate;
    if (!invoiceDate) return;

    const remaining = getSupplierDebtRemaining(receipt);

    if (remaining !== null && remaining <= 30) {
      alerts.push({
        type: "supplier",
        name: receipt.supplierName || "Nhà cung cấp",
        receiptNo: receipt.receiptNo || `PN-${receipt.id}`,
        remaining: remaining,
        invoiceDate: invoiceDate,
        label:
          remaining < 0
            ? `Quá hạn ${Math.abs(remaining)} ngày`
            : `Còn ${remaining} ngày đến hạn xuất HĐ`,
        total: receipt.total || 0,
      });
    }
  });

  alerts.sort((a, b) => a.remaining - b.remaining);
  document.getElementById("supplierAlertCount").textContent =
    `${alerts.length} cảnh báo`;

  if (alerts.length === 0) {
    container.innerHTML =
      '<div style="padding:40px;text-align:center;">Không có công nợ nào với nhà cung cấp sắp đến hạn</div>';
    return;
  }

  container.innerHTML = alerts
    .slice(0, 5)
    .map(
      (a) => `
        <div class="alert-row">
            <div class="alert-indicator ${a.remaining < 0 ? "ind-red" : "ind-yellow"}"></div>
            <div class="alert-body">
                <div class="alert-name"><strong>${escapeHtml(a.name)}</strong> - ${escapeHtml(a.receiptNo)}</div>
                <div class="alert-meta">Ngày nhập HĐ: ${formatDate(a.invoiceDate)} | <strong>${a.label}</strong></div>
                <div class="alert-meta">Giá trị: ${formatCurrency(a.total)}</div>
            </div>
            <div class="alert-tag ${a.remaining < 0 ? "tag-red" : "tag-yellow"}">${a.remaining < 0 ? "QUÁ HẠN" : "CẢNH BÁO"}</div>
        </div>
    `,
    )
    .join("");
}

async function loadCustomerDebtAlerts() {
  const container = document.getElementById("customerAlertList");
  if (!container) return;

  if (!homeExportsData || homeExportsData.length === 0) {
    container.innerHTML =
      '<div style="padding:40px;text-align:center;">Chưa có dữ liệu phiếu xuất</div>';
    document.getElementById("customerAlertCount").textContent = "0 cảnh báo";
    return;
  }

  const alerts = [];
  homeExportsData.forEach((exportItem) => {
    let invoiceDate = exportItem.ngayXuatHD || exportItem.exportDate;
    if (!invoiceDate) return;

    const remaining = getCustomerDebtRemaining(exportItem);

    if (remaining !== null && remaining <= 30) {
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
        total: exportItem.total || 0,
      });
    }
  });

  alerts.sort((a, b) => a.remaining - b.remaining);
  document.getElementById("customerAlertCount").textContent =
    `${alerts.length} cảnh báo`;

  if (alerts.length === 0) {
    container.innerHTML =
      '<div style="padding:40px;text-align:center;">Không có công nợ nào với khách hàng sắp đến hạn</div>';
    return;
  }

  container.innerHTML = alerts
    .slice(0, 5)
    .map(
      (a) => `
        <div class="alert-row">
            <div class="alert-indicator ${a.remaining < 0 ? "ind-red" : "ind-yellow"}"></div>
            <div class="alert-body">
                <div class="alert-name"><strong>${escapeHtml(a.name)}</strong> - ${escapeHtml(a.exportNo)}</div>
                <div class="alert-meta">Ngày xuất HĐ: ${formatDate(a.invoiceDate)} | <strong>${a.label}</strong></div>
                <div class="alert-meta">Giá trị: ${formatCurrency(a.total)}</div>
            </div>
            <div class="alert-tag ${a.remaining < 0 ? "tag-red" : "tag-yellow"}">${a.remaining < 0 ? "QUÁ HẠN" : "CẢNH BÁO"}</div>
        </div>
    `,
    )
    .join("");
}

function loadCategories() {
  const container = document.getElementById("categoryList");
  if (!container) return;

  if (!homeInventoryData || homeInventoryData.length === 0) {
    container.innerHTML =
      '<div style="padding:20px;text-align:center;">Đang tải dữ liệu...</div>';
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

// Refresh home data
window.refreshHomeData = async function () {
  await loadHomeData();
  loadHomeStats();
  loadSupplierDebtAlerts();
  loadCustomerDebtAlerts();
  loadCategories();
};

// Export
window.initHome = initHome;
