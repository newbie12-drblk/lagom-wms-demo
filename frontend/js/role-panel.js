/**
 * ==================== ROLE PANEL MODULE ====================
 * Quản lý tồn kho - CHỈ XEM, KHÔNG SỬA TRỰC TIẾP
 * Admin tạo yêu cầu → Quản lý duyệt → Cập nhật dữ liệu
 */

(function () {
  "use strict";

  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const currentUser = Auth.getCurrentUser();
  const roleId = currentUser.roleId;

  const isAdmin = roleId === "admin";
  const isQuanLy = roleId === "quan_ly";

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

  // ========== QUYỀN CHỈNH SỬA - KHÔNG AI ĐƯỢC SỬA TRỰC TIẾP ==========
  function canEditField(fieldName) {
    // KHÔNG AI ĐƯỢC SỬA TRỰC TIẾP TRÊN BẢNG
    // Tất cả đều phải qua yêu cầu duyệt
    return false;
  }

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

    // Cập nhật pageSub
    if (pageSub) {
      if (isAdmin) {
        pageSub.textContent =
          "👑 ADMIN - Chế độ XEM. Mọi thay đổi phải tạo yêu cầu và được Quản lý duyệt.";
      } else if (isQuanLy) {
        pageSub.textContent = "📋 QUẢN LÝ - Xem và duyệt các yêu cầu từ Admin.";
      } else {
        pageSub.textContent =
          "🔒 Chế độ XEM - Bạn không có quyền chỉnh sửa trực tiếp.";
      }
    }

    // Ẩn nút Lưu tất cả - KHÔNG AI ĐƯỢC SỬA TRỰC TIẾP
    if (saveAllBtn) {
      saveAllBtn.style.display = "none";
    }

    // Nút Tạo yêu cầu - CHỈ ADMIN
    if (btnCreateRequest) {
      if (isAdmin) {
        btnCreateRequest.style.display = "inline-flex";
        btnCreateRequest.innerHTML = '<i class="fas fa-plus"></i> Tạo yêu cầu';
        btnCreateRequest.onclick = () => openCreateRequestModal();
      } else {
        btnCreateRequest.style.display = "none";
        btnCreateRequest.onclick = null;
      }
    }
  }

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

  // ========== MODAL TẠO YÊU CẦU THÊM SẢN PHẨM ==========
  let productRowCounter = 1;

  function openCreateRequestModal() {
    const modal = document.getElementById("createRequestModal");
    if (!modal) {
      Utils.showToast("Lỗi: Không tìm thấy modal", "error");
      return;
    }
    const productsContainer = document.getElementById(
      "requestProductsContainer",
    );
    if (productsContainer) {
      productsContainer.innerHTML = "";
    }
    productRowCounter = 1;
    addProductRow();
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeCreateRequestModal() {
    const modal = document.getElementById("createRequestModal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
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
        <input type="text" placeholder="Tên thương mại *" class="product-name" style="min-width:200px;padding:8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;">
        <input type="text" placeholder="Mã hàng *" class="product-code" style="min-width:120px;padding:8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;">
        <input type="text" placeholder="Quy cách" class="product-quyCach" style="min-width:100px;padding:8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;">
        <input type="text" placeholder="Hãng SX" class="product-hangSX" style="min-width:120px;padding:8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;">
        <input type="text" placeholder="ĐVT" class="product-dvt" style="min-width:60px;padding:8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;">
        <input type="text" placeholder="Phân loại" class="product-phanLoai" style="min-width:120px;padding:8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;">
        <input type="text" placeholder="Giá nhập" class="product-giaNhap" style="min-width:100px;padding:8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;">
        <input type="text" placeholder="Tồn đầu" class="product-tonKho" style="min-width:80px;padding:8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;" value="0">
        <input type="text" placeholder="Số lot" class="product-soLot" style="min-width:100px;padding:8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;">
        <input type="date" placeholder="HSD" class="product-ngayHetHan" style="min-width:130px;padding:8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;">
        <button type="button" class="btn-remove-row" data-id="${productRowCounter}" style="padding:6px 12px;background:#dc2626;color:white;border:none;border-radius:4px;cursor:pointer;"><i class="fas fa-trash"></i> Xóa</button>
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
        giaXuat: 0,
        tonKho:
          Utils.parseNumber(row.querySelector(".product-tonKho")?.value) || 0,
        soLuongNhap:
          Utils.parseNumber(row.querySelector(".product-tonKho")?.value) || 0,
        soLuongXuat: 0,
        soLot: row.querySelector(".product-soLot")?.value || "",
        ngayHetHan: row.querySelector(".product-ngayHetHan")?.value || "",
        soHopDongNhap: "",
        soHoaDonNhap: "",
        soHopDongXuat: "",
        soHoaDonXuat: "",
        ngayNhapHD: "",
        ngayXuatHD: "",
        ghiChu: "",
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

    // Kiểm tra mã hàng trùng
    const maHangs = products.map((p) => p.maHang);
    if (new Set(maHangs).size !== maHangs.length) {
      Utils.showToast("Mã hàng bị trùng trong yêu cầu", "error");
      return;
    }

    Utils.showLoading(true, "Đang gửi yêu cầu...");
    try {
      await window.API.approval.createRequest({ products: products });
      Utils.showToast("✅ Đã gửi yêu cầu thêm sản phẩm, chờ Quản lý duyệt");
      closeCreateRequestModal();
    } catch (error) {
      Utils.showToast(error.message || "Lỗi khi gửi yêu cầu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ========== MODAL YÊU CẦU CHỈNH SỬA SẢN PHẨM ==========
  const editModal = document.getElementById("editProductModal");
  let currentEditProduct = null;

  function closeEditModal() {
    if (editModal) {
      editModal.style.display = "none";
    }
    document.body.style.overflow = "";
  }

  async function openEditRequestModal(productId) {
    try {
      const product = inventoryData.find((p) => p.id == productId);
      if (!product) {
        Utils.showToast("Không tìm thấy sản phẩm", "error");
        return;
      }
      currentEditProduct = product;

      document.getElementById("edit_productId").value = product.id;
      document.getElementById("edit_tenThuongMai").value =
        product.tenThuongMai || "";
      document.getElementById("edit_maHang").value = product.maHang || "";
      document.getElementById("edit_quyCach").value = product.quyCach || "";
      document.getElementById("edit_hangSX").value = product.hangSX || "";
      document.getElementById("edit_dvt").value = product.dvt || "";
      document.getElementById("edit_phanLoai").value = product.phanLoai || "";
      document.getElementById("edit_giaNhap").value =
        Utils.formatNumber(product.giaNhap) || "0";
      document.getElementById("edit_soLuongNhap").value =
        product.soLuongNhap || "0";
      document.getElementById("edit_soLuongXuat").value =
        product.soLuongXuat || "0";
      document.getElementById("edit_soLot").value = product.soLot || "";
      document.getElementById("edit_ngayHetHan").value =
        product.ngayHetHan || "";
      document.getElementById("edit_soHopDongNhap").value =
        product.soHopDongNhap || "";
      document.getElementById("edit_soHoaDonNhap").value =
        product.soHoaDonNhap || "";
      document.getElementById("edit_soHopDongXuat").value =
        product.soHopDongXuat || "";
      document.getElementById("edit_soHoaDonXuat").value =
        product.soHoaDonXuat || "";
      document.getElementById("edit_ngayNhapHD").value =
        product.ngayNhapHD || "";
      document.getElementById("edit_ngayXuatHD").value =
        product.ngayXuatHD || "";
      document.getElementById("edit_ghiChu").value = product.ghiChu || "";

      if (editModal) {
        editModal.style.display = "flex";
        document.body.style.overflow = "hidden";
      }
    } catch (error) {
      console.error("Open edit modal error:", error);
      Utils.showToast("Lỗi khi tải thông tin sản phẩm", "error");
    }
  }

  async function submitEditRequest() {
    const productId = document.getElementById("edit_productId").value;

    const updatedData = {
      tenThuongMai: document.getElementById("edit_tenThuongMai").value.trim(),
      maHang: document.getElementById("edit_maHang").value.trim(),
      quyCach: document.getElementById("edit_quyCach").value,
      hangSX: document.getElementById("edit_hangSX").value,
      dvt: document.getElementById("edit_dvt").value,
      phanLoai: document.getElementById("edit_phanLoai").value,
      giaNhap: Utils.parseNumber(document.getElementById("edit_giaNhap").value),
      soLuongNhap: Utils.parseNumber(
        document.getElementById("edit_soLuongNhap").value,
      ),
      soLuongXuat: Utils.parseNumber(
        document.getElementById("edit_soLuongXuat").value,
      ),
      soLot: document.getElementById("edit_soLot").value,
      ngayHetHan: document.getElementById("edit_ngayHetHan").value || null,
      soHopDongNhap: document.getElementById("edit_soHopDongNhap").value,
      soHoaDonNhap: document.getElementById("edit_soHoaDonNhap").value,
      soHopDongXuat: document.getElementById("edit_soHopDongXuat").value,
      soHoaDonXuat: document.getElementById("edit_soHoaDonXuat").value,
      ngayNhapHD: document.getElementById("edit_ngayNhapHD").value || null,
      ngayXuatHD: document.getElementById("edit_ngayXuatHD").value || null,
      ghiChu: document.getElementById("edit_ghiChu").value,
    };

    // Kiểm tra có thay đổi không
    let hasChanges = false;
    for (const key in updatedData) {
      if (updatedData[key] != currentEditProduct[key]) {
        hasChanges = true;
        break;
      }
    }

    if (!hasChanges) {
      Utils.showToast("Không có thay đổi nào", "warning");
      return;
    }

    if (!updatedData.tenThuongMai || !updatedData.maHang) {
      Utils.showToast("Tên thương mại và mã hàng không được để trống", "error");
      return;
    }

    Utils.showLoading(true, "Đang gửi yêu cầu chỉnh sửa...");
    try {
      await window.API.edit.createRequest(productId, updatedData);
      Utils.showToast("✅ Đã gửi yêu cầu chỉnh sửa, chờ Quản lý duyệt");
      closeEditModal();
    } catch (error) {
      Utils.showToast(error.message || "Lỗi khi gửi yêu cầu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ========== YÊU CẦU XÓA SẢN PHẨM ==========
  async function requestDeleteProduct(productId, productName) {
    if (
      !confirm(
        `Bạn có chắc muốn yêu cầu xóa sản phẩm "${productName}"?\n\nYêu cầu sẽ được gửi đến Quản lý để duyệt.`,
      )
    ) {
      return;
    }

    Utils.showLoading(true, "Đang gửi yêu cầu xóa...");
    try {
      await window.API.deletion.createRequest({ productId: productId });
      Utils.showToast(
        `✅ Đã gửi yêu cầu xóa sản phẩm "${productName}", chờ Quản lý duyệt`,
      );
    } catch (error) {
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
      await loadCategories();
      applyFilters();
    } catch (error) {
      Utils.showToast("Lỗi khi tải dữ liệu tồn kho", "error");
      inventoryData = [];
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="24" class="text-center">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
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

  // ========== RENDER - CHỈ HIỂN THỊ READ-ONLY ==========
  function renderReadonlyField(value, fieldName, isNumber = false) {
    // TẤT CẢ ĐỀU READ-ONLY
    if (isNumber) {
      return `<span class="readonly-field" style="color:#ffffff;">${Utils.formatNumber(value)}</span>`;
    }
    if (fieldName.includes("ngay")) {
      return `<span class="readonly-field" style="color:#ffffff;">${Utils.formatDate(value)}</span>`;
    }
    return `<span class="readonly-field" style="color:#ffffff;">${Utils.escapeHtml(String(value || "—"))}</span>`;
  }

  function renderTable() {
    if (!tbody) return;
    if (!filteredData || filteredData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="24" class="text-center">Không có dữ liệu tồn kho</td></tr>`;
      updatePaginationControls();
      return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const pageData = filteredData.slice(start, start + itemsPerPage);

    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="24" class="text-center">Không có dữ liệu tồn kho</td></tr>`;
      updatePaginationControls();
      return;
    }

    tbody.innerHTML = pageData
      .map((item, idx) => {
        const globalIdx = start + idx + 1;
        const remainingDays = getRemainingDays(item);
        const isOutOfStock = (item.tonKho || 0) === 0;

        // Chỉ Admin mới thấy nút hành động
        const actionButtons = isAdmin
          ? `
        <td class="text-center">
          <button class="btn-edit-product" onclick="window.openEditRequestModal(${item.id})" style="margin-right: 4px; padding: 4px 10px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
            <i class="fas fa-edit"></i> Sửa
          </button>
          <button class="btn-delete-product" onclick="window.requestDeleteProduct(${item.id}, '${Utils.escapeHtml(item.tenThuongMai).replace(/'/g, "\\'")}')" style="padding: 4px 10px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
            <i class="fas fa-trash"></i> Xóa
          </button>
        </td>
      `
          : `<td class="text-center"><span style="color:#6b82a0;font-size:11px;">—</span></td>`;

        return `
        <tr class="${isOutOfStock ? "out-of-stock" : ""}">
          <td class="sticky-col" style="position: sticky; left: 0; z-index: 100; background: #0f172a; color: #ffffff;">${globalIdx}</td>
          <td class="sticky-col-2" style="position: sticky; left: 50px; z-index: 100; background: #0f172a;"><strong style="color: #60a5fa;">${renderReadonlyField(item.tenThuongMai, "tenThuongMai")}</strong></td>
          <td>${renderReadonlyField(item.maHang, "maHang")}</td>
          <td>${renderReadonlyField(item.quyCach, "quyCach")}</td>
          <td>${renderReadonlyField(item.hangSX, "hangSX")}</td>
          <td>${renderReadonlyField(item.dvt, "dvt")}</td>
          <td>${renderReadonlyField(item.phanLoai, "phanLoai")}</td>
          <td class="text-right">${renderReadonlyField(item.giaNhap, "giaNhap", true)}</td>
          <td class="text-right">${renderReadonlyField(item.soLuongNhap, "soLuongNhap", true)}</td>
          <td>${renderReadonlyField(item.soHopDongNhap, "soHopDongNhap")}</td>
          <td>${renderReadonlyField(item.soHoaDonNhap, "soHoaDonNhap")}</td>
          <td>${renderReadonlyField(item.ngayNhapHD, "ngayNhapHD")}</td>
          <td>${renderReadonlyField(item.soLot, "soLot")}</td>
          <td>${renderReadonlyField(item.ngayHetHan, "ngayHetHan")}</td>
          <td class="text-right">${renderReadonlyField(item.soLuongXuat, "soLuongXuat", true)}</td>
          <td class="text-right">${renderReadonlyField(item.giaXuat, "giaXuat", true)}</td>
          <td>${renderReadonlyField(item.soHopDongXuat, "soHopDongXuat")}</td>
          <td>${renderReadonlyField(item.soHoaDonXuat, "soHoaDonXuat")}</td>
          <td>${renderReadonlyField(item.ngayXuatHD, "ngayXuatHD")}</td>
          <td class="text-right"><strong style="${isOutOfStock ? "color: #f87171;" : "color: #4ade80;"}">${renderReadonlyField(item.tonKho, "tonKho", true)}</strong></td>
          <td>${getDebtBadge(remainingDays)}</td>
          ${actionButtons}
        </tr>
      `;
      })
      .join("");

    updatePaginationControls();
    updateStats();
  }

  function updatePaginationControls() {
    totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    if (pageInfo) pageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
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

  function applyFilters() {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const category = catFilter?.value || "";
    const status = statusFilter?.value || "";

    let filtered = [...inventoryData];

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.tenThuongMai?.toLowerCase().includes(searchTerm) ||
          item.maHang?.toLowerCase().includes(searchTerm) ||
          item.soLot?.toLowerCase().includes(searchTerm),
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

    if (prevPageBtn) {
      prevPageBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          renderTable();
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderTable();
        }
      });
    }

    // Modal tạo yêu cầu
    const modal = document.getElementById("createRequestModal");
    const closeBtn = modal?.querySelector(".close");
    const cancelBtn = document.getElementById("btnCancelRequest");
    const submitBtn = document.getElementById("btnSubmitRequest");
    const addProductBtn = document.getElementById("btnAddProductRow");

    if (closeBtn) closeBtn.addEventListener("click", closeCreateRequestModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeCreateRequestModal);
    if (submitBtn) submitBtn.addEventListener("click", submitCreateRequest);
    if (addProductBtn)
      addProductBtn.addEventListener("click", () => addProductRow());

    // Modal chỉnh sửa
    const closeEditBtn = document.querySelector(".close-edit-modal");
    const cancelEditBtn = document.getElementById("btnCancelEdit");
    const submitEditBtn = document.getElementById("btnSubmitEdit");

    if (closeEditBtn) closeEditBtn.addEventListener("click", closeEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEditModal);
    if (submitEditBtn)
      submitEditBtn.addEventListener("click", submitEditRequest);

    window.addEventListener("click", (e) => {
      if (e.target === modal) closeCreateRequestModal();
      if (e.target === editModal) closeEditModal();
    });
  }

  // ========== INIT ==========
  async function init() {
    updateUserUI();
    await loadInventoryData();
    bindEvents();
    switchView("inventory");
    const dateEl = document.getElementById("currentDate");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString("vi-VN");
  }

  // Global functions
  window.requestDeleteProduct = requestDeleteProduct;
  window.openEditRequestModal = openEditRequestModal;

  init();
})();
