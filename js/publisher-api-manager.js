/**
 * Production Publisher Manager 
 * Uses proper authentication without localStorage
 */
class ProductionPublisherManager {
  constructor() {
    // Try multiple auth service options for compatibility
    const rawAuthService = window.prodAuth || window.apiService || null;
    
    // Create compatibility wrapper for legacy API service
    if (rawAuthService && !rawAuthService.apiRequest && rawAuthService.request) {
      this.authService = {
        ...rawAuthService,
        // Map legacy methods to expected interface
        apiRequest: (endpoint, options = {}) => rawAuthService.request(endpoint, options),
        isAuthenticated: () => rawAuthService.isAuthenticated(),
        isAdmin: () => rawAuthService.isAdmin(),
        logout: () => rawAuthService.logout()
      };
      console.log('🔧 Created compatibility wrapper for legacy API service');
    } else {
      this.authService = rawAuthService;
    }
    
    this.selectedPublishers = new Set();
    this.currentPublishers = [];
    this.pagination = { hasMore: false, lastKey: null };
    this.filters = { status: '', search: '', limit: 50 };
  }

  /**
   * Initialize with proper authentication check
   */
  async initialize() {
    try {
      console.log('🏢 Initializing Production Publisher Manager...');
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Check authentication (from memory, not localStorage)
      if (this.authService && this.authService.isAuthenticated() && this.authService.isAdmin()) {
        console.log('✅ Admin authenticated, loading publishers...');
        await this.refreshPublishers();
      } else if (this.authService && this.authService.isAuthenticated()) {
        console.log('⚠️ User authenticated but not admin');
        this.showError('Admin access required for publisher management');
      } else {
        console.log('⚠️ User not authenticated');
        this.showInfo('Please log in to view publishers');
        this.renderEmptyState();
      }
      
      console.log('✅ Production Publisher Manager initialized');
    } catch (error) {
      console.error('❌ Error initializing Publisher Manager:', error);
      this.showError('Failed to initialize publisher management system');
    }
  }

