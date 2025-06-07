/**
 * Production Publisher Manager 
 * Uses proper authentication without localStorage
 */
class ProductionPublisherManager {
  constructor() {
    this.authService = window.prodAuth;
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
      if (this.authService.isAuthenticated() && this.authService.isAdmin()) {
        console.log('✅ Admin authenticated, loading publishers...');
        await this.refreshPublishers();
      } else if (this.authService.isAuthenticated()) {
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
      const response = await this.authService.apiRequest(endpoint);
      
      if (response.vendors) {
        if (resetPagination) {
          this.currentPublishers = response.vendors;
        } else {
          this.currentPublishers = [...this.currentPublishers, ...response.vendors];
        }

        this.pagination = response.pagination || { hasMore: false, lastKey: null };
        
        console.log(`📊 Loaded ${response.vendors.length} publishers. Total: ${this.currentPublishers.length}`);
        return response.vendors;
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('❌ Error loading publishers:', error);
      
      if (error.message.includes('Not authenticated')) {
        this.showError('Session expired. Please log in again.');
        this.authService.logout();
      } else {
        this.showError(`Failed to load publishers: ${error.message}`);
      }
      return [];
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

  // ... other methods similar to original but using this.authService.apiRequest()
  
  showError(message) {
    console.error('❌', message);
  }

  showInfo(message) {
    console.log('ℹ️', message);
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

console.log('🏢 Production Publisher Manager loaded - NO localStorage dependencies'); 