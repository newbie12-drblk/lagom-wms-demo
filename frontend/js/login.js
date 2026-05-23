/**
 * ==================== LOGIN MODULE ====================
 * SỬA: Gọi API login
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
    }, 3000);
  }

  async function handleLogin(username, password) {
    if (!username || !password) {
      showError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
      return false;
    }

    const result = await Auth.login(username, password);

    if (result.success) {
      window.location.href = result.redirectUrl;
      return true;
    } else {
      showError(result.message);
      return false;
    }
  }

  function setupFormSubmit() {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      await handleLogin(username, password);
    });
  }

  function checkExistingSession() {
    if (Auth.isLoggedIn()) {
      const session = Auth.getCurrentSession();
      const redirectUrl =
        session.roleId === "admin" ? "admin.html" : "role-panel.html";
      window.location.href = redirectUrl;
    }
  }

  function init() {
    checkExistingSession();
    setupFormSubmit();
    usernameInput.focus();
  }

  init();
})();
