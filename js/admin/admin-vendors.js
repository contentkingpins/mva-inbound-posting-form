/**
 * Admin Vendor Management Module
 * Handles vendor CRUD operations, pricing, and API key management
 */

export class AdminVendors {
    constructor() {
        this.vendors = [];
        this.selectedVendor = null;
        this.vendorModal = null;
    }

    /**
     * Initialize vendor management
     */
    async initialize() {
        console.log('🏢 Initializing Vendor Management...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load vendors
        await this.loadVendors();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add vendor button
        const addVendorBtn = document.getElementById('add-vendor-btn');
        if (addVendorBtn) {
            addVendorBtn.addEventListener('click', () => this.showAddVendorModal());
        }

        // Refresh vendors button
        const refreshBtn = document.getElementById('refresh-vendors');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadVendors());
        }

        // Search functionality
        const searchInput = document.getElementById('vendor-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterVendors(e.target.value));
        }

        // Vendor pricing button
        const pricingBtn = document.getElementById('manage-vendor-pricing-btn');
        if (pricingBtn) {
            pricingBtn.addEventListener('click', () => this.showVendorPricingModal());
        }
    }

    /**
     * Load vendors from API
     */
    async loadVendors() {
        try {
            const token = localStorage.getItem('auth_token');
            const apiBase = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
            
            // Show loading state
            this.showVendorSkeletons();
            
            const response = await fetch(`${apiBase}/vendors`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch vendors');
            }

            const data = await response.json();
            this.vendors = data.vendors || [];
            
            this.renderVendors();
            this.updateVendorStats();
            
        } catch (error) {
            console.error('Error loading vendors:', error);
            this.showEmptyState();
            window.showToast('Failed to load vendors', 'error');
        }
    }

    /**
     * Show vendor loading skeletons
     */
    showVendorSkeletons() {
        const container = document.getElementById('vendor-grid');
        if (!container) return;

        const skeletonHTML = Array(4).fill('').map(() => `
            <div class="vendor-card glass-card skeleton-loading">
                <div class="skeleton-header"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line shorter"></div>
            </div>
        `).join('');

        container.innerHTML = skeletonHTML;
    }

    /**
     * Render vendors
     */
    renderVendors() {
        const container = document.getElementById('vendor-grid');
        if (!container) return;

        if (this.vendors.length === 0) {
            this.showEmptyState();
            return;
        }

        const vendorHTML = this.vendors.map(vendor => `
            <div class="vendor-card glass-card" data-vendor-code="${vendor.vendor_code}">
                <div class="vendor-header">
                    <div>
                        <h3 class="vendor-name">${vendor.vendor_name}</h3>
                        <span class="vendor-code">${vendor.vendor_code}</span>
                    </div>
                    <span class="status-badge ${vendor.status}" data-tooltip="Vendor ${vendor.status}">
                        ${vendor.status}
                    </span>
                </div>
                
                <div class="vendor-details">
                    <p><strong>Email:</strong> ${vendor.email || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${vendor.phone || 'N/A'}</p>
                    <p><strong>Lead Price:</strong> $${vendor.lead_price || '35.00'}</p>
                </div>
                
                <div class="vendor-metrics">
                    <div class="metric" data-tooltip="Total leads from this vendor">
                        <span class="metric-value">${vendor.total_leads || 0}</span>
                        <span class="metric-label">Leads</span>
                    </div>
                    <div class="metric" data-tooltip="Lead conversion rate">
                        <span class="metric-value">${vendor.conversion_rate || 0}%</span>
                        <span class="metric-label">Conversion</span>
                    </div>
                    <div class="metric" data-tooltip="Total revenue generated">
                        <span class="metric-value">$${(vendor.total_revenue || 0).toLocaleString()}</span>
                        <span class="metric-label">Revenue</span>
                    </div>
                </div>
                
                <div class="vendor-actions">
                    <button class="action-btn view" onclick="adminVendors.viewVendor('${vendor.vendor_code}')" data-tooltip="View details">
                        <span>👁️</span>
                    </button>
                    <button class="action-btn edit" onclick="adminVendors.editVendor('${vendor.vendor_code}')" data-tooltip="Edit vendor">
                        <span>✏️</span>
                    </button>
                    <button class="action-btn api" onclick="adminVendors.showAPIKey('${vendor.vendor_code}')" data-tooltip="View API credentials">
                        <span>🔑</span>
                    </button>
                    <button class="action-btn delete" onclick="adminVendors.deleteVendor('${vendor.vendor_code}')" data-tooltip="Delete vendor" data-tooltip-theme="danger">
                        <span>🗑️</span>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = vendorHTML;
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        const container = document.getElementById('vendor-grid');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏢</div>
                <h3 class="empty-state-title">No Vendors Yet</h3>
                <p class="empty-state-text">Add your first vendor to start receiving leads</p>
                <button class="btn btn-primary" onclick="adminVendors.showAddVendorModal()">
                    <span>➕</span> Add First Vendor
                </button>
            </div>
        `;
    }

    /**
     * Update vendor statistics
     */
    updateVendorStats() {
        const totalVendors = this.vendors.length;
        const activeVendors = this.vendors.filter(v => v.status === 'active').length;
        const totalLeads = this.vendors.reduce((sum, v) => sum + (v.total_leads || 0), 0);
        const totalRevenue = this.vendors.reduce((sum, v) => sum + (v.total_revenue || 0), 0);

        // Update stat cards if they exist
        const statsElements = {
            'total-vendors': totalVendors,
            'active-vendors': activeVendors,
            'vendor-leads': totalLeads,
            'vendor-revenue': `$${totalRevenue.toLocaleString()}`
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    /**
     * Filter vendors by search term
     */
    filterVendors(searchTerm) {
        const cards = document.querySelectorAll('.vendor-card');
        const term = searchTerm.toLowerCase();

        cards.forEach(card => {
            const vendorName = card.querySelector('.vendor-name').textContent.toLowerCase();
            const vendorCode = card.querySelector('.vendor-code').textContent.toLowerCase();
            const vendorEmail = card.querySelector('.vendor-details p').textContent.toLowerCase();

            const isMatch = vendorName.includes(term) || 
                          vendorCode.includes(term) || 
                          vendorEmail.includes(term);

            card.style.display = isMatch ? 'block' : 'none';
        });
    }

    /**
     * Show add vendor modal
     */
    showAddVendorModal() {
        const modalHTML = `
            <div class="modal-header">
                <h2 class="modal-title">Add New Vendor</h2>
                <button class="modal-close" onclick="adminVendors.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="add-vendor-form" class="conversational-form">
                    <div class="form-step">
                        <label for="vendor-name">Vendor/Company Name</label>
                        <input type="text" id="vendor-name" class="form-input" placeholder="Enter company name" required>
                    </div>
                    
                    <div class="form-step">
                        <label for="vendor-email">Contact Email</label>
                        <input type="email" id="vendor-email" class="form-input" placeholder="vendor@company.com" required>
                    </div>
                    
                    <div class="form-step">
                        <label for="vendor-phone">Phone Number</label>
                        <input type="tel" id="vendor-phone" class="form-input" placeholder="(555) 123-4567">
                    </div>
                    
                    <div class="form-step">
                        <label for="vendor-price">Lead Price ($)</label>
                        <input type="number" id="vendor-price" class="form-input" placeholder="35.00" step="0.01" min="0">
                    </div>
                    
                    <div class="form-step">
                        <label>Vendor Type</label>
                        <div class="role-options">
                            <label class="role-option">
                                <input type="radio" name="vendor-type" value="standard" checked>
                                <div class="role-card">
                                    <span class="role-icon">🏢</span>
                                    <span class="role-name">Standard Vendor</span>
                                </div>
                            </label>
                            <label class="role-option">
                                <input type="radio" name="vendor-type" value="premium">
                                <div class="role-card">
                                    <span class="role-icon">⭐</span>
                                    <span class="role-name">Premium Partner</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="adminVendors.closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="adminVendors.createVendor()">
                    <span>➕</span> Create Vendor
                </button>
            </div>
        `;

        this.showModal(modalHTML);
    }

    /**
     * Create new vendor
     */
    async createVendor() {
        const form = document.getElementById('add-vendor-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const vendorData = {
            vendor_name: document.getElementById('vendor-name').value,
            email: document.getElementById('vendor-email').value,
            phone: document.getElementById('vendor-phone').value,
            lead_price: parseFloat(document.getElementById('vendor-price').value) || 35.00,
            vendor_type: document.querySelector('input[name="vendor-type"]:checked').value
        };

        try {
            const token = localStorage.getItem('auth_token');
            const apiBase = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
            
            const response = await fetch(`${apiBase}/vendors`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(vendorData)
            });

            if (!response.ok) {
                throw new Error('Failed to create vendor');
            }

            const result = await response.json();
            
            window.showToast('Vendor created successfully!', 'success');
            this.closeModal();
            this.showVendorSuccessModal(result.vendor);
            await this.loadVendors();

        } catch (error) {
            console.error('Error creating vendor:', error);
            window.showToast('Failed to create vendor', 'error');
        }
    }

    /**
     * Show vendor API key
     */
    async showAPIKey(vendorCode) {
        const vendor = this.vendors.find(v => v.vendor_code === vendorCode);
        if (!vendor) return;

        const modalHTML = `
            <div class="modal-header">
                <h2 class="modal-title">API Credentials - ${vendor.vendor_name}</h2>
                <button class="modal-close" onclick="adminVendors.closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="api-key-display">
                    <label>Vendor Code</label>
                    <div class="api-key-container">
                        <input type="text" class="form-input" value="${vendor.vendor_code}" readonly>
                        <button class="btn btn-sm" onclick="adminVendors.copyToClipboard('${vendor.vendor_code}')" data-tooltip="Copy vendor code">
                            📋 Copy
                        </button>
                    </div>
                </div>
                
                <div class="api-key-display">
                    <label>API Key</label>
                    <div class="api-key-container">
                        <input type="password" id="api-key-field" class="form-input" value="${vendor.api_key || 'Loading...'}" readonly>
                        <button class="btn btn-sm" onclick="adminVendors.toggleAPIKeyVisibility()" data-tooltip="Show/hide API key">
                            👁️ Show
                        </button>
                        <button class="btn btn-sm" onclick="adminVendors.copyToClipboard('${vendor.api_key}')" data-tooltip="Copy API key">
                            📋 Copy
                        </button>
                    </div>
                </div>
                
                <div class="warning-text">
                    ⚠️ Keep this API key secure. It provides full access to submit leads.
                </div>
                
                <div class="api-section">
                    <h5>API Endpoint</h5>
                    <code>${window.APP_CONFIG?.apiEndpoint}/leads</code>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-danger" onclick="adminVendors.regenerateAPIKey('${vendorCode}')">
                    🔄 Regenerate API Key
                </button>
                <button class="btn btn-primary" onclick="adminVendors.closeModal()">Close</button>
            </div>
        `;

        this.showModal(modalHTML);
    }

    /**
     * Regenerate API key
     */
    async regenerateAPIKey(vendorCode) {
        if (!confirm('Are you sure you want to regenerate the API key? The old key will stop working immediately.')) {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token');
            const apiBase = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
            
            const response = await fetch(`${apiBase}/vendors/${vendorCode}/regenerate-key`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to regenerate API key');
            }

            const result = await response.json();
            
            window.showToast('API key regenerated successfully!', 'success');
            await this.loadVendors();
            this.showAPIKey(vendorCode);

        } catch (error) {
            console.error('Error regenerating API key:', error);
            window.showToast('Failed to regenerate API key', 'error');
        }
    }

    /**
     * Utility functions
     */
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            window.showToast('Copied to clipboard!', 'success');
        });
    }

    toggleAPIKeyVisibility() {
        const field = document.getElementById('api-key-field');
        const button = event.target;
        
        if (field.type === 'password') {
            field.type = 'text';
            button.textContent = '🙈 Hide';
        } else {
            field.type = 'password';
            button.textContent = '👁️ Show';
        }
    }

    showModal(content) {
        const modalOverlay = document.getElementById('modal-overlay') || this.createModalOverlay();
        const modalContent = modalOverlay.querySelector('.modal-content');
        
        modalContent.innerHTML = content;
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    createModalOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = '<div class="modal-content glass-modal"></div>';
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeModal();
        });
        
        document.body.appendChild(overlay);
        return overlay;
    }

    // Make these methods accessible globally for onclick handlers
    viewVendor(vendorCode) { /* Implementation */ }
    editVendor(vendorCode) { /* Implementation */ }
    deleteVendor(vendorCode) { /* Implementation */ }
}

// Create global instance for onclick handlers
window.adminVendors = new AdminVendors(); 