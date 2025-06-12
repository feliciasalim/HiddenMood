export const API_BASE_URL = 'https://capstone-himo.onrender.com';

const UNAUTHENTICATED_ENDPOINTS = [
  '/api/forgot-password/request',
  '/api/forgot-password/verify',
  '/api/forgot-password/reset'
];

export async function apiCall(endpoint, options = {}) {
  const baseUrl = API_BASE_URL; 
  const token = sessionStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(UNAUTHENTICATED_ENDPOINTS.includes(endpoint) ? {} : (token ? { 'Authorization': `Bearer ${token}` } : {})),
    ...(options.headers || {})
  };

  const url = `${baseUrl}${endpoint}`;

  try {
    console.log(`API Call: ${options.method || 'GET'} ${url}`); 

    const response = await fetch(url, {
      ...options,
      headers: headers
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text(); 
      } catch (e) {
        errorText = `Failed to read error response: ${e.message}`;
      }
      console.error(`API Call failed for ${endpoint}: HTTP ${response.status} - ${errorText}`);
      throw new Error(`HTTP ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      const responseText = await response.text();
      console.warn(`Non-JSON response for ${endpoint}:`, responseText);
      return responseText; 
    }

  } catch (error) {
    console.error('API Call failed for', endpoint, ':', error);
    throw error;
  }
}

export async function authenticatedApiCall(endpoint, options = {}) {
  const token = sessionStorage.getItem('token');

  if (!token) {
    throw new Error('No authentication token found. Please log in.');
  }

  const headers = {
    ...(options.headers || {}),
    'Authorization': `Bearer ${token}`
  };

  return apiCall(endpoint, { ...options, headers });
}

export async function testApiConnection() {
  try {
    console.log('Testing API connection...');
    const result = await apiCall('/api/test-db');
    console.log('API connection test successful:', result);
    return true;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
}

export async function checkServerHealth() {
  try {
    console.log('Checking server health...');
    const result = await apiCall('/');
    console.log('Server health check successful:', result);
    return true;
  } catch (error) {
    console.error('Server health check failed:', error);
    return false;
  }
}

export function isAuthenticated() {
  const token = sessionStorage.getItem('token');
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  return !!(token && isLoggedIn);
}

export function getCurrentUser() {
  const userStr = sessionStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function clearAuth() {
  sessionStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("token");
  console.log('Authentication cleared');
}