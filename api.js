import authService from './auth-service.js';

const API_ENDPOINT = 'https://nv01uveape.execute-api.us-east-1.amazonaws.com/prod';

// Helper function to make authenticated API requests
async function fetchWithAuth(endpoint, options = {}) {
  // Check authentication status
  const isAuthenticated = await authService.isAuthenticated();
  
  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    window.location.href = 'dashboard/login.html';
    return Promise.reject('Not authenticated');
  }
  
  // Get token from local storage
  const token = localStorage.getItem('auth_token');
  
  // Add authentication header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Add x-api-key header if needed
  const apiKey = localStorage.getItem('api_key');
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  
  try {
    // Make the API request
    const response = await fetch(`${API_ENDPOINT}${endpoint}`, {
      ...options,
      headers
    });
    
    // Handle token expiration
    if (response.status === 401) {
      try {
        // Try to refresh token
        await authService.refreshTokens();
        
        // Retry the request with new token
        return fetchWithAuth(endpoint, options);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        console.error('Token refresh failed:', refreshError);
        authService.signOut();
        window.location.href = 'dashboard/login.html';
        return Promise.reject('Authentication failed');
      }
    }
    
    // Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Promise.reject({
        status: response.status,
        message: errorData.message || 'API request failed',
        ...errorData
      });
    }
    
    // Return response data
    return response.json();
  } catch (error) {
    console.error('API request error:', error);
    return Promise.reject({
      message: 'Network error or server unavailable',
      originalError: error
    });
  }
}

// API methods for Leads
export const LeadsAPI = {
  // Get all leads
  getLeads: () => fetchWithAuth('/leads'),
  
  // Create new lead
  createLead: (leadData) => fetchWithAuth('/leads', {
    method: 'POST',
    body: JSON.stringify(leadData)
  }),
  
  // Update lead
  updateLead: (leadId, leadData) => fetchWithAuth(`/leads/${leadId}`, {
    method: 'PUT',
    body: JSON.stringify(leadData)
  }),
  
  // Update lead disposition
  updateDisposition: (leadId, disposition, notes) => fetchWithAuth(`/leads/${leadId}/disposition`, {
    method: 'PUT',
    body: JSON.stringify({ disposition, notes })
  }),
  
  // Export leads
  exportLeads: (filters) => fetchWithAuth('/export', {
    method: 'POST',
    body: JSON.stringify(filters)
  })
};

// API methods for Users
export const UsersAPI = {
  // Get all users (admin only)
  getUsers: () => fetchWithAuth('/auth/users'),
  
  // Create new user (admin only)
  createUser: (userData) => fetchWithAuth('/auth/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  
  // Update user (admin only)
  updateUser: (username, userData) => fetchWithAuth(`/auth/users/${username}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  }),
  
  // Change user password (admin only)
  changePassword: (username, password) => fetchWithAuth(`/auth/users/${username}/password`, {
    method: 'POST',
    body: JSON.stringify({ password })
  })
};

export default {
  fetchWithAuth,
  LeadsAPI,
  UsersAPI
}; 