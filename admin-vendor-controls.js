// Vendor Control Module for Admin Dashboard

class VendorControlModule {
    constructor() {
        this.vendors = [];
        this.API_ENDPOINT = window.APP_CONFIG.apiEndpoint;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Initialize vendor list
            await this.loadVendors();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize vendor metrics
            await this.loadVendorMetrics();
            
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize vendor controls:', error);
            throw error;
        }
    }

    async loadVendors() {
        try {
            const response = await fetch(`${this.API_ENDPOINT}/vendors`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch vendors');
            }

            this.vendors = await response.json();
            this.renderVendorList();
        } catch (error) {
            console.error('Error loading vendors:', error);
            throw error;
        }
    }

    async loadVendorMetrics() {
        try {
            const response = await fetch(`${this.API_ENDPOINT}/admin/vendor-metrics`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch vendor metrics');
            }

            const metrics = await response.json();
            this.updateVendorMetrics(metrics);
        } catch (error) {
            console.error('Error loading vendor metrics:', error);
        }
    }

    setupEventListeners() {
        // Add vendor form
        const addVendorForm = document.getElementById('add-vendor-form');
        if (addVendorForm) {
            addVendorForm.addEventListener('submit', (e) => this.handleAddVendor(e));
        }

        // Vendor list actions
        const vendorList = document.getElementById('vendor-list');
        if (vendorList) {
            vendorList.addEventListener('click', (e) => this.handleVendorActions(e));
        }

        // Search and filter
        const vendorSearch = document.getElementById('vendor-search');
        if (vendorSearch) {
            vendorSearch.addEventListener('input', (e) => this.handleVendorSearch(e));
        }
    }

    async handleAddVendor(event) {
        event.preventDefault();
        const form = event.target;
        
        try {
            const vendorData = {
                name: form.vendorName.value,
                contact_email: form.vendorEmail.value,
                contact_phone: form.vendorPhone.value,
                website: form.vendorWebsite.value,
                status: 'active'
            };

            const response = await fetch(`${this.API_ENDPOINT}/vendors`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(vendorData)
            });

            if (!response.ok) {
                throw new Error('Failed to create vendor');
            }

            const newVendor = await response.json();
            this.vendors.push(newVendor);
            this.renderVendorList();
            
            // Show success message
            showNotification('Vendor created successfully', 'success');
            
            // Clear form
            form.reset();
        } catch (error) {
            console.error('Error creating vendor:', error);
            showNotification('Failed to create vendor', 'error');
        }
    }

    async handleVendorActions(event) {
        const action = event.target.dataset.action;
        const vendorId = event.target.closest('[data-vendor-id]')?.dataset.vendorId;
        
        if (!action || !vendorId) return;

        try {
            switch (action) {
                case 'view-api':
                    await this.showVendorApiDetails(vendorId);
                    break;
                case 'regenerate-key':
                    await this.regenerateApiKey(vendorId);
                    break;
                case 'toggle-status':
                    await this.toggleVendorStatus(vendorId);
                    break;
                case 'edit':
                    this.showEditVendorModal(vendorId);
                    break;
                case 'delete':
                    await this.deleteVendor(vendorId);
                    break;
            }
        } catch (error) {
            console.error('Error handling vendor action:', error);
            showNotification('Failed to perform action', 'error');
        }
    }

    async showVendorApiDetails(vendorId) {
        try {
            const response = await fetch(`${this.API_ENDPOINT}/vendors/${vendorId}/api-details`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch API details');
            }

            const apiDetails = await response.json();
            this.renderApiDetailsModal(apiDetails);
        } catch (error) {
            console.error('Error fetching API details:', error);
            showNotification('Failed to load API details', 'error');
        }
    }

    async regenerateApiKey(vendorId) {
        if (!confirm('Are you sure you want to regenerate this vendor\'s API key? The old key will stop working immediately.')) {
            return;
        }

        try {
            const response = await fetch(`${this.API_ENDPOINT}/vendors/${vendorId}/regenerate-key`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to regenerate API key');
            }

            const result = await response.json();
            
            // Update vendor in list
            const vendorIndex = this.vendors.findIndex(v => v.id === vendorId);
            if (vendorIndex !== -1) {
                this.vendors[vendorIndex].api_key = result.new_api_key;
                this.renderVendorList();
            }

            showNotification('API key regenerated successfully', 'success');
        } catch (error) {
            console.error('Error regenerating API key:', error);
            showNotification('Failed to regenerate API key', 'error');
        }
    }

    async toggleVendorStatus(vendorId) {
        const vendor = this.vendors.find(v => v.id === vendorId);
        if (!vendor) return;

        const newStatus = vendor.status === 'active' ? 'inactive' : 'active';

        try {
            const response = await fetch(`${this.API_ENDPOINT}/vendors/${vendorId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update vendor status');
            }

            // Update vendor in list
            vendor.status = newStatus;
            this.renderVendorList();
            
            showNotification('Vendor status updated', 'success');
        } catch (error) {
            console.error('Error updating vendor status:', error);
            showNotification('Failed to update vendor status', 'error');
        }
    }

    async deleteVendor(vendorId) {
        if (!confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${this.API_ENDPOINT}/vendors/${vendorId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete vendor');
            }

            // Remove vendor from list
            this.vendors = this.vendors.filter(v => v.id !== vendorId);
            this.renderVendorList();
            
            showNotification('Vendor deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting vendor:', error);
            showNotification('Failed to delete vendor', 'error');
        }
    }

    handleVendorSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const vendorCards = document.querySelectorAll('.vendor-card');
        
        vendorCards.forEach(card => {
            const vendorName = card.querySelector('.vendor-name').textContent.toLowerCase();
            const vendorCode = card.querySelector('.vendor-code').textContent.toLowerCase();
            
            if (vendorName.includes(searchTerm) || vendorCode.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    updateVendorMetrics(metrics) {
        // Update vendor performance metrics in the UI
        const metricsContainer = document.getElementById('vendor-metrics');
        if (!metricsContainer) return;

        metricsContainer.innerHTML = `
            <div class="metric-card">
                <h3>Total Vendors</h3>
                <p class="metric-value">${metrics.totalVendors}</p>
            </div>
            <div class="metric-card">
                <h3>Active Vendors</h3>
                <p class="metric-value">${metrics.activeVendors}</p>
            </div>
            <div class="metric-card">
                <h3>Total Leads (30d)</h3>
                <p class="metric-value">${metrics.totalLeads30d}</p>
            </div>
            <div class="metric-card">
                <h3>Avg Lead Quality</h3>
                <p class="metric-value">${metrics.avgLeadQuality.toFixed(1)}</p>
            </div>
        `;
    }

    renderVendorList() {
        const container = document.getElementById('vendor-list');
        if (!container) return;

        container.innerHTML = this.vendors.map(vendor => `
            <div class="vendor-card" data-vendor-id="${vendor.id}">
                <div class="vendor-header">
                    <h3 class="vendor-name">${escapeHtml(vendor.name)}</h3>
                    <span class="vendor-code">${escapeHtml(vendor.vendor_code)}</span>
                    <span class="status-badge ${vendor.status}">${vendor.status}</span>
                </div>
                <div class="vendor-details">
                    <p><strong>Email:</strong> ${escapeHtml(vendor.contact_email)}</p>
                    <p><strong>Phone:</strong> ${escapeHtml(vendor.contact_phone)}</p>
                    <p><strong>Website:</strong> ${vendor.website ? `<a href="${escapeHtml(vendor.website)}" target="_blank">${escapeHtml(vendor.website)}</a>` : 'N/A'}</p>
                    <p><strong>Created:</strong> ${new Date(vendor.created_at).toLocaleDateString()}</p>
                </div>
                <div class="vendor-metrics">
                    <div class="metric">
                        <span class="metric-label">Leads (30d)</span>
                        <span class="metric-value">${vendor.metrics?.leads30d || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Conversion</span>
                        <span class="metric-value">${vendor.metrics?.conversion || '0%'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Quality</span>
                        <span class="metric-value">${vendor.metrics?.quality || 'N/A'}</span>
                    </div>
                </div>
                <div class="vendor-actions">
                    <button class="btn btn-primary" data-action="view-api">API Details</button>
                    <button class="btn" data-action="regenerate-key">Regenerate Key</button>
                    <button class="btn ${vendor.status === 'active' ? 'btn-warning' : 'btn-success'}" data-action="toggle-status">
                        ${vendor.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-danger" data-action="delete">Delete</button>
                </div>
            </div>
        `).join('') || '<p class="no-data">No vendors found</p>';
    }

    renderApiDetailsModal(apiDetails) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>API Details for ${escapeHtml(apiDetails.vendor_name)}</h2>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="api-details">
                        <div class="api-key-section">
                            <h3>API Key</h3>
                            <div class="api-key-display">
                                <code>${apiDetails.api_key}</code>
                                <button class="btn btn-sm" onclick="navigator.clipboard.writeText('${apiDetails.api_key}')">Copy</button>
                            </div>
                        </div>
                        <div class="endpoint-section">
                            <h3>Endpoint</h3>
                            <code>${apiDetails.endpoint}</code>
                        </div>
                        <div class="instructions-section">
                            <h3>Integration Instructions</h3>
                            <pre><code>${apiDetails.instructions}</code></pre>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.print()">Print Instructions</button>
                    <button class="btn" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Add close button functionality
        modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
    }
}

// Create and export instance
const vendorControl = new VendorControlModule();
window.vendorControl = vendorControl; // Make available globally 