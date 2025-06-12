export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

// List of endpoints that do not require authentication
const UNAUTHENTICATED_ENDPOINTS = [
  '/api/forgot-password/request',
  '/api/forgot-password/verify',
  '/api/forgot-password/reset',
  '/api/auth/login', // Added to support login without token
  '/api/auth/register' // Added if you have a registration endpoint
];

// Generic API call function
export async function apiCall(endpoint, options = {}) {
  const baseUrl = API_BASE_URL; // Use the defined constant
  const token = sessionStorage.getItem('token');

  // Conditionally add token only if the endpoint requires authentication
  const headers = {
    'Content-Type': 'application/json',
    ...(UNAUTHENTICATED_ENDPOINTS.includes(endpoint) ? {} : (token ? { 'Authorization': `Bearer ${token}` } : {})),
    ...(options.headers || {}) // Merge any additional headers
  };

  const url = `${baseUrl}${endpoint}`; // Construct the full URL

  try {
    console.log(`API Call: ${options.method || 'GET'} ${url}`); // Log the request

    const response = await fetch(url, {
      ...options,
      headers: headers
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text(); // Attempt to read error message
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
      return responseText; // Or handle as needed
    }

  } catch (error) {
    console.error('API Call failed for', endpoint, ':', error);
    throw error;
  }
}

// Authenticated API call - explicitly requires token
export async function authenticatedApiCall(endpoint, options = {}) {
  const token = sessionStorage.getItem('token');

  if (!token) {
    throw new Error('No authentication token found. Please log in.');
  }

  // Add the token to the headers if not already present
  const headers = {
    ...(options.headers || {}),
    'Authorization': `Bearer ${token}`
  };

  return apiCall(endpoint, { ...options, headers });
}

// Add a utility function to test the API connection
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

// Add a utility function to check server health
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

// Utility function to check if user is authenticated
export function isAuthenticated() {
  const token = sessionStorage.getItem('token');
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  return !!(token && isLoggedIn);
}

// Utility function to get current user info
export function getCurrentUser() {
  const userStr = sessionStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Utility function to clear authentication
export function clearAuth() {
  sessionStorage.removeItem("isLoggedIn");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("token");
  console.log('Authentication cleared');
}