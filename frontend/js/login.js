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
      const result = await Auth.login(username, password);

      if (result.success) {
        // 🔥 Tất cả user đều vào role-panel.html
        window.location.href = "role-panel.html";
        return true;
      } else {
        showError(result.message || "Đăng nhập thất bại!");
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      showError(error.message || "Lỗi kết nối server!");
      return false;
    }
  }

  function setupFormSubmit() {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      await handleLogin(username, password);

      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng nhập';
    });
  }

  function checkExistingSession() {
    if (Auth.isLoggedIn()) {
      // Tất cả user vào role-panel
      window.location.href = "role-panel.html";
    }
  }

  function init() {
    checkExistingSession();
    setupFormSubmit();
    usernameInput.focus();
  }

  init();
})();
