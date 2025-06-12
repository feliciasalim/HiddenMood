import { apiCall } from '../config.js';

export function renderLogin() {
  fetch("views/loginView.html")
    .then((res) => res.text())
    .then((html) => {
      document.getElementById("app").innerHTML = html;
      attachLoginListeners();
    })
    .catch((error) => {
      console.error('Error loading login view:', error);
      document.getElementById("app").innerHTML = '<p>Error loading login page</p>';
    });
}

function attachLoginListeners() {
  const loginButton = document.getElementById("loginButton");
  const errorMessageDiv = document.getElementById("errorMessage");

  if (!loginButton || !errorMessageDiv) {
    console.error('Login elements not found');
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

  loginButton.addEventListener("click", async (e) => {
    e.preventDefault();
    clearError();

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value.trim();

    if (!email || !password) {
      showError("Please fill in all fields.");
      return;
    }

    try {
      loginButton.disabled = true;
      loginButton.textContent = "Logging in...";

      const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.token && data.user) {
        if (window.login) {
          window.login(data.user, data.token);
        }

        await fetchUserProfile();

        await window.updateNavbar();

        window.loadView('dashboard');
      }

      clearError();
    } catch (error) {
      console.error('Login error:', error);
      showError(error.message);
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Log In";
    }
  });

  const signupLink = document.getElementById("signupLink");
  if (signupLink) {
    signupLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.loadView) {
        window.loadView('signup');
      }
    });
  }

  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.loadView) {
        window.loadView('forgetpassword');
      }
    });
  }
}

async function fetchUserProfile() {
  const token = sessionStorage.getItem('token');
  if (!token) {
    console.warn('No token found, skipping profile fetch');
    return;
  }

  try {
    const profileResponse = await apiCall('/api/auth/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (profileResponse.user) {
      const user = profileResponse.user;
      sessionStorage.setItem('user', JSON.stringify(user));
      updateNavbarUI(user);
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    const cachedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (cachedUser) {
      updateNavbarUI(cachedUser);
    }
  }
}

function handleProfileImageDisplay(imageElement, user) {
  const defaultImage = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';

  try {
    if (!user?.img) {
      imageElement.src = defaultImage;
      return;
    }

    if (typeof user.img === 'string') {
      if (user.img.startsWith('http') || user.img.startsWith('data:image/')) {
        imageElement.src = user.img;
        return;
      }

      if (user.img.startsWith('\\x')) {
        try {
          const hexString = user.img.substring(2);
          const url = hexString.match(/.{2}/g)?.map(hex => String.fromCharCode(parseInt(hex, 16))).join('') || '';
          if (url.startsWith('http')) {
            imageElement.src = url;
            return;
          }
        } catch (hexError) {
          console.error('Error decoding hex string:', hexError);
        }
      }
    }

    if (user.img && typeof user.img === 'object' && user.img.data) {
      const base64String = convertBinaryToBase64(user.img.data);
      if (base64String) {
        imageElement.src = base64String;
        return;
      }
    }

    imageElement.src = defaultImage;
    imageElement.onerror = () => {
      console.warn('Failed to load profile image, using default');
      imageElement.src = defaultImage;
      imageElement.onerror = null;
    };
  } catch (error) {
    console.error('Error displaying profile image:', error);
    imageElement.src = defaultImage;
  }
}

function convertBinaryToBase64(binaryData) {
  try {
    if (!binaryData) return null;

    let binary = '';
    let bytes;

    if (binaryData instanceof ArrayBuffer) {
      bytes = new Uint8Array(binaryData);
    } else if (binaryData instanceof Uint8Array) {
      bytes = binaryData;
    } else if (Array.isArray(binaryData)) {
      bytes = new Uint8Array(binaryData);
    } else {
      console.warn('Unknown binary data format:', typeof binaryData);
      return null;
    }

    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, chunk);
    }

    return 'data:image/jpeg;base64,' + btoa(binary);
  } catch (error) {
    console.error('Error converting binary to base64:', error);
    return null;
  }
}

function updateNavbarUI(user) {
  if (!user) {
    console.warn('No user data provided to updateNavbarUI');
    return;
  }

  const profileImage = document.getElementById('profile-image');
  const dropdownUsername = document.getElementById('dropdown-username');
  const dropdownEmail = document.getElementById('dropdown-email');

  if (profileImage) {
    handleProfileImageDisplay(profileImage, user);
  }
  if (dropdownUsername) {
    dropdownUsername.textContent = user.name || 'User';
  }
  if (dropdownEmail) {
    dropdownEmail.textContent = user.email || '';
  }
}