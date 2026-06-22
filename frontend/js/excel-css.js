/**
 * ==================== EXCEL CSS ====================
 * CSS dành riêng cho file Excel xuất ra
 * Được load 1 lần và lưu vào window.EXCEL_CSS
 */

window.EXCEL_CSS = `
  .excel-company-header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 3px double #1a365d;
  }
  .excel-company-name {
    font-size: 18px;
    font-weight: 700;
    color: #1a365d;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 4px;
  }
  .excel-company-address,
  .excel-company-tax {
    font-size: 12px;
    color: #4a5568;
  }
  .excel-title {
    text-align: center;
    margin: 20px 0 10px;
  }
  .excel-title h2 {
    text-align: center;
    color: #1a365d;
    font-size: 20px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 4px;
  }
  .excel-sub-title {
    text-align: center;
    font-size: 13px;
    color: #4a5568;
    font-style: italic;
    margin-top: 2px;
  }
  .excel-date-row {
    text-align: right;
    font-size: 14px;
    margin-bottom: 20px;
    color: #2d3748;
    font-style: italic;
  }
  .excel-info-grid {
    display: flex;
    gap: 20px;
    margin: 15px 0;
  }
  .excel-info-box {
    border: 1px solid #dce0e5;
    padding: 12px 16px;
    background: #f8fafc;
    border-radius: 4px;
    flex: 1;
  }
  .excel-info-box strong {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #1a365d;
    margin-bottom: 8px;
    border-bottom: 1px solid #dce0e5;
    padding-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .excel-info-line {
    margin: 4px 0;
    font-size: 13px;
  }
  .excel-info-line label {
    font-weight: 600;
    color: #4a5568;
    margin-right: 8px;
    min-width: 70px;
    display: inline-block;
  }
  .excel-info-line .excel-value {
    color: #1a202c;
  }
  .excel-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin: 15px 0;
    border: 1px solid #dce0e5;
  }
  .excel-table th {
    background: #1a365d;
    color: #ffffff;
    font-weight: 700;
    padding: 8px 10px;
    border: 1px solid #2a4a6e;
    text-align: center;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .excel-table td {
    padding: 6px 8px;
    border: 1px solid #dce0e5;
    text-align: left;
    font-size: 12px;
    color: #1a202c;
  }
  .excel-text-right { text-align: right; }
  .excel-text-center { text-align: center; }
  .excel-text-left { text-align: left; }
  .excel-total-row {
    background: #edf2f7;
    font-weight: 700;
    border-top: 2px solid #1a365d;
  }
  .excel-total-row td {
    font-size: 14px;
    padding: 10px 8px;
    color: #1a365d;
  }
  .excel-total-amount {
    font-size: 16px;
    color: #1a365d;
  }
  .excel-stt-cell {
    text-align: center;
    background: #f7fafc;
    font-weight: 600;
    color: #2d3748;
  }
  .excel-signature {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
    padding-top: 20px;
  }
  .excel-sign-item {
    text-align: center;
    width: 200px;
  }
  .excel-sign-line {
    margin-top: 35px;
    padding-top: 8px;
    border-top: 1px solid #1a202c;
    font-size: 12px;
    color: #4a5568;
  }
  .excel-sign-sub {
    font-size: 10px;
    color: #718096;
    display: block;
    margin-top: 3px;
  }
  .excel-notes {
    margin-top: 15px;
    padding: 10px 16px;
    border: 1px solid #dce0e5;
    background: #fafbfc;
    border-radius: 4px;
    font-size: 13px;
    color: #4a5568;
  }
  .excel-notes strong {
    color: #1a365d;
  }
`;

console.log("✅ Excel CSS đã được load!");
