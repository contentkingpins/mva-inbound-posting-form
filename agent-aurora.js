// Professional Agent Dashboard - Legal Lead Management

// Global state
let availableLeads = [];
let myLeads = [];
let currentUser = null;
let API_ENDPOINT = '';

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard().catch(error => {
        console.error('Failed to initialize dashboard:', error);
    });
    
    // Set up auto-refresh for real-time updates
    setInterval(refreshDashboard, 15000); // Refresh every 15 seconds
});

// Initialize dashboard features
async function initializeDashboard() {
    try {
        // Get API endpoint from config
        API_ENDPOINT = window.APP_CONFIG.apiEndpoint;
        
        // Get current user data
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            throw new Error('User data not found');
        }
        currentUser = JSON.parse(userStr);

        // Initialize components
        initializeEventListeners();
        await loadDashboardData();
        
        // Set up auto-refresh for real-time updates
        setInterval(refreshDashboard, 15000); // Refresh every 15 seconds
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showError('Failed to initialize dashboard components');
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.authService.signOut();
        });
    }

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tabId = e.target.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Lead action buttons
    document.addEventListener('click', (e) => {
        if (e.target.matches('.claim-lead-btn')) {
            const leadId = e.target.getAttribute('data-lead-id');
            claimLead(leadId);
        } else if (e.target.matches('.update-status-btn')) {
            const leadId = e.target.getAttribute('data-lead-id');
            updateLeadStatus(leadId);
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadAvailableLeads(),
            loadMyLeads()
        ]);
        updateDashboardUI();
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showError('Failed to load leads data');
    }
}

// Refresh dashboard
async function refreshDashboard() {
    try {
        // Verify auth is still valid
        const authResult = await window.authService.checkAuth();
        if (!authResult.isAuthenticated) {
            throw new Error('Session expired');
        }

        // Refresh data
        await loadDashboardData();
    } catch (error) {
        console.error('Dashboard refresh failed:', error);
        showError('Failed to refresh dashboard data');
    }
}

// Load available leads
async function loadAvailableLeads() {
    try {
        const response = await fetch(`${API_ENDPOINT}/leads?status=new`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch available leads');
        }

        const data = await response.json();
        availableLeads = data.leads || [];
    } catch (error) {
        console.error('Failed to load available leads:', error);
        throw error;
    }
}

