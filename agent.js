// Agent Dashboard JavaScript

// Global variables
let availableLeads = [];
let myLeads = [];
let currentUser = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    
    // Initialize components
    initializeEventListeners();
    loadDashboardData();
    
    // Set up auto-refresh
    setInterval(refreshAvailableLeads, 30000); // Refresh every 30 seconds
});

// Authentication check
function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user.email) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }
    
    // Check if user is an agent (not admin)
    if (user.role === 'admin') {
        // Redirect admins to admin dashboard
        window.location.href = 'admin.html';
        return;
    }
    
    currentUser = user;
    
    // Set agent name
    document.getElementById('agent-name').textContent = user.name || user.email.split('@')[0];
}

// Logout function
function logout() {
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('cognitoUser');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Show logout message
    showToast('Logging out...', 'info');
    
    // Redirect to login page
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}

// Initialize event listeners
function initializeEventListeners() {
    // Search functionality
    document.getElementById('search-available').addEventListener('input', (e) => {
        filterAvailableLeads(e.target.value);
    });
    
    // Filter functionality
    document.getElementById('filter-my-leads').addEventListener('change', (e) => {
        filterMyLeads(e.target.value);
    });
    
    // Modal close on outside click
    document.getElementById('lead-details-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal('lead-details-modal');
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load available leads
        await loadAvailableLeads();
        
        // Load my leads
        await loadMyLeads();
        
        // Update stats
        updateStats();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading data. Please refresh the page.', 'error');
    }
}

// Load available leads
async function loadAvailableLeads() {
    try {
        // Show loading state
        document.getElementById('available-leads-grid').innerHTML = `
            <div class="loading-placeholder">
                <div class="spinner"></div>
                <p>Loading available leads...</p>
            </div>
        `;
        
        // In a real app, this would be an API call
        // For now, using mock data
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        
        availableLeads = generateMockAvailableLeads();
        renderAvailableLeads();
    } catch (error) {
        console.error('Error loading available leads:', error);
        document.getElementById('available-leads-grid').innerHTML = `
            <div class="empty-message">Error loading leads. Please try again.</div>
        `;
    }
}

// Load my leads
async function loadMyLeads() {
    try {
        // In a real app, this would be an API call
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
        
        myLeads = generateMockMyLeads();
        renderMyLeads();
    } catch (error) {
        console.error('Error loading my leads:', error);
    }
}

// Render available leads
function renderAvailableLeads(leads = availableLeads) {
    const grid = document.getElementById('available-leads-grid');
    
    if (leads.length === 0) {
        grid.innerHTML = `
            <div class="empty-message">No available leads at the moment.</div>
        `;
        return;
    }
    
    grid.innerHTML = leads.map(lead => `
        <div class="lead-card" onclick="showLeadDetails('${lead.id}')">
            <div class="lead-card-header">
                <div class="lead-name">${lead.name}</div>
                <div class="lead-email">${lead.email}</div>
            </div>
            <div class="lead-details">
                <div class="lead-detail">📱 ${lead.phone}</div>
                <div class="lead-detail">📍 ${lead.location}</div>
            </div>
            <div class="lead-tags">
                ${lead.services.map(service => `<span class="lead-tag">${service}</span>`).join('')}
            </div>
            <div class="lead-actions">
                <span class="lead-time">${getTimeAgo(lead.createdAt)}</span>
                <button class="btn btn-sm btn-primary" onclick="claimLead(event, '${lead.id}')">
                    Claim Lead
                </button>
            </div>
        </div>
    `).join('');
}

