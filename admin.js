/**
 * Admin Dashboard Main Controller
 * Coordinates all admin modules and initializes the dashboard
 */

// Import modules
import { AdminAnalytics } from './js/admin/admin-analytics.js';
import { AdminVendors } from './js/admin/admin-vendors.js';

// Global variables
let adminAnalytics = null;
let adminVendors = null;
let currentUser = null;
let performanceChart;
let agents = [];
let activities = [];
let refreshInterval;
let activityPaused = false;
let currentSort = { key: null, direction: 'asc' };
let sortConfig = { key: null, direction: 'asc' };

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin Dashboard Initializing...');
    
    // Set dark theme permanently
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        window.location.href = 'login.html';
        return;
    }
    
    // Initialize modules
    await initializeModules();
    
    // Initialize dashboard
    await initializeDashboard();
    
    // Setup global event listeners
    setupGlobalEventListeners();
    
    console.log('✅ Admin Dashboard Ready');
});

// Authentication check
async function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Enhanced admin role detection
    const userRole = user['custom:role'] || user.role || 'agent';
    const userEmail = user.email || '';
    
    // Known admin emails (fallback for users without proper role attribute)
    const knownAdminEmails = [
        'george@contentkingpins.com',
        'admin@contentkingpins.com'
    ];
    
    console.log('Admin auth check:', {
        'hasToken': !!token,
        'hasEmail': !!userEmail,
        'role': userRole,
        'custom:role': user['custom:role'],
        'email': userEmail,
        'isKnownAdmin': knownAdminEmails.includes(userEmail.toLowerCase())
    });
    
    // Check if user should have admin access
    const shouldBeAdmin = userRole === 'admin' || knownAdminEmails.includes(userEmail.toLowerCase());
    
    if (!token || !userEmail || !shouldBeAdmin) {
        console.log('❌ Admin access denied, redirecting to login');
        // Not logged in or not admin, redirect to login page
        return false;
    }
    
    // If admin email but role not set, fix it
    if (knownAdminEmails.includes(userEmail.toLowerCase()) && userRole !== 'admin') {
        console.log('🔧 Fixing admin role for known admin email');
        user.role = 'admin';
        user['custom:role'] = 'admin';
        localStorage.setItem('user', JSON.stringify(user));
    }
    
    console.log('✅ Admin access granted');
    
    // Set admin name
    document.getElementById('admin-name').textContent = user.name || user.given_name || user.email.split('@')[0];
    currentUser = user;
    return true;
}

// Initialize date/time
function initializeDateTime() {
    const updateDateTime = () => {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const dateElement = document.querySelector('.header-date');
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('en-US', options);
        }
    };
    
    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute
}

// Theme - Force Dark Mode Always
function initializeThemeToggle() {
    // Force dark mode always
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('admin-theme', 'dark');
    
    // No theme toggle buttons - dark mode is permanent
    console.log('🌙 Dark mode permanently enabled');
}

// Initialize system-wide statistics
function initializeSystemStats() {
    // Mock data for demonstration
    const stats = {
        totalLeads: 1247,
        totalAgents: 24,
        totalRevenue: 89567.45,
        conversionRate: 23.4,
        responseTime: 4.2,
        // Publisher stats removed to avoid conflicts with admin.html implementation
        activeLeads: 89,
        completedLeads: 156,
        monthlyGrowth: 12.8
    };
    
    updateSystemStats(stats);
}

// Update system stats with animation
function updateSystemStats(stats) {
    // Animate stats with CountUp.js
    if (typeof CountUp !== 'undefined') {
        new CountUp('total-agents-stat', stats.totalAgents, { duration: 2 }).start();
        new CountUp('total-leads-stat', stats.totalLeads, { duration: 2 }).start();
        new CountUp('total-revenue-stat', stats.totalRevenue, { duration: 2, prefix: '$', decimal: '.' }).start();
        new CountUp('conversion-rate-stat', stats.conversionRate, { duration: 2, suffix: '%' }).start();
        
        // Publisher stats removed - handled by admin.html
        
    } else {
        // Fallback without animation
        document.getElementById('total-agents-stat').textContent = stats.totalAgents;
        document.getElementById('total-leads-stat').textContent = stats.totalLeads;
        document.getElementById('total-revenue-stat').textContent = '$' + stats.totalRevenue.toLocaleString();
        document.getElementById('conversion-rate-stat').textContent = stats.conversionRate + '%';
        
        // Publisher stats removed - handled by admin.html
    }
}

// Initialize live activity feed
function initializeActivityFeed() {
    const pauseBtn = document.getElementById('pause-activity');
    const clearBtn = document.getElementById('clear-activity');
    
    pauseBtn.addEventListener('click', toggleActivityFeed);
    clearBtn.addEventListener('click', clearActivityFeed);
    
    // Start with some sample activities
    addActivity('👤', 'New agent John Doe added to system', 'just now');
    addActivity('🏢', 'Vendor "Smith Legal" created new lead', '2 min ago');
    addActivity('📋', 'Lead #2847 assigned to Agent Sarah', '5 min ago');
    addActivity('💰', 'Lead #2845 converted - $450 revenue', '8 min ago');
}