  /**
   * Load publishers using production API
   */
  async loadPublishers(resetPagination = true) {
    try {
      if (resetPagination) {
        this.pagination.lastKey = null;
      }

      const queryParams = new URLSearchParams({
        limit: this.filters.limit.toString()
      });

      if (this.filters.status && this.filters.status !== 'all') {
        queryParams.set('status', this.filters.status);
      }

      if (this.filters.search) {
        queryParams.set('search', this.filters.search);
      }

      if (this.pagination.lastKey) {
        queryParams.set('lastKey', this.pagination.lastKey);
      }

      const endpoint = `/vendors?${queryParams.toString()}`;
      console.log('📡 Loading publishers from:', endpoint);

      // Use production auth service for API call
      if (!this.authService || !this.authService.apiRequest) {
        throw new Error('Authentication service not available');
      }
      
      const response = await this.authService.apiRequest(endpoint);
      
      // Handle both array response and object response formats
      let vendors, pagination;
      
      if (Array.isArray(response)) {
        // Backend returns plain array (current format)
        vendors = response;
        pagination = { hasMore: false, lastKey: null };
      } else if (response.vendors) {
        // Backend returns object with vendors property (future format)
        vendors = response.vendors;
        pagination = response.pagination || { hasMore: false, lastKey: null };
      } else {
        throw new Error('Invalid response format from API');
      }
      
      if (resetPagination) {
        this.currentPublishers = vendors;
      } else {
        this.currentPublishers = [...this.currentPublishers, ...vendors];
      }

      this.pagination = pagination;
      
      console.log(`📊 Loaded ${vendors.length} publishers. Total: ${this.currentPublishers.length}`);
      return vendors;
    } catch (error) {
      console.error('❌ Error loading publishers:', error);
      
      if (error.message.includes('Not authenticated')) {
        this.showError('Session expired. Please log in again.');
        if (this.authService && this.authService.logout) {
          this.authService.logout();
        }
      } else {
        this.showError(`Failed to load publishers: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Create a new publisher
   */
  async createPublisher(publisherData) {
    try {
      console.log('🏢 Creating publisher:', publisherData);
      
      if (!this.authService || !this.authService.apiRequest) {
        throw new Error('Authentication service not available');
      }

      // Validate required fields
      if (!publisherData.name || !publisherData.email) {
        throw new Error('Publisher name and email are required');
      }

      const response = await this.authService.apiRequest('/vendors', {
        method: 'POST',
        body: publisherData
      });

      console.log('✅ Publisher created successfully:', response);
      
      // Refresh publishers list
      await this.refreshPublishers();
      
      return response;
    } catch (error) {
      console.error('❌ Error creating publisher:', error);
      throw error;
    }
  }

  /**
   * Render empty state when not authenticated
   */
  renderEmptyState() {
    const tbody = document.getElementById('publishers-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 2rem;">
            <div style="color: #9CA3AF;">
              <h3>Please log in to view publishers</h3>
              <p>Admin access required for publisher management</p>
            </div>
          </td>
        </tr>
      `;
    }
    this.updatePublisherStats();
    this.updatePublisherCount();
  }

  showError(message) {
    console.error('❌', message);
    if (typeof showNotification === 'function') {
      showNotification(message, 'error');
    } else {
      alert('Error: ' + message);
    }
  }

  showInfo(message) {
    console.log('ℹ️', message);
    if (typeof showNotification === 'function') {
      showNotification(message, 'info');
    }
  }

  updatePublisherStats() {
    // Update stats display
  }

  updatePublisherCount() {
    const countEl = document.getElementById('publisher-count');
    if (countEl) {
      countEl.textContent = `${this.currentPublishers.length} publishers`;
    }
  }

  setupEventListeners() {
    // Setup event listeners for UI
  }

  async refreshPublishers() {
    await this.loadPublishers(true);
  }
}

// Export for production use
window.ProductionPublisherManager = ProductionPublisherManager;

// DEDICATED handleCreatePublisher function to stop the infinite loop
function handleCreatePublisher() {
  console.log('🏢 DEDICATED handleCreatePublisher called from publisher-manager.js');
  
  try {
    // Get form values
    const name = document.getElementById('new-publisher-name')?.value?.trim();
    const email = document.getElementById('new-publisher-email')?.value?.trim();
    const code = document.getElementById('new-publisher-code')?.value?.trim();
    const apiKey = document.getElementById('new-publisher-api-key')?.value?.trim();
    const status = document.getElementById('new-publisher-status')?.value || 'active';

    // Validate required fields
    if (!name) {
      alert('Please enter a publisher name');
      return;
    }

    if (!email) {
      alert('Please enter a contact email');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (!code) {
      alert('Please enter a vendor code');
      return;
    }

    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }

    // Create publisher data object
    const publisherData = {
      name,
      email,
      vendorCode: code,
      apiKey,
      status
    };

    // Get the publisher manager instance
    const publisherManager = window.productionPublisherManager;
    
    if (!publisherManager) {
      throw new Error('Publisher manager not initialized');
    }

    // Show loading state
    const createBtn = document.querySelector('#add-publisher-modal .btn-primary');
    if (createBtn) {
      createBtn.disabled = true;
      createBtn.textContent = 'Creating...';
    }

    // Create publisher
    publisherManager.createPublisher(publisherData)
      .then(() => {
        alert(`✅ Publisher "${name}" created successfully!`);
        closeModal('add-publisher-modal');
      })
      .catch(error => {
        console.error('Publisher creation failed:', error);
        alert(`❌ Failed to create publisher: ${error.message}`);
      })
      .finally(() => {
        // Reset button state
        if (createBtn) {
          createBtn.disabled = false;
          createBtn.textContent = 'Create Publisher';
        }
      });

  } catch (error) {
    console.error('Error in handleCreatePublisher:', error);
    alert(`❌ Error creating publisher: ${error.message}`);
  }
}

function closeModal(modalId) {
  try {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      console.log('✅ Modal closed:', modalId);
    }
  } catch (error) {
    console.error('Error closing modal:', error);
  }
}

// Expose the DEDICATED function to global scope
window.handleCreatePublisher = handleCreatePublisher;
window.closeModal = closeModal;

console.log('🏢 Production Publisher Manager loaded - NO localStorage dependencies');
console.log('✅ DEDICATED handleCreatePublisher exposed to global scope');

// Initialize the production publisher manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for auth service to be available (check for both options)
  const initializeManager = () => {
    const authService = window.prodAuth || window.apiService;
    if (authService) {
      console.log(`🚀 Initializing Production Publisher Manager with ${authService === window.prodAuth ? 'Enterprise Cognito' : 'Legacy API Service'}...`);
      window.productionPublisherManager = new ProductionPublisherManager();
      window.productionPublisherManager.initialize();
      console.log('✅ Production Publisher Manager instance created and available globally');
    } else {
      console.log('⏳ Waiting for auth service (prodAuth or apiService)...');
      setTimeout(initializeManager, 100);
    }
  };
  
  initializeManager();
});

// Also expose for immediate use if DOM already loaded
if (document.readyState === 'loading') {
  // Already added event listener above
} else {
  // DOM already loaded, initialize immediately
  setTimeout(() => {
    const authService = window.prodAuth || window.apiService;
    if (authService && !window.productionPublisherManager) {
      console.log(`🚀 Late initializing Production Publisher Manager with ${authService === window.prodAuth ? 'Enterprise Cognito' : 'Legacy API Service'}...`);
      window.productionPublisherManager = new ProductionPublisherManager();
      window.productionPublisherManager.initialize();
      console.log('✅ Production Publisher Manager instance created globally');
    }
  }, 500);
} 