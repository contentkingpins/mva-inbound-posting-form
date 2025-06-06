/**
 * Enterprise Publisher API Manager
 * Integrates with real backend DynamoDB vendor management system
 */

class PublisherAPIManager {
    constructor() {
        this.apiService = new window.MVACRMAPIService();
        this.selectedPublishers = new Set();
        this.currentPublishers = [];
        this.pagination = { hasMore: false, lastKey: null };
        this.filters = { status: '', search: '', limit: 50 };
    }

    /**
     * Initialize the publisher management system
     */
    async initialize() {
        try {
            console.log('🏢 Initializing Enterprise Publisher API Manager...');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.refreshPublishers();
            
            console.log('✅ Publisher API Manager initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing Publisher API Manager:', error);
            this.showError('Failed to initialize publisher management system');
        }
    }

    /**
     * Setup event listeners for publisher management
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('publisher-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.filters.search = searchInput.value;
                this.refreshPublishers();
            }, 300));
        }

        // Status filter
        const statusFilter = document.getElementById('publisher-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filters.status = statusFilter.value;
                this.refreshPublishers();
            });
        }

        // Sort dropdown
        const sortSelect = document.getElementById('publisher-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.refreshPublishers();
            });
        }

        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all-publishers');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAllPublishers(e.target.checked);
            });
        }
    }

    /**
     * Load publishers from backend API
     */
    async loadPublishers(resetPagination = true) {
        try {
            if (resetPagination) {
                this.pagination.lastKey = null;
            }

            const queryParams = {
                limit: this.filters.limit
            };

            if (this.filters.status && this.filters.status !== 'all') {
                queryParams.status = this.filters.status;
            }

            if (this.filters.search) {
                queryParams.search = this.filters.search;
            }

            if (this.pagination.lastKey) {
                queryParams.lastKey = this.pagination.lastKey;
            }

            console.log('📡 Loading publishers from API with params:', queryParams);

            const response = await this.apiService.getVendors(queryParams);
            
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
            this.showError('Failed to load publishers from server');
            return [];
        }
    }

