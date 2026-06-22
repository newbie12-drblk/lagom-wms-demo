// Thêm vào cuối file utils.js
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

// Thêm vào window.Utils
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
