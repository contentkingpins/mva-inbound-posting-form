// Agent Aurora Dashboard JavaScript
// Professional Lead Management System for Legal Agents

// Global variables
let currentUser = null;
let authToken = null;
let availableLeads = [];
let myLeads = [];
let refreshInterval = null;
let searchTimeout = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Agent Aurora Dashboard Initializing...');
    
    // Check authentication first
    checkAuth().then(() => {
        initializeDashboard();
        setupEventListeners();
        loadDashboardData();
        startAutoRefresh();
    }).catch(error => {
        console.error('Authentication failed:', error);
        redirectToLogin();
    });
});

/**
 * Authentication Functions
 */
async function checkAuth() {
    try {
        // Get auth token from localStorage
        authToken = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('user');
        
        if (!authToken || !userStr) {
            throw new Error('No authentication data found');
        }
        
        // Parse user data
        currentUser = JSON.parse(userStr);
        
        // Verify user has agent role
        if (currentUser.role !== 'agent' && currentUser['custom:role'] !== 'agent') {
            throw new Error('Access denied: Agent role required');
        }
        
        console.log('✅ Authentication verified for agent:', currentUser.email);
        
        // Update UI with user info
        document.getElementById('agent-name').textContent = currentUser.name || currentUser.email.split('@')[0];
        
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        throw error;
    }
}

function logout() {
    // Clear all stored data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('idToken');
    sessionStorage.clear();
    
    // Stop refresh interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Redirect to login
    window.location.href = 'login.html';
}

function redirectToLogin() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

/**
 * API Functions
 */
async function makeAuthenticatedRequest(endpoint, options = {}) {
    const config = {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    try {
        const response = await fetch(`${window.APP_CONFIG.apiEndpoint}${endpoint}`, config);
        
        if (response.status === 401) {
            console.warn('Authentication expired, redirecting to login');
            redirectToLogin();
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Dashboard Initialization
 */
function initializeDashboard() {
    console.log('📊 Initializing dashboard components...');
    
    // Initialize stats with loading state
    updateStats({
        available: '-',
        active: '-',
        retained: '-',
        conversionRate: '-%'
    });
    
    // Show loading states
    showLoadingState('available-leads-grid');
    showLoadingState('my-leads-grid');
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-leads');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterLeads(e.target.value);
            }, 300);
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('filter-status');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            filterMyLeads(e.target.value);
        });
    }
    
    // Modal close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeLeadModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLeadModal();
        }
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
            refreshLeads();
        }
    });
}

/**
 * Data Loading Functions
 */