    /**
     * Refresh publisher list and update UI
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
     * Create new publisher via API
     */
    async createPublisher(publisherData) {
        try {
            console.log('🏢 Creating publisher via API:', publisherData);
            
            const response = await this.apiService.createVendor({
                name: publisherData.name,
                email: publisherData.email,
                contact_phone: publisherData.contact_phone || '',
                website: publisherData.website || '',
                notes: publisherData.notes || '',
                status: publisherData.status || 'active'
            });

            if (response.vendor) {
                console.log('✅ Publisher created successfully via API:', response.vendor.id);
                
                // Add to current list
                this.currentPublishers.unshift(response.vendor);
                
                // Update UI
                this.renderPublishersTable();
                this.updatePublisherStats();
                this.updatePublisherCount();
                
                // Show success message
                this.showSuccess(`Publisher "${response.vendor.name}" created successfully!`);
                
                // Download credentials
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
     * Update publisher via API
     */
    async updatePublisher(publisherId, updates) {
        try {
            console.log('📝 Updating publisher via API:', publisherId, updates);
            
            const response = await this.apiService.updateVendor(publisherId, updates);
            
            if (response.vendor) {
                // Update in current list
                const index = this.currentPublishers.findIndex(p => p.id === publisherId);
                if (index !== -1) {
                    this.currentPublishers[index] = response.vendor;
                }
                
                // Update UI
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
     * Delete publisher via API
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

            console.log('🗑️ Deleting publisher via API:', publisherId);
            
            await this.apiService.deleteVendor(publisherId);
            
            // Remove from current list
            this.currentPublishers = this.currentPublishers.filter(p => p.id !== publisherId);
            
            // Update UI
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
     * Bulk update publishers via API
     */
    async bulkUpdatePublishers(publisherIds, updates) {
        try {
            console.log('📊 Bulk updating publishers via API:', publisherIds.length, updates);
            
            const response = await this.apiService.bulkUpdateVendors(publisherIds, updates);
            
            if (response.results) {
                const { successful, failed, total } = response.results;
                
                // Refresh the list to get updated data
                await this.refreshPublishers();
                
                // Clear selections
                this.selectedPublishers.clear();
                this.updateBulkActionsVisibility();
                
                if (failed > 0) {
                    this.showWarning(`Bulk update completed: ${successful}/${total} successful, ${failed} failed`);
                } else {
                    this.showSuccess(`Successfully updated ${successful} publishers`);
                }
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('❌ Error in bulk update:', error);
            this.showError(`Bulk update failed: ${error.message}`);
        }
    }

    /**
     * Regenerate API key for publisher
     */
    async regenerateApiKey(publisherId) {
        try {
            const publisher = this.currentPublishers.find(p => p.id === publisherId);
            if (!publisher) {
                throw new Error('Publisher not found');
            }

            if (!confirm(`🔄 Regenerate API key for "${publisher.name}"?\n\nThis will invalidate the current API key!`)) {
                return;
            }

            console.log('🔑 Regenerating API key via API:', publisherId);
            
            const response = await this.apiService.regenerateVendorApiKey(publisherId);
            
            if (response.vendor) {
                // Update in current list
                const index = this.currentPublishers.findIndex(p => p.id === publisherId);
                if (index !== -1) {
                    this.currentPublishers[index] = response.vendor;
                }
                
                // Update UI
                this.renderPublishersTable();
                
                this.showSuccess('API key regenerated successfully');
                
                // Download new credentials
                this.downloadPublisherCredentials(response.vendor);
                
                return response.vendor;
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('❌ Error regenerating API key:', error);
            this.showError(`Failed to regenerate API key: ${error.message}`);
        }
    }

    /**
     * Render publishers table
     */
    renderPublishersTable() {
        const tbody = document.getElementById('publishers-table-body');
        if (!tbody) {
            console.warn('Publishers table body not found');
            return;
        }

        tbody.innerHTML = this.currentPublishers.map(publisher => `
            <tr>
                <td><input type="checkbox" value="${publisher.id}" onchange="publisherManager.togglePublisherSelection('${publisher.id}', this.checked)"></td>
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
                <td>
                    <strong>${publisher.lead_count || 0}</strong>
                    ${publisher.lead_count > 0 ? '<br><small class="text-muted">Active</small>' : ''}
                </td>
                <td>$${(publisher.revenue || 0).toLocaleString()}</td>
                <td>${this.formatDate(publisher.last_activity || publisher.created_date)}</td>
                <td>
                    <button class="action-btn-sm view" onclick="publisherManager.viewPublisher('${publisher.id}')" title="View Details">👁️</button>
                    <button class="action-btn-sm edit" onclick="publisherManager.editPublisher('${publisher.id}')" title="Edit">✏️</button>
                    <button class="action-btn-sm api" onclick="publisherManager.regenerateApiKey('${publisher.id}')" title="Regenerate API Key">🔄</button>
                    <button class="action-btn-sm pdf" onclick="publisherManager.downloadPublisherCredentials(${JSON.stringify(publisher).replace(/"/g, '&quot;')})" title="Download Credentials">📄</button>
                    <button class="action-btn-sm delete" onclick="publisherManager.deletePublisher('${publisher.id}')" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        console.log('📊 Publishers table updated with', this.currentPublishers.length, 'publishers');
        this.updateBulkActionsVisibility();
    }

    /**
     * Update publisher count display
     */
    updatePublisherCount() {
        const countEl = document.getElementById('publisher-count');
        if (countEl) {
            countEl.textContent = `${this.currentPublishers.length} publishers`;
        }
    }

    /**
     * Update publisher statistics
     */
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

    /**
     * Toggle publisher selection
     */
    togglePublisherSelection(publisherId, checked) {
        if (checked) {
            this.selectedPublishers.add(publisherId);
        } else {
            this.selectedPublishers.delete(publisherId);
        }
        this.updateBulkActionsVisibility();
    }

    /**
     * Toggle select all publishers
     */
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
        
        this.updateBulkActionsVisibility();
    }

    /**
     * Update bulk actions visibility
     */
    updateBulkActionsVisibility() {
        const bulkBar = document.getElementById('bulk-publishers-actions');
        const count = document.getElementById('selected-publishers-count');
        
        if (bulkBar && count) {
            bulkBar.style.display = this.selectedPublishers.size > 0 ? 'flex' : 'none';
            count.textContent = this.selectedPublishers.size;
        }
    }

    /**
     * View publisher details
     */
    async viewPublisher(publisherId) {
        try {
            const response = await this.apiService.getVendor(publisherId);
            const publisher = response.vendor;
            
            const details = `
Publisher Details:

Name: ${publisher.name}
Email: ${publisher.email}
Phone: ${publisher.contact_phone || 'N/A'}
Website: ${publisher.website || 'N/A'}
Vendor Code: ${publisher.vendor_code}
Tracking ID: ${publisher.tracking_id}
Status: ${publisher.status}
Created: ${this.formatDate(publisher.created_date)}
Lead Count: ${publisher.lead_count || 0}
Revenue: $${(publisher.revenue || 0).toLocaleString()}
Notes: ${publisher.notes || 'None'}
            `.trim();
            
            alert(details);
        } catch (error) {
            console.error('Error viewing publisher:', error);
            this.showError('Failed to load publisher details');
        }
    }

    /**
     * Edit publisher (simplified modal)
     */
    editPublisher(publisherId) {
        const publisher = this.currentPublishers.find(p => p.id === publisherId);
        if (!publisher) {
            this.showError('Publisher not found');
            return;
        }

        const newName = prompt('Edit Publisher Name:', publisher.name);
        if (newName && newName !== publisher.name) {
            this.updatePublisher(publisherId, { name: newName });
        }
    }

    /**
     * Download publisher credentials
     */
    downloadPublisherCredentials(publisher) {
        if (window.downloadPublisherCredentials) {
            window.downloadPublisherCredentials(publisher);
        } else {
            console.warn('downloadPublisherCredentials function not available');
        }
    }

    // Bulk actions
    async bulkActivatePublishers() {
        const selectedIds = Array.from(this.selectedPublishers);
        if (selectedIds.length === 0) {
            this.showError('Please select publishers to activate');
            return;
        }
        
        if (confirm(`Activate ${selectedIds.length} selected publishers?`)) {
            await this.bulkUpdatePublishers(selectedIds, { status: 'active' });
        }
    }

    async bulkDeactivatePublishers() {
        const selectedIds = Array.from(this.selectedPublishers);
        if (selectedIds.length === 0) {
            this.showError('Please select publishers to deactivate');
            return;
        }
        
        if (confirm(`Deactivate ${selectedIds.length} selected publishers?`)) {
            await this.bulkUpdatePublishers(selectedIds, { status: 'inactive' });
        }
    }

    async bulkDeletePublishers() {
        const selectedIds = Array.from(this.selectedPublishers);
        if (selectedIds.length === 0) {
            this.showError('Please select publishers to delete');
            return;
        }
        
        if (confirm(`⚠️ DELETE ${selectedIds.length} selected publishers?\n\nThis action cannot be undone!`)) {
            for (const publisherId of selectedIds) {
                try {
                    await this.deletePublisher(publisherId);
                } catch (error) {
                    console.error(`Failed to delete publisher ${publisherId}:`, error);
                }
            }
            
            this.selectedPublishers.clear();
            this.updateBulkActionsVisibility();
        }
    }

    /**
     * Utility functions
     */
    formatDate(dateString) {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
        // Implement loading indicator
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.display = show ? 'block' : 'none';
        }
    }

    showSuccess(message) {
        console.log('✅', message);
        if (window.addActivityFeedItem) {
            window.addActivityFeedItem(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        console.error('❌', message);
        if (window.addActivityFeedItem) {
            window.addActivityFeedItem(message, 'error');
        } else {
            alert('Error: ' + message);
        }
    }

    showWarning(message) {
        console.warn('⚠️', message);
        if (window.addActivityFeedItem) {
            window.addActivityFeedItem(message, 'warning');
        } else {
            alert('Warning: ' + message);
        }
    }
}

// Initialize enterprise publisher manager
let publisherManager = null;

// Expose to global scope for button handlers
window.publisherManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        publisherManager = new PublisherAPIManager();
        window.publisherManager = publisherManager;
        
        // Wait a moment for other scripts to load
        setTimeout(async () => {
            await publisherManager.initialize();
        }, 1000);
    } catch (error) {
        console.error('❌ Error initializing publisher manager:', error);
    }
});

// Global functions for backward compatibility
window.handleCreatePublisher = async function() {
    console.log('🏢 Creating publisher via Enterprise API Manager...');
    
    try {
        const nameEl = document.getElementById('new-publisher-name');
        const emailEl = document.getElementById('new-publisher-email');
        const phoneEl = document.getElementById('new-publisher-phone');
        const websiteEl = document.getElementById('new-publisher-website');
        const statusEl = document.getElementById('new-publisher-status');
        const notesEl = document.getElementById('new-publisher-notes');
        
        if (!nameEl || !emailEl) {
            alert('Error: Form elements not found');
            return;
        }
        
        const publisherData = {
            name: nameEl.value.trim(),
            email: emailEl.value.trim(),
            contact_phone: phoneEl ? phoneEl.value.trim() : '',
            website: websiteEl ? websiteEl.value.trim() : '',
            status: statusEl ? statusEl.value : 'active',
            notes: notesEl ? notesEl.value.trim() : ''
        };
        
        if (!publisherData.name || !publisherData.email) {
            alert('Please fill in Publisher Name and Contact Email');
            return;
        }
        
        await publisherManager.createPublisher(publisherData);
        
        // Clear form
        nameEl.value = '';
        emailEl.value = '';
        if (phoneEl) phoneEl.value = '';
        if (websiteEl) websiteEl.value = '';
        if (notesEl) notesEl.value = '';
        
        // Close modal
        if (window.closeModal) {
            closeModal('add-publisher-modal');
        }
        
    } catch (error) {
        console.error('❌ Error creating publisher:', error);
        alert('Error creating publisher: ' + error.message);
    }
};

// Export bulk action functions
window.bulkActivatePublishers = () => publisherManager?.bulkActivatePublishers();
window.bulkDeactivatePublishers = () => publisherManager?.bulkDeactivatePublishers();
window.bulkDeletePublishers = () => publisherManager?.bulkDeletePublishers();
window.refreshPublishers = () => publisherManager?.refreshPublishers(); 