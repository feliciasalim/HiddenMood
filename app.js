import { renderHome } from './presenters/homePresenter.js';
import { renderLogin } from './presenters/loginPresenter.js';
import { renderSignup } from './presenters/signupPresenter.js';
import { renderCurhat } from './presenters/curhatPresenter.js';
import { renderFeedback } from './presenters/feedbackPresenter.js';
import { renderDashboard } from './presenters/dashboardPresenter.js';
import { renderForgetPass } from './presenters/forgetPassPresenter.js';
import { renderArticles } from './presenters/articlesPresenter.js';
import { renderHistory } from './presenters/historyPresenter.js';
import { renderAccount } from './presenters/accountPresenter.js';

let isInitialLoad = true;

window.loadView = async function (view, section) {
    if (!view) {
        const hash = window.location.hash.substring(1);
        view = hash || (sessionStorage.getItem('isLoggedIn') === 'true' ? 'curhat' : 'home');
    }
    
    if (view !== 'home') {
        window.location.hash = view;
    } else {
        window.location.hash = '';
    }

    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    console.log(`Attempting to load view: ${view}`);
    console.log(`isLoggedIn: ${isLoggedIn}`);
    
    await window.updateNavbar();
    
    if (view === 'signup' || view === 'login' || view === 'forgetpassword' || view === 'terms' || view === 'privacy') {
        document.body.classList.add('no-navbar');
    } else {
        document.body.classList.remove('no-navbar');
    }
    
    if (view === 'signup' || view === 'login' || view === 'dashboard' || view === 'account' || view === 'history' || view === 'curhat' || view === 'feedback' || view === 'articles' || view === 'forgetpassword' || view === 'terms' || view === 'privacy') {
        document.body.classList.add('contact');
    } else {
        document.body.classList.remove('contact');
    }
    
    let renderFunction;
    switch (view) {
        case 'home':
            renderFunction = renderHome;
            break;
        case 'login':
            renderFunction = renderLogin;
            break;
        case 'signup':
            renderFunction = renderSignup;
            break;
        case 'articles':
            renderFunction = renderArticles;
            break;
        case 'curhat':
            renderFunction = isLoggedIn ? renderCurhat : renderLogin;
            break;
        case 'feedback':
            renderFunction = isLoggedIn ? renderFeedback : renderLogin;
            break;
        case 'dashboard':
            renderFunction = isLoggedIn ? renderDashboard : renderLogin;
            break;
        case 'history':
            renderFunction = isLoggedIn ? renderHistory : renderLogin;
            break;
        case 'account':
            renderFunction = renderAccount;
            break;
        case 'forgetpassword':
            renderFunction = renderForgetPass;
            break;
        case 'terms':
            renderFunction = renderTerms;
            break;
        case 'privacy':
            renderFunction = renderPrivacy;
            break;
        default:
            renderFunction = renderHome;
    }
    
    if (renderFunction) {
        try {
            await renderFunction(); 
            
            if (section) {
                setTimeout(() => {
                    const targetElement = document.getElementById(section);
                    if (targetElement) {
                        targetElement.scrollIntoView({ 
                            behavior: 'smooth',
                            block: 'start'
                        });
                    } else {
                        console.warn(`Section with id '${section}' not found`);
                    }
                }, 100);
            }
        } catch (error) {
            console.error(`Error rendering view ${view}:`, error);
            renderLogin();
        }
    } else {
        console.error(`No render function found for view ${view}`);
        renderHome();
    }
    
    if (isLoggedIn) {
        const cachedUser = window.getCurrentUser();
        if (cachedUser) {
            updateNavbarUI(cachedUser);
        }
    }
};

window.login = async function (userData, token) {
    sessionStorage.setItem('isLoggedIn', 'true');
    if (userData) {
        sessionStorage.setItem('user', JSON.stringify(userData));
    }
    if (token) {
        sessionStorage.setItem('token', token);
    }
    console.log('User logged in, isLoggedIn set to true');
    console.log('User data:', userData);
    
    await loadView('curhat');
};

