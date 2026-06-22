/**
 * ==================== EXCEL CSS ====================
 */

window.EXCEL_CSS = `
  /* RESET */
  * { 
    font-family: 'Arial', 'Times New Roman', sans-serif; 
    box-sizing: border-box;
  }
  
  /* HEADER CÔNG TY */
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
    font-family: 'Arial', sans-serif;
  }
  .excel-company-address {
    font-size: 12px;
    color: #4a5568;
    font-family: 'Arial', sans-serif;
  }
  .excel-company-tax {
    font-size: 12px;
    color: #4a5568;
    font-family: 'Arial', sans-serif;
  }
  
  /* TIÊU ĐỀ */
  .excel-title {
    text-align: center;
    margin: 20px 0 5px;
  }
  .excel-title h2 {
    text-align: center;
    color: #1a365d;
    font-size: 20px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-family: 'Arial', sans-serif;
  }
  .excel-sub-title {
    text-align: center;
    font-size: 13px;
    color: #4a5568;
    font-style: italic;
    margin-top: 2px;
    font-family: 'Arial', sans-serif;
  }
  
  /* NGÀY THÁNG */
  .excel-date-row {
    text-align: right;
    font-size: 13px;
    margin: 10px 0 20px;
    color: #2d3748;
    font-style: italic;
    padding-right: 10px;
    font-family: 'Arial', sans-serif;
  }
  
  /* INFO BOX */
  .excel-info-box {
    border: 1px solid #dce0e5;
    padding: 12px 16px;
    background: #f8fafc;
    margin: 10px 0;
  }
  .excel-info-box strong {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #1a365d;
    margin-bottom: 8px;
    border-bottom: 1px solid #dce0e5;
    padding-bottom: 6px;
    font-family: 'Arial', sans-serif;
  }
  .excel-info-line {
    margin: 5px 0;
    font-size: 13px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    font-family: 'Arial', sans-serif;
  }
  .excel-info-line label {
    font-weight: 600;
    color: #4a5568;
    width: 100px;
    flex-shrink: 0;
  }
  .excel-info-line .excel-value {
    color: #1a202c;
    font-weight: 500;
  }
  .excel-info-grid {
    display: flex;
    gap: 20px;
    margin: 15px 0;
  }
  
  /* BẢNG CHÍNH */
  .excel-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin: 15px 0;
    border: 1px solid #dce0e5;
    font-family: 'Arial', sans-serif;
  }
  .excel-table th {
    background: #1a365d;
    color: #ffffff;
    font-weight: 700;
    padding: 8px 8px;
    border: 1px solid #2a4a6e;
    text-align: center;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
    font-family: 'Arial', sans-serif;
  }
  .excel-table td {
    padding: 6px 8px;
    border: 1px solid #dce0e5;
    font-size: 11px;
    color: #1a202c;
    vertical-align: middle;
    font-family: 'Arial', sans-serif;
  }
  
  /* CĂN LỀ */
  .excel-text-left { text-align: left !important; }
  .excel-text-center { text-align: center !important; }
  .excel-text-right { text-align: right !important; }
  
  /* TỔNG CỘNG */
  .excel-total-row {
    background: #edf2f7;
    font-weight: 700;
    border-top: 2px solid #1a365d;
  }
  .excel-total-row td {
    font-size: 13px;
    padding: 10px 8px;
    color: #1a365d;
    font-family: 'Arial', sans-serif;
  }
  .excel-total-amount {
    font-size: 15px;
    color: #1a365d;
    font-weight: 700;
  }
  
  /* STT */
  .excel-stt-cell {
    text-align: center;
    background: #f7fafc;
    font-weight: 600;
    color: #2d3748;
  }
  
  /* CHỮ KÝ - TÁCH 2 BÊN TRÁI PHẢI, MỖI BÊN CÓ KHOẢNG TRỐNG ĐỂ KÝ */
  .excel-signature-wrapper {
    display: flex;
    justify-content: space-between;
    margin-top: 50px;
    padding-top: 10px;
    width: 100%;
  }
  .excel-sign-item {
    text-align: center;
    width: 45%;
    max-width: 350px;
  }
  .excel-sign-line {
    margin-top: 50px;
    padding-top: 8px;
    border-top: 1px solid #1a202c;
    font-size: 13px;
    color: #4a5568;
    font-family: 'Arial', sans-serif;
    min-width: 200px;
  }
  .excel-sign-sub {
    font-size: 11px;
    color: #718096;
    display: block;
    margin-top: 4px;
    font-family: 'Arial', sans-serif;
  }
  
  /* KHOẢNG CÁCH SAU BẢNG */
  .excel-spacer {
    height: 40px;
  }
`;