async function loadDashboardData() {
    try {
        console.log('📥 Loading dashboard data...');
        
        // Load leads data
        await Promise.all([
            loadAvailableLeads(),
            loadMyLeads(),
            loadStats()
        ]);
        
        console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

async function loadAvailableLeads() {
    try {
        const response = await makeAuthenticatedRequest('/leads?status=new&unassigned=true&limit=50');
        availableLeads = response.leads || [];
        
        console.log(`📋 Loaded ${availableLeads.length} available leads`);
        renderAvailableLeads(availableLeads);
        
        return availableLeads;
    } catch (error) {
        console.error('Failed to load available leads:', error);
        showEmptyState('available-leads-grid', 'Failed to load available leads');
        return [];
    }
}

async function loadMyLeads() {
    try {
        const response = await makeAuthenticatedRequest(`/leads?assigned_agent=${currentUser.email}&limit=100`);
        myLeads = response.leads || [];
        
        console.log(`👤 Loaded ${myLeads.length} assigned leads`);
        renderMyLeads(myLeads);
        
        return myLeads;
    } catch (error) {
        console.error('Failed to load my leads:', error);
        showEmptyState('my-leads-grid', 'Failed to load your leads');
        return [];
    }
}

async function loadStats() {
    try {
        // Calculate stats from loaded data
        const availableCount = availableLeads.length;
        const activeCount = myLeads.filter(lead => 
            lead.disposition && !['Closed', 'Rejected'].includes(lead.disposition)
        ).length;
        const retainedCount = myLeads.filter(lead => 
            lead.disposition === 'Retained for Firm' || lead.disposition === 'Closed'
        ).length;
        const conversionRate = myLeads.length > 0 ? 
            Math.round((retainedCount / myLeads.length) * 100) : 0;
        
        updateStats({
            available: availableCount,
            active: activeCount,
            retained: retainedCount,
            conversionRate: `${conversionRate}%`
        });
        
    } catch (error) {
        console.error('Failed to calculate stats:', error);
    }
}

/**
 * Rendering Functions
 */
function renderAvailableLeads(leads) {
    const container = document.getElementById('available-leads-grid');
    
    if (!leads || leads.length === 0) {
        showEmptyState('available-leads-grid', 'No available leads at the moment');
        return;
    }
    
    container.innerHTML = leads.map(lead => createLeadCard(lead, 'available')).join('');
}

function renderMyLeads(leads) {
    const container = document.getElementById('my-leads-grid');
    
    if (!leads || leads.length === 0) {
        showEmptyState('my-leads-grid', 'No leads assigned to you yet');
        return;
    }
    
    container.innerHTML = leads.map(lead => createLeadCard(lead, 'assigned')).join('');
}

function createLeadCard(lead, type) {
    const createdDate = new Date(lead.created_date || lead.timestamp);
    const timeAgo = getTimeAgo(createdDate);
    const leadValue = lead.lead_value || 35;
    const status = lead.disposition || 'New';
    
    return `
        <div class="lead-card" onclick="openLeadModal('${lead.lead_id}', '${type}')">
            <div class="lead-header">
                <h3 class="lead-name">${lead.first_name} ${lead.last_name}</h3>
                <span class="lead-value">$${leadValue}</span>
            </div>
            
            <div class="lead-details">
                <div class="lead-detail">
                    <span>📧</span>
                    <span>${lead.email}</span>
                </div>
                <div class="lead-detail">
                    <span>📞</span>
                    <span>${lead.phone}</span>
                </div>
                ${lead.vendor_code ? `
                <div class="lead-detail">
                    <span>🏢</span>
                    <span>${lead.vendor_code}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="lead-footer">
                <span class="lead-status ${status.toLowerCase().replace(/\s+/g, '-')}">${status}</span>
                <span class="lead-time">${timeAgo}</span>
            </div>
        </div>
    `;
}

function updateStats(stats) {
    document.getElementById('available-count').textContent = stats.available;
    document.getElementById('active-count').textContent = stats.active;
    document.getElementById('retained-count').textContent = stats.retained;
    document.getElementById('conversion-rate').textContent = stats.conversionRate;
}

/**
 * Lead Management Functions
 */
async function claimLead(leadId) {
    try {
        showToast('Claiming lead...', 'info');
        
        await makeAuthenticatedRequest(`/leads/${leadId}`, {
            method: 'PUT',
            body: JSON.stringify({
                assigned_agent: currentUser.email,
                disposition: 'Contacted',
                notes: 'Lead claimed by agent'
            })
        });
        
        showToast('Lead claimed successfully!', 'success');
        
        // Refresh data
        await loadDashboardData();
        closeLeadModal();
        
    } catch (error) {
        console.error('Failed to claim lead:', error);
        showToast('Failed to claim lead', 'error');
    }
}

async function updateLeadStatus(leadId, newStatus, notes = '') {
    try {
        showToast('Updating lead...', 'info');
        
        const updateData = {
            disposition: newStatus
        };
        
        if (notes) {
            updateData.notes = notes;
        }
        
        if (newStatus === 'Closed' || newStatus === 'Retained for Firm') {
            updateData.closed_date = new Date().toISOString();
        }
        
        await makeAuthenticatedRequest(`/leads/${leadId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        showToast('Lead updated successfully!', 'success');
        
        // Refresh data
        await loadDashboardData();
        closeLeadModal();
        
    } catch (error) {
        console.error('Failed to update lead:', error);
        showToast('Failed to update lead', 'error');
    }
}

/**
 * Modal Functions
 */
function openLeadModal(leadId, type) {
    const lead = type === 'available' ? 
        availableLeads.find(l => l.lead_id === leadId) :
        myLeads.find(l => l.lead_id === leadId);
    
    if (!lead) {
        showToast('Lead not found', 'error');
        return;
    }
    
    const modal = document.getElementById('lead-modal');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('lead-details');
    const actionBtn = document.getElementById('modal-action-btn');
    
    title.textContent = `${lead.first_name} ${lead.last_name}`;
    
    content.innerHTML = `
        <div style="display: grid; gap: 1rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <strong>Email:</strong><br>
                    <span style="color: var(--text-secondary);">${lead.email}</span>
                </div>
                <div>
                    <strong>Phone:</strong><br>
                    <span style="color: var(--text-secondary);">${lead.phone}</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <strong>Status:</strong><br>
                    <span class="lead-status ${(lead.disposition || 'new').toLowerCase().replace(/\s+/g, '-')}">${lead.disposition || 'New'}</span>
                </div>
                <div>
                    <strong>Value:</strong><br>
                    <span style="color: var(--accent); font-weight: 600;">$${lead.lead_value || 35}</span>
                </div>
            </div>
            
            ${lead.vendor_code ? `
            <div>
                <strong>Vendor:</strong><br>
                <span style="color: var(--text-secondary);">${lead.vendor_code}</span>
            </div>
            ` : ''}
            
            <div>
                <strong>Created:</strong><br>
                <span style="color: var(--text-secondary);">${new Date(lead.created_date || lead.timestamp).toLocaleString()}</span>
            </div>
            
            ${lead.notes ? `
            <div>
                <strong>Notes:</strong><br>
                <span style="color: var(--text-secondary);">${lead.notes}</span>
            </div>
            ` : ''}
            
            ${type === 'assigned' ? `
            <div>
                <label for="status-select" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Update Status:</label>
                <select id="status-select" class="glass-input" style="width: 100%;">
                    <option value="New" ${lead.disposition === 'New' ? 'selected' : ''}>New</option>
                    <option value="Contacted" ${lead.disposition === 'Contacted' ? 'selected' : ''}>Contacted</option>
                    <option value="Qualified" ${lead.disposition === 'Qualified' ? 'selected' : ''}>Qualified</option>
                    <option value="Retained for Firm" ${lead.disposition === 'Retained for Firm' ? 'selected' : ''}>Retained for Firm</option>
                    <option value="Docs Sent" ${lead.disposition === 'Docs Sent' ? 'selected' : ''}>Docs Sent</option>
                    <option value="Closed" ${lead.disposition === 'Closed' ? 'selected' : ''}>Closed</option>
                    <option value="Rejected" ${lead.disposition === 'Rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            </div>
            
            <div>
                <label for="notes-input" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Add Notes:</label>
                <textarea id="notes-input" class="glass-input" placeholder="Enter notes about this lead..." style="width: 100%; min-height: 80px; resize: vertical;"></textarea>
            </div>
            ` : ''}
        </div>
    `;
    
    // Setup action button
    if (type === 'available') {
        actionBtn.textContent = 'Claim Lead';
        actionBtn.style.display = 'block';
        actionBtn.onclick = () => claimLead(leadId);
    } else {
        actionBtn.textContent = 'Update Lead';
        actionBtn.style.display = 'block';
        actionBtn.onclick = () => {
            const newStatus = document.getElementById('status-select').value;
            const notes = document.getElementById('notes-input').value;
            updateLeadStatus(leadId, newStatus, notes);
        };
    }
    
    modal.style.display = 'flex';
}

function closeLeadModal() {
    const modal = document.getElementById('lead-modal');
    modal.style.display = 'none';
}

/**
 * Filter Functions
 */
function filterLeads(searchTerm) {
    if (!searchTerm) {
        renderAvailableLeads(availableLeads);
        return;
    }
    
    const filtered = availableLeads.filter(lead => 
        lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        (lead.vendor_code && lead.vendor_code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    renderAvailableLeads(filtered);
}

function filterMyLeads(status) {
    if (status === 'all') {
        renderMyLeads(myLeads);
        return;
    }
    
    const filtered = myLeads.filter(lead => 
        (lead.disposition || 'new').toLowerCase() === status.toLowerCase()
    );
    
    renderMyLeads(filtered);
}

/**
 * Refresh Functions
 */
async function refreshLeads() {
    console.log('🔄 Refreshing leads data...');
    showToast('Refreshing data...', 'info');
    
    try {
        await loadDashboardData();
        showToast('Data refreshed successfully!', 'success');
    } catch (error) {
        console.error('Failed to refresh data:', error);
        showToast('Failed to refresh data', 'error');
    }
}

function startAutoRefresh() {
    // Refresh data every 2 minutes
    refreshInterval = setInterval(() => {
        console.log('🔄 Auto-refreshing data...');
        loadDashboardData();
    }, 120000);
}

/**
 * Utility Functions
 */
function showLoadingState(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading...</p>
        </div>
    `;
}

function showEmptyState(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <p>${message}</p>
        </div>
    `;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

// Export functions for global access
window.refreshLeads = refreshLeads;
window.openLeadModal = openLeadModal;
window.closeLeadModal = closeLeadModal;
window.logout = logout;

console.log('✅ Agent Aurora Dashboard JavaScript loaded successfully'); 