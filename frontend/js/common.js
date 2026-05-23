/**
 * ==================== COMMON UTILITIES ====================
 */

// Format functions
function formatCurrency(num) {
  if (num === undefined || num === null || isNaN(num)) num = 0;
  return new Intl.NumberFormat("vi-VN").format(num) + " ₫";
}

function formatNumber(num) {
  if (num === undefined || num === null || num === 0) return "0";
  return new Intl.NumberFormat("vi-VN").format(num);
}

function parseNumber(str) {
  if (!str) return 0;
  return parseInt(String(str).replace(/[^0-9]/g, ""), 10) || 0;
}

function formatDate(dateString) {
  if (!dateString || dateString === "") return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("vi-VN");
}

function formatDateISO(dateString) {
  if (!dateString) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  const parts = dateString.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return dateString;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * TÍNH CÔNG NỢ THEO CÔNG THỨC MỚI
 * Công nợ = Ngày xuất hóa đơn - Ngày hôm nay
 * Số ngày càng nhỏ càng cảnh báo nguy hiểm
 *
 * @param {string} invoiceDate - Ngày xuất hóa đơn (ngayXuatHD) hoặc ngày nhập HĐ
 * @param {string} type - Loại công nợ: 'supplier' (NCC) hoặc 'customer' (KH)
 * @returns {number|null} Số ngày còn lại đến hạn xuất hóa đơn
 */
function getRemainingDaysForDebt(invoiceDate, type = "customer") {
  // Nếu không có ngày xuất hóa đơn
  if (!invoiceDate || invoiceDate === "") return null;

  const dueDate = new Date(invoiceDate);
  if (isNaN(dueDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  // Số ngày còn lại = Ngày xuất hóa đơn - Hôm nay
  // Nếu âm là quá hạn
  return Math.ceil((dueDate - today) / 86400000);
}

/**
 * Tính công nợ từ dữ liệu inventory (cho bảng tồn kho)
 * @param {Object} item - Item từ inventory
 * @returns {number|null} Số ngày còn lại
 */
function getRemainingDays(item) {
  // Ưu tiên dùng ngayXuatHD nếu có
  if (item.ngayXuatHD && item.ngayXuatHD !== "") {
    return getRemainingDaysForDebt(item.ngayXuatHD, "customer");
  }
  // Nếu không có, dùng ngayNhapHD + 90 ngày (công nợ NCC)
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

/**
 * Lấy trạng thái công nợ dựa trên số ngày còn lại
 * Số ngày càng nhỏ càng cảnh báo nguy hiểm
 */
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

/**
 * TÍNH CÔNG NỢ CHO NHÀ CUNG CẤP (từ phiếu nhập)
 * @param {Object} receipt - Phiếu nhập hàng
 * @returns {Object} Thông tin công nợ
 */
function getSupplierDebtInfo(receipt) {
  const invoiceDate = receipt.ngayNhapHD || receipt.ngayNhapHD;
  const remaining = getRemainingDaysForDebt(invoiceDate, "supplier");
  const status = getDebtStatus(remaining);

  return {
    remaining: remaining,
    status: status.status,
    label: status.label,
    badgeClass: status.badgeClass,
    invoiceDate: invoiceDate,
    receiptNo: receipt.receiptNo || receipt.id,
    supplierName: receipt.supplier?.name || "—",
    total: receipt.total || 0,
  };
}

/**
 * TÍNH CÔNG NỢ CHO KHÁCH HÀNG (từ phiếu xuất)
 * @param {Object} exportItem - Phiếu xuất kho
 * @returns {Object} Thông tin công nợ
 */
function getCustomerDebtInfo(exportItem) {
  const invoiceDate = exportItem.ngayXuatHD || exportItem.exportDate;
  const remaining = getRemainingDaysForDebt(invoiceDate, "customer");
  const status = getDebtStatus(remaining);

  return {
    remaining: remaining,
    status: status.status,
    label: status.label,
    badgeClass: status.badgeClass,
    invoiceDate: invoiceDate,
    exportNo: exportItem.exportNo || exportItem.id,
    customerName: exportItem.receiverName || "—",
    total: exportItem.total || 0,
  };
}

// Export CSV
function exportToCSV(data, filename, headers) {
  if (!data || data.length === 0) {
    alert("Không có dữ liệu để xuất!");
    return;
  }
  const csvRows = [headers.join(",")];
  for (const row of data) {
    const values = headers.map((header) => {
      let val = row[header];
      if (val === undefined || val === null) return "";
      if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
      return val;
    });
    csvRows.push(values.join(","));
  }
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute(
    "download",
    `${filename}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  alert("Đã xuất file CSV thành công!");
}

// Pagination class
class Pagination {
  constructor(itemsPerPage = 20) {
    this.currentPage = 1;
    this.itemsPerPage = itemsPerPage;
    this.totalItems = 0;
    this.data = [];
  }
  setData(data) {
    this.data = data;
    this.totalItems = data.length;
    this.currentPage = 1;
  }
  getCurrentPageData() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.data.slice(start, start + this.itemsPerPage);
  }
  getTotalPages() {
    return Math.ceil(this.totalItems / this.itemsPerPage) || 1;
  }
  nextPage() {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
      return true;
    }
    return false;
  }
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      return true;
    }
    return false;
  }
  getPageInfo() {
    return `Trang ${this.currentPage} / ${this.getTotalPages()}`;
  }
  updateButtons(prevBtn, nextBtn) {
    if (prevBtn) prevBtn.disabled = this.currentPage === 1;
    if (nextBtn) nextBtn.disabled = this.currentPage === this.getTotalPages();
  }
}

// ========== LOAD INVENTORY DATA ==========
function loadInventoryData() {
  const saved = localStorage.getItem("lagom_inventory");
  if (saved && JSON.parse(saved).length > 0) {
    return JSON.parse(saved);
  }
  return [];
}

function saveInventoryDataToStorage(data) {
  localStorage.setItem("lagom_inventory", JSON.stringify(data));
}

// ========== LOAD RECEIPTS FOR SUPPLIER DEBT ==========
function loadReceiptsData() {
  const saved = localStorage.getItem("lagom_receipts");
  if (saved && JSON.parse(saved).length > 0) {
    return JSON.parse(saved);
  }
  return [];
}

// ========== LOAD EXPORTS FOR CUSTOMER DEBT ==========
function loadExportsData() {
  const saved = localStorage.getItem("lagom_exports");
  if (saved && JSON.parse(saved).length > 0) {
    return JSON.parse(saved);
  }
  return [];
}
