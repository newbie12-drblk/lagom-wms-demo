/**
 * ==================== LOGIN MODULE ====================
 */

(function () {
  "use strict";

  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const errorMessage = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");

  function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.add("show");
    setTimeout(() => {
      errorMessage.classList.remove("show");
    }, 5000);
  }

  async function handleLogin(username, password) {
    if (!username || !password) {
      showError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
      return false;
    }

    try {
      console.log("🔑 Đang đăng nhập với:", { username, password });

      // Gọi API login - PHẢI LÀ POST
      const response = await fetch(
        "https://lagom-wms-demo.onrender.com/api/auth/login",
        {
          method: "POST", // 👈 QUAN TRỌNG: PHẢI LÀ POST
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        },
      );

      console.log("📥 Response status:", response.status);

      const data = await response.json();
      console.log("📥 Response data:", data);

      if (response.ok && data.success) {
        // Lưu token
        localStorage.setItem("lagom_token", data.token);

        // Lưu session
        const session = {
          userId: data.user.id,
          username: data.user.username,
          fullName: data.user.fullName,
          email: data.user.email,
          roleId: data.user.roleId,
          loginAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        };
        localStorage.setItem("lagom_session", JSON.stringify(session));

        // Chuyển hướng
        window.location.href = data.redirectUrl || "role-panel.html";
        return true;
      } else {
        showError(data.message || "Đăng nhập thất bại!");
        return false;
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      showError(error.message || "Lỗi kết nối server!");
      return false;
    }
  }

  function setupFormSubmit() {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Disable button để tránh spam
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      await handleLogin(username, password);

      // Enable lại button
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng nhập';
    });
  }

  function checkExistingSession() {
    if (Auth.isLoggedIn()) {
      const session = Auth.getCurrentSession();
      let redirectUrl = "role-panel.html";

      if (session.roleId === "admin") {
        redirectUrl = "admin.html";
      } else if (session.roleId === "quan_ly") {
        redirectUrl = "manager.html";
      }

      window.location.href = redirectUrl;
    }
  }

  function init() {
    checkExistingSession();
    setupFormSubmit();
    usernameInput.focus();
    console.log("✅ Login page initialized");
  }

  init();
})();