window.addEventListener('hashchange', () => {
    if (!isInitialLoad) {
        const hash = window.location.hash.substring(1);
        loadView(hash);
    }
});

window.addEventListener('DOMContentLoaded', async () => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    console.log(`DOMContentLoaded: isLoggedIn = ${isLoggedIn}`);
    
    const hash = window.location.hash.substring(1);
    let initialView;
    
    if (hash) {
        initialView = hash;
    } else {
        initialView = isLoggedIn ? 'curhat' : 'home';
    }
    
    await loadView(initialView);
    isInitialLoad = false;
});

window.openInNewTab = function(view) {
    const newTab = window.open(window.location.origin + window.location.pathname + '#' + view, '_blank');
    
    if (newTab) {
        newTab.focus();
    }
};


function handleProfileImageDisplay(imageElement, userImage) {
    const defaultImage = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
    try {
        if (!userImage) {
            imageElement.src = defaultImage;
            return;
        }
        if (typeof userImage === 'string') {
            if (userImage.startsWith('http') || userImage.startsWith('data:image/')) {
                imageElement.src = userImage;
                return;
            }
            if (userImage.startsWith('\\x')) {
                try {
                    const hexString = userImage.substring(2);
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
        if (userImage && typeof userImage === 'object' && userImage.data) {
            const base64String = convertBinaryToBase64(userImage.data);
            if (base64String) {
                imageElement.src = base64String;
                return;
            }
        }
        imageElement.src = defaultImage;
        imageElement.onerror = () => {
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

window.updateNavbar = async function () {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) {
        console.error('Navbar container not found');
        return;
    }
    const isLoggedIn = window.isUserLoggedIn();
    const navbarFile = isLoggedIn ? 'views/navbarLogin.html' : 'views/navbarNotLogin.html';
    try {
        const response = await fetch(navbarFile);
        if (!response.ok) throw new Error(`Failed to load navbar: ${navbarFile}`);
        const html = await response.text();
        navbarContainer.innerHTML = html;
        const menuToggle = document.getElementById('menu-toggle');
        const navbarMenu = document.getElementById('navbar-menu');
        if (menuToggle && navbarMenu) {
            menuToggle.removeEventListener('click', window.toggleMobileMenu);
            window.toggleMobileMenu = () => {
                navbarMenu.classList.toggle('hidden');
            };
            menuToggle.addEventListener('click', window.toggleMobileMenu);
        }
        if (isLoggedIn) {
            const cachedUser = window.getCurrentUser();
            if (cachedUser) {
                updateNavbarUI(cachedUser);
            }
            fetchUserProfile().catch(console.error);
        }
    } catch (error) {
        console.error('Error updating navbar:', error);
    }
};

function updateNavbarUI(user) {
    if (!user) {
        console.warn("No user data provided to updateNavbarUI");
        return;
    }
    const profileImage = document.getElementById("profile-image");
    const dropdownUsername = document.getElementById("dropdown-username");
    const dropdownEmail = document.getElementById("dropdown-email");
    if (profileImage) {
        handleProfileImageDisplay(profileImage, user.img);
    }
    if (dropdownUsername) dropdownUsername.textContent = user.name || "User";
    if (dropdownEmail) dropdownEmail.textContent = user.email || "";
}

async function fetchUserProfile() {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    try {
        const profileResponse = await fetch('/api/profile', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (profileResponse.ok) {
            const result = await profileResponse.json();
            sessionStorage.setItem('user', JSON.stringify(result.user));
            updateNavbarUI(result.user);
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}



window.logout = function () {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    console.log('User logged out');
    window.updateNavbar();
    loadView('home');
};

window.getCurrentUser = function () {
    const userStr = sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

window.getAuthToken = function () {
    return sessionStorage.getItem('token');
};

window.isUserLoggedIn = function () {
    return sessionStorage.getItem('isLoggedIn') === 'true';
};

