import { apiCall } from "../config.js";

export function renderForgetPass() {
  return fetch('views/forgetPasswordView.html')
    .then(res => {
      if (!res.ok) throw new Error("Failed to load forget password view");
      return res.text();
    })
    .then(html => {
      document.getElementById('app').innerHTML = html;
      setupEventListeners();
    })
    .catch(error => {
      console.error("Error loading forget password view:", error);
      showError("Failed to load page");
    });
}

function setupEventListeners() {
  const sendCodeBtn = document.getElementById("send-code-btn");
  const verifyCodeBtn = document.getElementById("verify-code-btn");
  const resetPasswordBtn = document.getElementById("reset-password-btn");
  const backToLoginLink = document.getElementById("back-to-login");

  if (sendCodeBtn) {
    sendCodeBtn.addEventListener("click", (e) => handleSendCode(e, sendCodeBtn));
  } else {
    console.error("sendCodeBtn not found in DOM");
  }
  if (verifyCodeBtn) {
    verifyCodeBtn.addEventListener("click", (e) => handleVerifyCode(e, verifyCodeBtn));
  } else {
    console.error("verifyCodeBtn not found in DOM");
  }
  if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener("click", (e) => handleResetPassword(e, resetPasswordBtn));
  } else {
    console.error("resetPasswordBtn not found in DOM");
  }
  if (backToLoginLink) {
    backToLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.loadView("login");
    });
  } else {
    console.error("backToLoginLink not found in DOM");
  }
}

async function handleSendCode(event, button) {
  event.preventDefault(); // Prevent default form submission if applicable
  const emailInput = document.getElementById("loginEmail");
  const email = emailInput?.value.trim();
  clearErrors();

  console.log("handleSendCode started with email:", email);

  if (!email) {
    showError("email-error", "Email is required");
    alert("Error: Email is required");
    return;
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    showError("email-error", "Invalid email format");
    alert("Error: Invalid email format");
    return;
  }

  if (!button) {
    console.error("Button reference is undefined in handleSendCode");
    showError("email-error", "Internal error: Button not found");
    alert("Error: Internal error - Button not found");
    return;
  }

  showLoading(true, button);
  console.log("Sending request to /api/forgot-password/request with email:", email);

  try {
    const response = await apiCall("/api/forgot-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    console.log("API response received:", response);

    if (!response.message) {
      throw new Error("Invalid response from server");
    }

    toggleStage("code-stage");
    showSuccess("Verification code sent to your email");
    alert("Success: Verification code sent to your email!");
  } catch (error) {
    console.error("API call failed:", error);
    showError("email-error", error.message || "Failed to send code");
    alert(`Error: Failed to send code - ${error.message || "Unknown error"}`);
  } finally {
    showLoading(false, button);
    console.log("handleSendCode completed");
  }
}

async function handleVerifyCode(event, button) {
  event.preventDefault();
  const email = document.getElementById("loginEmail")?.value.trim();
  const codeInput = document.getElementById("verificationCode");
  const code = codeInput?.value.trim();
  clearErrors();

  if (!code) {
    showError("code-error", "Code is required");
    return;
  }

  if (!/^\d{6}$/.test(code)) {
    showError("code-error", "Code must be a 6-digit number");
    return;
  }

  if (!button) {
    console.error("Button reference is undefined in handleVerifyCode");
    showError("code-error", "Internal error: Button not found");
    return;
  }

  showLoading(true, button);

  try {
    const response = await apiCall("/api/forgot-password/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    if (!response.message) {
      throw new Error("Invalid response from server");
    }

    toggleStage("password-stage");
    showSuccess("Code verified successfully");
  } catch (error) {
    showError("code-error", error.message || "Invalid or expired code");
  } finally {
    showLoading(false, button);
  }
}

async function handleResetPassword(event, button) {
  event.preventDefault();
  const email = document.getElementById("loginEmail")?.value.trim();
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const newPassword = newPasswordInput?.value;
  const confirmPassword = confirmPasswordInput?.value;
  clearErrors();

  if (!newPassword || !confirmPassword) {
    if (!newPassword) showError("new-password-error", "New password is required");
    if (!confirmPassword) showError("confirm-password-error", "Confirm password is required");
    return;
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    showError("new-password-error", passwordValidation.message);
    return;
  }

  if (newPassword !== confirmPassword) {
    showError("confirm-password-error", "Passwords do not match");
    return;
  }

  if (!button) {
    console.error("Button reference is undefined in handleResetPassword");
    showError("new-password-error", "Internal error: Button not found");
    return;
  }

  showLoading(true, button);

  try {
    const response = await apiCall("/api/forgot-password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword }),
    });

    if (!response.message) {
      throw new Error("Invalid response from server");
    }

    showSuccess("Password reset successfully! Redirecting to login...");
    setTimeout(() => window.loadView("login"), 2000);
  } catch (error) {
    showError("new-password-error", error.message || "Failed to reset password");
  } finally {
    showLoading(false, button);
  }
}

function validatePassword(password) {
  const minLength = 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength || !(hasLetter && hasNumber && hasSymbol)) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long and include a mix of letters, numbers, and symbols.",
    };
  }
  return { isValid: true, message: "" };
}

function toggleStage(stageId) {
  const stages = ["email-stage", "code-stage", "password-stage"];
  stages.forEach(id => {
    const stage = document.getElementById(id);
    if (stage) stage.classList.add("hidden");
  });
  const activeStage = document.getElementById(stageId);
  if (activeStage) activeStage.classList.remove("hidden");
}

function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
  }
}

function clearErrors() {
  const errorElements = document.querySelectorAll("[id$='-error']");
  errorElements.forEach(el => {
    el.textContent = "";
    el.classList.add("hidden");
  });
}

function showSuccess(message) {
  clearErrors();
  const emailError = document.getElementById("email-error");
  if (emailError) {
    emailError.textContent = message;
    emailError.classList.remove("hidden", "text-red-600");
    emailError.classList.add("text-green-600");
  }
}

function showLoading(isLoading, button) {
  if (isLoading) {
    button.disabled = true;
    button.textContent = "Processing...";
  } else {
    button.disabled = false;
    button.textContent = button.id === "send-code-btn" ? "Send Code" : 
                         button.id === "verify-code-btn" ? "Verify Code" : "Reset Password";
  }
}