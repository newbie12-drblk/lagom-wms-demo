/**
 * ==================== ROLE PANEL MODULE ====================
 * Quản lý tồn kho theo role - Phân quyền chỉnh sửa chi tiết
 */

(function () {
  "use strict";

  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const currentUser = Auth.getCurrentUser();
  const roleId = currentUser.roleId;

  // Role definitions
  const isAdmin = roleId === "admin";
  const isKeToan = roleId === "ke_toan";
  const isQuanLyKho = roleId === "quan_ly_kho";
  const isQuanLy = roleId === "quan_ly";
  const isNhanVien = roleId === "nhan_vien";
  const isNhapLieu = roleId === "nhap_lieu";

  // ========== QUYỀN CHỈNH SỬA THEO ROLE ==========

  // Kế toán: chỉ được sửa số hóa đơn và ngày hóa đơn
  const keToanFields = [
    "soHoaDonNhap",
    "soHoaDonXuat",
    "ngayNhapHD",
    "ngayXuatHD",
  ];

  // Quản lý kho: chỉ được sửa số lượng, hợp đồng, hóa đơn, lot, HSD
  const quanLyKhoFields = [
    "soLuongNhap",
    "soHopDongNhap",
    "soHoaDonNhap",
    "soLot",
    "ngayHetHan",
    "soLuongXuat",
    "soHopDongXuat",
    "soHoaDonXuat",
  ];

  // Tất cả các field có trong bảng inventory
  const allFields = [
    "tenThuongMai",
    "maHang",
    "quyCach",
    "hangSX",
    "dvt",
    "phanLoai",
    "giaNhap",
    "giaXuat",
    "tonKho",
    "soLuongNhap",
    "soLuongXuat",
    "soLot",
    "ngayHetHan",
    "soHopDongNhap",
    "soHoaDonNhap",
    "soHopDongXuat",
    "soHoaDonXuat",
    "ngayNhapHD",
    "ngayXuatHD",
    "ghiChu",
  ];

  // Field mà Quản lý KHÔNG được sửa (thuộc về Kế toán và Quản lý kho)
  const quanLyForbiddenFields = [...keToanFields, ...quanLyKhoFields];

  // Quản lý được sửa những field không nằm trong danh sách cấm
  const quanLyFields = allFields.filter(
    (field) => !quanLyForbiddenFields.includes(field),
  );

  function canEditField(fieldName) {
    if (isAdmin) return true;
    if (isNhapLieu) return true; // Nhập liệu được full quyền (phải qua admin duyệt)
    if (isNhanVien) return false; // Nhân viên không được sửa gì
    if (isKeToan && keToanFields.includes(fieldName)) return true;
    if (isQuanLyKho && quanLyKhoFields.includes(fieldName)) return true;
    if (isQuanLy && quanLyFields.includes(fieldName)) return true;
    return false;
  }

  console.log("=== ROLE PANEL DEBUG ===");
  console.log("roleId:", roleId);
  console.log("=== QUYỀN CHI TIẾT ===");
  console.log("Kế toán được sửa:", keToanFields);
  console.log("Quản lý kho được sửa:", quanLyKhoFields);
  console.log("Quản lý được sửa:", quanLyFields);

  // DOM Elements
  const tbody = document.getElementById("inv-tbody");
  const searchInput = document.getElementById("inv-search");
  const catFilter = document.getElementById("inv-cat-filter");
  const statusFilter = document.getElementById("inv-status-filter");
  const resetBtn = document.getElementById("btnResetFilter");
  const refreshBtn = document.getElementById("btnRefresh");
  const saveAllBtn = document.getElementById("btnSaveAll");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");
  const pageTitle = document.getElementById("pageTitle");
  const pageSub = document.getElementById("pageSub");
  const btnCreateRequest = document.getElementById("btnCreateRequest");

  // Views
  const views = {
    inventory: document.getElementById("view-inventory"),
    statistics: document.getElementById("view-statistics"),
    "supplier-debt": document.getElementById("view-supplier-debt"),
    "customer-debt": document.getElementById("view-customer-debt"),
  };

  let inventoryData = [];
  let filteredData = [];
  let currentPage = 1;
  const itemsPerPage = 20;
  let totalPages = 1;

  // ========== UI ==========
  function updateUserUI() {
    const topbarRight = document.getElementById("topbarRight");
    if (!topbarRight) return;

    let userBar = document.querySelector(".user-info");
    if (!userBar) {
      userBar = document.createElement("div");
      userBar.className = "user-info";
      topbarRight.insertBefore(userBar, topbarRight.firstChild);
    }

    userBar.innerHTML = `
      <div class="user-avatar"><i class="fas fa-user-circle"></i></div>
      <div class="user-details">
        <span class="user-name">${Utils.escapeHtml(currentUser.fullName)}</span>
        <span class="user-role role-${roleId}">${currentUser.roleName}</span>
      </div>
      <button class="logout-btn" id="logoutBtn" title="Đăng xuất"><i class="fas fa-sign-out-alt"></i></button>
    `;

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      Auth.logout();
      window.location.href = "login.html";
    });

    document.getElementById("btnOpenIndex")?.addEventListener("click", () => {
      window.open("index.html", "_blank");
    });

    if (pageTitle) {
      pageTitle.textContent = `Bảng điều khiển - ${currentUser.roleName}`;
    }

    if (pageSub) {
      if (isNhanVien) {
        pageSub.textContent = "🔒 Chế độ XEM - Bạn không có quyền chỉnh sửa";
      } else if (isAdmin) {
        pageSub.textContent =
          "👑 ADMIN - Bạn có toàn quyền chỉnh sửa và quản lý hệ thống";
      } else if (isKeToan) {
        pageSub.textContent =
          "💰 KẾ TOÁN - Bạn được sửa: Số hóa đơn, Ngày hóa đơn";
      } else if (isQuanLyKho) {
        pageSub.textContent =
          "📦 QUẢN LÝ KHO - Bạn được sửa: Số lượng nhập, Số HĐ, Số lot, Ngày đến hạn, Số lượng xuất";
      } else if (isQuanLy) {
        pageSub.textContent =
          "📋 QUẢN LÝ - Bạn được sửa: Tất cả các trường còn lại (tên sp, mã hàng, giá, tồn kho, ghi chú...)";
      } else if (isNhapLieu) {
        pageSub.textContent =
          "✏️ NHẬP LIỆU - Bạn có quyền chỉnh sửa full, nhưng phải được Admin duyệt";
      } else {
        pageSub.textContent = "✏️ Bạn có quyền chỉnh sửa các trường được phép";
      }
    }

    // Ẩn nút Lưu tất cả nếu là nhân viên
    if (isNhanVien && saveAllBtn) {
      saveAllBtn.style.display = "none";
    }

    // Xử lý nút Tạo yêu cầu (chỉ nhập liệu)
    if (btnCreateRequest) {
      if (isNhapLieu) {
        console.log("✅ HIỂN THỊ nút Tạo yêu cầu cho role:", roleId);
        btnCreateRequest.style.display = "inline-flex";
        btnCreateRequest.onclick = function (e) {
          e.preventDefault();
          console.log("🖱️ Nút Tạo yêu cầu được click!");
          openCreateRequestModal();
        };
      } else {
        console.log("❌ ẨN nút Tạo yêu cầu cho role:", roleId);
        btnCreateRequest.style.display = "none";
        btnCreateRequest.onclick = null;
      }
    }
  }

  // ========== VIEW ==========
  function switchView(viewName) {
    Object.values(views).forEach((view) => {
      if (view) view.classList.remove("active");
    });
    if (views[viewName]) {
      views[viewName].classList.add("active");
    }
    document.querySelectorAll(".nav-item").forEach((item) => {
      const view = item.getAttribute("data-view");
      if (view === viewName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
    const breadcrumb = document.getElementById("breadcrumb-title");
    const titles = {
      inventory: "Quản lý tồn kho",
      statistics: "Thống kê",
      "supplier-debt": "Công nợ NCC",
      "customer-debt": "Công nợ KH",
    };
    if (breadcrumb && titles[viewName]) {
      breadcrumb.textContent = titles[viewName];
    }
    if (viewName === "inventory") {
      loadInventoryData();
    }
  }

  // ========== MODAL TẠO YÊU CẦU ==========
  let productRowCounter = 1;

  function openCreateRequestModal() {
    console.log("📂 openCreateRequestModal - ĐANG MỞ MODAL");
    const modal = document.getElementById("createRequestModal");
    if (!modal) {
      console.error("❌ Không tìm thấy modal #createRequestModal!");
      Utils.showToast("Lỗi: Không tìm thấy modal", "error");
      return;
    }
    console.log("✅ Tìm thấy modal, đang mở...");
    const productsContainer = document.getElementById(
      "requestProductsContainer",
    );
    if (productsContainer) {
      productsContainer.innerHTML = "";
    }
    productRowCounter = 1;
    addProductRow();
    modal.style.display = "block";
  }

  function addProductRow(data = null) {
    const productsContainer = document.getElementById(
      "requestProductsContainer",
    );
    if (!productsContainer) return;
    const row = document.createElement("div");
    row.className = "product-row";
    row.setAttribute("data-row-id", productRowCounter);
    row.style.cssText =
      "margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 10px;";
    row.innerHTML = `
      <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
        <input type="text" placeholder="Tên thương mại *" class="product-name" style="flex:2; min-width: 150px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: #1a1a2e; color: white;">
        <input type="text" placeholder="Mã hàng *" class="product-code" style="flex:1; min-width: 100px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: #1a1a2e; color: white;">
        <input type="text" placeholder="Quy cách" class="product-quyCach" style="flex:1; min-width: 100px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: #1a1a2e; color: white;">
        <input type="text" placeholder="Hãng SX" class="product-hangSX" style="flex:1; min-width: 100px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: #1a1a2e; color: white;">
        <input type="text" placeholder="ĐVT" class="product-dvt" style="flex:0.5; min-width: 60px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: #1a1a2e; color: white;">
        <input type="text" placeholder="Phân loại" class="product-phanLoai" style="flex:1; min-width: 100px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: #1a1a2e; color: white;">
        <input type="text" placeholder="Giá nhập" class="product-giaNhap" style="flex:1; min-width: 100px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: #1a1a2e; color: white;">
        <input type="text" placeholder="Giá xuất" class="product-giaXuat" style="flex:1; min-width: 100px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: #1a1a2e; color: white;">
        <input type="text" placeholder="Tồn đầu" class="product-tonKho" style="flex:0.5; min-width: 80px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: #1a1a2e; color: white;">
        <input type="text" placeholder="Số lot" class="product-soLot" style="flex:1; min-width: 100px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: #1a1a2e; color: white;">
        <input type="date" placeholder="HSD" class="product-ngayHetHan" style="flex:1; min-width: 120px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: #1a1a2e; color: white;">
        <button type="button" class="btn-remove-row" data-id="${productRowCounter}" style="background: #dc2626; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;"><i class="fas fa-trash"></i> Xóa</button>
      </div>
    `;
    if (data) {
      row.querySelector(".product-name").value = data.tenThuongMai || "";
      row.querySelector(".product-code").value = data.maHang || "";
      row.querySelector(".product-quyCach").value = data.quyCach || "";
      row.querySelector(".product-hangSX").value = data.hangSX || "";
      row.querySelector(".product-dvt").value = data.dvt || "";
      row.querySelector(".product-phanLoai").value = data.phanLoai || "";
      row.querySelector(".product-giaNhap").value = data.giaNhap || "";
      row.querySelector(".product-giaXuat").value = data.giaXuat || "";
      row.querySelector(".product-tonKho").value = data.tonKho || "0";
      row.querySelector(".product-soLot").value = data.soLot || "";
      row.querySelector(".product-ngayHetHan").value = data.ngayHetHan || "";
    }
    productsContainer.appendChild(row);
    productRowCounter++;
    row.querySelector(".btn-remove-row")?.addEventListener("click", () => {
      row.remove();
    });
  }

  function collectProductsFromModal() {
    const products = [];
    const rows = document.querySelectorAll(
      "#requestProductsContainer .product-row",
    );
    for (let row of rows) {
      const name = row.querySelector(".product-name")?.value.trim();
      const code = row.querySelector(".product-code")?.value.trim();
      if (!name || !code) continue;
      products.push({
        tenThuongMai: name,
        maHang: code,
        quyCach: row.querySelector(".product-quyCach")?.value || "",
        hangSX: row.querySelector(".product-hangSX")?.value || "",
        dvt: row.querySelector(".product-dvt")?.value || "",
        phanLoai: row.querySelector(".product-phanLoai")?.value || "",
        giaNhap: Utils.parseNumber(
          row.querySelector(".product-giaNhap")?.value,
        ),
        giaXuat: Utils.parseNumber(
          row.querySelector(".product-giaXuat")?.value,
        ),
        tonKho:
          Utils.parseNumber(row.querySelector(".product-tonKho")?.value) || 0,
        soLuongNhap:
          Utils.parseNumber(row.querySelector(".product-tonKho")?.value) || 0,
        soLuongXuat: 0,
        soLot: row.querySelector(".product-soLot")?.value || "",
        ngayHetHan: row.querySelector(".product-ngayHetHan")?.value || "",
      });
    }
    return products;
  }

  async function submitCreateRequest() {
    const products = collectProductsFromModal();
    if (products.length === 0) {
      Utils.showToast("Vui lòng thêm ít nhất một sản phẩm hợp lệ", "error");
      return;
    }
    Utils.showLoading(true, "Đang gửi yêu cầu...");
    try {
      await window.API.approval.createRequest({ products: products });
      Utils.showToast("Yêu cầu đã được gửi đến Admin");
      const modal = document.getElementById("createRequestModal");
      if (modal) modal.style.display = "none";
    } catch (error) {
      console.error("Submit request error:", error);
      Utils.showToast(error.message || "Lỗi khi gửi yêu cầu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ========== DATA ==========
  async function loadInventoryData() {
    Utils.showLoading(true, "Đang tải dữ liệu...");
    try {
      inventoryData = await window.API.inventory.getAll();
      console.log("Inventory loaded:", inventoryData.length);
      await loadCategories();
      applyFilters();
    } catch (error) {
      console.error("Load inventory error:", error);
      Utils.showToast("Lỗi khi tải dữ liệu tồn kho", "error");
      inventoryData = [];
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="21" style="text-align:center;padding:60px;color:red;">Lỗi tải dữ liệu: ${error.message}<\/td><\/tr>`;
      }
    } finally {
      Utils.showLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const categories = await window.API.inventory.getCategories();
      if (catFilter) {
        catFilter.innerHTML =
          '<option value="">Tất cả phân loại</option>' +
          categories
            .map(
              (cat) =>
                `<option value="${Utils.escapeHtml(cat)}">${Utils.escapeHtml(cat)}</option>`,
            )
            .join("");
      }
    } catch (error) {
      console.error("Load categories error:", error);
    }
  }

  // ========== HELPER ==========
  function getRemainingDays(item) {
    if (item.ngayXuatHD && item.ngayXuatHD !== "") {
      const dueDate = new Date(item.ngayXuatHD);
      if (isNaN(dueDate.getTime())) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      return Math.ceil((dueDate - today) / 86400000);
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

  function getDebtBadge(remainingDays) {
    if (remainingDays === null)
      return '<span class="debt-badge no-debt">—</span>';
    if (remainingDays < 0)
      return `<span class="debt-badge expired">Quá hạn ${Math.abs(remainingDays)} ngày</span>`;
    if (remainingDays <= 7)
      return `<span class="debt-badge critical">Còn ${remainingDays} ngày (KHẨN CẤP)</span>`;
    if (remainingDays <= 30)
      return `<span class="debt-badge warning">Còn ${remainingDays} ngày</span>`;
    if (remainingDays <= 90)
      return `<span class="debt-badge normal">Còn ${remainingDays} ngày</span>`;
    return `<span class="debt-badge safe">Còn ${remainingDays} ngày</span>`;
  }

  // ========== RENDER FIELD (CÓ PHÂN QUYỀN) ==========
  function renderEditableField(value, fieldName, isNumber = false) {
    // Nhân viên: chỉ xem
    if (isNhanVien) {
      if (isNumber) {
        return `<span class="readonly-field">${Utils.formatNumber(value)}</span>`;
      }
      if (
        fieldName === "ngayHetHan" ||
        fieldName === "ngayNhapHD" ||
        fieldName === "ngayXuatHD"
      ) {
        return `<span class="readonly-field">${Utils.formatDate(value)}</span>`;
      }
      return `<span class="readonly-field">${Utils.escapeHtml(String(value || "—"))}</span>`;
    }

    // Kiểm tra quyền chỉnh sửa
    const canEdit = canEditField(fieldName);

    if (canEdit) {
      if (isNumber) {
        return `<input type="text" class="editable-field" data-field="${fieldName}" value="${Utils.formatNumber(value)}" style="color:#ffffff;">`;
      }
      if (
        fieldName === "ngayHetHan" ||
        fieldName === "ngayNhapHD" ||
        fieldName === "ngayXuatHD"
      ) {
        const dateValue =
          value && value !== "—" ? Utils.formatDate(value, "YYYY-MM-DD") : "";
        return `<input type="date" class="editable-field" data-field="${fieldName}" value="${dateValue}" style="color:#ffffff;">`;
      }
      return `<input type="text" class="editable-field" data-field="${fieldName}" value="${Utils.escapeHtml(String(value || ""))}" style="color:#ffffff;">`;
    }

    // Không có quyền: readonly
    if (isNumber) {
      return `<span class="readonly-field">${Utils.formatNumber(value)}</span>`;
    }
    if (
      fieldName === "ngayHetHan" ||
      fieldName === "ngayNhapHD" ||
      fieldName === "ngayXuatHD"
    ) {
      return `<span class="readonly-field">${Utils.formatDate(value)}</span>`;
    }
    return `<span class="readonly-field">${Utils.escapeHtml(String(value || "—"))}</span>`;
  }

  // ========== RENDER TABLE ==========
  function renderTable() {
    if (!tbody) return;
    if (!filteredData || filteredData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="21" style="text-align:center;padding:60px;">Không có dữ liệu tồn kho<\/td><\/tr>`;
      updatePaginationControls();
      return;
    }
    const start = (currentPage - 1) * itemsPerPage;
    const pageData = filteredData.slice(start, start + itemsPerPage);
    if (pageData.length === 0) {
      tbody.innerHTML = `<td><td colspan="21" style="text-align:center;padding:60px;">Không có dữ liệu tồn kho<\/td><\/tr>`;
      updatePaginationControls();
      return;
    }
    tbody.innerHTML = pageData
      .map((item, idx) => {
        const globalIdx = start + idx + 1;
        const remainingDays = getRemainingDays(item);
        const isOutOfStock = (item.tonKho || 0) === 0;
        return `
        <tr class="${isOutOfStock ? "out-of-stock" : ""}">
          <td class="sticky-col" style="position: sticky; left: 0; z-index: 100; background: #0f172a;">${globalIdx}<\/td>
          <td class="sticky-col-2" style="position: sticky; left: 50px; z-index: 100; background: #0f172a;"><strong style="color: #60a5fa;">${renderEditableField(item.tenThuongMai, "tenThuongMai")}<\/strong><\/td>
          <td>${renderEditableField(item.maHang, "maHang")}<\/td>
          <td>${renderEditableField(item.quyCach, "quyCach")}<\/td>
          <td>${renderEditableField(item.hangSX, "hangSX")}<\/td>
          <td>${renderEditableField(item.dvt, "dvt")}<\/td>
          <td>${renderEditableField(item.phanLoai, "phanLoai")}<\/td>
          <td class="text-right">${renderEditableField(item.giaNhap, "giaNhap", true)}<\/td>
          <td class="text-right">${renderEditableField(item.soLuongNhap, "soLuongNhap", true)}<\/td>
          <td>${renderEditableField(item.soHopDongNhap, "soHopDongNhap")}<\/td>
          <td>${renderEditableField(item.soHoaDonNhap, "soHoaDonNhap")}<\/td>
          <td>${renderEditableField(item.ngayNhapHD, "ngayNhapHD")}<\/td>
          <td>${renderEditableField(item.soLot, "soLot")}<\/td>
          <td>${renderEditableField(item.ngayHetHan, "ngayHetHan")}<\/td>
          <td class="text-right">${renderEditableField(item.soLuongXuat, "soLuongXuat", true)}<\/td>
          <td class="text-right">${renderEditableField(item.giaXuat, "giaXuat", true)}<\/td>
          <td>${renderEditableField(item.soHopDongXuat, "soHopDongXuat")}<\/td>
          <td>${renderEditableField(item.soHoaDonXuat, "soHoaDonXuat")}<\/td>
          <td>${renderEditableField(item.ngayXuatHD, "ngayXuatHD")}<\/td>
          <td class="text-right"><strong style="${isOutOfStock ? "color: #f87171;" : "color: #4ade80;"}">${renderEditableField(item.tonKho, "tonKho", true)}<\/strong><\/td>
          <td>${getDebtBadge(remainingDays)}<\/td>
        <\/tr>
      `;
      })
      .join("");
    attachEditEvents();
    updatePaginationControls();
    updateStats();
  }

  function attachEditEvents() {
    if (isNhanVien) return;
    document.querySelectorAll(".editable-field").forEach((input) => {
      input.removeEventListener("change", handleEdit);
      input.addEventListener("change", handleEdit);
    });
  }

  let pendingEdit = null;

  async function handleEdit(e) {
    if (pendingEdit) clearTimeout(pendingEdit);
    pendingEdit = setTimeout(async () => {
      const input = e.target;
      const fieldName = input.dataset.field;
      let newValue = input.value;
      const row = input.closest("tr");
      const rowIndex = Array.from(row.parentNode.children).indexOf(row);
      const itemIndex = (currentPage - 1) * itemsPerPage + rowIndex;
      if (itemIndex >= 0 && itemIndex < filteredData.length) {
        const item = filteredData[itemIndex];
        let parsedValue = newValue;
        const numberFields = [
          "giaNhap",
          "giaXuat",
          "soLuongNhap",
          "soLuongXuat",
          "tonKho",
        ];
        if (numberFields.includes(fieldName)) {
          parsedValue = Utils.parseNumber(newValue);
        }
        const oldValue = item[fieldName];
        if (oldValue == parsedValue) return;
        item[fieldName] = parsedValue;
        Utils.showLoading(true, "Đang lưu...");
        try {
          await window.API.inventory.update(item.id, {
            [fieldName]: parsedValue,
          });
          Utils.showToast("Đã lưu thay đổi", "success");
          if (numberFields.includes(fieldName)) {
            input.value = Utils.formatNumber(parsedValue);
          }
          updateStats();
        } catch (error) {
          Utils.showToast(error.message || "Lỗi khi lưu", "error");
          item[fieldName] = oldValue;
          if (numberFields.includes(fieldName)) {
            input.value = Utils.formatNumber(oldValue);
          } else {
            input.value = oldValue;
          }
        } finally {
          Utils.showLoading(false);
        }
      }
      pendingEdit = null;
    }, 500);
  }

  async function saveAllChanges() {
    Utils.showLoading(true, "Đang lưu tất cả thay đổi...");
    try {
      for (const item of filteredData) {
        const originalItem = inventoryData.find((orig) => orig.id === item.id);
        if (originalItem) {
          const updates = {};
          for (const key of Object.keys(item)) {
            if (item[key] !== originalItem[key]) {
              updates[key] = item[key];
            }
          }
          if (Object.keys(updates).length > 0) {
            await window.API.inventory.update(item.id, updates);
          }
        }
      }
      Utils.showToast("Đã lưu tất cả thay đổi", "success");
      await loadInventoryData();
    } catch (error) {
      Utils.showToast(error.message || "Lỗi khi lưu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  async function updateStats() {
    try {
      const stats = await window.API.inventory.getStats();
      document.getElementById("statTotalItems").textContent =
        stats.totalItems || 0;
      document.getElementById("statTotalStock").textContent =
        stats.totalStock || 0;
      document.getElementById("statTotalValue").textContent =
        Utils.formatCurrency(stats.totalValue || 0);
      document.getElementById("statExpiringSoon").textContent =
        stats.expiringSoon || 0;
      document.getElementById("statExpired").textContent = stats.expired || 0;
    } catch (error) {
      console.error("Update stats error:", error);
    }
  }

  function updatePaginationControls() {
    totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    if (pageInfo) pageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
  }

  // ========== FILTER ==========
  function applyFilters() {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const category = catFilter?.value || "";
    const status = statusFilter?.value || "";
    let filtered = [...inventoryData];
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          (item.tenThuongMai &&
            item.tenThuongMai.toLowerCase().includes(searchTerm)) ||
          (item.maHang && item.maHang.toLowerCase().includes(searchTerm)) ||
          (item.soLot && item.soLot.toLowerCase().includes(searchTerm)),
      );
    }
    if (category) {
      filtered = filtered.filter((item) => item.phanLoai === category);
    }
    if (status === "con-hang") {
      filtered = filtered.filter((item) => (item.tonKho || 0) > 0);
    } else if (status === "het-hang") {
      filtered = filtered.filter((item) => (item.tonKho || 0) === 0);
    } else if (status === "sap-het-han") {
      filtered = filtered.filter((item) => {
        const remaining = getRemainingDays(item);
        return remaining !== null && remaining > 0 && remaining <= 30;
      });
    } else if (status === "het-han") {
      filtered = filtered.filter((item) => {
        const remaining = getRemainingDays(item);
        return remaining !== null && remaining < 0;
      });
    }
    filteredData = filtered;
    currentPage = 1;
    renderTable();
  }

  function resetFilters() {
    if (searchInput) searchInput.value = "";
    if (catFilter) catFilter.value = "";
    if (statusFilter) statusFilter.value = "";
    applyFilters();
  }

  function refreshData() {
    loadInventoryData();
  }

  // ========== EVENTS ==========
  function bindEvents() {
    document.querySelectorAll(".nav-item").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = link.getAttribute("data-view");
        if (view) switchView(view);
      });
    });
    if (searchInput)
      searchInput.addEventListener("input", () => applyFilters());
    if (catFilter) catFilter.addEventListener("change", () => applyFilters());
    if (statusFilter)
      statusFilter.addEventListener("change", () => applyFilters());
    if (resetBtn) resetBtn.addEventListener("click", resetFilters);
    if (refreshBtn) refreshBtn.addEventListener("click", refreshData);
    if (saveAllBtn && !isNhanVien)
      saveAllBtn.addEventListener("click", saveAllChanges);
    if (prevPageBtn)
      prevPageBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          renderTable();
        }
      });
    if (nextPageBtn)
      nextPageBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderTable();
        }
      });

    const modal = document.getElementById("createRequestModal");
    const closeBtn = modal?.querySelector(".close");
    const cancelBtn = document.getElementById("btnCancelRequest");
    const submitBtn = document.getElementById("btnSubmitRequest");
    const addProductBtn = document.getElementById("btnAddProductRow");
    if (closeBtn)
      closeBtn.addEventListener("click", () => (modal.style.display = "none"));
    if (cancelBtn)
      cancelBtn.addEventListener("click", () => (modal.style.display = "none"));
    if (submitBtn) submitBtn.addEventListener("click", submitCreateRequest);
    if (addProductBtn)
      addProductBtn.addEventListener("click", () => addProductRow());
    window.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }

  // ========== INIT ==========
  async function init() {
    console.log("=== ROLE PANEL INIT ===");
    updateUserUI();
    await loadInventoryData();
    bindEvents();
    switchView("inventory");
    const dateEl = document.getElementById("currentDate");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString("vi-VN");
  }

  init();
})();
