/**
 * MVA CRM API Service
 * Centralized API communication layer for all backend endpoints
 * Base URL: https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod
 */

class MVACRMAPIService {
  constructor() {
    this.baseURL = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      },
      ...options
    };

    // Add authentication headers
    this.addAuthHeaders(config.headers);

    try {
      console.log(`🌐 API Request: ${config.method || 'GET'} ${endpoint}`);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Response: ${endpoint}`, data);
      return data;
    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Add authentication headers based on user type
   */
  addAuthHeaders(headers) {
    // Try JWT token first (for admin/agent users) - Updated to new localStorage keys
    const accessToken = localStorage.getItem('mva_token') || localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      return;
    }

    // Try API key for vendor users
    const apiKey = localStorage.getItem('vendor_api_key');
    if (apiKey) {
      headers['x-api-key'] = apiKey;
      return;
    }
  }

  /**
   * Get current user info from localStorage or JWT token
   */
  getCurrentUser() {
    try {
      // First try new JWT token approach
      const token = localStorage.getItem('mva_token');
      if (token) {
        return this.getUserFromToken(token);
      }

      // Fallback to old localStorage approach
      const userStr = localStorage.getItem('mva_user') || localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Extract user info from JWT token
   */
  getUserFromToken(token) {
    try {
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        user_id: payload.user_id,
        email: payload.email,
        role: payload.role,
        vendor_code: payload.vendor_code,
        username: payload.username || payload.email
      };
    } catch (error) {
      console.error('Invalid JWT token:', error);
      return null;
    }
  }

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  /**
   * User login
   */
  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  /**
   * Register new user (Admin only)
   */
  async registerUser(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  /**
   * Get all users (Admin only)
   */
  async getUsers() {
    return this.request('/auth/users');
  }

  /**
   * Get specific user (Admin only)
   */
  async getUser(username) {
    return this.request(`/auth/users/${username}`);
  }

  /**
   * Update user (Admin only)
   */
  async updateUser(username, updates) {
    return this.request(`/auth/users/${username}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Forgot password
   */
  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  /**
   * Confirm forgot password
   */
  async confirmForgotPassword(email, confirmationCode, newPassword) {
    return this.request('/auth/confirm-forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, confirmationCode, newPassword })
    });
  }

  /**
   * Change password
   */
  async changePassword(username, oldPassword, newPassword) {
    return this.request(`/auth/users/${username}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  }

  /**
   * Force logout all users (Admin only)
   */
  async forceLogoutAll() {
    return this.request('/admin/force-logout-all', {
      method: 'POST'
    });
  }

  // ============================================================================
  // LEAD MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * Create new lead
   */
  async createLead(leadData) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
  }

  /**
   * Get leads with optional filtering
   */
  async getLeads(vendorCode = null, filters = {}) {
    const params = new URLSearchParams(filters);
    if (vendorCode) params.set('vendor_code', vendorCode);
    
    const query = params.toString();
    const endpoint = query ? `/leads?${query}` : '/leads';
    
    return this.request(endpoint);
  }

  /**
   * Get single lead
   */
  async getLead(leadId) {
    return this.request(`/leads/${leadId}`);
  }

  /**
   * Update lead
   */
  async updateLead(leadId, updates) {
    return this.request(`/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Send retainer agreement via DocuSign
   */
  async sendRetainer(leadId, options = {}) {
    return this.request(`/leads/${leadId}/send-retainer`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  /**
   * Get lead statistics
   */
  async getLeadStats(period = 'all', vendorCode = null) {
    const params = new URLSearchParams({ period });
    if (vendorCode) params.set('vendor_code', vendorCode);
    
    return this.request(`/stats?${params.toString()}`);
  }

  /**
   * Export leads data
   */
  async exportLeads(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/export?${params.toString()}`);
  }

  // ============================================================================
  // VENDOR MANAGEMENT ENDPOINTS  
  // ============================================================================

  /**
   * Get all vendors (Admin only)
   */
  async getVendors() {
    return this.request('/vendors');
  }

  /**
   * Get all vendors (Admin only)
   */
  async getVendors(queryParams = {}) {
    const searchParams = new URLSearchParams(queryParams);
    const endpoint = searchParams.toString() ? `/vendors?${searchParams}` : '/vendors';
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * Get specific vendor by ID (Admin only)
   */
  async getVendor(vendorId) {
    return this.request(`/vendors/${vendorId}`, { method: 'GET' });
  }

  /**
   * Create new vendor (Admin only)
   */
  async createVendor(vendorData) {
    return this.request('/vendors', {
      method: 'POST',
      body: JSON.stringify(vendorData)
    });
  }

  /**
   * Update vendor (Admin only)
   */
  async updateVendor(vendorId, vendorData) {
    return this.request(`/vendors/${vendorId}`, {
      method: 'PUT',
      body: JSON.stringify(vendorData)
    });
  }

  /**
   * Delete vendor (Admin only)
   */
  async deleteVendor(vendorId) {
    return this.request(`/vendors/${vendorId}`, { method: 'DELETE' });
  }

  /**
   * Bulk update vendors (Admin only)
   */
  async bulkUpdateVendors(vendorIds, updates) {
    return this.request('/vendors/bulk-update', {
      method: 'POST',
      body: JSON.stringify({
        vendor_ids: vendorIds,
        updates: updates
      })
    });
  }

  /**
   * Regenerate vendor API key (Admin only)
   */
  async regenerateVendorApiKey(vendorId) {
    return this.request(`/vendors/${vendorId}/api-key`, { method: 'PUT' });
  }

  /**
   * Regenerate vendor API key (Admin only)
   */
  async regenerateApiKey(vendorCode) {
    return this.request(`/vendors/${vendorCode}/regenerate-key`, {
      method: 'POST'
    });
  }

  // ============================================================================
  // ADMIN ANALYTICS ENDPOINTS
  // ============================================================================

  /**
   * Get dashboard analytics (Admin only)
   */
  async getDashboardAnalytics() {
    return this.request('/admin/analytics/dashboard');
  }

  /**
   * Get performance metrics (Admin only)
   */
  async getPerformanceMetrics(days = 30, vendorCode = null) {
    const params = new URLSearchParams({ days: days.toString() });
    if (vendorCode) params.set('vendor_code', vendorCode);
    
    return this.request(`/admin/analytics/performance?${params.toString()}`);
  }

  /**
   * Generate reports (Admin only)
   */
  async generateReport(reportConfig) {
    return this.request('/admin/reports/generate', {
      method: 'POST',
      body: JSON.stringify(reportConfig)
    });
  }

  /**
   * Create vendor account (Admin only)
   */
  async createVendorAccount(vendorInfo) {
    return this.request('/admin/vendors/create', {
      method: 'POST',
      body: JSON.stringify(vendorInfo)
    });
  }

  // ============================================================================
  // VENDOR DASHBOARD ENDPOINTS
  // ============================================================================

  /**
   * Get vendor dashboard data
   */
  async getVendorDashboard() {
    return this.request('/vendor/dashboard');
  }

  /**
   * Get vendor leads
   */
  async getVendorLeads(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/vendor/leads?${params.toString()}`);
  }

  /**
   * Get vendor analytics
   */
  async getVendorAnalytics(period = 30) {
    return this.request(`/vendor/analytics?period=${period}`);
  }

  /**
   * Get vendor performance metrics
   */
  async getVendorPerformance() {
    return this.request('/vendor/performance');
  }

  /**
   * Update vendor profile
   */
  async updateVendorProfile(profileData) {
    return this.request('/vendor/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  // ============================================================================
  // AGENT ANALYTICS ENDPOINTS
  // ============================================================================

  /**
   * Get agent KPIs
   */
  async getAgentKPIs(period = 30) {
    return this.request(`/agent/analytics/kpis?period=${period}`);
  }

  /**
   * Get agent goals
   */
  async getAgentGoals() {
    return this.request('/agent/goals');
  }

  /**
   * Create agent goal
   */
  async createAgentGoal(goalData) {
    return this.request('/agent/goals', {
      method: 'POST',
      body: JSON.stringify(goalData)
    });
  }

  /**
   * Update agent goal
   */
  async updateAgentGoal(goalData) {
    return this.request('/agent/goals', {
      method: 'PUT',
      body: JSON.stringify(goalData)
    });
  }

  /**
   * Get agent conversion funnel
   */
  async getAgentConversionFunnel(period = 30) {
    return this.request(`/agent/analytics/funnel?period=${period}`);
  }

  /**
   * Get agent lead sources
   */
  async getAgentLeadSources(period = 30) {
    return this.request(`/agent/analytics/lead-sources?period=${period}`);
  }

  /**
   * Get agent revenue trends
   */
  async getAgentRevenueTrends(period = 90) {
    return this.request(`/agent/analytics/revenue-trends?period=${period}`);
  }

  /**
   * Get agent activities
   */
  async getAgentActivities(limit = 50) {
    return this.request(`/agent/analytics/activities?limit=${limit}`);
  }

  // ============================================================================
  // DOCUMENT MANAGEMENT ENDPOINTS (Phase 3)
  // ============================================================================

  /**
   * Search documents
   */
  async searchDocuments(searchCriteria) {
    return this.request('/documents/search', {
      method: 'POST',
      body: JSON.stringify(searchCriteria)
    });
  }

  /**
   * Get document analytics
   */
  async getDocumentAnalytics(timeframe = '30d', groupBy = 'day') {
    return this.request(`/documents/analytics?timeframe=${timeframe}&groupBy=${groupBy}`);
  }

  /**
   * Get recent documents
   */
  async getRecentDocuments(type = 'uploaded', limit = 20, days = 7) {
    return this.request(`/documents/recent?type=${type}&limit=${limit}&days=${days}`);
  }

  /**
   * Share document
   */
  async shareDocument(documentId, shareOptions) {
    return this.request(`/documents/${documentId}/share`, {
      method: 'POST',
      body: JSON.stringify(shareOptions)
    });
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(documentId, updates) {
    return this.request(`/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Get document metadata
   */
  async getDocumentMetadata(documentId) {
    return this.request(`/documents/${documentId}`);
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId) {
    return this.request(`/documents/${documentId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get lead documents
   */
  async getLeadDocuments(leadId) {
    return this.request(`/leads/${leadId}/documents`);
  }

  /**
   * Upload document to lead
   */
  async uploadDocument(leadId, formData) {
    // Remove Content-Type header for FormData
    const headers = { ...this.defaultHeaders };
    delete headers['Content-Type'];
    this.addAuthHeaders(headers);

    const response = await fetch(`${this.baseURL}/leads/${leadId}/documents`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Upload failed');
    }

    return await response.json();
  }

  /**
   * Download document
   */
  async downloadDocument(documentId) {
    const data = await this.request(`/documents/${documentId}/download`);
    return data.downloadUrl;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    const apiKey = localStorage.getItem('vendor_api_key');
    return !!(token || apiKey);
  }

  /**
   * Get user role
   */
  getUserRole() {
    const user = this.getCurrentUser();
    if (!user) return null;
    
    return user['custom:role'] || user.role || 'agent';
  }

  /**
   * Check if current user is admin
   */
  isAdmin() {
    return this.getUserRole() === 'admin';
  }

  /**
   * Check if current user is agent
   */
  isAgent() {
    return this.getUserRole() === 'agent';
  }

  /**
   * Check if current user is vendor
   */
  isVendor() {
    return this.getUserRole() === 'vendor' || !!localStorage.getItem('vendor_api_key');
  }

  /**
   * Logout user
   */
  logout() {
    // Clear all auth data
    const authKeys = ['auth_token', 'user', 'accessToken', 'idToken', 'refreshToken', 'vendor_api_key'];
    authKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear session storage
    const sessionKeys = ['cognitoUser', 'userEmail', 'userAttributes'];
    sessionKeys.forEach(key => sessionStorage.removeItem(key));
    
    // Redirect to login
    window.location.href = 'login.html';
  }

  // ============================================================================
  // ERROR HANDLING HELPERS
  // ============================================================================

  /**
   * Handle API errors with user-friendly messages
   */
  handleError(error, context = '') {
    console.error(`API Error in ${context}:`, error);
    
    // Common error mappings
    const errorMap = {
      'Authentication required': 'Please log in to continue.',
      'Invalid API key': 'Your session has expired. Please log in again.',
      'Admin access required': 'You do not have permission to perform this action.',
      'Agent access required': 'This feature is only available to agents.',
      'Validation failed': 'Please check your input and try again.',
      'User with this email already exists': 'A user with this email already exists.',
      'A lead with this email already exists': 'A lead with this email already exists.',
      'A lead with this phone number already exists': 'A lead with this phone number already exists.'
    };

    return errorMap[error.message] || error.message || 'An unexpected error occurred.';
  }
}

// Create global instance
window.apiService = new MVACRMAPIService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MVACRMAPIService;
} 