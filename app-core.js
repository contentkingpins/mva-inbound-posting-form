/**
 * Core Application Logic
 * Main application controller that orchestrates all modules
 */

// Configuration Constants
const API_ENDPOINT = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads';
const EXPORT_ENDPOINT = 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/export';
const REFRESH_INTERVAL = 10000; // 10 seconds

// Application State
const AppState = {
    leads: [],
    filteredLeads: [],
    vendorCodes: new Set(),
    refreshTimer: null,
    expandedLeadId: null,
    allLeads: [],
    searchTerm: '',
    
    // Module instances
    paginationManager: null,
    chartsManager: null,
    
    // Initialize modules
    initModules() {
        this.paginationManager = new PaginationManager();
        this.chartsManager = new ChartsManager();
        
        // Listen for pagination changes
        document.addEventListener('paginationChanged', () => {
            this.renderLeads();
        });
    }
};

// DOM Elements
const elements = {
    vendorFilter: document.getElementById('vendor-filter'),
    searchInput: document.getElementById('lead-search'),
    refreshBtn: document.getElementById('refresh-btn'),
    autoRefreshCb: document.getElementById('auto-refresh'),
    leadsTable: document.getElementById('leads-table'),
    leadsBody: document.getElementById('leads-body'),
    loadingEl: document.getElementById('loading'),
    errorEl: document.getElementById('error'),
    noDataEl: document.getElementById('no-data'),
    addLeadBtn: document.getElementById('add-lead-btn'),
    
    // Export modal elements
    exportBtn: document.getElementById('export-btn'),
    exportModalOverlay: document.getElementById('export-modal-overlay'),
    exportModalClose: document.getElementById('export-modal-close'),
    exportVendorSelect: document.getElementById('export-vendor'),
    exportStartDate: document.getElementById('export-start-date'),
    exportEndDate: document.getElementById('export-end-date'),
    exportCancelBtn: document.getElementById('export-cancel'),
    exportDownloadBtn: document.getElementById('export-download')
};

// Main Application Class
class LeadManagerApp {
    constructor() {
        this.searchDebounceTimer = null;
        this.initialize();
    }
    
