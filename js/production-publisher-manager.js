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
   * Create new publisher
   */
  async createPublisher(publisherData) {
    try {
      console.log('🏢 Creating publisher:', publisherData);
      
      const response = await this.authService.apiRequest('/vendors', {
        method: 'POST',
        body: JSON.stringify({
          name: publisherData.name,
          email: publisherData.email,
          contact_phone: publisherData.contact_phone || '',
          website: publisherData.website || '',
          notes: publisherData.notes || '',
          status: publisherData.status || 'active'
        })
      });

      if (response.vendor) {
        console.log('✅ Publisher created:', response.vendor.id);
        
        // Add to current list
        this.currentPublishers.unshift(response.vendor);
        
        // Update UI
        this.renderPublishersTable();
        this.updatePublisherStats();
        this.updatePublisherCount();
        
        this.showSuccess(`Publisher "${response.vendor.name}" created successfully!`);
        this.downloadPublisherCredentials(response.vendor);
        
        return response.vendor;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Error creating publisher:', error);
      this.showError(`Failed to create publisher: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update publisher
   */
  async updatePublisher(publisherId, updates) {
    try {
      const response = await this.authService.apiRequest(`/vendors/${publisherId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      if (response.vendor) {
        // Update in current list
        const index = this.currentPublishers.findIndex(p => p.id === publisherId);
        if (index !== -1) {
          this.currentPublishers[index] = response.vendor;
        }
        
        this.renderPublishersTable();
        this.updatePublisherStats();
        this.showSuccess('Publisher updated successfully');
        
        return response.vendor;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Error updating publisher:', error);
      this.showError(`Failed to update publisher: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete publisher
   */
  async deletePublisher(publisherId) {
    try {
      const publisher = this.currentPublishers.find(p => p.id === publisherId);
      if (!publisher) {
        throw new Error('Publisher not found');
      }

      if (!confirm(`⚠️ Delete publisher "${publisher.name}"?\n\nThis action cannot be undone!`)) {
        return;
      }

      await this.authService.apiRequest(`/vendors/${publisherId}`, {
        method: 'DELETE'
      });
      
      // Remove from current list
      this.currentPublishers = this.currentPublishers.filter(p => p.id !== publisherId);
      
      this.renderPublishersTable();
      this.updatePublisherStats();
      this.updatePublisherCount();
      
      this.showSuccess(`Publisher "${publisher.name}" deleted successfully`);
    } catch (error) {
      console.error('❌ Error deleting publisher:', error);
      if (error.message.includes('existing leads')) {
        this.showError('Cannot delete publisher with existing leads. Please archive instead.');
      } else {
        this.showError(`Failed to delete publisher: ${error.message}`);
      }
    }
  }

  /**
   * Refresh publishers
   */
  async refreshPublishers() {
    try {
      this.showLoading(true);
      await this.loadPublishers(true);
      this.renderPublishersTable();
      this.updatePublisherStats();
      this.updatePublisherCount();
      this.showLoading(false);
    } catch (error) {
      console.error('❌ Error refreshing publishers:', error);
      this.showError('Failed to refresh publisher list');
      this.showLoading(false);
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

  /**
   * Setup event listeners (same as before)
   */
  setupEventListeners() {
    const searchInput = document.getElementById('publisher-search');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(() => {
        this.filters.search = searchInput.value;
        this.refreshPublishers();
      }, 300));
    }

    const statusFilter = document.getElementById('publisher-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.filters.status = statusFilter.value;
        this.refreshPublishers();
      });
    }

    const sortSelect = document.getElementById('publisher-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.refreshPublishers();
      });
    }

    const selectAllCheckbox = document.getElementById('select-all-publishers');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        this.toggleSelectAllPublishers(e.target.checked);
      });
    }
  }

  // ... (rest of the methods remain the same as original)
  renderPublishersTable() {
    const tbody = document.getElementById('publishers-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.currentPublishers.map(publisher => `
      <tr>
        <td><input type="checkbox" value="${publisher.id}" onchange="prodPublisherManager.togglePublisherSelection('${publisher.id}', this.checked)"></td>
        <td>
          <div class="publisher-info">
            <div class="publisher-name">${publisher.name}</div>
            <div class="publisher-email">${publisher.email}</div>
          </div>
        </td>
        <td><span class="status-badge ${publisher.status}">${publisher.status.toUpperCase()}</span></td>
        <td><span class="vendor-code">${publisher.vendor_code}</span></td>
        <td><span class="vendor-code">${publisher.tracking_id || 'N/A'}</span></td>
        <td><div class="api-key-display">${publisher.api_key ? publisher.api_key.substring(0, 8) + '...' : 'No Key'}</div></td>
        <td><strong>${publisher.lead_count || 0}</strong></td>
        <td>$${(publisher.revenue || 0).toLocaleString()}</td>
        <td>${this.formatDate(publisher.last_activity || publisher.created_date)}</td>
        <td>
          <button class="action-btn-sm view" onclick="prodPublisherManager.viewPublisher('${publisher.id}')" title="View Details">👁️</button>
          <button class="action-btn-sm edit" onclick="prodPublisherManager.editPublisher('${publisher.id}')" title="Edit">✏️</button>
          <button class="action-btn-sm delete" onclick="prodPublisherManager.deletePublisher('${publisher.id}')" title="Delete">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  updatePublisherCount() {
    const countEl = document.getElementById('publisher-count');
    if (countEl) {
      countEl.textContent = `${this.currentPublishers.length} publishers`;
    }
  }

  updatePublisherStats() {
    const activePublishers = this.currentPublishers.filter(p => p.status === 'active').length;
    const totalLeads = this.currentPublishers.reduce((sum, p) => sum + (p.lead_count || 0), 0);
    const totalRevenue = this.currentPublishers.reduce((sum, p) => sum + (p.revenue || 0), 0);

    const totalEl = document.getElementById('total-publishers');
    const activeEl = document.getElementById('active-publishers');
    const leadsEl = document.getElementById('total-publisher-leads');
    const revenueEl = document.getElementById('total-publisher-revenue');

    if (totalEl) totalEl.textContent = this.currentPublishers.length;
    if (activeEl) activeEl.textContent = activePublishers;
    if (leadsEl) leadsEl.textContent = totalLeads.toLocaleString();
    if (revenueEl) revenueEl.textContent = '$' + totalRevenue.toLocaleString();
  }

  // Utility methods
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  showLoading(show) {
    // Implement loading state
  }

  showSuccess(message) {
    console.log('✅', message);
    // Implement success notification
  }

  showError(message) {
    console.error('❌', message);
    // Implement error notification
  }

  showInfo(message) {
    console.log('ℹ️', message);
    // Implement info notification
  }

  togglePublisherSelection(publisherId, checked) {
    if (checked) {
      this.selectedPublishers.add(publisherId);
    } else {
      this.selectedPublishers.delete(publisherId);
    }
  }

  toggleSelectAllPublishers(checked) {
    const checkboxes = document.querySelectorAll('#publishers-table-body input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = checked;
      const publisherId = cb.value;
      if (checked) {
        this.selectedPublishers.add(publisherId);
      } else {
        this.selectedPublishers.delete(publisherId);
      }
    });
  }

  downloadPublisherCredentials(publisher) {
    // Implement credential download
    console.log('📄 Downloading credentials for:', publisher.name);
  }

  viewPublisher(publisherId) {
    console.log('👁️ Viewing publisher:', publisherId);
  }

  editPublisher(publisherId) {
    console.log('✏️ Editing publisher:', publisherId);
  }
}

// Export for production use
window.ProductionPublisherManager = ProductionPublisherManager;
window.prodPublisherManager = new ProductionPublisherManager();

console.log('🏢 Production Publisher Manager loaded - NO localStorage dependencies'); 