// Add activity to feed
function addActivity(icon, text, time) {
    if (activityPaused) return;
    
    const feed = document.getElementById('activity-feed');
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
        <div class="activity-icon">${icon}</div>
        <div class="activity-text">${text}</div>
        <div class="activity-time">${time}</div>
    `;
    
    feed.insertBefore(activityItem, feed.firstChild);
    
    // Keep only latest 50 activities
    while (feed.children.length > 50) {
        feed.removeChild(feed.lastChild);
    }
    
    // Store in activities array
    activities.unshift({ icon, text, time, timestamp: Date.now() });
    if (activities.length > 50) activities.pop();
}

// Toggle activity feed
function toggleActivityFeed() {
    activityPaused = !activityPaused;
    const pauseBtn = document.getElementById('pause-activity');
    pauseBtn.innerHTML = activityPaused ? '▶️ Resume' : '⏸️ Pause';
}

// Clear activity feed
function clearActivityFeed() {
    document.getElementById('activity-feed').innerHTML = '';
    activities = [];
}

// Initialize enhanced agent management
function initializeEnhancedAgentManagement() {
    // Load agents from API
    loadAgentsFromAPI();
    
    // Initialize search and filters
    setupAgentFilters();
    
    // Initialize sorting
    setupTableSorting();
    
    // Initialize bulk actions
    setupBulkActions();
    
    // Initialize leaderboard
    updateAgentLeaderboard();
    
    // Add agent button
    document.getElementById('add-agent-btn').addEventListener('click', showAddAgentModal);
}

// Setup agent filtering
function setupAgentFilters() {
    const searchInput = document.getElementById('agent-search');
    const statusFilter = document.getElementById('agent-status-filter');
    const roleFilter = document.getElementById('agent-role-filter');
    
    searchInput.addEventListener('input', filterAgents);
    statusFilter.addEventListener('change', filterAgents);
    roleFilter.addEventListener('change', filterAgents);
}

// Filter agents based on search and filters
function filterAgents() {
    const searchTerm = document.getElementById('agent-search').value.toLowerCase();
    const statusFilter = document.getElementById('agent-status-filter').value;
    const roleFilter = document.getElementById('agent-role-filter').value;
    
    const filteredAgents = agents.filter(agent => {
        const matchesSearch = agent.name.toLowerCase().includes(searchTerm) ||
                            agent.email.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
        const matchesRole = roleFilter === 'all' || agent.role === roleFilter;
        
        return matchesSearch && matchesStatus && matchesRole;
    });
    
    renderEnhancedAgentsTable(filteredAgents);
}

// Setup table sorting
function setupTableSorting() {
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            
            if (sortConfig.key === sortKey) {
                sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortConfig.key = sortKey;
                sortConfig.direction = 'asc';
            }
            
            sortAgents();
            updateSortIndicators();
        });
    });
}

// Sort agents by current config
function sortAgents() {
    if (!sortConfig.key) return;
    
    agents.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Handle different data types
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    filterAgents(); // Re-render with current filters
}

// Update sort indicators
function updateSortIndicators() {
    document.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('sorted');
        const indicator = header.querySelector('.sort-indicator');
        
        if (header.dataset.sort === sortConfig.key) {
            header.classList.add('sorted');
            indicator.textContent = sortConfig.direction === 'asc' ? '↑' : '↓';
        } else {
            indicator.textContent = '↕️';
        }
    });
}

// Setup bulk actions
function setupBulkActions() {
    const selectAllCheckbox = document.getElementById('select-all-agents');
    const bulkActionsBtn = document.getElementById('bulk-actions-btn');
    
    selectAllCheckbox.addEventListener('change', toggleSelectAll);
    bulkActionsBtn.addEventListener('click', toggleBulkActionsBar);
    
    // Bulk action buttons
    document.getElementById('bulk-enable').addEventListener('click', () => bulkAction('enable'));
    document.getElementById('bulk-disable').addEventListener('click', () => bulkAction('disable'));
    document.getElementById('bulk-delete').addEventListener('click', () => bulkAction('delete'));
}

// Toggle select all agents
function toggleSelectAll() {
    const selectAll = document.getElementById('select-all-agents').checked;
    const checkboxes = document.querySelectorAll('.agent-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll;
        if (selectAll) {
            selectedAgents.add(checkbox.value);
        } else {
            selectedAgents.clear();
        }
    });
    
    updateBulkActionsBar();
}

// Update bulk actions bar
function updateBulkActionsBar() {
    const bulkBar = document.getElementById('bulk-actions-bar');
    const count = document.getElementById('selected-agent-count');
    
    count.textContent = selectedAgents.size;
    bulkBar.style.display = selectedAgents.size > 0 ? 'flex' : 'none';
}

// Toggle bulk actions bar
function toggleBulkActionsBar() {
    const bulkBar = document.getElementById('bulk-actions-bar');
    const isVisible = bulkBar.style.display === 'flex';
    bulkBar.style.display = isVisible ? 'none' : 'flex';
}

// Perform bulk action
function bulkAction(action) {
    if (selectedAgents.size === 0) return;
    
    const agentIds = Array.from(selectedAgents);
    let message = '';
    
    switch (action) {
        case 'enable':
            message = `Enable ${agentIds.length} selected agents?`;
            break;
        case 'disable':
            message = `Disable ${agentIds.length} selected agents?`;
            break;
        case 'delete':
            message = `Delete ${agentIds.length} selected agents? This cannot be undone.`;
            break;
    }
    
    if (confirm(message)) {
        // Perform the action via API
        performBulkAgentAction(action, agentIds);
    }
}

// Perform bulk agent action via API
async function performBulkAgentAction(action, agentIds) {
    try {
        // Mock API call - replace with actual endpoint
        console.log(`Performing ${action} on agents:`, agentIds);
        
        // Update local data
        agentIds.forEach(agentId => {
            const agent = agents.find(a => a.id === agentId);
            if (agent) {
                if (action === 'enable') agent.status = 'active';
                if (action === 'disable') agent.status = 'inactive';
                if (action === 'delete') {
                    agents = agents.filter(a => a.id !== agentId);
                }
            }
        });
        
        // Clear selection and refresh
        selectedAgents.clear();
        updateBulkActionsBar();
        filterAgents();
        
        showToast(`Successfully ${action}d ${agentIds.length} agents`, 'success');
        
    } catch (error) {
        console.error(`Error performing bulk ${action}:`, error);
        showToast(`Failed to ${action} agents`, 'error');
    }
}

// Render enhanced agents table
function renderEnhancedAgentsTable(agentList = agents) {
    const tbody = document.getElementById('agents-tbody');
    tbody.innerHTML = '';
    
    agentList.forEach(agent => {
        const row = document.createElement('tr');
        const lastActive = agent.lastActive || 'Never';
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="bulk-checkbox agent-checkbox" value="${agent.id}" 
                       onchange="handleAgentSelection('${agent.id}', this.checked)">
            </td>
            <td>
                <div class="agent-info">
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-email">${agent.email}</div>
                </div>
            </td>
            <td>
                <div class="status-indicator">
                    <span class="status-dot ${agent.status === 'offline' ? 'offline' : ''}"></span>
                    ${agent.status}
                </div>
            </td>
            <td>
                <span class="role-badge role-${agent.role}">${agent.role}</span>
            </td>
            <td>${agent.leads || 0}</td>
            <td>${agent.conversion || 0}%</td>
            <td>${lastActive}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view" onclick="viewAgentDetails('${agent.id}')">👁️</button>
                    <button class="action-btn edit" onclick="editAgent('${agent.id}')">✏️</button>
                    <button class="action-btn delete" onclick="deleteAgent('${agent.id}')">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Handle individual agent selection
function handleAgentSelection(agentId, isSelected) {
    if (isSelected) {
        selectedAgents.add(agentId);
    } else {
        selectedAgents.delete(agentId);
    }
    updateBulkActionsBar();
}

// Update agent leaderboard
function updateAgentLeaderboard() {
    const leaderboardGrid = document.getElementById('agent-leaderboard');
    
    // Sort agents by performance score (leads * conversion rate)
    const topAgents = [...agents]
        .map(agent => ({
            ...agent,
            score: (agent.leads || 0) * ((agent.conversion || 0) / 100)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    
    leaderboardGrid.innerHTML = topAgents.map((agent, index) => `
        <div class="leaderboard-card">
            <div class="leaderboard-rank">#${index + 1}</div>
            <div class="leaderboard-info">
                <div class="leaderboard-name">${agent.name}</div>
                <div class="leaderboard-stats">${agent.leads || 0} leads • ${agent.conversion || 0}% conv</div>
            </div>
            <div class="leaderboard-score">${Math.round(agent.score)}</div>
        </div>
    `).join('');
}

// Show add agent modal
function showAddAgentModal() {
    openModal('add-agent-modal');
}

// Generate temporary password
function generateTemporaryPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Update last refresh time
function updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `Last updated: ${timeString}`;
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Create toast container if it doesn't exist
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Refresh dashboard
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            showToast('Refreshing dashboard...', 'info');
            loadDashboardData();
            
            // Visual feedback
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);
        });
    }
});

// Global utility functions for window scope
window.handleAgentSelection = handleAgentSelection;
window.viewAgentDetails = viewAgentDetails;
window.editAgent = editAgent;
window.deleteAgent = deleteAgent;
window.showAddAgentModal = showAddAgentModal;
window.openVendorPricingModal = openVendorPricingModal;

console.log('📄 Publisher management handled by admin.html - no conflicts'); 