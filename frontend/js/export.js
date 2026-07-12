/**
 * ==================== EXPORT MODULE ====================
 * Quản lý phiếu xuất kho - TỰ ĐỘNG DUYỆT
 * TỰ ĐỘNG ĐIỀN THÔNG TIN KHI NHẬP MÃ HÀNG HOẶC TÊN SẢN PHẨM
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

  // ========== TỰ ĐỘNG ĐIỀN THEO MÃ HÀNG HOẶC TÊN ==========
  async function autoFillProduct(row, inputField) {
    if (!row || !inputField) return;
    const searchValue = inputField.value.trim();
    if (!searchValue) return;

    // Xác định loại tìm kiếm (mã hàng hoặc tên)
    const isCode = inputField.classList.contains("product-code");
    const isName = inputField.classList.contains("product-name");

    inputField.style.borderColor = "#fbbf24";

    try {
      let product = null;

      // Nếu là mã hàng, tìm theo mã
      if (isCode) {
        product = await window.API.inventory.getByMaHang(searchValue);
        if (!product) {
          // Nếu không tìm thấy theo mã, thử tìm theo tên
          const allProducts = await window.API.inventory.getAll();
          const matched = allProducts.filter(
            (p) =>
              p.maHang &&
              p.maHang.toLowerCase().includes(searchValue.toLowerCase()),
          );
          if (matched.length === 1) {
            product = matched[0];
          } else if (matched.length > 1) {
            const names = matched
              .map((p, i) => `${i + 1}. ${p.maHang} - ${p.tenThuongMai}`)
              .join("\n");
            const choice = prompt(
              `Tìm thấy ${matched.length} sản phẩm. Vui lòng chọn số:\n${names}`,
            );
            if (choice) {
              const idx = parseInt(choice) - 1;
              if (idx >= 0 && idx < matched.length) {
                product = matched[idx];
              }
            }
          }
        }
      }
      // Nếu là tên, tìm tất cả sản phẩm và lọc theo tên
      else if (isName) {
        const allProducts = await window.API.inventory.getAll();
        const matched = allProducts.filter(
          (p) =>
            p.tenThuongMai &&
            p.tenThuongMai.toLowerCase().includes(searchValue.toLowerCase()),
        );
        if (matched.length === 1) {
          product = matched[0];
        } else if (matched.length > 1) {
          const names = matched
            .map((p, i) => `${i + 1}. ${p.maHang} - ${p.tenThuongMai}`)
            .join("\n");
          const choice = prompt(
            `Tìm thấy ${matched.length} sản phẩm. Vui lòng chọn số:\n${names}`,
          );
          if (choice) {
            const idx = parseInt(choice) - 1;
            if (idx >= 0 && idx < matched.length) {
              product = matched[idx];
            }
          }
        } else {
          // Thử tìm theo mã hàng chứa từ khóa
          const matchedByCode = allProducts.filter(
            (p) =>
              p.maHang &&
              p.maHang.toLowerCase().includes(searchValue.toLowerCase()),
          );
          if (matchedByCode.length === 1) {
            product = matchedByCode[0];
          }
        }
      }

      if (product) {
        // Điền thông tin vào các trường
        const nameInput = row.querySelector(".product-name");
        const codeInput = row.querySelector(".product-code");
        const packingInput = row.querySelector(".packing");
        const manufacturerInput = row.querySelector(".manufacturer");
        const unitInput = row.querySelector(".unit");
        const categoryInput = row.querySelector(".category");
        const priceInput = row.querySelector(".price-input");
        const lotInput = row.querySelector(".lot-input");
        const expiryInput = row.querySelector(".expiry-input");

        if (nameInput) {
          nameInput.value = product.tenThuongMai || "";
          nameInput.style.borderColor = "#4ade80";
        }
        if (codeInput) {
          codeInput.value = product.maHang || "";
          codeInput.style.borderColor = "#4ade80";
        }
        if (packingInput) {
          packingInput.value = product.quyCach || "";
          packingInput.style.borderColor = "#4ade80";
        }
        if (manufacturerInput) {
          manufacturerInput.value = product.hangSX || "";
          manufacturerInput.style.borderColor = "#4ade80";
        }
        if (unitInput) {
          unitInput.value = product.dvt || "";
          unitInput.style.borderColor = "#4ade80";
        }
        if (categoryInput) {
          categoryInput.value = product.phanLoai || "";
          categoryInput.style.borderColor = "#4ade80";
        }
        if (priceInput) {
          priceInput.value = formatCurrency(
            product.giaXuat || product.giaNhap || 0,
          );
          updateRowTotal(row);
          priceInput.style.borderColor = "#4ade80";
        }
        if (lotInput && product.soLot) {
          lotInput.value = product.soLot;
          lotInput.style.borderColor = "#4ade80";
        }
        if (expiryInput && product.ngayHetHan) {
          expiryInput.value = product.ngayHetHan;
          expiryInput.style.borderColor = "#4ade80";
        }

        // Reset border color sau 3 giây
        setTimeout(() => {
          inputField.style.borderColor = "";
          row.querySelectorAll("input").forEach((inp) => {
            inp.style.borderColor = "";
          });
        }, 3000);

        Utils.showToast("✅ Đã tìm thấy sản phẩm và tự động điền thông tin!");
      } else {
        inputField.style.borderColor = "#ef4444";
        Utils.showToast("❌ Không tìm thấy sản phẩm: " + searchValue, "error");
        setTimeout(() => {
          inputField.style.borderColor = "";
        }, 3000);
      }
    } catch (error) {
      console.error("❌ Lỗi tìm sản phẩm:", error);
      inputField.style.borderColor = "#ef4444";
      setTimeout(() => {
        inputField.style.borderColor = "";
      }, 3000);
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
      <td class="text-center col-delete">${removeButton}</td>
    `;

    const priceInput = row.querySelector(".price-input");
    const qtyInput = row.querySelector(".qty-input");
    const maHangInput = row.querySelector(".product-code");
    const tenInput = row.querySelector(".product-name");
    const removeBtn = row.querySelector(".btn-remove");

    // ===== SỰ KIỆN CHO MÃ HÀNG =====
    if (maHangInput) {
      maHangInput.addEventListener("blur", function () {
        autoFillProduct(row, this);
      });
      maHangInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          autoFillProduct(row, this);
        }
      });
    }

    // ===== SỰ KIỆN CHO TÊN SẢN PHẨM =====
    if (tenInput) {
      tenInput.addEventListener("blur", function () {
        autoFillProduct(row, this);
      });
      tenInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          autoFillProduct(row, this);
        }
      });
    }

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

    const customerNameEl = document.getElementById("customerName");
    const customerAddressEl = document.getElementById("customerAddress");
    const customerTaxEl = document.getElementById("customerTax");
    const customerContractEl = document.getElementById("customerContract");
    const exportNoEl = document.getElementById("exportNo");
    const receiverNameEl = document.getElementById("receiverName");
    const exportReasonEl = document.getElementById("exportReason");

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const exportDate = `${year}-${month}-${day}`;

    const data = {
      exportDate: exportDate,
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

  // ========== Reset form ==========
  function resetFormData() {
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
    calculateTotal();
  }

  function clearForm() {
    if (confirm("Bạn có chắc muốn làm mới toàn bộ phiếu xuất?")) {
      resetFormData();
    }
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

    Utils.showLoading(true, "Đang trình duyệt phiếu...");
    try {
      const result = await window.API.export.create(data);
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
      console.error("❌ Save export error:", error);
      Utils.showToast(
        "❌ " + (error.message || "Có lỗi xảy ra khi lưu phiếu!"),
        "error",
      );
    } finally {
      Utils.showLoading(false);
    }
  }

  // ========== IN PHIẾU ==========
  function printExport() {
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
      DOM.btnPrint.addEventListener("click", printExport);
    }

    if (DOM.btnBack) {
      DOM.btnBack.addEventListener("click", goBack);
    }

    if (DOM.btnSave) {
      DOM.btnSave.addEventListener("click", saveExport);
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
