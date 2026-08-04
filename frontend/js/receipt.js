/**
 * ==================== RECEIPT MODULE ====================
 * Quản lý phiếu nhập hàng - CHỈ 7 TRƯỜNG + SL NHẬP
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
    if (!input) return 0;
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

    maHangInput.style.borderColor = "#fbbf24";

    try {
      const product = await window.API.inventory.getByMaHang(maHang);
      if (product) {
        const nameInput = row.querySelector(".product-name");
        const unitInput = row.querySelector(".unit");
        const manufacturerInput = row.querySelector(".manufacturer");
        const categoryInput = row.querySelector(".category");
        const priceInput = row.querySelector(".price-input");
        const contractInput = row.querySelector(".contract-input");

        if (nameInput) {
          nameInput.value = product.tenThuongMai || "";
          nameInput.style.borderColor = "#4ade80";
        }
        if (unitInput) {
          unitInput.value = product.dvt || "";
          unitInput.style.borderColor = "#4ade80";
        }
        if (manufacturerInput) {
          manufacturerInput.value = product.hangSX || "";
          manufacturerInput.style.borderColor = "#4ade80";
        }
        if (categoryInput) {
          categoryInput.value = product.phanLoai || "";
          categoryInput.style.borderColor = "#4ade80";
        }
        if (priceInput) {
          priceInput.value = formatCurrency(product.giaNhap || 0);
          updateRowTotal(row);
          priceInput.style.borderColor = "#4ade80";
        }
        if (contractInput && product.soHopDongNhap) {
          contractInput.value = product.soHopDongNhap;
          contractInput.style.borderColor = "#4ade80";
        }

        setTimeout(() => {
          maHangInput.style.borderColor = "";
          row.querySelectorAll("input").forEach((inp) => {
            inp.style.borderColor = "";
          });
        }, 3000);

        Utils.showToast("✅ Đã tìm thấy sản phẩm và tự động điền thông tin!");
      } else {
        maHangInput.style.borderColor = "#ef4444";
        Utils.showToast(
          "❌ Không tìm thấy sản phẩm với mã: " + maHang,
          "error",
        );
        setTimeout(() => {
          maHangInput.style.borderColor = "";
        }, 3000);
      }
    } catch (error) {
      console.log("Không tìm thấy sản phẩm với mã:", maHang);
      maHangInput.style.borderColor = "#ef4444";
      setTimeout(() => {
        maHangInput.style.borderColor = "";
      }, 3000);
    }
  }

  // ========== Tạo dòng sản phẩm - CHỈ 8 TRƯỜNG ==========
  function createProductRow(data = null) {
    const row = document.createElement("tr");
    const stt = rowCounter++;

    const removeButton =
      '<button class="btn-remove" type="button"><i class="fas fa-trash"></i></button>';

    row.innerHTML = `
      <td class="stt-cell">${stt}</td>
      <td><input type="text" class="product-code" value="${escapeHtml(data?.maHang || "")}" placeholder="Mã hàng *"></td>
      <td><input type="text" class="product-name" value="${escapeHtml(data?.tenThuongMai || "")}" placeholder="Tên thương mại *"></td>
      <td><input type="text" class="unit" value="${escapeHtml(data?.dvt || "")}" placeholder="ĐVT"></td>
      <td><input type="text" class="manufacturer" value="${escapeHtml(data?.hangSX || "")}" placeholder="Hãng/Nước SX"></td>
      <td><input type="text" class="category" value="${escapeHtml(data?.phanLoai || "")}" placeholder="Phân loại máy"></td>
      <td><input type="text" class="price-input" value="${data?.giaNhap ? formatCurrency(data.giaNhap) : "0"}"></td>
      <td><input type="text" class="contract-input" value="${escapeHtml(data?.soHopDongNhap || "")}" placeholder="Số HĐ"></td>
      <td><input type="text" class="qty-input" value="${data?.soLuongNhap || "0"}"></td>
      <td class="row-total" data-total="0">0</td>
      <td class="text-center col-delete">${removeButton}</td>
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

  // ========== Lấy dữ liệu phiếu nhập ==========
  function getReceiptData() {
    const items = [];
    if (!DOM.itemsBody) return { items: [], total: 0 };

    const rows = DOM.itemsBody.querySelectorAll("tr");

    rows.forEach((row) => {
      const codeInput = row.querySelector(".product-code");
      const nameInput = row.querySelector(".product-name");
      const unitInput = row.querySelector(".unit");
      const manufacturerInput = row.querySelector(".manufacturer");
      const categoryInput = row.querySelector(".category");
      const priceInput = row.querySelector(".price-input");
      const contractInput = row.querySelector(".contract-input");
      const qtyInput = row.querySelector(".qty-input");
      const totalSpan = row.querySelector(".row-total");

      items.push({
        maHang: codeInput?.value || "",
        tenThuongMai: nameInput?.value || "",
        dvt: unitInput?.value || "",
        hangSX: manufacturerInput?.value || "",
        phanLoai: categoryInput?.value || "",
        giaNhap: parseNumber(priceInput?.value),
        soHopDongNhap: contractInput?.value || "",
        soLuongNhap: parseNumber(qtyInput?.value),
        thanhTien: parseNumber(totalSpan?.getAttribute("data-total")),
      });
    });

    const supplierNameEl = document.getElementById("supplierName");
    const supplierAddressEl = document.getElementById("supplierAddress");
    const supplierTaxEl = document.getElementById("supplierTax");
    const customerNameEl = document.getElementById("customerName");
    const customerAddressEl = document.getElementById("customerAddress");
    const customerTaxEl = document.getElementById("customerTax");
    const customerContractEl = document.getElementById("customerContract");

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const receiptDate = `${year}-${month}-${day}`;

    const data = {
      receiptDate: receiptDate,
      supplierName: supplierNameEl?.value || "",
      supplierAddress: supplierAddressEl?.value || "",
      supplierTax: supplierTaxEl?.value || "",
      customerName: customerNameEl?.value || "",
      customerAddress: customerAddressEl?.value || "",
      customerTax: customerTaxEl?.value || "",
      customerContract: customerContractEl?.value || "",
      items: items,
      total: parseNumber(DOM.totalAmount?.textContent),
      notes: "",
    };

    console.log("📤 Dữ liệu thu thập được:", JSON.stringify(data, null, 2));
    return data;
  }

  // ========== Reset form ==========
  function resetFormData() {
    if (DOM.supplierName) DOM.supplierName.value = "";
    if (DOM.supplierAddress) DOM.supplierAddress.value = "";
    if (DOM.supplierTax) DOM.supplierTax.value = "";
    if (DOM.customerName) DOM.customerName.value = "";
    if (DOM.customerAddress) DOM.customerAddress.value = "";
    if (DOM.customerTax) DOM.customerTax.value = "";
    if (DOM.customerContract) DOM.customerContract.value = "";
    if (DOM.itemsBody) DOM.itemsBody.innerHTML = "";
    rowCounter = 1;
    addNewRow();
    calculateTotal();
  }

  function clearForm() {
    if (confirm("Bạn có chắc muốn làm mới toàn bộ phiếu?")) {
      resetFormData();
    }
  }

  // ========== LƯU PHIẾU NHẬP ==========
  async function saveReceipt() {
    const data = getReceiptData();

    if (data.items.length === 0) {
      alert("⚠️ Chưa có sản phẩm nào để nhập!");
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

    Utils.showLoading(true, "Đang trình duyệt phiếu...");
    try {
      const result = await window.API.receipt.create(data);
      console.log("📥 Kết quả từ server:", result);

      if (result.success) {
        if (result.data && result.data.status === "approved") {
          Utils.showToast("✅ " + result.message);
        } else if (result.details && result.details.length > 0) {
          let errorMsg = "⚠️ " + result.message + "\n\n";
          errorMsg += result.details.join("\n");
          alert(errorMsg);
          Utils.showToast("⚠️ Phiếu đã lưu nhưng cần kiểm tra lại", "warning");
        } else if (
          result.data &&
          result.data.status === "awaiting_confirmation"
        ) {
          Utils.showToast("🔄 " + result.message + " - Chờ xác nhận", "info");
        } else if (result.data && result.data.status === "pending") {
          Utils.showToast("⏳ " + result.message + " - Chờ duyệt", "info");
        } else {
          Utils.showToast("✅ " + result.message);
        }
        resetFormData();
      } else {
        Utils.showToast(
          "❌ Lỗi: " + (result.message || "Không thể lưu phiếu"),
          "error",
        );
      }
    } catch (error) {
      console.error("❌ Save receipt error:", error);
      Utils.showToast(
        "❌ " + (error.message || "Có lỗi xảy ra khi lưu phiếu!"),
        "error",
      );
    } finally {
      Utils.showLoading(false);
    }
  }

  // ========== IN PHIẾU ==========
  function printReceipt() {
    const inputs = document.querySelectorAll("input, select");
    const inputValues = {};
    inputs.forEach((input, index) => {
      inputValues[index] = input.value;
    });

    window.print();

    setTimeout(() => {
      inputs.forEach((input, index) => {
        if (inputValues[index] !== undefined) {
          input.value = inputValues[index];
        }
      });
      calculateTotal();
    }, 500);
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
      DOM.btnPrint.addEventListener("click", printReceipt);
    }

    if (DOM.btnBack) {
      DOM.btnBack.addEventListener("click", goBack);
    }

    if (DOM.btnSave) {
      DOM.btnSave.addEventListener("click", saveReceipt);
    }
  }

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
