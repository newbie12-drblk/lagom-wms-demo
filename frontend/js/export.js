/**
 * ==================== EXPORT MODULE ====================
 * Quản lý phiếu xuất kho - FIXED VERSION
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
    customerName: document.getElementById("customerName"),
    customerAddress: document.getElementById("customerAddress"),
    customerTax: document.getElementById("customerTax"),
    customerContract: document.getElementById("customerContract"),
    exportNo: document.getElementById("exportNo"),
    receiverName: document.getElementById("receiverName"),
    exportReason: document.getElementById("exportReason"),
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
    if (!input) return 0;
    const rawValue = input.value;
    const number = parseNumber(rawValue);
    input.value = number ? formatCurrency(number) : "";
    return number;
  }

  function calculateTotal() {
    let total = 0;
    document.querySelectorAll(".row-total").forEach((el) => {
      total += parseNumber(el.getAttribute("data-total"));
    });
    if (DOM.totalAmount) {
      DOM.totalAmount.textContent = formatCurrency(total);
    }
    return total;
  }

  function updateRowTotal(row) {
    if (!row) return;
    const priceInput = row.querySelector(".price-input");
    const qtyInput = row.querySelector(".qty-input");
    const totalSpan = row.querySelector(".row-total");

    if (!priceInput || !qtyInput || !totalSpan) return;

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
    if (!row || !maHangInput) return;
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
        const lotInput = row.querySelector(".lot-input");
        const expiryInput = row.querySelector(".expiry-input");

        if (nameInput) nameInput.value = product.tenThuongMai || "";
        if (packingInput) packingInput.value = product.quyCach || "";
        if (manufacturerInput) manufacturerInput.value = product.hangSX || "";
        if (unitInput) unitInput.value = product.dvt || "";
        if (categoryInput) categoryInput.value = product.phanLoai || "";
        if (priceInput) {
          priceInput.value = formatCurrency(
            product.giaXuat || product.giaNhap || 0,
          );
          updateRowTotal(row);
        }
        if (lotInput && product.soLot) lotInput.value = product.soLot;
        if (expiryInput && product.ngayHetHan)
          expiryInput.value = product.ngayHetHan;
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
      <td><input type="text" class="product-name" value="${escapeHtml(data?.tenThuongMai || "")}" placeholder="Tên sản phẩm"></td>
      <td><input type="text" class="product-code" value="${escapeHtml(data?.maHang || "")}" placeholder="Mã hàng"></td>
      <td><input type="text" class="packing" value="${escapeHtml(data?.quyCach || "")}" placeholder="Quy cách"></td>
      <td><input type="text" class="manufacturer" value="${escapeHtml(data?.hangSX || "")}" placeholder="Hãng SX"></td>
      <td><input type="text" class="unit" value="${escapeHtml(data?.dvt || "")}" placeholder="ĐVT"></td>
      <td><input type="text" class="category" value="${escapeHtml(data?.phanLoai || "")}" placeholder="Phân loại"></td>
      <td><input type="text" class="price-input" value="${data?.donGia ? formatCurrency(data.donGia) : "0"}"></td>
      <td><input type="text" class="qty-input" value="${data?.soLuong || "0"}"></td>
      <td class="row-total" data-total="0">0</td>
      <td><input type="text" class="lot-input" placeholder="Số lot" value="${escapeHtml(data?.soLot || "")}"></td>
      <td><input type="date" class="expiry-input" value="${data?.ngayHetHan || ""}"></td>
      <td><input type="text" class="note-input" placeholder="Ghi chú" value="${escapeHtml(data?.ghiChu || "")}"></td>
      <td class="text-center">${removeButton}</td>
    `;

    const priceInput = row.querySelector(".price-input");
    const qtyInput = row.querySelector(".qty-input");
    const maHangInput = row.querySelector(".product-code");
    const removeBtn = row.querySelector(".btn-remove");

    if (priceInput) {
      priceInput.addEventListener("input", function () {
        formatNumberInput(this);
        updateRowTotal(row);
      });
    }

    if (qtyInput) {
      qtyInput.addEventListener("input", function () {
        formatNumberInput(this);
        updateRowTotal(row);
      });
    }

    if (maHangInput) {
      maHangInput.addEventListener("blur", function () {
        autoFillByMaHang(row, this);
      });
      maHangInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          autoFillByMaHang(row, this);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        if (document.querySelectorAll("#itemsBody tr").length <= 1) {
          alert("⚠️ Phải có ít nhất một dòng sản phẩm!");
          return;
        }
        row.remove();
        renumberRows();
        calculateTotal();
      });
    }

    return row;
  }

  function addNewRow(data = null) {
    if (!DOM.itemsBody) return;
    const row = createProductRow(data);
    DOM.itemsBody.appendChild(row);
    updateRowTotal(row);
  }

  function renumberRows() {
    if (!DOM.itemsBody) return;
    const rows = DOM.itemsBody.querySelectorAll("tr");
    rows.forEach((row, index) => {
      const sttCell = row.querySelector(".stt-cell");
      if (sttCell) sttCell.textContent = index + 1;
    });
    rowCounter = rows.length + 1;
  }

  // ========== Lấy dữ liệu phiếu xuất ==========
  function getExportData() {
    const items = [];
    if (!DOM.itemsBody) return { items: [], total: 0 };

    const rows = DOM.itemsBody.querySelectorAll("tr");

    rows.forEach((row) => {
      const nameInput = row.querySelector(".product-name");
      const codeInput = row.querySelector(".product-code");
      const packingInput = row.querySelector(".packing");
      const manufacturerInput = row.querySelector(".manufacturer");
      const unitInput = row.querySelector(".unit");
      const categoryInput = row.querySelector(".category");
      const priceInput = row.querySelector(".price-input");
      const qtyInput = row.querySelector(".qty-input");
      const totalSpan = row.querySelector(".row-total");
      const lotInput = row.querySelector(".lot-input");
      const expiryInput = row.querySelector(".expiry-input");
      const noteInput = row.querySelector(".note-input");

      items.push({
        tenThuongMai: nameInput?.value || "",
        maHang: codeInput?.value || "",
        quyCach: packingInput?.value || "",
        hangSX: manufacturerInput?.value || "",
        dvt: unitInput?.value || "",
        phanLoai: categoryInput?.value || "",
        donGia: parseNumber(priceInput?.value),
        soLuong: parseNumber(qtyInput?.value),
        thanhTien: parseNumber(totalSpan?.getAttribute("data-total")),
        soLot: lotInput?.value || "",
        ngayHetHan: expiryInput?.value || "",
        ghiChu: noteInput?.value || "",
      });
    });

    // Lấy giá trị từ DOM
    const customerNameEl = document.getElementById("customerName");
    const customerAddressEl = document.getElementById("customerAddress");
    const customerTaxEl = document.getElementById("customerTax");
    const customerContractEl = document.getElementById("customerContract");
    const exportNoEl = document.getElementById("exportNo");
    const receiverNameEl = document.getElementById("receiverName");
    const exportReasonEl = document.getElementById("exportReason");

    // Lấy ngày hiện tại định dạng YYYY-MM-DD
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const exportDate = `${year}-${month}-${day}`;

    const data = {
      exportDate: exportDate, // ĐỊNH DẠNG YYYY-MM-DD
      exportNo: exportNoEl?.value || "",
      customerName: customerNameEl?.value || "",
      customerAddress: customerAddressEl?.value || "",
      customerTax: customerTaxEl?.value || "",
      customerContract: customerContractEl?.value || "",
      receiverName: receiverNameEl?.value || "",
      exportReason: exportReasonEl?.value || "",
      items: items,
      total: parseNumber(DOM.totalAmount?.textContent),
    };

    console.log("📤 Dữ liệu thu thập được:", JSON.stringify(data, null, 2));
    return data;
  }

  // ========== LƯU PHIẾU XUẤT ==========
  async function saveExport() {
    const data = getExportData();

    if (data.items.length === 0) {
      alert("⚠️ Chưa có sản phẩm nào để xuất!");
      return;
    }

    const invalidItems = data.items.filter(
      (item) => !item.tenThuongMai || !item.maHang,
    );
    if (invalidItems.length > 0) {
      alert(
        "⚠️ Vui lòng nhập đầy đủ Tên thương mại và Mã hàng cho tất cả sản phẩm!",
      );
      return;
    }

    Utils.showLoading(true, "Đang lưu phiếu...");
    try {
      const result = await window.API.export.create(data);
      console.log("📥 Kết quả từ server:", result);

      if (result.success) {
        Utils.showToast("✅ Đã lưu phiếu xuất kho thành công!");
        clearForm();
      } else {
        Utils.showToast(
          "❌ Lỗi: " + (result.message || "Không thể lưu phiếu"),
          "error",
        );
      }
    } catch (error) {
      console.error("❌ Save export error:", error);
      Utils.showToast(
        "❌ " + (error.message || "Có lỗi xảy ra khi lưu phiếu!"),
        "error",
      );
    } finally {
      Utils.showLoading(false);
    }
  }

  // ========== Làm mới form ==========
  function clearForm() {
    if (confirm("Bạn có chắc muốn làm mới toàn bộ phiếu xuất?")) {
      if (DOM.customerName) DOM.customerName.value = "";
      if (DOM.customerAddress) DOM.customerAddress.value = "";
      if (DOM.customerTax) DOM.customerTax.value = "";
      if (DOM.customerContract) DOM.customerContract.value = "";
      if (DOM.exportNo)
        DOM.exportNo.value = "PX-" + new Date().getFullYear() + "-001";
      if (DOM.receiverName) DOM.receiverName.value = "";
      if (DOM.exportReason) DOM.exportReason.value = "Sử dụng nội bộ";
      if (DOM.itemsBody) DOM.itemsBody.innerHTML = "";
      rowCounter = 1;
      addNewRow();
    }
  }

  function printExport() {
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
    const data = getExportData();

    if (data.items.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }

    let itemsHTML = data.items
      .map(
        (item, idx) => `
      <tr>
        <td class="excel-text-center">${idx + 1}</td>
        <td class="excel-text-left">${escapeHtml(item.tenThuongMai)}</td>
        <td class="excel-text-left">${escapeHtml(item.maHang)}</td>
        <td class="excel-text-left">${escapeHtml(item.quyCach)}</td>
        <td class="excel-text-left">${escapeHtml(item.hangSX)}</td>
        <td class="excel-text-center">${escapeHtml(item.dvt)}</td>
        <td class="excel-text-left">${escapeHtml(item.phanLoai)}</td>
        <td class="excel-text-right">${formatCurrency(item.donGia)}</td>
        <td class="excel-text-right">${item.soLuong}</td>
        <td class="excel-text-right">${formatCurrency(item.thanhTien)}</td>
        <td class="excel-text-center">${escapeHtml(item.soLot)}</td>
        <td class="excel-text-center">${escapeHtml(item.ngayHetHan)}</td>
        <td class="excel-text-left">${escapeHtml(item.ghiChu)}</td>
      </tr>
    `,
      )
      .join("");

    const totalHTML = `
    <tr class="excel-total-row">
      <td colspan="9" class="excel-text-right"><strong>TỔNG CỘNG:</strong></td>
      <td class="excel-text-right excel-total-amount"><strong>${formatCurrency(data.total)}</strong></td>
      <td colspan="3"></td>
    </tr>
  `;

    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const htmlContent = `
    <div class="excel-company-header">
      <div class="excel-company-name">CÔNG TY TNHH DƯỢC - TRANG THIẾT BỊ LAGOM</div>
      <div class="excel-company-address">Địa chỉ: Số 1073/63B đường Cách Mạng Tháng Tám, Phường Tân Sơn Nhất, TP. Hồ Chí Minh</div>
      <div class="excel-company-tax">MST: 0316156162</div>
    </div>
    
    <div class="excel-title">
      <h2>PHIẾU XUẤT KHO</h2>
      <div class="excel-sub-title">(Biên bản bàn giao hàng hóa)</div>
    </div>
    
    <div class="excel-date-row">
      Ngày ${day} tháng ${month} năm ${year}
    </div>
    
    <div class="excel-info-box">
      <strong>📋 Thông tin khách hàng</strong>
      <div class="excel-info-line"><label>Đơn vị:</label> <span class="excel-value">${escapeHtml(data.customerName)}</span></div>
      <div class="excel-info-line"><label>Địa chỉ:</label> <span class="excel-value">${escapeHtml(data.customerAddress)}</span></div>
      <div class="excel-info-line"><label>MST:</label> <span class="excel-value">${escapeHtml(data.customerTax)}</span></div>
      <div class="excel-info-line"><label>Số HĐ:</label> <span class="excel-value">${escapeHtml(data.customerContract)}</span></div>
    </div>
    
    <div class="excel-info-box">
      <strong>🚚 Thông tin xuất kho</strong>
      <div class="excel-info-line"><label>Số phiếu xuất:</label> <span class="excel-value">${escapeHtml(data.exportNo)}</span></div>
      <div class="excel-info-line"><label>Người nhận:</label> <span class="excel-value">${escapeHtml(data.receiverName)}</span></div>
      <div class="excel-info-line"><label>Lý do xuất:</label> <span class="excel-value">${escapeHtml(data.exportReason)}</span></div>
    </div>
    
    <table class="excel-table">
      <thead>
        <tr>
          <th style="width:30px;">TT</th>
          <th style="width:130px;">Tên thương mại</th>
          <th style="width:75px;">Mã hàng</th>
          <th style="width:95px;">Quy cách</th>
          <th style="width:110px;">Hãng SX</th>
          <th style="width:35px;">ĐVT</th>
          <th style="width:110px;">Phân loại</th>
          <th style="width:100px;">Đơn giá</th>
          <th style="width:55px;">Số lượng</th>
          <th style="width:120px;">Thành tiền</th>
          <th style="width:75px;">Số lot</th>
          <th style="width:85px;">HSD</th>
          <th style="width:95px;">Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
        ${totalHTML}
      </tbody>
    </table>
    
    <!-- CÁCH BẢNG 3 DÒNG -->
    <div style="height: 45px;"></div>
    
    <!-- CHỮ KÝ - TÁCH 2 BÊN TRÁI PHẢI BẰNG TABLE -->
    <table style="width: 100%; border: none; margin-top: 20px;">
      <tr>
        <td style="width: 50%; text-align: left; border: none; padding: 0 20px 0 0;">
          <div style="border-top: 1px solid #1a202c; padding-top: 8px; width: 80%;">
            <strong>ĐẠI DIỆN BÊN GIAO</strong><br>
            <span style="font-size: 11px; color: #718096;">(Ký, họ tên, đóng dấu)</span>
          </div>
        </td>
        <td style="width: 50%; text-align: right; border: none; padding: 0 0 0 20px;">
          <div style="border-top: 1px solid #1a202c; padding-top: 8px; width: 80%; margin-left: auto;">
            <strong>ĐẠI DIỆN BÊN NHẬN</strong><br>
            <span style="font-size: 11px; color: #718096;">(Ký, họ tên)</span>
          </div>
        </td>
      </tr>
    </table>
  `;

    Utils.exportToExcel(htmlContent, "phieu_xuat_kho");
  }

  // ========== INIT ==========
  function init() {
    if (!checkAuthAndRedirect()) return;
    setCurrentDate();
    addNewRow();
  }

  // ========== BIND EVENTS ==========
  function bindEvents() {
    if (DOM.btnAddRow) {
      DOM.btnAddRow.addEventListener("click", function () {
        addNewRow();
      });
    }

    if (DOM.btnClear) {
      DOM.btnClear.addEventListener("click", clearForm);
    }

    if (DOM.btnPrint) {
      DOM.btnPrint.addEventListener("click", printExport);
    }

    if (DOM.btnBack) {
      DOM.btnBack.addEventListener("click", goBack);
    }

    if (DOM.btnSave) {
      DOM.btnSave.addEventListener("click", saveExport);
    }

    if (DOM.btnExportExcel) {
      DOM.btnExportExcel.addEventListener("click", exportToExcel);
    }
  }

  // Chạy khi DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
      bindEvents();
    });
  } else {
    init();
    bindEvents();
  }
})();
