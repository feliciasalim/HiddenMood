import { apiCall } from '../config.js';

export function renderSignup() {
  fetch("views/signupView.html")
    .then((res) => res.text())
    .then((html) => {
      document.getElementById("app").innerHTML = html;
      attachSignupListeners();
    })
    .catch((error) => {
      console.error('Error loading signup view:', error);
      document.getElementById("app").innerHTML = '<p>Error loading signup page</p>';
    });
}

function attachSignupListeners() {
  const signupButton = document.getElementById("signupButton");
  const errorMessageDiv = document.getElementById("errorMessage");

  if (!signupButton || !errorMessageDiv) {
    console.error('Signup elements not found');
    return;
  }

  function showError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block';
  }

  function clearError() {
    errorMessageDiv.textContent = "";
    errorMessageDiv.style.display = 'none';
  }

  signupButton.addEventListener("click", async (e) => {
    e.preventDefault();
    clearError();

    const name = document.getElementById("signupName")?.value.trim();
    const email = document.getElementById("signupEmail")?.value.trim();
    const password = document.getElementById("signupPassword")?.value.trim();
    const confirmPassword = document.getElementById("signupConfirmPassword")?.value.trim();
    const termsAccepted = document.getElementById("termsCheckbox")?.checked;

    if (!name || !email || !password || !confirmPassword) {
      showError("Please fill in all fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    if (!termsAccepted) {
      showError("You must agree to the Terms & Privacy Policy.");
      return;
    }

    try {
      signupButton.disabled = true;
      signupButton.textContent = "Creating Account...";

      const data = await apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      clearError();
      
      if (window.loadView) {
        window.loadView('login');
      }

    } catch (error) {
      console.error('Registration error:', error);
      showError(error.message);
    } finally {
      signupButton.disabled = false;
      signupButton.textContent = "Sign Up";
    }
  });

  const loginLink = document.getElementById("loginLink");
  if (loginLink) {
    loginLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.loadView) {
        window.loadView('login');
      }
    });
  }
}