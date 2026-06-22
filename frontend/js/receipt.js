/**
 * ==================== RECEIPT MODULE ====================
 * Quản lý phiếu nhập hàng
 */

(function () {
  "use strict";

  // ========== KIỂM TRA ĐĂNG NHẬP ==========
  function checkAuthAndRedirect() {
    if (!window.Auth) {
      console.log("⏳ Đang chờ Auth load...");
      return false;
    }
    if (!Auth.isLoggedIn()) {
      alert("❌ Vui lòng đăng nhập để sử dụng chức năng này!");
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  // ========== DOM Elements ==========
  const DOM = {
    btnExportExcel: document.getElementById("btnExportExcel"),
    day: document.getElementById("day"),
    month: document.getElementById("month"),
    year: document.getElementById("year"),
    supplierName: document.getElementById("supplierName"),
    supplierAddress: document.getElementById("supplierAddress"),
    supplierTax: document.getElementById("supplierTax"),
    customerName: document.getElementById("customerName"),
    customerAddress: document.getElementById("customerAddress"),
    customerTax: document.getElementById("customerTax"),
    customerContract: document.getElementById("customerContract"),
    itemsBody: document.getElementById("itemsBody"),
    totalAmount: document.getElementById("totalAmount"),
    btnAddRow: document.getElementById("btnAddRow"),
    btnClear: document.getElementById("btnClear"),
    btnPrint: document.getElementById("btnPrint"),
    btnBack: document.getElementById("btnBack"),
    btnSave: document.getElementById("btnSave"),
  };

  let rowCounter = 1;

  // ========== Utility Functions ==========
  function formatCurrency(num) {
    if (isNaN(num)) num = 0;
    return new Intl.NumberFormat("vi-VN").format(num);
  }

  function parseNumber(str) {
    if (!str) return 0;
    const cleaned = String(str).replace(/[^0-9]/g, "");
    return parseInt(cleaned, 10) || 0;
  }

  function formatNumberInput(input) {
    const rawValue = input.value;
    const number = parseNumber(rawValue);
    input.value = number ? formatCurrency(number) : "";
    return number;
  }

  function calculateTotal() {
    let total = 0;
    const rowTotals = document.querySelectorAll(".row-total");
    rowTotals.forEach((el) => {
      total += parseNumber(el.getAttribute("data-total"));
    });
    if (DOM.totalAmount) DOM.totalAmount.textContent = formatCurrency(total);
    return total;
  }

  function updateRowTotal(row) {
    const priceInput = row.querySelector(".price-input");
    const qtyInput = row.querySelector(".qty-input");
    const totalSpan = row.querySelector(".row-total");

    const price = parseNumber(priceInput.value);
    const qty = parseNumber(qtyInput.value);
    const total = price * qty;

    totalSpan.textContent = formatCurrency(total);
    totalSpan.setAttribute("data-total", total);
    calculateTotal();
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(
      /[&<>]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
    );
  }

  // ========== TỰ ĐỘNG ĐIỀN THEO MÃ HÀNG ==========
  async function autoFillByMaHang(row, maHangInput) {
    const maHang = maHangInput.value.trim();
    if (!maHang) return;

    try {
      const product = await window.API.inventory.getByMaHang(maHang);
      if (product) {
        const nameInput = row.querySelector(".product-name");
        const packingInput = row.querySelector(".packing");
        const manufacturerInput = row.querySelector(".manufacturer");
        const unitInput = row.querySelector(".unit");
        const categoryInput = row.querySelector(".category");
        const priceInput = row.querySelector(".price-input");

        if (nameInput) nameInput.value = product.tenThuongMai || "";
        if (packingInput) packingInput.value = product.quyCach || "";
        if (manufacturerInput) manufacturerInput.value = product.hangSX || "";
        if (unitInput) unitInput.value = product.dvt || "";
        if (categoryInput) categoryInput.value = product.phanLoai || "";
        if (priceInput) {
          priceInput.value = formatCurrency(product.giaNhap || 0);
          updateRowTotal(row);
        }
      }
    } catch (error) {
      console.log("Không tìm thấy sản phẩm với mã:", maHang);
    }
  }

  // ========== Tạo dòng sản phẩm ==========
  function createProductRow(data = null) {
    const row = document.createElement("tr");
    const stt = rowCounter++;

    const removeButton =
      '<button class="btn-remove" type="button"><i class="fas fa-trash"></i></button>';

    row.innerHTML = `
            <td class="stt-cell">${stt}</td>
            <td><input type="text" class="product-name" value="${escapeHtml(data?.tenThuongMai || "")}" placeholder="Tên thương mại"></td>
            <td><input type="text" class="product-code" value="${escapeHtml(data?.maHang || "")}" placeholder="Mã hàng"></td>
            <td><input type="text" class="packing" value="${escapeHtml(data?.quyCach || "")}" placeholder="Quy cách"></td>
            <td><input type="text" class="manufacturer" value="${escapeHtml(data?.hangSX || "")}" placeholder="Hãng SX"></td>
            <td><input type="text" class="unit" value="${escapeHtml(data?.dvt || "")}" placeholder="ĐVT"></td>
            <td><input type="text" class="category" value="${escapeHtml(data?.phanLoai || "")}" placeholder="Phân loại"></td>
            <td><input type="text" class="price-input" value="${data?.giaNhap ? formatCurrency(data.giaNhap) : "0"}"></td>
            <td><input type="text" class="qty-input" value="${data?.soLuongNhap || "0"}"></td>
            <td class="row-total" data-total="0">0</td>
            <td class="text-center">${removeButton}</td>
        `;

    // Gắn sự kiện
    const priceInput = row.querySelector(".price-input");
    const qtyInput = row.querySelector(".qty-input");
    const maHangInput = row.querySelector(".product-code");
    const removeBtn = row.querySelector(".btn-remove");

    if (priceInput) {
      priceInput.addEventListener("input", () => {
        formatNumberInput(priceInput);
        updateRowTotal(row);
      });
    }

    if (qtyInput) {
      qtyInput.addEventListener("input", () => {
        formatNumberInput(qtyInput);
        updateRowTotal(row);
      });
    }

    if (maHangInput) {
      maHangInput.addEventListener("blur", () =>
        autoFillByMaHang(row, maHangInput),
      );
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        row.remove();
        renumberRows();
        calculateTotal();
      });
    }

    return row;
  }

  function addNewRow(data = null) {
    const row = createProductRow(data);
    DOM.itemsBody.appendChild(row);
    updateRowTotal(row);
  }

  function renumberRows() {
    const rows = DOM.itemsBody.querySelectorAll("tr");
    rows.forEach((row, index) => {
      const sttCell = row.querySelector(".stt-cell");
      if (sttCell) sttCell.textContent = index + 1;
    });
    rowCounter = rows.length + 1;
  }

  // ========== Lấy dữ liệu phiếu nhập ==========
  function getReceiptData() {
    const items = [];
    const rows = DOM.itemsBody.querySelectorAll("tr");

    rows.forEach((row) => {
      items.push({
        tenThuongMai: row.querySelector(".product-name")?.value || "",
        maHang: row.querySelector(".product-code")?.value || "",
        quyCach: row.querySelector(".packing")?.value || "",
        hangSX: row.querySelector(".manufacturer")?.value || "",
        dvt: row.querySelector(".unit")?.value || "",
        phanLoai: row.querySelector(".category")?.value || "",
        giaNhap: parseNumber(row.querySelector(".price-input")?.value),
        soLuongNhap: parseNumber(row.querySelector(".qty-input")?.value),
        thanhTien: parseNumber(
          row.querySelector(".row-total")?.getAttribute("data-total"),
        ),
      });
    });

    return {
      receiptDate: `${DOM.day?.textContent}/${DOM.month?.textContent}/${DOM.year?.textContent}`,
      supplierName: DOM.supplierName?.value || "",
      supplierAddress: DOM.supplierAddress?.value || "",
      supplierTax: DOM.supplierTax?.value || "",
      customerName: DOM.customerName?.value || "",
      customerAddress: DOM.customerAddress?.value || "",
      customerTax: DOM.customerTax?.value || "",
      customerContract: DOM.customerContract?.value || "",
      items: items,
      total: parseNumber(DOM.totalAmount?.textContent),
      notes: "",
    };
  }

  // ========== LƯU PHIẾU NHẬP ==========
  async function saveReceipt() {
    const data = getReceiptData();

    if (data.items.length === 0) {
      alert("⚠️ Chưa có sản phẩm nào để nhập!");
      return;
    }

    Utils.showLoading(true, "Đang lưu phiếu...");
    try {
      const result = await window.API.receipt.create(data);
      if (result.success) {
        Utils.showToast("✅ Đã lưu phiếu nhập hàng thành công!");
        clearForm();
      } else {
        Utils.showToast(
          "❌ Lỗi: " + (result.message || "Không thể lưu phiếu"),
          "error",
        );
      }
    } catch (error) {
      console.error("Save receipt error:", error);
      Utils.showToast("❌ Có lỗi xảy ra khi lưu phiếu!", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ========== Làm mới form ==========
  function clearForm() {
    if (confirm("Bạn có chắc muốn làm mới toàn bộ phiếu?")) {
      DOM.supplierName.value = "";
      DOM.supplierAddress.value = "";
      DOM.supplierTax.value = "";
      DOM.customerName.value = "";
      DOM.customerAddress.value = "";
      DOM.customerTax.value = "";
      DOM.customerContract.value = "";
      DOM.itemsBody.innerHTML = "";
      rowCounter = 1;
      addNewRow();
    }
  }

  function printReceipt() {
    window.print();
  }

  function goBack() {
    window.location.href = "index.html";
  }

  function setCurrentDate() {
    const today = new Date();
    if (DOM.day) DOM.day.textContent = today.getDate();
    if (DOM.month) DOM.month.textContent = today.getMonth() + 1;
    if (DOM.year) DOM.year.textContent = today.getFullYear();
  }

  // ========== EXPORT TO EXCEL ==========
  function exportToExcel() {
    const data = getReceiptData();

    if (data.items.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }

    // Tạo HTML cho Excel
    let itemsHTML = data.items
      .map(
        (item, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${escapeHtml(item.tenThuongMai)}</td>
        <td>${escapeHtml(item.maHang)}</td>
        <td>${escapeHtml(item.quyCach)}</td>
        <td>${escapeHtml(item.hangSX)}</td>
        <td>${escapeHtml(item.dvt)}</td>
        <td>${escapeHtml(item.phanLoai)}</td>
        <td class="text-right">${formatCurrency(item.giaNhap)}</td>
        <td class="text-right">${item.soLuongNhap}</td>
        <td class="text-right">${formatCurrency(item.thanhTien)}</td>
        <td></td>
      </tr>
    `,
      )
      .join("");

    const totalHTML = `
      <tr class="total-row">
        <td colspan="8" class="text-right"><strong>TỔNG CỘNG:</strong></td>
        <td class="text-right"><strong>${formatCurrency(data.total)}</strong></td>
        <td colspan="2"></td>
      </tr>
    `;

    const htmlContent = `
      <div class="company-header">
        <div class="company-name">CÔNG TY TNHH DƯỢC - TRANG THIẾT BỊ LAGOM</div>
        <div class="company-address">Địa chỉ: Số 1073/63B đường Cách Mạng Tháng Tám, Phường Tân Sơn Nhất, TP. Hồ Chí Minh</div>
        <div class="company-tax">MST: 0316156162</div>
      </div>
      
      <h2>PHIẾU ĐỀ NGHỊ NHẬP HÀNG HÓA</h2>
      
      <div class="date-row">
        Ngày ${DOM.day?.textContent || ""} tháng ${DOM.month?.textContent || ""} năm ${DOM.year?.textContent || ""}
      </div>
      
      <div class="info-grid">
        <div class="info-box">
          <strong>📦 Thông tin nhà cung cấp</strong>
          <div class="info-line"><label>Công ty:</label> ${escapeHtml(data.supplierName)}</div>
          <div class="info-line"><label>Địa chỉ:</label> ${escapeHtml(data.supplierAddress)}</div>
          <div class="info-line"><label>MST:</label> ${escapeHtml(data.supplierTax)}</div>
        </div>
        <div class="info-box">
          <strong>🏥 Thông tin khách hàng</strong>
          <div class="info-line"><label>Tên đơn vị:</label> ${escapeHtml(data.customerName)}</div>
          <div class="info-line"><label>Địa chỉ:</label> ${escapeHtml(data.customerAddress)}</div>
          <div class="info-line"><label>MST:</label> ${escapeHtml(data.customerTax)}</div>
          <div class="info-line"><label>Số HĐ:</label> ${escapeHtml(data.customerContract)}</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>TT</th>
            <th>Tên thương mại</th>
            <th>Mã hàng</th>
            <th>Quy cách</th>
            <th>Hãng SX</th>
            <th>ĐVT</th>
            <th>Phân loại</th>
            <th>Đơn giá</th>
            <th>Số lượng</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
          ${totalHTML}
        </tbody>
      </table>
      
      <div class="signature">
        <div class="sign-item"><div class="sign-line">Bộ phận đặt hàng</div></div>
        <div class="sign-item"><div class="sign-line">Người lập phiếu</div></div>
        <div class="sign-item"><div class="sign-line">Giám đốc</div></div>
      </div>
    `;

    Utils.exportToExcel(htmlContent, "phieu_nhap_hang");
  }

  // ========== INIT ==========
  function init() {
    if (!checkAuthAndRedirect()) return;
    setCurrentDate();
    addNewRow();
  }

  // ========== BIND EVENTS ==========
  function bindEvents() {
    if (DOM.btnAddRow)
      DOM.btnAddRow.addEventListener("click", () => addNewRow());
    if (DOM.btnClear) DOM.btnClear.addEventListener("click", clearForm);
    if (DOM.btnPrint) DOM.btnPrint.addEventListener("click", printReceipt);
    if (DOM.btnBack) DOM.btnBack.addEventListener("click", goBack);
    if (DOM.btnSave) DOM.btnSave.addEventListener("click", saveReceipt);
    if (DOM.btnExportExcel)
      DOM.btnExportExcel.addEventListener("click", exportToExcel);
  }

  document.addEventListener("DOMContentLoaded", () => {
    init();
    bindEvents();
  });
})();
