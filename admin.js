// Admin Dashboard JavaScript - Enhanced Command Center

// Global variables
let performanceChart;
let vendorChart;
let agents = [];
let vendors = [];
let activities = [];
let sortConfig = { key: null, direction: 'asc' };
let selectedAgents = new Set();
let activityPaused = false;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    
    // Initialize components
    initializeDateTime();
    initializeThemeToggle();
    initializeSystemStats();
    initializeActivityFeed();
    initializeEnhancedAgentManagement();
    initializeVendorAnalytics();
    initializeModals();
    
    // Load data
    loadDashboardData();
    
    // Start real-time updates
    startRealTimeUpdates();
});

// Authentication check
function checkAuth() {
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
        window.location.href = 'login.html';
        return;
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

// Theme toggle functionality
function initializeThemeToggle() {
    const lightBtn = document.querySelector('.theme-btn[data-theme="light"]');
    const darkBtn = document.querySelector('.theme-btn[data-theme="dark"]');
    
    if (!lightBtn || !darkBtn) return;
    
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('admin-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update button states
    lightBtn.classList.toggle('active', savedTheme === 'light');
    darkBtn.classList.toggle('active', savedTheme === 'dark');
    
    // Theme button handlers
    lightBtn.addEventListener('click', () => setTheme('light'));
    darkBtn.addEventListener('click', () => setTheme('dark'));
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('admin-theme', theme);
        
        // Update button states
        lightBtn.classList.toggle('active', theme === 'light');
        darkBtn.classList.toggle('active', theme === 'dark');
        
        // Update charts if they exist
        if (performanceChart) performanceChart.update();
        if (vendorChart) vendorChart.update();
    }
}

// Initialize system-wide statistics
function initializeSystemStats() {
    // Mock data for demonstration - replace with API calls
    const systemStats = {
        totalAgents: 15,
        totalVendors: 8,
        totalLeads: 2847,
        totalRevenue: 89250,
        systemHealth: 98,
        conversionRate: 72.5
    };
    
    updateSystemStats(systemStats);
}

// Update system statistics with real data
function updateSystemStats(stats) {
    if (typeof CountUp !== 'undefined') {
        new CountUp('total-agents-stat', stats.totalAgents, { duration: 2 }).start();
        new CountUp('total-vendors-stat', stats.totalVendors, { duration: 2 }).start();
        new CountUp('total-leads-stat', stats.totalLeads, { duration: 2.5, separator: ',' }).start();
        new CountUp('total-revenue-stat', stats.totalRevenue, { 
            duration: 2.5, 
            separator: ',',
            prefix: '$'
        }).start();
        new CountUp('conversion-rate-stat', stats.conversionRate, { 
            duration: 2, 
            suffix: '%',
            decimal: '.',
            decimalPlaces: 1
        }).start();
    } else {
        document.getElementById('total-agents-stat').textContent = stats.totalAgents;
        document.getElementById('total-vendors-stat').textContent = stats.totalVendors;
        document.getElementById('total-leads-stat').textContent = stats.totalLeads.toLocaleString();
        document.getElementById('total-revenue-stat').textContent = '$' + stats.totalRevenue.toLocaleString();
        document.getElementById('conversion-rate-stat').textContent = stats.conversionRate + '%';
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

// Initialize vendor analytics
function initializeVendorAnalytics() {
    loadVendorsFromAPI();
    setupVendorControls();
    initializeVendorChart();
}

// Setup vendor controls
function setupVendorControls() {
    const periodSelect = document.getElementById('vendor-period');
    const comparisonBtn = document.getElementById('vendor-comparison');
    
    periodSelect.addEventListener('change', updateVendorAnalytics);
    comparisonBtn.addEventListener('click', showVendorComparison);
}

// Load vendors from API
async function loadVendorsFromAPI() {
    try {
        const response = await fetch('https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/vendors', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            vendors = await response.json();
            renderVendorMetrics();
        } else {
            // Use mock data
            vendors = generateMockVendors();
            renderVendorMetrics();
        }
    } catch (error) {
        console.error('Error loading vendors:', error);
        vendors = generateMockVendors();
        renderVendorMetrics();
    }
}

// Generate mock vendor data
function generateMockVendors() {
    return [
        { id: 'v1', name: 'Smith Legal Group', status: 'active', leads: 156, revenue: 12450, conversionRate: 68 },
        { id: 'v2', name: 'Johnson & Associates', status: 'active', leads: 203, revenue: 18670, conversionRate: 74 },
        { id: 'v3', name: 'Williams Law Firm', status: 'active', leads: 89, revenue: 7120, conversionRate: 62 },
        { id: 'v4', name: 'Brown Legal Services', status: 'active', leads: 134, revenue: 10890, conversionRate: 71 },
        { id: 'v5', name: 'Davis & Partners', status: 'inactive', leads: 67, revenue: 4230, conversionRate: 58 }
    ];
}

// Render vendor metrics
function renderVendorMetrics() {
    const metricsGrid = document.getElementById('vendor-metrics');
    
    metricsGrid.innerHTML = vendors.map(vendor => `
        <div class="vendor-metric-card">
            <div class="vendor-header">
                <div class="vendor-name">${vendor.name}</div>
                <div class="vendor-status ${vendor.status}">${vendor.status}</div>
            </div>
            <div class="vendor-metrics">
                <div class="vendor-metric">
                    <div class="vendor-metric-value">${vendor.leads}</div>
                    <div class="vendor-metric-label">Leads</div>
                </div>
                <div class="vendor-metric">
                    <div class="vendor-metric-value">$${vendor.revenue.toLocaleString()}</div>
                    <div class="vendor-metric-label">Revenue</div>
                </div>
                <div class="vendor-metric">
                    <div class="vendor-metric-value">${vendor.conversionRate}%</div>
                    <div class="vendor-metric-label">Conversion</div>
                </div>
                <div class="vendor-metric">
                    <div class="vendor-metric-value">${Math.round(vendor.revenue / vendor.leads)}</div>
                    <div class="vendor-metric-label">Avg Value</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Initialize vendor performance chart
function initializeVendorChart() {
    const ctx = document.getElementById('vendor-performance-chart');
    if (!ctx) return;
    
    vendorChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: vendors.map(v => v.name.split(' ')[0]), // First word of vendor name
            datasets: [{
                label: 'Leads',
                data: vendors.map(v => v.leads),
                backgroundColor: 'rgba(66, 153, 225, 0.6)',
                borderColor: 'rgba(66, 153, 225, 1)',
                borderWidth: 1
            }, {
                label: 'Revenue',
                data: vendors.map(v => v.revenue),
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });
}

// Update vendor analytics
function updateVendorAnalytics() {
    const period = document.getElementById('vendor-period').value;
    console.log('Updating vendor analytics for period:', period);
    
    // Mock data update - replace with API call
    renderVendorMetrics();
    if (vendorChart) {
        vendorChart.update();
    }
}

// Show vendor comparison
function showVendorComparison() {
    // This would open a modal with detailed vendor comparison
    console.log('Showing vendor comparison modal');
    showToast('Vendor comparison feature coming soon!', 'info');
}

// Start real-time updates
function startRealTimeUpdates() {
    // Update every 30 seconds
    setInterval(() => {
        if (!activityPaused) {
            generateRandomActivity();
        }
        updateLastRefreshTime();
    }, 30000);
    
    // Update stats every 5 minutes
    setInterval(() => {
        loadDashboardData();
    }, 5 * 60 * 1000);
}

// Generate random activity for demo
function generateRandomActivity() {
    const activities = [
        { icon: '📋', text: 'New lead received from vendor', type: 'lead' },
        { icon: '👤', text: 'Agent logged in', type: 'agent' },
        { icon: '💰', text: 'Lead converted', type: 'conversion' },
        { icon: '🔄', text: 'Lead status updated', type: 'update' }
    ];
    
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    const timeAgo = ['just now', '1 min ago', '2 min ago', '3 min ago'][Math.floor(Math.random() * 4)];
    
    addActivity(randomActivity.icon, randomActivity.text, timeAgo);
}

// Agent action functions
function viewAgentDetails(agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
        // This would open a detailed modal
        console.log('Viewing agent details:', agent);
        showToast(`Viewing details for ${agent.name}`, 'info');
    }
}

function editAgent(agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
        // This would open an edit modal
        console.log('Editing agent:', agent);
        showToast(`Editing ${agent.name}`, 'info');
    }
}

function deleteAgent(agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (agent && confirm(`Delete agent ${agent.name}?`)) {
        agents = agents.filter(a => a.id !== agentId);
        filterAgents();
        showToast(`Agent ${agent.name} deleted`, 'success');
        addActivity('🗑️', `Agent ${agent.name} removed from system`, 'just now');
    }
}

// Load dashboard data
function loadDashboardData() {
    // Load system-wide data
    loadSystemMetrics();
    loadAgentsFromAPI();
    loadVendorsFromAPI();
    updateLastRefreshTime();
}

// Load system metrics
async function loadSystemMetrics() {
    try {
        // Mock API call - replace with actual endpoints
        const systemData = {
            totalAgents: agents.length,
            totalVendors: vendors.length,
            totalLeads: Math.floor(Math.random() * 5000) + 2000,
            totalRevenue: Math.floor(Math.random() * 100000) + 50000,
            systemHealth: Math.floor(Math.random() * 5) + 95,
            conversionRate: Math.floor(Math.random() * 20) + 60
        };
        
        updateSystemStats(systemData);
    } catch (error) {
        console.error('Error loading system metrics:', error);
    }
}

// Load agents from API with enhanced data
async function loadAgentsFromAPI() {
    try {
        const response = await fetch('https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/auth/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const users = await response.json();
            
            // Convert API users to enhanced agents format
            agents = users.map(user => ({
                id: user.username || user.email,
                name: user.name || user.email?.split('@')[0] || 'Unknown',
                email: user.email,
                status: user.enabled ? (Math.random() > 0.5 ? 'online' : 'offline') : 'inactive',
                leads: Math.floor(Math.random() * 200) + 10,
                conversion: Math.floor(Math.random() * 40) + 50,
                role: user.role || 'agent',
                lastActive: generateRandomDate()
            }));
            
            renderEnhancedAgentsTable();
            updateAgentLeaderboard();
        } else {
            // Use enhanced mock data
            agents = generateMockAgents();
            renderEnhancedAgentsTable();
            updateAgentLeaderboard();
        }
    } catch (error) {
        console.error('Error loading agents:', error);
        agents = generateMockAgents();
        renderEnhancedAgentsTable();
        updateAgentLeaderboard();
    }
}

// Generate enhanced mock agent data
function generateMockAgents() {
    return [
        { id: 'a1', name: 'Sarah Johnson', email: 'sarah@company.com', status: 'online', leads: 156, conversion: 78, role: 'agent', lastActive: '2 min ago' },
        { id: 'a2', name: 'Mike Chen', email: 'mike@company.com', status: 'online', leads: 203, conversion: 72, role: 'agent', lastActive: '5 min ago' },
        { id: 'a3', name: 'Emily Davis', email: 'emily@company.com', status: 'offline', leads: 89, conversion: 65, role: 'agent', lastActive: '2 hours ago' },
        { id: 'a4', name: 'John Smith', email: 'john@company.com', status: 'online', leads: 134, conversion: 81, role: 'admin', lastActive: 'just now' },
        { id: 'a5', name: 'Lisa Brown', email: 'lisa@company.com', status: 'offline', leads: 97, conversion: 69, role: 'agent', lastActive: '1 day ago' }
    ];
}

// Generate random date for demo
function generateRandomDate() {
    const dates = ['just now', '2 min ago', '15 min ago', '1 hour ago', '3 hours ago', '1 day ago'];
    return dates[Math.floor(Math.random() * dates.length)];
}

// Initialize modals
function initializeModals() {
    // Close modal buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            document.getElementById(modalId).style.display = 'none';
        });
    });
    
    // Cancel buttons
    document.querySelectorAll('[data-modal]').forEach(btn => {
        if (btn.textContent === 'Cancel') {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.modal;
                document.getElementById(modalId).style.display = 'none';
            });
        }
    });
    
    // Add agent modal
    const sendInviteBtn = document.getElementById('send-agent-invite');
    if (sendInviteBtn) {
        sendInviteBtn.addEventListener('click', async () => {
            const email = document.getElementById('new-agent-email').value;
            const role = document.querySelector('input[name="agent-role"]:checked')?.value || 'agent';
            
            if (!email) {
                showToast('Please enter an email address', 'error');
                return;
            }
            
            try {
                // Show loading state
                const button = document.getElementById('send-agent-invite');
                const originalText = button.textContent;
                button.textContent = 'Sending...';
                button.disabled = true;
                
                // Create user via API
                const userData = {
                    email: email,
                    role: role,
                    temporary_password: generateTemporaryPassword(),
                    force_change_password: true
                };
                
                const response = await fetch('https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/auth/users', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to create user: ${response.status}`);
                }
                
                const newUser = await response.json();
                
                // Add agent to local list
                agents.push({
                    id: newUser.Username || email,
                    name: email.split('@')[0],
                    email: email,
                    status: 'invited',
                    leads: 0,
                    conversion: 0,
                    role: role,
                    lastActive: 'Never'
                });
                
                renderEnhancedAgentsTable();
                updateAgentLeaderboard();
                document.getElementById('add-agent-modal').style.display = 'none';
                showToast(`Agent invitation sent to ${email}`, 'success');
                addActivity('👤', `New agent ${email} invited to system`, 'just now');
                
                // Reset form
                document.getElementById('new-agent-email').value = '';
                
            } catch (error) {
                console.error('Error creating agent:', error);
                showToast(`Failed to create agent: ${error.message}`, 'error');
            } finally {
                // Reset button state
                const button = document.getElementById('send-agent-invite');
                button.textContent = originalText;
                button.disabled = false;
            }
        });
    }
}

// Show add agent modal
function showAddAgentModal() {
    const modal = document.getElementById('add-agent-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
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