// Render my leads
function renderMyLeads(leads = myLeads) {
    const tbody = document.getElementById('my-leads-tbody');
    
    if (leads.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">
                    <div class="empty-message">
                        <p>No active leads yet. Claim some from the available pool above!</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = leads.map(lead => `
        <tr>
            <td>
                <div class="lead-name">${lead.name}</div>
                <div class="lead-email">${lead.email}</div>
            </td>
            <td>${lead.phone}</td>
            <td>
                <span class="status-badge status-${lead.status.toLowerCase()}">${lead.status}</span>
            </td>
            <td>${formatDate(lead.claimedAt)}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="updateLeadStatus('${lead.id}')">
                    Update
                </button>
                <button class="btn btn-sm btn-secondary" onclick="showLeadDetails('${lead.id}', true)">
                    Details
                </button>
            </td>
        </tr>
    `).join('');
}

// Update stats
function updateStats() {
    // Available leads count
    document.getElementById('available-leads').textContent = availableLeads.length;
    
    // My leads count
    document.getElementById('my-leads').textContent = myLeads.length;
    
    // Completed retainers (mock data)
    const completedThisMonth = myLeads.filter(lead => 
        lead.status === 'Completed' && isThisMonth(lead.completedAt)
    ).length;
    document.getElementById('completed-retainers').textContent = completedThisMonth;
    
    // Conversion rate
    const conversionRate = myLeads.length > 0 
        ? Math.round((completedThisMonth / myLeads.length) * 100)
        : 0;
    document.getElementById('conversion-rate').textContent = conversionRate + '%';
    
    // Update notification count
    const newLeadsCount = availableLeads.filter(lead => 
        new Date(lead.createdAt) > new Date(Date.now() - 3600000) // Last hour
    ).length;
    const notificationBadge = document.getElementById('notification-count');
    notificationBadge.textContent = newLeadsCount > 0 ? newLeadsCount : '';
}

// Claim lead
async function claimLead(event, leadId) {
    event.stopPropagation();
    
    try {
        // Show loading state
        event.target.disabled = true;
        event.target.textContent = 'Claiming...';
        
        // In a real app, this would be an API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Move lead from available to my leads
        const lead = availableLeads.find(l => l.id === leadId);
        if (lead) {
            // Remove from available
            availableLeads = availableLeads.filter(l => l.id !== leadId);
            
            // Add to my leads
            myLeads.unshift({
                ...lead,
                status: 'New',
                claimedAt: new Date().toISOString(),
                claimedBy: currentUser.email
            });
            
            // Re-render both sections
            renderAvailableLeads();
            renderMyLeads();
            updateStats();
            
            showToast(`Lead "${lead.name}" claimed successfully!`, 'success');
        }
    } catch (error) {
        console.error('Error claiming lead:', error);
        showToast('Error claiming lead. Please try again.', 'error');
        event.target.disabled = false;
        event.target.textContent = 'Claim Lead';
    }
}

// Show lead details
function showLeadDetails(leadId, isMine = false) {
    const lead = isMine 
        ? myLeads.find(l => l.id === leadId)
        : availableLeads.find(l => l.id === leadId);
    
    if (!lead) return;
    
    const modalContent = document.getElementById('lead-details-content');
    modalContent.innerHTML = `
        <div class="lead-detail-section">
            <h4>Contact Information</h4>
            <p><strong>Name:</strong> ${lead.name}</p>
            <p><strong>Email:</strong> ${lead.email}</p>
            <p><strong>Phone:</strong> ${lead.phone}</p>
            <p><strong>Location:</strong> ${lead.location}</p>
        </div>
        
        <div class="lead-detail-section">
            <h4>Services Interested In</h4>
            <div class="lead-tags">
                ${lead.services.map(service => `<span class="lead-tag">${service}</span>`).join('')}
            </div>
        </div>
        
        ${lead.notes ? `
            <div class="lead-detail-section">
                <h4>Notes</h4>
                <p>${lead.notes}</p>
            </div>
        ` : ''}
        
        ${isMine ? `
            <div class="lead-detail-section">
                <h4>Lead History</h4>
                <p><strong>Claimed:</strong> ${formatDate(lead.claimedAt)}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${lead.status.toLowerCase()}">${lead.status}</span></p>
            </div>
        ` : ''}
    `;
    
    // Update modal action button
    const actionBtn = document.getElementById('modal-action-btn');
    if (isMine) {
        actionBtn.textContent = 'Update Status';
        actionBtn.onclick = () => updateLeadStatus(leadId);
    } else {
        actionBtn.textContent = 'Claim Lead';
        actionBtn.onclick = () => {
            claimLead({ stopPropagation: () => {}, target: actionBtn }, leadId);
            closeModal('lead-details-modal');
        };
    }
    
    // Show modal
    document.getElementById('lead-details-modal').classList.add('active');
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Update lead status
function updateLeadStatus(leadId) {
    // In a real app, this would open a status update form
    const statuses = ['New', 'Contacted', 'Interested', 'Negotiating', 'Completed'];
    const lead = myLeads.find(l => l.id === leadId);
    
    if (lead) {
        const currentIndex = statuses.indexOf(lead.status);
        const newStatus = statuses[(currentIndex + 1) % statuses.length];
        
        lead.status = newStatus;
        if (newStatus === 'Completed') {
            lead.completedAt = new Date().toISOString();
        }
        
        renderMyLeads();
        updateStats();
        showToast(`Lead status updated to "${newStatus}"`, 'success');
    }
}

// Filter available leads
function filterAvailableLeads(searchTerm) {
    const filtered = availableLeads.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.services.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    renderAvailableLeads(filtered);
}

// Filter my leads
function filterMyLeads(status) {
    const filtered = status === 'all' 
        ? myLeads 
        : myLeads.filter(lead => lead.status.toLowerCase() === status);
    
    renderMyLeads(filtered);
}

// Refresh available leads
function refreshAvailableLeads() {
    loadAvailableLeads();
    showToast('Leads refreshed', 'info');
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utility functions
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function isThisMonth(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

// Mock data generators
function generateMockAvailableLeads() {
    const names = ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emma Davis', 'Robert Wilson'];
    const locations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ'];
    const services = ['SEO', 'PPC', 'Social Media', 'Web Design', 'Content Marketing', 'Email Marketing'];
    
    return Array.from({ length: 8 }, (_, i) => ({
        id: `lead-${Date.now()}-${i}`,
        name: names[Math.floor(Math.random() * names.length)] + ` ${i + 1}`,
        email: `lead${i + 1}@example.com`,
        phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        location: locations[Math.floor(Math.random() * locations.length)],
        services: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => 
            services[Math.floor(Math.random() * services.length)]
        ).filter((v, i, a) => a.indexOf(v) === i),
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        notes: Math.random() > 0.5 ? 'Interested in a comprehensive digital marketing strategy.' : null
    }));
}

function generateMockMyLeads() {
    const leads = generateMockAvailableLeads().slice(0, 3);
    const statuses = ['New', 'Contacted', 'Interested', 'Negotiating', 'Completed'];
    
    return leads.map((lead, i) => ({
        ...lead,
        id: `my-lead-${Date.now()}-${i}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        claimedAt: new Date(Date.now() - Math.random() * 86400000 * 14).toISOString(),
        claimedBy: currentUser?.email || 'agent@example.com',
        completedAt: Math.random() > 0.7 ? new Date(Date.now() - Math.random() * 86400000 * 7).toISOString() : null
    }));
}

// Add slideOut animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(120%);
            opacity: 0;
        }
    }
    
    .lead-detail-section {
        margin-bottom: 1.5rem;
    }
    
    .lead-detail-section h4 {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    
    .lead-detail-section p {
        margin-bottom: 0.5rem;
    }
`;
document.head.appendChild(style); 