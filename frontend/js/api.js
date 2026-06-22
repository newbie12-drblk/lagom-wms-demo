/**
 * ==================== API WRAPPER ====================
 */

const API_BASE_URL = "https://lagom-wms-demo.onrender.com/api";

// Lấy token từ localStorage
function getToken() {
  return localStorage.getItem("lagom_token");
}

// Lưu token
function setToken(token) {
  localStorage.setItem("lagom_token", token);
}

// Xóa token
function removeToken() {
  localStorage.removeItem("lagom_token");
}

// Lấy thông tin user hiện tại
function getCurrentUserFromToken() {
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
}

// Gọi API chung
async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

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
}

// ========== AUTH API ==========
const authAPI = {
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

  logout: () => {
    removeToken();
  },

  getCurrentUser: async () => {
    return await apiCall("/auth/me");
  },

  getAllUsers: async () => {
    return await apiCall("/auth/users");
  },

  createUser: async (userData) => {
    return await apiCall("/auth/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (id, userData) => {
    return await apiCall(`/auth/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (id) => {
    return await apiCall(`/auth/users/${id}`, {
      method: "DELETE",
    });
  },
};

// ========== INVENTORY API ==========
const inventoryAPI = {
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

  create: async (productData) => {
    return await apiCall("/inventory", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  },

  update: async (id, updateData) => {
    return await apiCall(`/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  },

  delete: async (id) => {
    return await apiCall(`/inventory/${id}`, {
      method: "DELETE",
    });
  },
};

// ========== RECEIPT API ==========
const receiptAPI = {
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
    console.log("📤 Receipt data nhận được:", receiptData);

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

    console.log("📤 Payload gửi lên server:", JSON.stringify(payload, null, 2));

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

  delete: async (id) => {
    return await apiCall(`/receipts/${id}`, {
      method: "DELETE",
    });
  },
};

// ========== EXPORT API ==========
const exportAPI = {
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
    console.log("📤 Export data nhận được:", exportData);

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

    console.log("📤 Payload gửi lên server:", JSON.stringify(payload, null, 2));

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

  delete: async (id) => {
    return await apiCall(`/exports/${id}`, {
      method: "DELETE",
    });
  },
};

// ========== APPROVAL API ==========
const approvalAPI = {
  createRequest: async (productData) => {
    return await apiCall("/approvals", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  },

  getMyRequests: async () => {
    const data = await apiCall("/approvals/my");
    return data.data || [];
  },

  getAllRequests: async (status = null) => {
    const url = status ? `/approvals?status=${status}` : "/approvals";
    const data = await apiCall(url);
    return data.data || [];
  },

  approve: async (id) => {
    return await apiCall(`/approvals/${id}/approve`, {
      method: "PUT",
    });
  },

  reject: async (id, reason) => {
    return await apiCall(`/approvals/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  },

  delete: async (id) => {
    return await apiCall(`/approvals/${id}`, {
      method: "DELETE",
    });
  },
};

// ========== DELETION API ==========
const deletionAPI = {
  createRequest: async (productId) => {
    return await apiCall("/deletions", {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
  },

  getAllRequests: async (status = null) => {
    const url = status ? `/deletions?status=${status}` : "/deletions";
    const data = await apiCall(url);
    return data.data || [];
  },

  getMyRequests: async () => {
    const data = await apiCall("/deletions/my");
    return data.data || [];
  },

  approve: async (id) => {
    return await apiCall(`/deletions/${id}/approve`, {
      method: "PUT",
    });
  },

  reject: async (id, reason) => {
    return await apiCall(`/deletions/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  },
};

// ========== EDIT API ==========
const editAPI = {
  createRequest: async (productId, updatedData) => {
    return await apiCall("/edits", {
      method: "POST",
      body: JSON.stringify({ productId, updatedData }),
    });
  },

  getAllRequests: async (status = null) => {
    const url = status ? `/edits?status=${status}` : "/edits";
    const data = await apiCall(url);
    return data.data || [];
  },

  getMyRequests: async () => {
    const data = await apiCall("/edits/my");
    return data.data || [];
  },

  approve: async (id) => {
    return await apiCall(`/edits/${id}/approve`, {
      method: "PUT",
    });
  },

  reject: async (id, reason) => {
    return await apiCall(`/edits/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  },
};

// ========== HISTORY API ==========
const historyAPI = {
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
};

// ========== NOTIFICATION API ==========
const notificationAPI = {
  getMyNotifications: async (limit = 20) => {
    const data = await apiCall(`/notifications?limit=${limit}`);
    return {
      notifications: data.data || [],
      unreadCount: data.unreadCount || 0,
    };
  },

  markAsRead: async (id) => {
    return await apiCall(`/notifications/${id}/read`, {
      method: "PUT",
    });
  },

  markAllAsRead: async () => {
    return await apiCall("/notifications/read-all", {
      method: "PUT",
    });
  },

  delete: async (id) => {
    return await apiCall(`/notifications/${id}`, {
      method: "DELETE",
    });
  },
};

// ========== FILE API ==========
const fileAPI = {
  upload: async (relatedType, relatedId, file) => {
    const formData = new FormData();
    formData.append("relatedType", relatedType);
    formData.append("relatedId", relatedId);
    formData.append("file", file);

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return await response.json();
  },

  getByRelated: async (relatedType, relatedId) => {
    const data = await apiCall(`/files/${relatedType}/${relatedId}`);
    return data.data || [];
  },

  delete: async (id) => {
    return await apiCall(`/files/${id}`, {
      method: "DELETE",
    });
  },

  getDownloadUrl: (id) => {
    return `${API_BASE_URL}/files/download/${id}?token=${getToken()}`;
  },
};

// Export tất cả
window.API = {
  auth: authAPI,
  inventory: inventoryAPI,
  receipt: receiptAPI,
  export: exportAPI,
  approval: approvalAPI,
  deletion: deletionAPI,
  edit: editAPI,
  history: historyAPI,
  notification: notificationAPI,
  file: fileAPI,
  getToken,
  setToken,
  removeToken,
  getCurrentUserFromToken,
};