    async initialize() {
        try {
            // Initialize modules
            AppState.initModules();
            
            // Clear any mock data
            Utils.getFromLocalStorage('mockDataLoaded') && localStorage.removeItem('mockDataLoaded');
            
            // Setup authentication
            this.setupAuthentication();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load leads data
            await this.fetchLeads();
            
            // Setup export modal defaults
            this.setupExportDefaults();
            
            // Create modals
            this.createAddLeadModal();
            
            // Initialize UI enhancements
            this.initializeUI();
            
            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }
    
    setupAuthentication() {
        const token = localStorage.getItem('auth_token');
        const user = Utils.getFromLocalStorage('user', {});
        
        if (!token || !user.email) {
            window.location.href = 'login.html';
            return;
        }
        
        // Setup token refresh
        this.setupTokenRefresh();
        
        // Add user info to header
        this.addUserInfoToHeader(user);
    }
    
    setupTokenRefresh() {
        // Token refresh logic (simplified)
        const refreshCognitoToken = async () => {
            try {
                if (typeof AmazonCognitoIdentity === 'undefined') {
                    console.error('Cognito SDK not loaded, redirecting to login');
                    window.location.href = 'login.html';
                    return;
                }
                
                const cognitoConfig = Utils.getAppConfig();
                const userPool = new AmazonCognitoIdentity.CognitoUserPool({
                    UserPoolId: cognitoConfig.userPoolId,
                    ClientId: cognitoConfig.clientId
                });
                
                const currentUser = userPool.getCurrentUser();
                
                if (!currentUser) {
                    console.error('No user session found, redirecting to login');
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                
                // Refresh session
                await new Promise((resolve, reject) => {
                    currentUser.getSession((err, session) => {
                        if (err || !session?.isValid()) {
                            localStorage.clear();
                            window.location.href = 'login.html';
                            reject(err);
                            return;
                        }
                        
                        // Update tokens
                        const accessToken = session.getAccessToken().getJwtToken();
                        const idToken = session.getIdToken().getJwtToken();
                        
                        localStorage.setItem('accessToken', accessToken);
                        localStorage.setItem('idToken', idToken);
                        localStorage.setItem('auth_token', idToken);
                        
                        resolve();
                    });
                });
            } catch (error) {
                console.error('Token refresh error:', error);
                localStorage.clear();
                window.location.href = 'login.html';
            }
        };
        
        // Refresh now and setup periodic refresh
        refreshCognitoToken();
        setInterval(refreshCognitoToken, 2700000); // 45 minutes
    }
    
    addUserInfoToHeader(user) {
        const headerControls = document.querySelector('.controls');
        if (!headerControls) return;
        
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <span>Welcome, <strong>${user.name || user.email}</strong></span>
            <span class="role-badge ${user.role === 'admin' ? 'role-admin' : 'role-agent'}">
                ${user.role === 'admin' ? 'Admin' : 'Agent'}
            </span>
            <button id="logout-btn" class="btn btn-sm btn-secondary" style="margin-left: 10px;">Logout</button>
        `;
        headerControls.appendChild(userInfo);
        
        // Logout handler
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
        
        // Admin link
        if (user.role === 'admin') {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.className = 'btn';
            adminLink.textContent = 'Admin Panel';
            headerControls.insertBefore(adminLink, headerControls.firstChild);
        }
    }
    
    logout() {
        try {
            if (typeof AmazonCognitoIdentity !== 'undefined') {
                const cognitoConfig = Utils.getAppConfig();
                const userPool = new AmazonCognitoIdentity.CognitoUserPool({
                    UserPoolId: cognitoConfig.userPoolId,
                    ClientId: cognitoConfig.clientId
                });
                
                const currentUser = userPool.getCurrentUser();
                if (currentUser) {
                    currentUser.signOut();
                }
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    }
    
    setupEventListeners() {
        // Core functionality
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', () => this.fetchLeads());
        }
        if (elements.vendorFilter) {
            elements.vendorFilter.addEventListener('change', () => this.filterAndRenderLeads());
        }
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', (e) => this.debounceSearch(e));
        }
        if (elements.autoRefreshCb) {
            elements.autoRefreshCb.addEventListener('change', () => this.toggleAutoRefresh());
        }
        
        // Export functionality
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', () => this.openExportModal());
        }
        if (elements.exportModalClose) {
            elements.exportModalClose.addEventListener('click', () => this.closeExportModal());
        }
        if (elements.exportCancelBtn) {
            elements.exportCancelBtn.addEventListener('click', () => this.closeExportModal());
        }
        if (elements.exportDownloadBtn) {
            elements.exportDownloadBtn.addEventListener('click', () => this.exportLeadsToCsv());
        }
        
        // Add lead functionality
        if (elements.addLeadBtn) {
            elements.addLeadBtn.addEventListener('click', () => this.openAddLeadModal());
        }
    }
    
    debounceSearch(e) {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
            this.handleSearch(e);
        }, 300);
    }
    
    handleSearch(e) {
        AppState.searchTerm = e.target.value.toLowerCase().trim();
        
        // Close any expanded rows
        if (AppState.expandedLeadId) {
            const expandedRow = document.getElementById(`detail-${AppState.expandedLeadId}`);
            if (expandedRow) {
                expandedRow.remove();
            }
            
            const expandedLeadRow = document.querySelector('tr.expanded');
            if (expandedLeadRow) {
                expandedLeadRow.classList.remove('expanded');
            }
        }
        
        this.filterAndRenderLeads();
        
        // Show appropriate messages
        if (AppState.filteredLeads.length === 0 && AppState.searchTerm) {
            elements.noDataEl.textContent = `No leads found matching "${AppState.searchTerm}"`;
            elements.noDataEl.style.display = 'block';
            elements.leadsTable.style.display = 'none';
        } else if (AppState.filteredLeads.length > 0) {
            elements.noDataEl.style.display = 'none';
            elements.leadsTable.style.display = 'table';
        }
    }
    
    filterAndRenderLeads() {
        // Filter by vendor
        const vendorCode = elements.vendorFilter.value;
        let resultsToFilter = AppState.leads;
        
        if (vendorCode) {
            resultsToFilter = AppState.leads.filter(lead => lead.vendor_code === vendorCode);
        }
        
        // Filter by search term
        if (AppState.searchTerm) {
            AppState.filteredLeads = resultsToFilter.filter(lead => {
                const searchableContent = [
                    `${lead.first_name} ${lead.last_name}`,
                    lead.email,
                    lead.phone_home,
                    lead.lead_id,
                    lead.zip_code,
                    lead.city,
                    lead.state,
                    lead.notes,
                    lead.disposition,
                    lead.accident_date,
                    lead.accident_location,
                    `${lead.city} ${lead.state} ${lead.zip_code}`
                ].filter(Boolean).join(' ').toLowerCase();
                
                return searchableContent.includes(AppState.searchTerm);
            });
        } else {
            AppState.filteredLeads = resultsToFilter;
        }
        
        // Reset pagination and render
        AppState.paginationManager.resetToFirstPage();
        AppState.expandedLeadId = null;
        this.renderLeads();
    }
    
    async fetchLeads() {
        const startTime = performance.now();
        this.showLoading(true, 'Fetching leads...');
        this.hideError();
        
        try {
            const vendorCode = elements.vendorFilter.value;
            let url = API_ENDPOINT;
            if (vendorCode) {
                url += `?vendor_code=${vendorCode}`;
            }
            
            const token = localStorage.getItem('auth_token');
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const newLeads = await response.json();
            
            // Preserve existing disposition/notes data
            const existingLeads = Utils.getFromLocalStorage('leads', []);
            const existingLeadsMap = new Map();
            
            existingLeads.forEach(lead => {
                existingLeadsMap.set(lead.lead_id, {
                    disposition: lead.disposition,
                    notes: lead.notes,
                    updated_at: lead.updated_at
                });
            });
            
            // Merge new data with existing
            AppState.leads = newLeads.map(lead => {
                const existingData = existingLeadsMap.get(lead.lead_id);
                
                return {
                    ...lead,
                    disposition: existingData?.disposition || lead.disposition || 'New',
                    notes: existingData?.notes || lead.notes || '',
                    updated_at: existingData?.updated_at || lead.updated_at || lead.timestamp
                };
            });
            
            // Store updated leads
            Utils.updateLocalStorage('leads', AppState.leads);
            
            // Store all leads for export if no vendor filter
            if (!vendorCode) {
                AppState.allLeads = [...AppState.leads];
            }
            
            // Update UI
            this.updateVendorOptions();
            this.filterAndRenderLeads();
            
            // Update charts and animations
            AppState.chartsManager.initializeStatsAnimation();
            AppState.chartsManager.initializeCharts();
            
            Utils.logPerformance('Fetch Leads', startTime);
            
        } catch (error) {
            console.error('Error fetching leads:', error);
            this.showError('Failed to fetch leads. Please check your API endpoint and try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    renderLeads() {
        // Update pagination with filtered leads
        AppState.paginationManager.setFilteredLeads(AppState.filteredLeads);
        
        // Get leads for current page
        const leadsToShow = AppState.paginationManager.getCurrentPageLeads();
        
        // Clear existing rows
        elements.leadsBody.innerHTML = '';
        
        // Show/hide table and pagination
        if (AppState.filteredLeads.length === 0) {
            elements.noDataEl.style.display = 'block';
            elements.leadsTable.style.display = 'none';
            return;
        }
        
        elements.noDataEl.style.display = 'none';
        elements.leadsTable.style.display = 'table';
        
        // Update pagination controls
        AppState.paginationManager.updateControls();
        
        // Render leads for current page
        leadsToShow.forEach(lead => {
            const row = this.createLeadRow(lead);
            elements.leadsBody.appendChild(row);
        });
    }
    
    createLeadRow(lead) {
        const row = document.createElement('tr');
        row.dataset.leadId = lead.lead_id;
        row.classList.add('lead-row');
        
        row.innerHTML = `
            <td class="lead-name">
                <div class="name-cell">
                    <span>${Utils.escapeHtml(lead.first_name)} ${Utils.escapeHtml(lead.last_name)}</span>
                    <button class="details-btn" title="Show Details">
                        <span class="details-icon">▼</span>
                    </button>
                </div>
            </td>
            <td>
                <div class="contact-info">
                    <div class="phone">${Utils.escapeHtml(lead.phone_home || '')}</div>
                    <div class="email">${Utils.escapeHtml(lead.email || '')}</div>
                </div>
            </td>
            <td>${Utils.escapeHtml(lead.incident_type || '')}</td>
            <td>
                <select class="disposition-select" data-lead-id="${lead.lead_id}">
                    <option value="New" ${(lead.disposition || 'New') === 'New' ? 'selected' : ''}>New</option>
                    <option value="Retained for Firm" ${lead.disposition === 'Retained for Firm' ? 'selected' : ''}>Retained for Firm</option>
                    <option value="Docs Sent" ${lead.disposition === 'Docs Sent' ? 'selected' : ''}>Docs Sent</option>
                    <option value="Awaiting Proof of Claim" ${lead.disposition === 'Awaiting Proof of Claim' ? 'selected' : ''}>Awaiting Proof of Claim</option>
                    <option value="Not Interested" ${lead.disposition === 'Not Interested' ? 'selected' : ''}>Not Interested</option>
                    <option value="Not Qualified Lead" ${lead.disposition === 'Not Qualified Lead' ? 'selected' : ''}>Not Qualified Lead</option>
                </select>
            </td>
            <td>${Utils.getLocationDisplay(lead)}</td>
            <td>${Utils.escapeHtml(lead.vendor_code || '')}</td>
            <td>${Utils.formatDate(lead.timestamp, true)}</td>
        `;
        
        // Add event listeners
        this.attachRowEventListeners(row, lead);
        
        return row;
    }
    
    attachRowEventListeners(row, lead) {
        // Details button
        const detailsBtn = row.querySelector('.details-btn');
        detailsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLeadDetails(lead);
        });
        
        // Disposition select
        const dispositionSelect = row.querySelector('.disposition-select');
        dispositionSelect.addEventListener('change', async (e) => {
            e.stopPropagation();
            await this.updateLeadDisposition(e.target.dataset.leadId, e.target.value, lead.notes || '');
        });
        
        // Row click
        row.addEventListener('click', (e) => {
            if (!e.target.closest('select') && !e.target.closest('button')) {
                this.toggleLeadDetails(lead);
            }
        });
    }
    
    // Utility methods
    showLoading(show, message = 'Loading...') {
        if (show) {
            elements.loadingEl.textContent = message;
            elements.loadingEl.style.display = 'block';
            this.disableControls(true);
            document.body.classList.add('loading-state');
        } else {
            elements.loadingEl.style.display = 'none';
            this.disableControls(false);
            document.body.classList.remove('loading-state');
        }
    }
    
    disableControls(disabled) {
        const controls = [
            elements.refreshBtn, elements.vendorFilter, elements.searchInput,
            elements.addLeadBtn, elements.exportBtn
        ];
        
        controls.forEach(control => {
            if (control) control.disabled = disabled;
        });
    }
    
    showError(message, isDuplicate = false) {
        elements.errorEl.textContent = message;
        elements.errorEl.style.display = 'block';
        elements.errorEl.classList.toggle('duplicate-error', isDuplicate);
    }
    
    hideError() {
        elements.errorEl.style.display = 'none';
        elements.errorEl.classList.remove('duplicate-error');
    }
    
    // Additional methods would go here for modal management, auto-refresh, etc.
    // This is a condensed version focusing on core functionality
    
    initializeUI() {
        // Focus search input
        if (elements.searchInput) {
            elements.searchInput.focus();
        }
        
        // Hide skeleton loader
        const skeleton = document.getElementById('skeleton-loader');
        if (skeleton) {
            skeleton.style.transition = 'opacity 0.3s ease';
            skeleton.style.opacity = '0';
            setTimeout(() => skeleton.remove(), 300);
        }
        
        // Initialize animations after delay
        requestAnimationFrame(() => {
            setTimeout(() => {
                AppState.chartsManager.initializeStatsAnimation();
                AppState.chartsManager.initializeCharts();
            }, 100);
        });
    }
    
    // Placeholder methods for remaining functionality
    toggleAutoRefresh() { /* Implementation */ }
    openExportModal() { /* Implementation */ }
    closeExportModal() { /* Implementation */ }
    exportLeadsToCsv() { /* Implementation */ }
    openAddLeadModal() { /* Implementation */ }
    createAddLeadModal() { /* Implementation */ }
    updateVendorOptions() { /* Implementation */ }
    toggleLeadDetails(lead) { /* Implementation */ }
    updateLeadDisposition(leadId, disposition, notes) { /* Implementation */ }
    setupExportDefaults() { /* Implementation */ }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LeadManagerApp();
});

console.log('🚀 Core application loaded - modules ready'); 