// Load my leads
async function loadMyLeads() {
    try {
        const response = await fetch(`${API_ENDPOINT}/leads?assigned_to=${currentUser.email}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch my leads');
        }

        const data = await response.json();
        myLeads = data.leads || [];
    } catch (error) {
        console.error('Failed to load my leads:', error);
        throw error;
    }
}

// Update dashboard UI
function updateDashboardUI() {
    updateAvailableLeadsUI();
    updateMyLeadsUI();
    updateStatistics();
}

// Show error message
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}

// Switch between tabs
function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

// Update available leads UI
function updateAvailableLeadsUI() {
    const container = document.getElementById('available-leads');
    if (!container) return;

    container.innerHTML = availableLeads.map(lead => `
        <div class="lead-card">
            <h3>${lead.first_name} ${lead.last_name}</h3>
            <p>${lead.email}</p>
            <p>${lead.phone}</p>
            <button class="claim-lead-btn" data-lead-id="${lead.lead_id}">Claim Lead</button>
        </div>
    `).join('');
}

// Update my leads UI
function updateMyLeadsUI() {
    const container = document.getElementById('my-leads');
    if (!container) return;

    container.innerHTML = myLeads.map(lead => `
        <div class="lead-card">
            <h3>${lead.first_name} ${lead.last_name}</h3>
            <p>Status: ${lead.disposition}</p>
            <p>${lead.email}</p>
            <p>${lead.phone}</p>
            <button class="update-status-btn" data-lead-id="${lead.lead_id}">Update Status</button>
        </div>
    `).join('');

    // Update badge count
    const badge = document.getElementById('my-leads-count');
    if (badge) {
        badge.textContent = myLeads.length;
    }
}

// Update statistics
function updateStatistics() {
    const closedLeads = myLeads.filter(lead => lead.disposition === 'Closed').length;
    const conversionRate = myLeads.length ? (closedLeads / myLeads.length * 100).toFixed(1) : 0;

    document.getElementById('total-leads').textContent = myLeads.length;
    document.getElementById('closed-leads').textContent = closedLeads;
    document.getElementById('conversion-rate').textContent = `${conversionRate}%`;
}

// Claim a lead
async function claimLead(leadId) {
    try {
        const response = await fetch(`${API_ENDPOINT}/leads/${leadId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                assigned_to: currentUser.email,
                disposition: 'Assigned'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to claim lead');
        }

        // Refresh dashboard data
        await loadDashboardData();
    } catch (error) {
        console.error('Failed to claim lead:', error);
        showError('Failed to claim lead');
    }
}

// Update lead status
async function updateLeadStatus(leadId) {
    try {
        const lead = myLeads.find(l => l.lead_id === leadId);
        if (!lead) {
            throw new Error('Lead not found');
        }

        const newStatus = prompt('Enter new status:', lead.disposition);
        if (!newStatus) return;

        const response = await fetch(`${API_ENDPOINT}/leads/${leadId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                disposition: newStatus
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update lead status');
        }

        // Refresh dashboard data
        await loadDashboardData();
    } catch (error) {
        console.error('Failed to update lead status:', error);
        showError('Failed to update lead status');
    }
}

// Utility Functions
function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStatusClass(disposition) {
    const statusMap = {
        'New': 'new',
        'Contacted': 'contacted',
        'Qualified': 'qualified',
        'Retained for Firm': 'retained',
        'Docs Sent': 'qualified',
        'Awaiting Proof of Claim': 'contacted',
        'Not Interested': 'lost',
        'Not Qualified Lead': 'lost'
    };
    return statusMap[disposition] || 'new';
}

// Notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: var(--glass-white);
        backdrop-filter: blur(12px);
        border: 1px solid var(--glass-border);
        border-radius: 8px;
        padding: 1rem 1.5rem;
        color: var(--text-primary);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    // Add type-specific styling
    if (type === 'success') {
        notification.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        notification.style.background = 'rgba(16, 185, 129, 0.1)';
    } else if (type === 'error') {
        notification.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        notification.style.background = 'rgba(239, 68, 68, 0.1)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Loading States
function showLoadingState() {
    document.querySelectorAll('.leads-grid').forEach(grid => {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 2rem;">
                <div class="loading-skeleton" style="width: 100%; height: 120px; margin-bottom: 1rem;"></div>
                <div class="loading-skeleton" style="width: 100%; height: 120px; margin-bottom: 1rem;"></div>
                <div class="loading-skeleton" style="width: 100%; height: 120px;"></div>
            </div>
        `;
    });
}

function hideLoadingState() {
    // Loading state will be replaced by actual content
}

// Logout
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Mock Data Generators
function generateMockAvailableLeads() {
    return [
        {
            lead_id: 'lead-001',
            first_name: 'John',
            last_name: 'Smith',
            email: 'john.smith@email.com',
            phone_home: '5551234567',
            city: 'Miami',
            state: 'FL',
            zip_code: '33101',
            incident_type: 'MVA',
            accident_location: 'I-95 and SW 8th St',
            caller_at_fault: 'no',
            has_attorney: 'no',
            was_injured: 'yes',
            medical_within_30_days: 'yes',
            notes: 'Rear-ended at traffic light',
            created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
            lead_id: 'lead-002',
            first_name: 'Sarah',
            last_name: 'Johnson',
            email: 'sarah.j@email.com',
            phone_home: '5559876543',
            city: 'Orlando',
            state: 'FL',
            zip_code: '32801',
            incident_type: 'CMVA',
            accident_location: 'Turnpike Mile Marker 254',
            caller_at_fault: 'no',
            has_attorney: 'no',
            was_injured: 'yes',
            medical_within_30_days: 'yes',
            notes: 'Hit by commercial truck',
            created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
            lead_id: 'lead-003',
            first_name: 'Michael',
            last_name: 'Davis',
            email: 'mdavis@email.com',
            phone_home: '5555551212',
            city: 'Tampa',
            state: 'FL',
            zip_code: '33602',
            incident_type: 'PI',
            accident_location: 'Walmart on Dale Mabry',
            caller_at_fault: 'no',
            has_attorney: 'no',
            was_injured: 'yes',
            medical_within_30_days: 'yes',
            notes: 'Slip and fall in store',
            created_at: new Date(Date.now() - 10800000).toISOString()
        }
    ];
}

function generateMockMyLeads() {
    return [
        {
            lead_id: 'my-lead-001',
            first_name: 'Emily',
            last_name: 'Wilson',
            email: 'emily.w@email.com',
            phone_home: '5553334444',
            city: 'Fort Lauderdale',
            state: 'FL',
            zip_code: '33301',
            incident_type: 'MVA',
            accident_location: 'I-595 and University Dr',
            caller_at_fault: 'no',
            has_attorney: 'no',
            was_injured: 'yes',
            medical_within_30_days: 'yes',
            disposition: 'Contacted',
            notes: 'Spoke with client, very interested in representation',
            claimedAt: new Date(Date.now() - 86400000).toISOString(),
            claimedBy: currentUser?.email || 'agent@example.com'
        },
        {
            lead_id: 'my-lead-002',
            first_name: 'Robert',
            last_name: 'Brown',
            email: 'rbrown@email.com',
            phone_home: '5557778888',
            city: 'Jacksonville',
            state: 'FL',
            zip_code: '32202',
            incident_type: 'PFAS',
            accident_location: 'Naval Air Station Jacksonville',
            caller_at_fault: 'no',
            has_attorney: 'no',
            was_injured: 'yes',
            medical_within_30_days: 'yes',
            disposition: 'Retained for Firm',
            notes: 'Client signed retainer, gathering medical records',
            claimedAt: new Date(Date.now() - 172800000).toISOString(),
            claimedBy: currentUser?.email || 'agent@example.com',
            docusign_info: {
                status: 'completed',
                sentAt: new Date(Date.now() - 86400000).toISOString(),
                completedAt: new Date(Date.now() - 43200000).toISOString()
            }
        }
    ];
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style); 