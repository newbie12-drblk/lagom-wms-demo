// ==================== API WRAPPER ====================

const API_BASE_URL = "https://lagom-wms-demo.onrender.com/api";

function getToken() {
  return localStorage.getItem("lagom_token");
}

function setToken(token) {
  localStorage.setItem("lagom_token", token);
}

function removeToken() {
  localStorage.removeItem("lagom_token");
}

async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        if (window.location.pathname !== "/login.html") {
          window.location.href = "login.html";
        }
      }
      throw new Error(data.message || "Có lỗi xảy ra");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// API Object
const API = {
  auth: {
    login: async (username, password) => {
      const data = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (data.success && data.token) {
        setToken(data.token);
      }
      return data;
    },
    logout: () => removeToken(),
    getCurrentUser: async () => await apiCall("/auth/me"),
    getAllUsers: async () => await apiCall("/auth/users"),
    createUser: async (userData) =>
      await apiCall("/auth/users", {
        method: "POST",
        body: JSON.stringify(userData),
      }),
    updateUser: async (id, userData) =>
      await apiCall(`/auth/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      }),
    deleteUser: async (id) =>
      await apiCall(`/auth/users/${id}`, {
        method: "DELETE",
      }),
  },

  inventory: {
    getAll: async () => {
      const data = await apiCall("/inventory");
      return data.data || [];
    },
    getByMaHang: async (maHang) => {
      const data = await apiCall(`/inventory/product/${maHang}`);
      return data.data;
    },
    getCategories: async () => {
      const data = await apiCall("/inventory/categories");
      return data.data || [];
    },
    getStats: async () => {
      const data = await apiCall("/inventory/stats");
      return data.data;
    },
    getPending: async () => {
      const data = await apiCall("/inventory/pending");
      return data.data || [];
    },
    create: async (productData) =>
      await apiCall("/inventory", {
        method: "POST",
        body: JSON.stringify(productData),
      }),
    update: async (id, updateData) =>
      await apiCall(`/inventory/${id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      }),
    delete: async (id) =>
      await apiCall(`/inventory/${id}`, {
        method: "DELETE",
      }),
    approve: async (id, tonKho) =>
      await apiCall(`/inventory/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify({ tonKho }),
      }),
    reject: async (id, reason) =>
      await apiCall(`/inventory/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      }),
  },

  receipt: {
    getAll: async () => {
      const data = await apiCall("/receipts");
      return data.data || [];
    },
    getById: async (id) => {
      const data = await apiCall(`/receipts/${id}`);
      return data.data;
    },
    getPending: async () => {
      const data = await apiCall("/receipts/pending");
      return data.data || [];
    },
    create: async (receiptData) => {
      const payload = {
        receiptDate:
          receiptData.receiptDate || new Date().toISOString().split("T")[0],
        supplierName: receiptData.supplierName || "",
        supplierAddress: receiptData.supplierAddress || "",
        supplierTax: receiptData.supplierTax || "",
        customerName: receiptData.customerName || "",
        customerAddress: receiptData.customerAddress || "",
        customerTax: receiptData.customerTax || "",
        customerContract: receiptData.customerContract || "",
        items: receiptData.items || [],
        total: Number(receiptData.total) || 0,
        notes: receiptData.notes || "",
      };
      return await apiCall("/receipts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    updateStatus: async (id, status, rejectedReason = null) => {
      return await apiCall(`/receipts/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status, rejectedReason }),
      });
    },
    delete: async (id) =>
      await apiCall(`/receipts/${id}`, {
        method: "DELETE",
      }),
  },

  export: {
    getAll: async () => {
      const data = await apiCall("/exports");
      return data.data || [];
    },
    getById: async (id) => {
      const data = await apiCall(`/exports/${id}`);
      return data.data;
    },
    getPending: async () => {
      const data = await apiCall("/exports/pending");
      return data.data || [];
    },
    create: async (exportData) => {
      const payload = {
        exportDate:
          exportData.exportDate || new Date().toISOString().split("T")[0],
        exportNo: exportData.exportNo || `PX-${Date.now()}`,
        receiverName: exportData.receiverName || "",
        customerName: exportData.customerName || "",
        customerAddress: exportData.customerAddress || "",
        customerTax: exportData.customerTax || "",
        customerContract: exportData.customerContract || "",
        exportReason: exportData.exportReason || "Sử dụng nội bộ",
        items: exportData.items || [],
        total: Number(exportData.total) || 0,
      };
      return await apiCall("/exports", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    updateStatus: async (id, status, rejectedReason = null) => {
      return await apiCall(`/exports/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status, rejectedReason }),
      });
    },
    delete: async (id) =>
      await apiCall(`/exports/${id}`, {
        method: "DELETE",
      }),
  },

  // ==================== INVOICE API ====================
  invoice: {
    // Lấy danh sách phiếu xuất chưa có hóa đơn
    getExportsWithoutInvoice: async () => {
      const data = await apiCall("/invoice/exports-without-invoice");
      return data.data || [];
    },
    // Tạo yêu cầu hóa đơn
    createRequest: async (invoiceData) => {
      return await apiCall("/invoice/requests", {
        method: "POST",
        body: JSON.stringify(invoiceData),
      });
    },
    // Lấy danh sách yêu cầu hóa đơn
    getRequests: async (status = null) => {
      const url = status
        ? `/invoice/requests?status=${status}`
        : "/invoice/requests";
      const data = await apiCall(url);
      return data.data || [];
    },
    // Lấy yêu cầu hóa đơn theo ID
    getRequestById: async (id) => {
      const data = await apiCall(`/invoice/requests/${id}`);
      return data.data;
    },
    // Duyệt hóa đơn (Quản lý)
    approve: async (id) => {
      return await apiCall(`/invoice/requests/${id}/approve`, {
        method: "PUT",
      });
    },
    // Từ chối hóa đơn (Quản lý)
    reject: async (id, reason) => {
      return await apiCall(`/invoice/requests/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      });
    },
    // Xóa yêu cầu hóa đơn
    delete: async (id) => {
      return await apiCall(`/invoice/requests/${id}`, {
        method: "DELETE",
      });
    },
  },

  receiptRequest: {
    create: async (data) =>
      await apiCall("/receipt-requests", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getPending: async () => {
      const data = await apiCall("/receipt-requests/pending");
      return data.data || [];
    },
    getAll: async (status = null) => {
      const url = status
        ? `/receipt-requests?status=${status}`
        : "/receipt-requests";
      const data = await apiCall(url);
      return data.data || [];
    },
    approve: async (id, soLuongNhap) =>
      await apiCall(`/receipt-requests/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify({ soLuongNhap }),
      }),
    reject: async (id, reason) =>
      await apiCall(`/receipt-requests/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      }),
  },

  exportRequest: {
    create: async (data) =>
      await apiCall("/export-requests", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getPending: async () => {
      const data = await apiCall("/export-requests/pending");
      return data.data || [];
    },
    getAll: async (status = null) => {
      const url = status
        ? `/export-requests?status=${status}`
        : "/export-requests";
      const data = await apiCall(url);
      return data.data || [];
    },
    approve: async (id, extraData) =>
      await apiCall(`/export-requests/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify(extraData),
      }),
    reject: async (id, reason) =>
      await apiCall(`/export-requests/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      }),
  },

  approval: {
    createRequest: async (productData) =>
      await apiCall("/approvals", {
        method: "POST",
        body: JSON.stringify(productData),
      }),
    getMyRequests: async () => {
      const data = await apiCall("/approvals/my");
      return data.data || [];
    },
    getAllRequests: async (status = null) => {
      const url = status ? `/approvals?status=${status}` : "/approvals";
      const data = await apiCall(url);
      return data.data || [];
    },
    approve: async (id) =>
      await apiCall(`/approvals/${id}/approve`, {
        method: "PUT",
      }),
    reject: async (id, reason) =>
      await apiCall(`/approvals/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      }),
    delete: async (id) =>
      await apiCall(`/approvals/${id}`, {
        method: "DELETE",
      }),
  },

  deletion: {
    createRequest: async (data) =>
      await apiCall("/deletions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getAllRequests: async (status = null) => {
      const url = status ? `/deletions?status=${status}` : "/deletions";
      const data = await apiCall(url);
      return data.data || [];
    },
    getMyRequests: async () => {
      const data = await apiCall("/deletions/my");
      return data.data || [];
    },
    approve: async (id) =>
      await apiCall(`/deletions/${id}/approve`, {
        method: "PUT",
      }),
    reject: async (id, reason) =>
      await apiCall(`/deletions/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      }),
  },

  edit: {
    createRequest: async (productId, updatedData) =>
      await apiCall("/edits", {
        method: "POST",
        body: JSON.stringify({ productId, updatedData }),
      }),
    getAllRequests: async (status = null) => {
      const url = status ? `/edits?status=${status}` : "/edits";
      const data = await apiCall(url);
      return data.data || [];
    },
    getMyRequests: async () => {
      const data = await apiCall("/edits/my");
      return data.data || [];
    },
    approve: async (id) =>
      await apiCall(`/edits/${id}/approve`, {
        method: "PUT",
      }),
    reject: async (id, reason) =>
      await apiCall(`/edits/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      }),
  },

  history: {
    getByRecord: async (tableName, recordId) => {
      const data = await apiCall(`/history/record/${tableName}/${recordId}`);
      return data.data || [];
    },
    getByUser: async (userId, limit = 50) => {
      const data = await apiCall(`/history/user/${userId}?limit=${limit}`);
      return data.data || [];
    },
    getAll: async (limit = 100) => {
      const data = await apiCall(`/history/all?limit=${limit}`);
      return data.data || [];
    },
  },

  notification: {
    getMyNotifications: async (limit = 20) => {
      const data = await apiCall(`/notifications?limit=${limit}`);
      return {
        notifications: data.data || [],
        unreadCount: data.unreadCount || 0,
      };
    },
    markAsRead: async (id) =>
      await apiCall(`/notifications/${id}/read`, {
        method: "PUT",
      }),
    markAllAsRead: async () =>
      await apiCall("/notifications/read-all", {
        method: "PUT",
      }),
    delete: async (id) =>
      await apiCall(`/notifications/${id}`, {
        method: "DELETE",
      }),
  },

  file: {
    upload: async (relatedType, relatedId, file) => {
      const formData = new FormData();
      formData.append("relatedType", relatedType);
      formData.append("relatedId", relatedId);
      formData.append("file", file);
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      return await response.json();
    },
    getByRelated: async (relatedType, relatedId) => {
      const data = await apiCall(`/files/${relatedType}/${relatedId}`);
      return data.data || [];
    },
    delete: async (id) =>
      await apiCall(`/files/${id}`, {
        method: "DELETE",
      }),
    getDownloadUrl: (id) =>
      `${API_BASE_URL}/files/download/${id}?token=${getToken()}`,
  },

  getToken,
  setToken,
  removeToken,
  getCurrentUserFromToken: () => {
    const token = getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        id: payload.userId,
        username: payload.username,
        fullName: payload.fullName,
        roleId: payload.roleId,
      };
    } catch (e) {
      return null;
    }
  },
};

window.API = API;
console.log("✅ API loaded successfully!");
