/**
 * ==================== INVENTORY MODULE ====================
 * Quản lý tồn kho (chế độ xem)
 * CHỈ 4 TAB: Thêm, Sửa, Xóa, Tạo hóa đơn
 * FIX: Đúng 21 cột trong bảng
 */

(function () {
  "use strict";

  let currentPage = 1;
  const rowsPerPage = 20;
  let filteredInventoryData = [];
  let inventoryData = [];
  let requestType = "add"; // 'add', 'edit', 'delete', 'invoice'

  // DOM Elements
  const tbody = document.getElementById("inv-tbody");
  const searchInput = document.getElementById("inv-search");
  const catFilter = document.getElementById("inv-cat-filter");
  const statusFilter = document.getElementById("inv-status-filter");
  const createRequestBtn = document.getElementById("btnCreateRequest");
  const exportBtn = document.getElementById("btnExport");
  const refreshBtn = document.getElementById("btnRefreshInventory");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");

  // ==================== KIỂM TRA ROLE ====================
  function isAdmin() {
    const user = Auth.getCurrentUser();
    return user && user.roleId === "admin";
  }

  function isQuanLy() {
    const user = Auth.getCurrentUser();
    return user && user.roleId === "quan_ly";
  }

  // Helper functions
  function formatCurrency(num) {
    return Utils.formatCurrency(num);
  }

  function formatNumber(num) {
    return Utils.formatNumber(num);
  }

  function formatDate(dateStr) {
    return Utils.formatDate(dateStr);
  }

  function escapeHtml(str) {
    return Utils.escapeHtml(str);
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

  // ==================== RENDER TABLE - 21 CỘT ====================
  function renderInventoryTable(data) {
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="21" style="text-align:center;padding:60px;color:#6b82a0;">
        <i class="fas fa-box-open" style="font-size:48px;display:block;margin-bottom:16px;opacity:0.4;"></i>
        Không có dữ liệu tồn kho
      </td></tr>`;
      updatePaginationControls(0);
      return;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = data.slice(start, end);

    tbody.innerHTML = pageData
      .map((item, idx) => {
        const remainingDays = getRemainingDays(item);
        const globalIdx = start + idx + 1;
        const isOutOfStock = (item.tonKho || 0) === 0;

        const formatDateDisplay = (dateStr) => {
          if (!dateStr || dateStr === "" || dateStr === "—") return "—";
          try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("vi-VN");
          } catch (e) {
            return dateStr;
          }
        };

        return `
          <tr class="${isOutOfStock ? "out-of-stock" : ""}">
            <!-- CỘT 1: STT - CỐ ĐỊNH -->
            <td class="sticky-col" style="position: sticky; left: 0; z-index: 100; background: #0f172a; color: #ffffff; min-width: 45px; text-align: center; border-bottom: 1px solid #1e2d45; padding: 8px 6px;">${globalIdx}</td>
            
            <!-- CỘT 2: TÊN THƯƠNG MẠI - CỐ ĐỊNH -->
            <td class="sticky-col-2" style="position: sticky; left: 45px; z-index: 100; background: #0f172a; min-width: 180px; border-bottom: 1px solid #1e2d45; padding: 8px 6px;">
              <strong style="color: #60a5fa;">${escapeHtml(item.tenThuongMai || "—")}</strong>
            </td>
            
            <!-- CỘT 3: MÃ HÀNG -->
            <td style="min-width: 100px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${escapeHtml(item.maHang || "—")}</td>
            
            <!-- CỘT 4: QUY CÁCH -->
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${escapeHtml(item.quyCach || "—")}</td>
            
            <!-- CỘT 5: HÃNG SX -->
            <td style="min-width: 150px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${escapeHtml(item.hangSX || "—")}</td>
            
            <!-- CỘT 6: ĐVT -->
            <td style="min-width: 50px; text-align: center; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${escapeHtml(item.dvt || "—")}</td>
            
            <!-- CỘT 7: PHÂN LOẠI MÁY -->
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${escapeHtml(item.phanLoai || "—")}</td>
            
            <!-- CỘT 8: GIÁ NHẬP -->
            <td class="text-right" style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #93c5fd; font-family: monospace;">${formatCurrency(item.giaNhap || 0)}</td>
            
            <!-- CỘT 9: SL NHẬP -->
            <td class="text-right" style="min-width: 80px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #86efac; font-weight: 600;">${formatNumber(item.soLuongNhap || 0)}</td>
            
            <!-- CỘT 10: SỐ HĐ (Số hợp đồng nhập) -->
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${escapeHtml(item.soHopDongNhap || "—")}</td>
            
            <!-- CỘT 11: SỐ HĐƠN NHẬP (Số hóa đơn nhập) -->
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #fbbf24; font-weight: 500;">${escapeHtml(item.soHoaDonNhap || "—")}</td>
            
            <!-- CỘT 12: NGÀY NHẬP HĐ -->
            <td style="min-width: 110px; text-align: center; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${formatDateDisplay(item.ngayNhapHD)}</td>
            
            <!-- CỘT 13: SỐ LOT -->
            <td style="min-width: 100px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff; font-family: monospace;">${escapeHtml(item.soLot || "—")}</td>
            
            <!-- CỘT 14: NGÀY HẾT HẠN -->
            <td style="min-width: 110px; text-align: center; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: ${item.ngayHetHan && new Date(item.ngayHetHan) < new Date() ? "#f87171" : "#ffffff"};">${formatDateDisplay(item.ngayHetHan)}</td>
            
            <!-- CỘT 15: SL XUẤT -->
            <td class="text-right" style="min-width: 80px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${formatNumber(item.soLuongXuat || 0)}</td>
            
            <!-- CỘT 16: GIÁ XUẤT -->
            <td class="text-right" style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #93c5fd; font-family: monospace;">${formatCurrency(item.giaXuat || 0)}</td>
            
            <!-- CỘT 17: SỐ HĐ XUẤT (Số hợp đồng xuất) -->
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${escapeHtml(item.soHopDongXuat || "—")}</td>
            
            <!-- CỘT 18: SỐ HĐƠN XUẤT (Số hóa đơn xuất) -->
            <td style="min-width: 120px; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #fbbf24; font-weight: 500;">${escapeHtml(item.soHoaDonXuat || "—")}</td>
            
            <!-- CỘT 19: NGÀY XUẤT -->
            <td style="min-width: 110px; text-align: center; border-bottom: 1px solid #1e2d45; padding: 8px 6px; color: #ffffff;">${formatDateDisplay(item.ngayXuatHD)}</td>
            
            <!-- CỘT 20: TỒN CUỐI -->
            <td class="text-right" style="min-width: 80px; border-bottom: 1px solid #1e2d45; padding: 8px 6px;">
              <strong style="${isOutOfStock ? "color: #f87171;" : "color: #4ade80;"}">${formatNumber(item.tonKho || 0)}</strong>
            </td>
            
            <!-- CỘT 21: CÔNG NỢ -->
            <td style="min-width: 150px; border-bottom: 1px solid #1e2d45; padding: 8px 6px;">${getDebtBadge(remainingDays)}</td>
          </tr>
        `;
      })
      .join("");

    updatePaginationControls(data.length);
  }

  function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (pageInfo)
      pageInfo.textContent = `Trang ${currentPage} / ${totalPages || 1}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn)
      nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
  }

  // Update stats
  async function updateInventoryStats(data) {
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

  // ==================== REFRESH INVENTORY DATA ====================
  async function refreshInventoryData() {
    Utils.showLoading(true, "Đang làm mới dữ liệu tồn kho...");
    try {
      localStorage.removeItem("lagom_inventory");

      const freshData = await window.API.inventory.getAll();
      inventoryData = freshData;
      window.inventoryData = freshData;

      await populateCategoryFilter();
      applyInventoryFilters(freshData);
      await updateInventoryStats(freshData);

      Utils.showToast("✅ Đã làm mới dữ liệu tồn kho");
    } catch (error) {
      console.error("Refresh inventory error:", error);
      Utils.showToast("❌ Lỗi khi làm mới dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // Apply filters
  function applyInventoryFilters(data) {
    inventoryData = data;
    if (!data || data.length === 0) {
      filteredInventoryData = [];
      renderInventoryTable([]);
      updateInventoryStats([]);
      return;
    }

    const searchTerm = searchInput?.value.toLowerCase() || "";
    const category = catFilter?.value || "";
    const status = statusFilter?.value || "";

    let filtered = [...data];

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

    filteredInventoryData = filtered;
    currentPage = 1;
    renderInventoryTable(filteredInventoryData);
    updateInventoryStats(filteredInventoryData);
  }

  // Populate category filter
  async function populateCategoryFilter() {
    try {
      const categories = await window.API.inventory.getCategories();
      if (catFilter) {
        catFilter.innerHTML =
          '<option value="">Tất cả phân loại</option>' +
          categories
            .map(
              (cat) =>
                `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`,
            )
            .join("");
      }
    } catch (error) {
      console.error("Load categories error:", error);
    }
  }

  function resetFilters() {
    if (searchInput) searchInput.value = "";
    if (catFilter) catFilter.value = "";
    if (statusFilter) statusFilter.value = "";
    applyInventoryFilters(inventoryData);
  }

  // ==================== EXPORT TO EXCEL ====================
  function exportInventoryToExcel() {
    if (!filteredInventoryData || filteredInventoryData.length === 0) {
      Utils.showToast("Không có dữ liệu để xuất!", "error");
      return;
    }

    const exportData = filteredInventoryData.map((item, idx) => ({
      STT: idx + 1,
      "Tên thương mại": item.tenThuongMai || "",
      "Mã hàng": item.maHang || "",
      "Quy cách": item.quyCach || "",
      "Hãng SX": item.hangSX || "",
      ĐVT: item.dvt || "",
      "Phân loại": item.phanLoai || "",
      "Giá nhập": item.giaNhap || 0,
      "Số lượng nhập": item.soLuongNhap || 0,
      "Số hợp đồng": item.soHopDongNhap || "",
      "Số hóa đơn nhập": item.soHoaDonNhap || "",
      "Ngày nhập HĐ": item.ngayNhapHD || "",
      "Số lot": item.soLot || "",
      "Ngày hết hạn": item.ngayHetHan || "",
      "Số lượng xuất": item.soLuongXuat || 0,
      "Giá xuất": item.giaXuat || 0,
      "Số hợp đồng xuất": item.soHopDongXuat || "",
      "Số hóa đơn xuất": item.soHoaDonXuat || "",
      "Ngày xuất": item.ngayXuatHD || "",
      "Tồn cuối": item.tonKho || 0,
    }));

    const headers = Object.keys(exportData[0]);
    const csvRows = [headers.join(",")];

    for (const row of exportData) {
      const values = headers.map((header) => {
        let val = row[header];
        if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
        return val;
      });
      csvRows.push(values.join(","));
    }

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    Utils.downloadFile(
      blob,
      `ton_kho_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`,
    );
    Utils.showToast("Đã xuất file CSV thành công");
  }

  // ==================== LOAD DANH SÁCH PHIẾU ĐÃ DUYỆT ====================
  async function loadApprovedReferences() {
    const typeSelect = document.getElementById("invoiceType");
    const refSelect = document.getElementById("invoiceReference");

    if (!typeSelect || !refSelect) return;

    const type = typeSelect.value;
    refSelect.innerHTML = '<option value="">-- Đang tải --</option>';

    try {
      let data = [];
      if (type === "receipt") {
        const result = await window.API.receipt.getAll();
        data = result.filter((r) => r.status === "approved");
      } else {
        const result = await window.API.export.getAll();
        data = result.filter((r) => r.status === "approved");
      }

      if (data.length === 0) {
        refSelect.innerHTML =
          '<option value="">-- Không có phiếu nào đã duyệt --</option>';
        return;
      }

      refSelect.innerHTML = data
        .map((item) => {
          const label =
            type === "receipt"
              ? `${item.receiptNo || "PN-" + item.id} - ${item.supplierName || "Nhà cung cấp"}`
              : `${item.exportNo || "PX-" + item.id} - ${item.receiverName || "Người nhận"}`;
          return `<option value="${item.id}">${escapeHtml(label)}</option>`;
        })
        .join("");
    } catch (error) {
      console.error("Load references error:", error);
      refSelect.innerHTML = '<option value="">-- Lỗi tải dữ liệu --</option>';
    }
  }

  // ==================== TẠO MODAL YÊU CẦU ====================
  function showRequestModal() {
    const overlay = document.createElement("div");
    overlay.className = "request-modal-overlay";
    overlay.id = "requestModal";
    overlay.innerHTML = `
      <div class="request-modal">
        <div class="request-modal-header">
          <h3 id="requestModalTitle">📋 Tạo yêu cầu</h3>
          <button class="request-modal-close" onclick="window.closeRequestModal()">&times;</button>
        </div>

        <div class="request-options">
          <button class="btn btn-primary active" data-type="add" onclick="window.setRequestType('add')">
            <i class="fas fa-plus"></i> Thêm sản phẩm
          </button>
          <button class="btn btn-outline" data-type="edit" onclick="window.setRequestType('edit')">
            <i class="fas fa-edit"></i> Sửa sản phẩm
          </button>
          <button class="btn btn-outline" data-type="delete" onclick="window.setRequestType('delete')">
            <i class="fas fa-trash"></i> Xóa sản phẩm
          </button>
          <button class="btn btn-outline" data-type="invoice" onclick="window.setRequestType('invoice')" style="border-color: #a78bfa; color: #a78bfa;">
            <i class="fas fa-file-invoice"></i> Tạo hóa đơn
          </button>
        </div>

        <div id="requestContent">
          <!-- Nội dung sẽ được render theo loại -->
        </div>

        <div class="request-actions">
          <button class="btn btn-outline" onclick="window.closeRequestModal()">Hủy</button>
          <button class="btn btn-success" id="btnSubmitRequest" onclick="window.submitRequest()">
            <i class="fas fa-paper-plane"></i> Gửi yêu cầu
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    setRequestType("add");
  }

  window.closeRequestModal = function () {
    const modal = document.getElementById("requestModal");
    if (modal) {
      modal.remove();
      document.body.style.overflow = "";
    }
  };

  window.setRequestType = function (type) {
    requestType = type;

    document.querySelectorAll(".request-options .btn").forEach((btn) => {
      btn.classList.remove("active");
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-outline");
    });

    document.querySelectorAll(".request-options .btn").forEach((btn) => {
      if (btn.dataset.type === type) {
        btn.classList.remove("btn-outline");
        btn.classList.add("btn-primary");
        btn.classList.add("active");
      }
    });

    const titles = {
      add: "📝 Thêm sản phẩm mới",
      edit: "✏️ Sửa sản phẩm",
      delete: "🗑️ Xóa sản phẩm",
      invoice: "🧾 Tạo hóa đơn",
    };
    const titleEl = document.getElementById("requestModalTitle");
    if (titleEl) titleEl.textContent = titles[type] || "📋 Tạo yêu cầu";

    renderRequestContent(type);
  };

  // ==================== RENDER NỘI DUNG ====================
  function renderRequestContent(type) {
    const container = document.getElementById("requestContent");
    if (!container) return;

    if (type === "add") {
      // ========== THÊM SẢN PHẨM - 8 TRƯỜNG (BỎ QUY CÁCH ĐÓNG GÓI) ==========
      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">
          <i class="fas fa-info-circle"></i> Điền thông tin sản phẩm mới (các trường có <span style="color: #ef4444;">*</span> là bắt buộc):
        </p>
        <div class="request-table-wrap" style="overflow-x: auto; max-height: 400px; border: 1px solid #1e2d45; border-radius: 8px;">
          <table class="request-table" style="width:100%; border-collapse: collapse; font-size: 13px; background: #0f172a; min-width: 1000px;">
            <thead>
              <tr style="background: #1a2235; border-bottom: 2px solid #3b82f6;">
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; width: 40px; white-space: nowrap;">STT</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 150px;">TÊN THƯƠNG MẠI <span style="color:#ef4444;">*</span></th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 120px;">MÃ HÀNG <span style="color:#ef4444;">*</span></th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 120px;">QUY CÁCH</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; width: 70px;">ĐVT</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 130px;">HÃNG/NƯỚC SX</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 120px;">PHÂN LOẠI MÁY</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700; min-width: 120px;">GIÁ NHẬP</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 100px;">SỐ HĐ</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; width: 50px; white-space: nowrap;">XÓA</th>
              </tr>
            </thead>
            <tbody id="addProductBody">
              <tr style="border-bottom: 1px solid #1e2d45;">
                <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5; background: #0a0f1a; font-weight: 600;">1</td>
                <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-tenThuongMai" placeholder="Tên thương mại *" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #3b82f6; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
                <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-maHang" placeholder="Mã hàng *" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #3b82f6; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
                <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-quyCach" placeholder="Quy cách" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
                <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center;"><input type="text" class="add-dvt" placeholder="ĐVT" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px; text-align:center;"></td>
                <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-hangSX" placeholder="Hãng/Nước SX" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
                <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-phanLoai" placeholder="Phân loại máy" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
                <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right;"><input type="text" class="add-giaNhap" placeholder="Giá nhập" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px; text-align:right;"></td>
                <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-soHopDongNhap" placeholder="Số HĐ" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
                <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center;"><button class="btn-remove" onclick="window.removeAddRow(this)" style="background:#dc2626; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;"><i class="fas fa-trash"></i></button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="btn-add-sm" style="margin-top:10px; background:#10b981; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:6px;" onclick="window.addNewAddRow()">
          <i class="fas fa-plus"></i> Thêm dòng
        </button>
        <div style="margin-top: 12px; padding: 10px; background: #0f172a; border-radius: 8px; border: 1px solid #1e2d45;">
          <p style="font-size: 12px; color: #6b82a0;">
            <i class="fas fa-info-circle" style="color: #60a5fa;"></i>
            <strong>Lưu ý:</strong> Chỉ cần nhập 8 trường cơ bản. Các trường khác sẽ được nhập khi Quản lý duyệt đề nghị nhập hàng.
          </p>
        </div>
      `;
    } else if (type === "edit") {
      // ========== SỬA SẢN PHẨM ==========
      const data =
        filteredInventoryData.length > 0
          ? filteredInventoryData
          : inventoryData || [];

      if (data.length === 0) {
        container.innerHTML = `<p style="color: #6b82a0; text-align:center; padding:40px;">Không có sản phẩm để sửa</p>`;
        return;
      }

      let tableRows = data
        .map(
          (item, idx) => `
        <tr style="border-bottom: 1px solid #1e2d45;">
          <td class="checkbox-cell" style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; width: 40px;">
            <input type="checkbox" class="edit-checkbox" data-id="${item.id}" onchange="window.onEditSelect(this)" style="width:18px; height:18px; accent-color:#3b82f6; cursor:pointer;">
          </td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${idx + 1}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.tenThuongMai || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.maHang || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.quyCach || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.dvt || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.hangSX || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.phanLoai || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right; color: #93c5fd; font-family: monospace;">${formatCurrency(item.giaNhap || 0)}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.soHopDongNhap || "")}</td>
        </tr>
      `,
        )
        .join("");

      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">
          <i class="fas fa-info-circle"></i> 
          <strong>Chọn sản phẩm cần sửa</strong> (chỉ sửa được 8 trường cơ bản):
        </p>
        <div class="request-table-wrap" style="overflow-x: auto; max-height: 400px; border: 1px solid #1e2d45; border-radius: 8px;">
          <table class="request-table" style="width:100%; border-collapse: collapse; font-size: 13px; background: #0f172a; min-width: 1000px;">
            <thead>
              <tr style="background: #1a2235; border-bottom: 2px solid #3b82f6;">
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; width: 40px; white-space: nowrap;">Chọn</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; width: 40px;">STT</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 150px;">TÊN THƯƠNG MẠI</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 120px;">MÃ HÀNG</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 120px;">QUY CÁCH</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; width: 70px;">ĐVT</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 130px;">HÃNG/NƯỚC SX</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 120px;">PHÂN LOẠI MÁY</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700; min-width: 120px;">GIÁ NHẬP</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 100px;">SỐ HĐ</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        <div id="editFormContainer" style="margin-top:16px; display:none;">
          <p style="color: #fbbf24; margin-bottom: 8px;">✏️ Nhập thông tin mới cho sản phẩm đã chọn (8 trường):</p>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #1e2d45;">
            <div><label style="color:#6b82a0;font-size:11px;display:block;margin-bottom:4px;">Tên thương mại</label><input type="text" id="edit-tenThuongMai" class="edit-field" style="width:100%;padding:6px 8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;display:block;margin-bottom:4px;">Mã hàng</label><input type="text" id="edit-maHang" class="edit-field" style="width:100%;padding:6px 8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;display:block;margin-bottom:4px;">Quy cách</label><input type="text" id="edit-quyCach" class="edit-field" style="width:100%;padding:6px 8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;display:block;margin-bottom:4px;">ĐVT</label><input type="text" id="edit-dvt" class="edit-field" style="width:100%;padding:6px 8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;display:block;margin-bottom:4px;">Hãng/Nước SX</label><input type="text" id="edit-hangSX" class="edit-field" style="width:100%;padding:6px 8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;display:block;margin-bottom:4px;">Phân loại máy</label><input type="text" id="edit-phanLoai" class="edit-field" style="width:100%;padding:6px 8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;display:block;margin-bottom:4px;">Giá nhập</label><input type="text" id="edit-giaNhap" class="edit-field" style="width:100%;padding:6px 8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
            <div><label style="color:#6b82a0;font-size:11px;display:block;margin-bottom:4px;">Số HĐ</label><input type="text" id="edit-soHopDongNhap" class="edit-field" style="width:100%;padding:6px 8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;"></div>
          </div>
        </div>
        <div style="margin-top: 12px; padding: 10px; background: #0f172a; border-radius: 8px; border: 1px solid #1e2d45;">
          <p style="font-size: 12px; color: #6b82a0;">
            <i class="fas fa-info-circle" style="color: #60a5fa;"></i>
            <strong>Lưu ý:</strong> Chỉ sửa được 8 trường cơ bản. Các trường khác sẽ được cập nhật qua đề nghị nhập/xuất.
          </p>
        </div>
      `;
    } else if (type === "delete") {
      // ========== XÓA SẢN PHẨM ==========
      const data =
        filteredInventoryData.length > 0
          ? filteredInventoryData
          : inventoryData || [];

      if (data.length === 0) {
        container.innerHTML = `<p style="color: #6b82a0; text-align:center; padding:40px;">Không có sản phẩm để xóa</p>`;
        return;
      }

      let tableRows = data
        .map(
          (item, idx) => `
        <tr style="border-bottom: 1px solid #1e2d45;">
          <td class="checkbox-cell" style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; width: 40px;">
            <input type="checkbox" class="delete-checkbox" data-id="${item.id}" data-maHang="${escapeHtml(item.maHang || "")}" style="width:18px; height:18px; accent-color:#3b82f6; cursor:pointer;">
          </td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${idx + 1}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.tenThuongMai || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.maHang || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.quyCach || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.hangSX || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.dvt || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${escapeHtml(item.phanLoai || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right; color: #93c5fd; font-family: monospace;">${formatCurrency(item.giaNhap || 0)}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${item.soLuongNhap || 0}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5; font-family: monospace;">${escapeHtml(item.soLot || "")}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: ${item.ngayHetHan && new Date(item.ngayHetHan) < new Date() ? "#f87171" : "#e2eaf5"};">${formatDate(item.ngayHetHan)}</td>
          <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right; color: ${(item.tonKho || 0) === 0 ? "#f87171" : "#4ade80"}; font-weight: 600;">${item.tonKho || 0}</td>
        </tr>
      `,
        )
        .join("");

      container.innerHTML = `
        <p style="color: #f87171; margin-bottom: 12px;">
          <i class="fas fa-exclamation-triangle"></i> 
          <strong>Chọn sản phẩm cần xóa:</strong> Hành động này KHÔNG thể hoàn tác!
        </p>
        <div class="request-table-wrap" style="overflow-x: auto; max-height: 400px; border: 1px solid #1e2d45; border-radius: 8px;">
          <table class="request-table" style="width:100%; border-collapse: collapse; font-size: 13px; background: #0f172a; min-width: 1000px;">
            <thead>
              <tr style="background: #1a2235; border-bottom: 2px solid #3b82f6;">
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; width: 40px; white-space: nowrap;"><input type="checkbox" id="selectAllDelete" onchange="window.toggleAllDelete(this)" style="width:18px; height:18px; accent-color:#3b82f6; cursor:pointer;"></th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; width: 40px;">STT</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 150px;">TÊN THƯƠNG MẠI</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 120px;">MÃ HÀNG</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 120px;">QUY CÁCH</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 130px;">HÃNG/NƯỚC SX</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; width: 70px;">ĐVT</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 120px;">PHÂN LOẠI MÁY</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700; min-width: 120px;">GIÁ NHẬP</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; width: 70px;">SL NHẬP</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 100px;">SỐ LOT</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; min-width: 110px;">NGÀY HẾT HẠN</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700; width: 80px;">TỒN KHO</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        <div style="margin-top: 12px; padding: 10px; background: #0f172a; border-radius: 8px; border: 1px solid #1e2d45;">
          <p style="font-size: 12px; color: #6b82a0;">
            <i class="fas fa-info-circle" style="color: #60a5fa;"></i>
            <strong>Lưu ý:</strong> Yêu cầu xóa sẽ được gửi đến Quản lý để duyệt.
          </p>
        </div>
      `;
    } else if (type === "invoice") {
      // ========== TẠO HÓA ĐƠN ==========
      container.innerHTML = `
        <p style="color: #6b82a0; margin-bottom: 12px;">
          <i class="fas fa-info-circle"></i> 
          <strong>Tạo yêu cầu hóa đơn:</strong> Chọn phiếu nhập hoặc xuất đã được duyệt để tạo hóa đơn.
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #1e2d45; margin-bottom: 16px;">
          <div>
            <label style="color: #6b82a0; font-size: 12px; display: block; margin-bottom: 4px;">Loại hóa đơn *</label>
            <select id="invoiceType" onchange="window.loadApprovedReferences()" style="width:100%; padding:8px 12px; background:#1a2235; border:1px solid #1e2d45; border-radius:6px; color:#e2eaf5; font-size:13px;">
              <option value="receipt">📥 Phiếu nhập</option>
              <option value="export">📤 Phiếu xuất</option>
            </select>
          </div>
          <div>
            <label style="color: #6b82a0; font-size: 12px; display: block; margin-bottom: 4px;">Chọn phiếu *</label>
            <select id="invoiceReference" style="width:100%; padding:8px 12px; background:#1a2235; border:1px solid #1e2d45; border-radius:6px; color:#e2eaf5; font-size:13px;">
              <option value="">-- Đang tải danh sách --</option>
            </select>
          </div>
          <div>
            <label style="color: #6b82a0; font-size: 12px; display: block; margin-bottom: 4px;">Số hóa đơn nhập *</label>
            <input type="text" id="invoiceSoHoaDonNhap" placeholder="VD: 123/HĐNT/2026" style="width:100%; padding:8px 12px; background:#1a2235; border:1px solid #1e2d45; border-radius:6px; color:#e2eaf5; font-size:13px;">
          </div>
          <div>
            <label style="color: #6b82a0; font-size: 12px; display: block; margin-bottom: 4px;">Ngày hóa đơn nhập *</label>
            <input type="date" id="invoiceNgayNhapHD" style="width:100%; padding:8px 12px; background:#1a2235; border:1px solid #1e2d45; border-radius:6px; color:#e2eaf5; font-size:13px;">
          </div>
          <div>
            <label style="color: #6b82a0; font-size: 12px; display: block; margin-bottom: 4px;">Số hóa đơn xuất</label>
            <input type="text" id="invoiceSoHoaDonXuat" placeholder="VD: 456/HĐX/2026" style="width:100%; padding:8px 12px; background:#1a2235; border:1px solid #1e2d45; border-radius:6px; color:#e2eaf5; font-size:13px;">
          </div>
          <div>
            <label style="color: #6b82a0; font-size: 12px; display: block; margin-bottom: 4px;">Ngày hóa đơn xuất</label>
            <input type="date" id="invoiceNgayXuatHD" style="width:100%; padding:8px 12px; background:#1a2235; border:1px solid #1e2d45; border-radius:6px; color:#e2eaf5; font-size:13px;">
          </div>
          <div style="grid-column: 1 / -1;">
            <label style="color: #6b82a0; font-size: 12px; display: block; margin-bottom: 4px;">Ghi chú</label>
            <textarea id="invoiceNotes" placeholder="Ghi chú thêm..." style="width:100%; padding:8px 12px; background:#1a2235; border:1px solid #1e2d45; border-radius:6px; color:#e2eaf5; font-size:13px; min-height:60px; resize:vertical;"></textarea>
          </div>
        </div>

        <div style="margin-top: 12px; padding: 10px; background: #0f172a; border-radius: 8px; border: 1px solid #1e2d45;">
          <p style="font-size: 12px; color: #6b82a0;">
            <i class="fas fa-info-circle" style="color: #60a5fa;"></i>
            <strong>Lưu ý:</strong> Chọn phiếu đã được duyệt để tạo hóa đơn. Các trường có <span style="color:#ef4444;">*</span> là bắt buộc.
          </p>
        </div>
      `;

      // Load danh sách phiếu đã duyệt
      loadApprovedReferences();
    }
  }

  // ==================== HÀM HỖ TRỢ ====================
  window.toggleAllDelete = function (checkbox) {
    document.querySelectorAll(".delete-checkbox").forEach((cb) => {
      cb.checked = checkbox.checked;
    });
  };

  window.onEditSelect = function (checkbox) {
    const container = document.getElementById("editFormContainer");
    if (container) {
      container.style.display = checkbox.checked ? "block" : "none";
    }
    document.querySelectorAll(".edit-checkbox").forEach((cb) => {
      if (cb !== checkbox) cb.checked = false;
    });
  };

  window.removeAddRow = function (btn) {
    const row = btn.closest("tr");
    if (document.querySelectorAll("#addProductBody tr").length <= 1) {
      alert("⚠️ Phải có ít nhất một dòng sản phẩm!");
      return;
    }
    row.remove();
    renumberAddRows();
  };

  window.addNewAddRow = function () {
    const tbody = document.getElementById("addProductBody");
    if (!tbody) return;
    const rowCount = tbody.querySelectorAll("tr").length + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5; background: #0a0f1a; font-weight: 600;">${rowCount}</td>
      <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-tenThuongMai" placeholder="Tên thương mại *" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #3b82f6; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
      <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-maHang" placeholder="Mã hàng *" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #3b82f6; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
      <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-quyCach" placeholder="Quy cách" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
      <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center;"><input type="text" class="add-dvt" placeholder="ĐVT" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px; text-align:center;"></td>
      <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-hangSX" placeholder="Hãng/Nước SX" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
      <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-phanLoai" placeholder="Phân loại máy" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
      <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right;"><input type="text" class="add-giaNhap" placeholder="Giá nhập" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px; text-align:right;"></td>
      <td style="padding: 6px 10px; border: 1px solid #1e2d45;"><input type="text" class="add-soHopDongNhap" placeholder="Số HĐ" style="width:100%; padding:6px 8px; background:#1a2235; border:1px solid #1e2d45; border-radius:4px; color:#e2eaf5; font-size:13px;"></td>
      <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center;"><button class="btn-remove" onclick="window.removeAddRow(this)" style="background:#dc2626; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;"><i class="fas fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
  };

  function renumberAddRows() {
    const rows = document.querySelectorAll("#addProductBody tr");
    rows.forEach((row, idx) => {
      const firstTd = row.querySelector("td:first-child");
      if (firstTd) firstTd.textContent = idx + 1;
    });
  }

  // ==================== LẤY DỮ LIỆU THÊM SẢN PHẨM (8 TRƯỜNG) ====================
  function getAddProductsData() {
    const rows = document.querySelectorAll("#addProductBody tr");
    const products = [];
    let hasError = false;

    rows.forEach((row) => {
      const tenThuongMai = row.querySelector(".add-tenThuongMai")?.value.trim();
      const maHang = row.querySelector(".add-maHang")?.value.trim();

      if (!tenThuongMai || !maHang) {
        hasError = true;
        return;
      }

      products.push({
        tenThuongMai: tenThuongMai,
        maHang: maHang,
        quyCach: row.querySelector(".add-quyCach")?.value || "",
        dvt: row.querySelector(".add-dvt")?.value || "",
        hangSX: row.querySelector(".add-hangSX")?.value || "",
        phanLoai: row.querySelector(".add-phanLoai")?.value || "",
        giaNhap: parseFloat(
          row.querySelector(".add-giaNhap")?.value?.replace(/[^0-9]/g, "") || 0,
        ),
        soHopDongNhap: row.querySelector(".add-soHopDongNhap")?.value || "",
      });
    });

    return { products, hasError };
  }

  // ==================== GỬI YÊU CẦU ====================
  window.submitRequest = async function () {
    Utils.showLoading(true, "Đang gửi yêu cầu...");

    try {
      const token = API.getToken();

      if (requestType === "add") {
        // ========== THÊM SẢN PHẨM ==========
        const { products, hasError } = getAddProductsData();

        if (hasError || products.length === 0) {
          Utils.showToast(
            "⚠️ Vui lòng điền đầy đủ Tên thương mại và Mã hàng!",
            "warning",
          );
          Utils.showLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/approvals`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ products: products }),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ " + result.message);
          closeRequestModal();
        } else {
          Utils.showToast("❌ " + result.message, "error");
        }
      } else if (requestType === "edit") {
        // ========== SỬA SẢN PHẨM ==========
        const checked = document.querySelectorAll(".edit-checkbox:checked");
        if (checked.length === 0) {
          Utils.showToast("⚠️ Vui lòng chọn một sản phẩm để sửa!", "warning");
          Utils.showLoading(false);
          return;
        }

        const id = parseInt(checked[0].dataset.id);
        const oldProduct =
          filteredInventoryData.find((p) => p.id === id) ||
          inventoryData.find((p) => p.id === id);

        if (!oldProduct) {
          Utils.showToast("❌ Không tìm thấy sản phẩm!", "error");
          Utils.showLoading(false);
          return;
        }

        const newData = {
          tenThuongMai:
            document.getElementById("edit-tenThuongMai")?.value ||
            oldProduct.tenThuongMai,
          maHang:
            document.getElementById("edit-maHang")?.value || oldProduct.maHang,
          quyCach:
            document.getElementById("edit-quyCach")?.value ||
            oldProduct.quyCach,
          dvt: document.getElementById("edit-dvt")?.value || oldProduct.dvt,
          hangSX:
            document.getElementById("edit-hangSX")?.value || oldProduct.hangSX,
          phanLoai:
            document.getElementById("edit-phanLoai")?.value ||
            oldProduct.phanLoai,
          giaNhap: parseFloat(
            document
              .getElementById("edit-giaNhap")
              ?.value?.replace(/[^0-9]/g, "") || oldProduct.giaNhap,
          ),
          soHopDongNhap:
            document.getElementById("edit-soHopDongNhap")?.value ||
            oldProduct.soHopDongNhap,
        };

        const response = await fetch(`${API_BASE_URL}/edits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId: id, updatedData: newData }),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ " + result.message);
          closeRequestModal();
        } else {
          Utils.showToast("❌ " + result.message, "error");
        }
      } else if (requestType === "delete") {
        // ========== XÓA SẢN PHẨM ==========
        const checked = document.querySelectorAll(".delete-checkbox:checked");

        if (checked.length === 0) {
          Utils.showToast(
            "⚠️ Vui lòng chọn ít nhất một sản phẩm để xóa!",
            "warning",
          );
          Utils.showLoading(false);
          return;
        }

        const productIds = [];
        checked.forEach((cb) => {
          const id = parseInt(cb.dataset.id);
          if (!isNaN(id) && id > 0) productIds.push(id);
        });

        if (productIds.length === 0) {
          Utils.showToast("❌ Không tìm thấy ID sản phẩm hợp lệ!", "error");
          Utils.showLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/deletions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productIds: productIds }),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ " + result.message);
          closeRequestModal();
          if (typeof refreshInventoryData === "function") {
            setTimeout(() => refreshInventoryData(), 1000);
          }
        } else {
          Utils.showToast("❌ " + result.message, "error");
        }
      } else if (requestType === "invoice") {
        // ========== TẠO HÓA ĐƠN ==========
        const type = document.getElementById("invoiceType")?.value;
        const referenceId = document.getElementById("invoiceReference")?.value;
        const soHoaDonNhap = document
          .getElementById("invoiceSoHoaDonNhap")
          ?.value.trim();
        const ngayNhapHD = document.getElementById("invoiceNgayNhapHD")?.value;
        const soHoaDonXuat = document
          .getElementById("invoiceSoHoaDonXuat")
          ?.value.trim();
        const ngayXuatHD = document.getElementById("invoiceNgayXuatHD")?.value;
        const notes = document.getElementById("invoiceNotes")?.value.trim();

        if (!type || !referenceId) {
          Utils.showToast(
            "⚠️ Vui lòng chọn loại hóa đơn và phiếu tham chiếu!",
            "warning",
          );
          Utils.showLoading(false);
          return;
        }

        if (!soHoaDonNhap) {
          Utils.showToast("⚠️ Vui lòng nhập Số hóa đơn nhập!", "warning");
          Utils.showLoading(false);
          return;
        }

        if (!ngayNhapHD) {
          Utils.showToast("⚠️ Vui lòng nhập Ngày hóa đơn nhập!", "warning");
          Utils.showLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/invoices`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type,
            referenceId: parseInt(referenceId),
            soHoaDonNhap,
            ngayNhapHD,
            soHoaDonXuat: soHoaDonXuat || "",
            ngayXuatHD: ngayXuatHD || null,
            notes: notes || "",
          }),
        });
        const result = await response.json();

        if (result.success) {
          Utils.showToast("✅ " + result.message);
          closeRequestModal();
        } else {
          Utils.showToast("❌ " + (result.message || "Có lỗi xảy ra"), "error");
        }
      }
    } catch (error) {
      console.error("❌ Submit request error:", error);
      Utils.showToast("❌ " + (error.message || "Có lỗi xảy ra"), "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ==================== INIT ====================
  async function initInventory(inventoryDataFromMain) {
    localStorage.removeItem("lagom_inventory");

    const data = inventoryDataFromMain || (await window.API.inventory.getAll());
    inventoryData = data;
    window.inventoryData = data;

    await populateCategoryFilter();
    applyInventoryFilters(data);

    const applyFilters = () => applyInventoryFilters(data);

    if (searchInput) {
      const newSearch = searchInput.cloneNode(true);
      searchInput.parentNode.replaceChild(newSearch, searchInput);
      document
        .getElementById("inv-search")
        ?.addEventListener("input", applyFilters);
    }

    if (catFilter) {
      const newCat = catFilter.cloneNode(true);
      catFilter.parentNode.replaceChild(newCat, catFilter);
      document
        .getElementById("inv-cat-filter")
        ?.addEventListener("change", applyFilters);
    }

    if (statusFilter) {
      const newStatus = statusFilter.cloneNode(true);
      statusFilter.parentNode.replaceChild(newStatus, statusFilter);
      document
        .getElementById("inv-status-filter")
        ?.addEventListener("change", applyFilters);
    }

    const createRequestBtn = document.getElementById("btnCreateRequest");
    if (createRequestBtn) {
      if (isAdmin()) {
        createRequestBtn.style.display = "inline-flex";
        const newBtn = createRequestBtn.cloneNode(true);
        createRequestBtn.parentNode.replaceChild(newBtn, createRequestBtn);
        newBtn.addEventListener("click", showRequestModal);
      } else {
        createRequestBtn.style.display = "none";
      }
    }

    if (exportBtn) exportBtn.addEventListener("click", exportInventoryToExcel);
    if (refreshBtn) refreshBtn.addEventListener("click", refreshInventoryData);

    if (prevPageBtn)
      prevPageBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          renderInventoryTable(filteredInventoryData);
        }
      });
    if (nextPageBtn)
      nextPageBtn.addEventListener("click", () => {
        const total = Math.ceil(filteredInventoryData.length / rowsPerPage);
        if (currentPage < total) {
          currentPage++;
          renderInventoryTable(filteredInventoryData);
        }
      });
  }

  // Expose functions
  window.initInventory = initInventory;
  window.showRequestModal = showRequestModal;
  window.closeRequestModal = closeRequestModal;
  window.submitRequest = submitRequest;
  window.setRequestType = setRequestType;
  window.toggleAllDelete = toggleAllDelete;
  window.onEditSelect = onEditSelect;
  window.removeAddRow = removeAddRow;
  window.addNewAddRow = addNewAddRow;
  window.inventoryData = inventoryData;
  window.isAdmin = isAdmin;
  window.isQuanLy = isQuanLy;
  window.refreshInventoryData = refreshInventoryData;
  window.loadApprovedReferences = loadApprovedReferences;
})();
