/**
 * ==================== UTILS ====================
 * Các hàm dùng chung cho toàn bộ frontend
 */

// Format số thành tiền
function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) amount = 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

// Format số thường
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return new Intl.NumberFormat("vi-VN").format(num);
}

// Parse số từ string
function parseNumber(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

// Format ngày tháng
function formatDate(dateStr, format = "DD/MM/YYYY") {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  if (format === "DD/MM/YYYY") return `${day}/${month}/${year}`;
  if (format === "YYYY-MM-DD") return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Hiển thị toast message
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type === "success" ? "✓" : type === "error" ? "✗" : "ℹ"}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
  `;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#3b82f6"};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    max-width: 90%;
    word-break: break-word;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Hiển thị loading overlay
function showLoading(show = true, text = "Đang xử lý...") {
  let overlay = document.querySelector(".loading-overlay");
  if (show) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "loading-overlay";
      overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">${text}</div>
      `;
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
      `;
      document.body.appendChild(overlay);
    } else {
      const textEl = overlay.querySelector(".loading-text");
      if (textEl) textEl.textContent = text;
      overlay.style.display = "flex";
    }
  } else {
    if (overlay) overlay.style.display = "none";
  }
}

// Copy text vào clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Đã sao chép vào clipboard");
  } catch (err) {
    console.error("Copy failed:", err);
  }
}

// Download file từ blob
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export to Excel with formatting
function exportToExcel(htmlContent, filename) {
  const styles = `
    <style>
      * { font-family: 'Times New Roman', Arial, sans-serif; }
      h2 { text-align: center; color: #1e3a5f; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { 
        background: #1e3a5f; 
        color: white; 
        font-weight: bold; 
        padding: 8px; 
        border: 1px solid #2d4a6e;
        text-align: center;
      }
      td { 
        padding: 6px 8px; 
        border: 1px solid #cbd5e0; 
        text-align: left;
      }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .total-row { background: #f1f5f9; font-weight: bold; }
      .stt-cell { text-align: center; background: #f8fafc; }
      .company-header { 
        text-align: center; 
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #1e3a5f;
      }
      .company-name { 
        font-size: 18px; 
        font-weight: 700; 
        color: #1e3a5f; 
        text-transform: uppercase;
      }
      .company-address, .company-tax {
        font-size: 12px;
        color: #4a5568;
      }
      .info-box {
        border: 1px solid #cbd5e0;
        padding: 12px 16px;
        background: #f8fafc;
        border-radius: 4px;
        margin: 10px 0;
      }
      .info-box strong {
        display: block;
        font-size: 13px;
        font-weight: 700;
        color: #1e3a5f;
        margin-bottom: 8px;
      }
      .info-line {
        margin: 4px 0;
        font-size: 13px;
      }
      .info-line label {
        font-weight: 600;
        color: #4a5568;
        margin-right: 8px;
      }
      .signature {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
        padding-top: 20px;
      }
      .sign-item {
        text-align: center;
        width: 200px;
      }
      .sign-line {
        margin-top: 30px;
        padding-top: 8px;
        border-top: 1px solid #1a202c;
        font-size: 12px;
        color: #4a5568;
      }
      .date-row {
        text-align: right;
        font-size: 14px;
        margin-bottom: 20px;
        color: #2d3748;
        font-style: italic;
      }
    </style>
  `;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        ${styles}
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Sheet1</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Export tất cả
window.Utils = {
  formatCurrency,
  formatNumber,
  parseNumber,
  formatDate,
  escapeHtml,
  debounce,
  showToast,
  showLoading,
  copyToClipboard,
  downloadFile,
  exportToExcel,
};
