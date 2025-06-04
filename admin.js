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
let publisherChart;
let agents = [];
let publishers = [];
let activities = [];
let sortConfig = { key: null, direction: 'asc' };
let selectedAgents = new Set();
let selectedPublishers = new Set();
let activityPaused = false;

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
    // Mock data for demonstration - replace with API calls
    const systemStats = {
        totalAgents: 15,
        totalPublishers: 8,
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
        new CountUp('total-publishers-stat', stats.totalPublishers, { duration: 2 }).start();
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
        document.getElementById('total-publishers-stat').textContent = stats.totalPublishers;
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

// Initialize Publisher Management
function initializePublisherManagement() {
    console.log('🏢 Initializing Publisher Management...');
    
    // Publisher search and filtering
    const publisherSearch = document.getElementById('publisher-search');
    const statusFilter = document.getElementById('publisher-status-filter');
    const sortSelect = document.getElementById('publisher-sort');
    
    if (publisherSearch) {
        publisherSearch.addEventListener('input', debounce(filterPublishers, 300));
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', filterPublishers);
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', sortPublishers);
    }
    
    // Publisher table sorting
    const sortableHeaders = document.querySelectorAll('#publishers-table .sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            handlePublisherSort(sortKey);
        });
    });
    
    // Select all publishers checkbox
    const selectAllPublishers = document.getElementById('select-all-publishers');
    if (selectAllPublishers) {
        selectAllPublishers.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('#publishers-table-body input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                const publisherId = cb.dataset.publisherId;
                if (e.target.checked) {
                    selectedPublishers.add(publisherId);
                } else {
                    selectedPublishers.delete(publisherId);
                }
            });
            updateBulkActionsState();
        });
    }
    
    // Add publisher button
    const addPublisherBtn = document.getElementById('add-publisher-btn');
    if (addPublisherBtn) {
        addPublisherBtn.addEventListener('click', () => openPublisherModal());
    }
    
    // Bulk actions
    const bulkActionsBtn = document.getElementById('bulk-publisher-actions');
    if (bulkActionsBtn) {
        bulkActionsBtn.addEventListener('click', showBulkPublisherActions);
    }
    
    // API management buttons
    const generateApiBtn = document.getElementById('generate-api-key');
    const apiDocsBtn = document.getElementById('api-documentation');
    
    if (generateApiBtn) {
        generateApiBtn.addEventListener('click', generateApiKey);
    }
    
    if (apiDocsBtn) {
        apiDocsBtn.addEventListener('click', () => openModal('apiDocModal'));
    }
    
    // Load publishers
    loadPublishersFromAPI();
}

// Load publishers from API
async function loadPublishersFromAPI() {
    try {
        showToast('📊 Loading publishers...', 'info');
        
        // Mock API call - replace with actual endpoint
        const response = await fetch('/api/publishers', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        if (response.ok) {
            publishers = await response.json();
        } else {
            // Mock data for development
            publishers = [
                {
                    id: 'pub_001',
                    name: 'Legal Lead Pro',
                    email: 'contact@legalleadpro.com',
                    phone: '+1-555-0123',
                    website: 'https://legalleadpro.com',
                    status: 'active',
                    commission: 15.0,
                    description: 'Premium legal lead provider specializing in MVA cases',
                    apiKey: 'llp_sk_live_abc123...',
                    rateLimit: 5000,
                    totalLeads: 1247,
                    revenue: 34567.89,
                    lastActivity: new Date().toISOString(),
                    createdAt: '2024-01-15T08:00:00Z'
                },
                {
                    id: 'pub_002',
                    name: 'AccidentClaims.net',
                    email: 'admin@accidentclaims.net',
                    phone: '+1-555-0124',
                    website: 'https://accidentclaims.net',
                    status: 'active',
                    commission: 12.5,
                    description: 'High-volume accident claim lead generation',
                    apiKey: 'acn_sk_live_def456...',
                    rateLimit: 2000,
                    totalLeads: 892,
                    revenue: 23456.78,
                    lastActivity: new Date(Date.now() - 3600000).toISOString(),
                    createdAt: '2024-02-10T10:30:00Z'
                },
                {
                    id: 'pub_003',
                    name: 'InjuryLeads Direct',
                    email: 'support@injuryleadsdirect.com',
                    phone: '+1-555-0125',
                    website: 'https://injuryleadsdirect.com',
                    status: 'pending',
                    commission: 18.0,
                    description: 'Targeted injury lead campaigns',
                    apiKey: null,
                    rateLimit: 1000,
                    totalLeads: 234,
                    revenue: 5678.90,
                    lastActivity: new Date(Date.now() - 86400000).toISOString(),
                    createdAt: '2024-05-20T14:15:00Z'
                }
            ];
        }
        
        renderPublishersTable();
        updatePublisherStats();
        renderTopPublishers();
        updatePublisherChart();
        
        showToast(`✅ Loaded ${publishers.length} publishers`, 'success');
        
    } catch (error) {
        console.error('Error loading publishers:', error);
        showToast('❌ Failed to load publishers', 'error');
    }
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
async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    // Show skeletons while loading
    showStatSkeletons();
    showChartSkeleton('revenue-chart');
    showTableSkeleton('vendor-table-body', 3);
    
    try {
        const token = localStorage.getItem('auth_token');
        const apiBase = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
        
        // Simulate minimum loading time for better UX
        const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
        
        // Fetch dashboard data
        const dataPromise = fetch(`${apiBase}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Wait for both minimum time and actual data
        const [response] = await Promise.all([dataPromise, minLoadTime]);
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        
        const data = await response.json();
        
        // Hide skeletons
        hideStatSkeletons();
        
        // Update dashboard with real data
        updateDashboard(data);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        hideStatSkeletons();
        showEmptyState();
    }
}

// Add skeleton loading functions
function showStatSkeletons() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.classList.add('skeleton-loading');
    });
}

function hideStatSkeletons() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.classList.remove('skeleton-loading');
    });
}

function showTableSkeleton(containerId, rows = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const skeletonHTML = `
        <div class="table-skeleton">
            ${Array(rows).fill('').map(() => `
                <div class="table-skeleton-row">
                    <div class="table-skeleton-cell small"></div>
                    <div class="table-skeleton-cell"></div>
                    <div class="table-skeleton-cell"></div>
                    <div class="table-skeleton-cell large"></div>
                    <div class="table-skeleton-cell small"></div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = skeletonHTML;
}

function showChartSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="chart-skeleton"></div>';
}

// Initialize modals
function initializeModals() {
    // Generic modal functions for both .modal and .modal-overlay
    window.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            if (modal.classList.contains('modal-overlay')) {
                modal.classList.add('active');
            } else {
                modal.classList.add('show');
            }
        }
    };
    
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show', 'active');
        }
    };
    
    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') || e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('show', 'active');
        }
    });
    
    // Close modal buttons (including data-modal attributes)
    document.querySelectorAll('.close, [id*="close"], .modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            // Handle data-modal attribute
            const dataModal = btn.getAttribute('data-modal');
            if (dataModal) {
                closeModal(dataModal);
                return;
            }
            
            // Handle closest modal
            const modal = btn.closest('.modal, .modal-overlay');
            if (modal) {
                modal.classList.remove('show', 'active');
            }
        });
    });
    
    // Cancel buttons
    document.querySelectorAll('#cancel-publisher, #cancel-agent').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal, .modal-overlay');
            if (modal) {
                modal.classList.remove('show', 'active');
            }
        });
    });
    
    // Publisher form submission with vendor code generation
    const publisherForm = document.getElementById('publisher-form');
    if (publisherForm) {
        publisherForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handlePublisherSubmission();
        });
    }
    
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
                closeModal('add-agent-modal');
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

// Handle publisher form submission with vendor code generation
async function handlePublisherSubmission() {
    const formData = new FormData(document.getElementById('publisher-form'));
    const publisherData = Object.fromEntries(formData.entries());
    
    try {
        // Show loading state
        const saveBtn = document.getElementById('save-publisher');
        const loader = saveBtn.querySelector('.btn-loader');
        const originalText = saveBtn.textContent;
        
        if (loader) loader.style.display = 'inline-block';
        saveBtn.disabled = true;
        
        // Generate vendor code
        const vendorCode = generateVendorCode(publisherData.name);
        
        // Generate API key if requested
        let apiKey = null;
        if (document.getElementById('generate-api').checked) {
            apiKey = 'pk_live_' + generateSecureToken(32);
        }
        
        // Create publisher object
        const newPublisher = {
            id: 'pub_' + Date.now(),
            name: publisherData.name,
            email: publisherData.email,
            phone: publisherData.phone || '',
            website: publisherData.website || '',
            status: publisherData.status || 'active',
            commission: parseFloat(publisherData.commission) || 0,
            description: publisherData.description || '',
            vendorCode: vendorCode,
            apiKey: apiKey,
            rateLimit: parseInt(publisherData.rateLimit) || 1000,
            totalLeads: 0,
            revenue: 0,
            conversion: 0,
            createdAt: new Date().toISOString()
        };
        
        // Add to publishers array
        publishers.push(newPublisher);
        
        // Update displays
        renderPublishersTable();
        updatePublisherStats();
        renderTopPublishers();
        updatePublisherChart();
        
        // Close publisher modal
        closeModal('publisherModal');
        
        // Show success toast
        showToast(`Publisher "${publisherData.name}" created successfully with vendor code: ${vendorCode}`, 'success');
        
        // Add activity
        addActivity('🏢', `New publisher "${publisherData.name}" onboarded with vendor code ${vendorCode}`, 'just now');
        
        // Show API instructions ONLY if API key was generated
        if (apiKey) {
            setTimeout(() => {
                showPublisherOnboardingSuccess(newPublisher);
            }, 500);
            
            // Also generate PDF instructions automatically
            setTimeout(() => {
                downloadPublisherInstructionsAsPdf(publisherData.name, publisherData.email, vendorCode, apiKey);
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error creating publisher:', error);
        showToast(`Failed to create publisher: ${error.message}`, 'error');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('save-publisher');
        const loader = saveBtn.querySelector('.btn-loader');
        if (loader) loader.style.display = 'none';
        saveBtn.disabled = false;
    }
}

// Generate vendor code
function generateVendorCode(publisherName) {
    // Create a vendor code based on publisher name + timestamp
    const nameCode = publisherName
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 3)
        .padEnd(3, 'X');
    
    const timestamp = Date.now().toString().slice(-4);
    return `${nameCode}${timestamp}`;
}

// Show publisher onboarding success with API instructions
function showPublisherOnboardingSuccess(publisher) {
    const modalHtml = `
        <div class="modal show" id="publisherOnboardingModal">
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>🎉 Publisher Onboarded Successfully!</h3>
                    <span class="close" onclick="closeModal('publisherOnboardingModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="onboarding-success">
                        <div class="success-header">
                            <h4>✅ ${publisher.name} is now ready to submit leads!</h4>
                            <div class="vendor-code-display">
                                <label><strong>Vendor Code:</strong></label>
                                <div class="code-container">
                                    <code id="vendor-code-display">${publisher.vendorCode}</code>
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="copyToClipboard('vendor-code-display')">📋 Copy</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="api-section">
                            <h5>🔑 API Configuration</h5>
                            <div class="api-key-display">
                                <label><strong>API Key:</strong></label>
                                <div class="api-key-container">
                                    <input type="text" value="${publisher.apiKey}" class="form-input" readonly id="api-key-display">
                                    <button type="button" class="btn btn-secondary" onclick="copyToClipboard('api-key-display')">📋 Copy</button>
                                </div>
                                <p class="warning-text">⚠️ <strong>Important:</strong> Save this API key securely. It won't be shown again for security reasons.</p>
                            </div>
                        </div>
                        
                        <div class="api-section">
                            <h5>📖 API Documentation</h5>
                            <p>Here are the endpoints and instructions for ${publisher.name}:</p>
                            
                            <div class="endpoint-section">
                                <h6>Authentication</h6>
                                <p>Include the API key in the Authorization header:</p>
                                <div class="code-block">
                                    <code>Authorization: Bearer ${publisher.apiKey}</code>
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="copyToClipboard('auth-header')">📋 Copy</button>
                                </div>
                            </div>
                            
                            <div class="endpoint-section">
                                <h6>Submit Lead</h6>
                                <div class="endpoint">
                                    <span class="method post">POST</span>
                                    <span class="url">${window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod'}/leads/submit</span>
                                </div>
                                
                                <p><strong>Request Body Example:</strong></p>
                                <pre><code>{
  "vendorCode": "${publisher.vendorCode}",
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "phone": "+1234567890",
  "leadType": "motor_vehicle_accident",
  "incidentDate": "2024-05-30",
  "description": "Rear-end collision",
  "injuries": true,
  "location": {
    "city": "Los Angeles",
    "state": "CA", 
    "zipCode": "90210"
  },
  "metadata": {
    "source": "web_form",
    "campaign": "summer_2024"
  }
}</code></pre>
                            </div>
                            
                            <div class="endpoint-section">
                                <h6>Rate Limits</h6>
                                <p>Your current rate limit: <strong>${publisher.rateLimit || 1000} calls/hour</strong></p>
                                <ul>
                                    <li>Standard: 1,000 calls/hour</li>
                                    <li>Premium: 5,000 calls/hour</li> 
                                    <li>Enterprise: Unlimited</li>
                                </ul>
                            </div>
                            
                            <div class="endpoint-section">
                                <h6>Error Codes</h6>
                                <table class="error-codes-table">
                                    <tr><td>400</td><td>Bad Request - Invalid data format</td></tr>
                                    <tr><td>401</td><td>Unauthorized - Invalid API key</td></tr>
                                    <tr><td>429</td><td>Rate Limited - Too many requests</td></tr>
                                    <tr><td>500</td><td>Server Error - Contact support</td></tr>
                                </table>
                            </div>
                        </div>
                        
                        <div class="next-steps">
                            <h5>🚀 Next Steps</h5>
                            <ol>
                                <li>Save the vendor code: <strong>${publisher.vendorCode}</strong></li>
                                <li>Securely store the API key</li>
                                <li>Share integration details with ${publisher.name}</li>
                                <li>Test lead submission</li>
                                <li>Monitor performance in the dashboard</li>
                            </ol>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="downloadInstructions('${publisher.id}')">📄 Download Markdown</button>
                    <button type="button" class="btn btn-info" onclick="downloadPublisherPdfInstructions('${publisher.id}')">📄 Download PDF</button>
                    <button type="button" class="btn btn-primary" onclick="closeModal('publisherOnboardingModal')">Complete Onboarding</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing onboarding modal
    const existingModal = document.getElementById('publisherOnboardingModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Copy to clipboard utility
window.copyToClipboard = function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const text = element.value || element.textContent;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            element.select();
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
        });
    }
};

// Download instructions for publisher
window.downloadInstructions = function(publisherId) {
    const publisher = publishers.find(p => p.id === publisherId);
    if (!publisher) return;
    
    const instructions = `
# ${publisher.name} - API Integration Instructions

## Publisher Details
- **Name:** ${publisher.name}
- **Vendor Code:** ${publisher.vendorCode}
- **Rate Limit:** ${publisher.rateLimit} calls/hour
- **Status:** ${publisher.status}

${publisher.apiKey ? `
## API Configuration
- **API Key:** ${publisher.apiKey}
- **Base URL:** ${window.APP_CONFIG.apiEndpoint}

## Authentication
Include the API key in the Authorization header:
\`\`\`
Authorization: Bearer ${publisher.apiKey}
\`\`\`

## Submit Lead Endpoint
\`\`\`
POST ${window.APP_CONFIG.apiEndpoint}/leads/submit
\`\`\`

### Request Body Example:
\`\`\`json
{
  "vendorCode": "${publisher.vendorCode}",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com", 
  "phone": "+1234567890",
  "leadType": "motor_vehicle_accident",
  "incidentDate": "2024-05-30",
  "description": "Rear-end collision",
  "injuries": true,
  "location": {
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90210"
  },
  "metadata": {
    "source": "web_form",
    "campaign": "summer_2024"
  }
}
\`\`\`

## Error Codes
- **400:** Bad Request - Invalid data format
- **401:** Unauthorized - Invalid API key  
- **429:** Rate Limited - Too many requests
- **500:** Server Error - Contact support
` : ''}

## Next Steps
1. Save the vendor code: ${publisher.vendorCode}
${publisher.apiKey ? '2. Securely store the API key' : ''}
3. Test lead submission
4. Monitor performance in dashboard

---
Generated on: ${new Date().toLocaleString()}
Claim Connectors CRM - Admin Dashboard
    `;
    
    const blob = new Blob([instructions], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${publisher.name.replace(/[^a-zA-Z0-9]/g, '_')}_integration_instructions.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Instructions downloaded!', 'success');
};

// Download publisher instructions as PDF
window.downloadPublisherPdfInstructions = function(publisherId) {
    const publisher = publishers.find(p => p.id === publisherId);
    if (!publisher) return;
    
    downloadPublisherInstructionsAsPdf(publisher.name, publisher.email, publisher.vendorCode, publisher.apiKey);
};

// PDF generation function for publishers
function downloadPublisherInstructionsAsPdf(publisherName, email, vendorCode, apiKey) {
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
        console.warn('jsPDF not available, falling back to markdown download');
        alert('PDF generation not available. Downloading markdown instructions instead.');
        const publisher = publishers.find(p => p.name === publisherName);
        if (publisher) {
            window.downloadInstructions(publisher.id);
        }
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const baseUrl = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
    
    try {
        // Create a new PDF document
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Add header
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Claim Connectors - API Integration', 20, 25);
        
        doc.setFontSize(16);
        doc.text(`Publisher: ${publisherName}`, 20, 35);
        
        // Add publisher credentials section
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Publisher Credentials', 20, 50);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Publisher Name: ${publisherName}`, 25, 60);
        doc.text(`Contact Email: ${email}`, 25, 67);
        doc.text(`Vendor Code: ${vendorCode}`, 25, 74);
        doc.text(`API Key: ${apiKey}`, 25, 81);
        doc.text(`API Endpoint: ${baseUrl}`, 25, 88);
        
        // Add warning box
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('⚠️ IMPORTANT: Keep your API key secure and never share it publicly.', 25, 98);
        
        // Add API instructions section
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Lead Submission Instructions', 20, 115);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('To send leads to Claim Connectors, POST to our lead submission endpoint:', 25, 125);
        
        // Endpoint
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Endpoint:', 25, 135);
        doc.setFont(undefined, 'normal');
        doc.text(`POST ${baseUrl}/leads`, 25, 142);
        
        // Headers
        doc.setFont(undefined, 'bold');
        doc.text('Required Headers:', 25, 152);
        
        doc.setFont(undefined, 'normal');
        doc.text('Content-Type: application/json', 25, 159);
        doc.text(`X-API-Key: ${apiKey}`, 25, 166);
        doc.text(`X-Vendor-Code: ${vendorCode}`, 25, 173);
        
        // Sample payload
        doc.setFont(undefined, 'bold');
        doc.text('Sample Lead Data:', 25, 183);
        
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        const samplePayload = [
            '{',
            '  "first_name": "John",',
            '  "last_name": "Smith",',
            '  "email": "john.smith@email.com",',
            '  "phone_home": "(555) 123-4567",',
            '  "state": "CA",',
            '  "incident_type": "auto_accident",',
            `  "vendor_code": "${vendorCode}"`,
            '}'
        ];
        
        let yPos = 190;
        samplePayload.forEach(line => {
            doc.text(line, 25, yPos);
            yPos += 5;
        });
        
        // Add response format
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('Success Response Format:', 25, yPos + 10);
        
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        yPos += 17;
        const responseFormat = [
            '{',
            '  "status": "success",',
            '  "lead_id": "uuid-string",',
            '  "message": "Lead received"',
            '}'
        ];
        
        responseFormat.forEach(line => {
            doc.text(line, 25, yPos);
            yPos += 5;
        });
        
        // Add support information
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('Support Contact:', 25, yPos + 15);
        doc.setFont(undefined, 'normal');
        doc.text('Email: publishers@claimconnectors.com', 25, yPos + 22);
        doc.text('Phone: (555) CLAIM-01', 25, yPos + 29);
        
        // Add footer
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 280);
        doc.text('Claim Connectors - Lead Management System', 20, 285);
        
        // Generate the PDF filename
        const filename = `${publisherName.replace(/[^a-zA-Z0-9]/g, '_')}_API_Instructions.pdf`;
        
        // Save the PDF
        doc.save(filename);
        
        showToast('📄 PDF instructions downloaded successfully!', 'success');
        console.log('✅ Publisher PDF instructions downloaded successfully');
        
    } catch (err) {
        console.error('Failed to generate PDF: ', err);
        showToast('❌ Failed to generate PDF. Please try again.', 'error');
    }
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

// Render publishers table
function renderPublishersTable() {
    const tableBody = document.getElementById('publishers-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = publishers.map(publisher => `
        <tr>
            <td>
                <input type="checkbox" data-publisher-id="${publisher.id}" 
                       onchange="handlePublisherSelection('${publisher.id}', this.checked)">
            </td>
            <td>
                <div class="publisher-info">
                    <div class="publisher-name">${publisher.name}</div>
                    <div class="publisher-email">${publisher.email}</div>
                </div>
            </td>
            <td>
                <span class="status-badge ${publisher.status}">${publisher.status}</span>
            </td>
            <td>
                <div class="api-key-cell">
                    ${publisher.apiKey ? 
                        `<code class="api-key-preview">${publisher.apiKey.substring(0, 12)}...</code>` : 
                        '<span class="no-api">No API Key</span>'
                    }
                </div>
            </td>
            <td class="text-center">${publisher.totalLeads.toLocaleString()}</td>
            <td class="text-center">$${publisher.revenue.toLocaleString()}</td>
            <td class="text-center">${formatRelativeTime(publisher.lastActivity)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editPublisher('${publisher.id}')">
                        ✏️ Edit
                    </button>
                    <button class="action-btn pdf" onclick="downloadPublisherPdfInstructions('${publisher.id}')" title="Download PDF Instructions">
                        📄 PDF
                    </button>
                    ${publisher.apiKey ? 
                        `<button class="action-btn api" onclick="regenerateApiKey('${publisher.id}')">
                            🔄 Regen API
                        </button>` : 
                        `<button class="action-btn api" onclick="generatePublisherApiKey('${publisher.id}')">
                            🔑 Gen API
                        </button>`
                    }
                    <button class="action-btn delete" onclick="deletePublisher('${publisher.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Handle publisher selection
function handlePublisherSelection(publisherId, isSelected) {
    if (isSelected) {
        selectedPublishers.add(publisherId);
    } else {
        selectedPublishers.delete(publisherId);
    }
    updateBulkActionsState();
}

// Update bulk actions state
function updateBulkActionsState() {
    const bulkBtn = document.getElementById('bulk-publisher-actions');
    if (bulkBtn) {
        bulkBtn.textContent = selectedPublishers.size > 0 ? 
            `📋 Bulk Actions (${selectedPublishers.size})` : 
            '📋 Bulk Actions';
        bulkBtn.disabled = selectedPublishers.size === 0;
    }
}

// Filter publishers
function filterPublishers() {
    const search = document.getElementById('publisher-search').value.toLowerCase();
    const statusFilter = document.getElementById('publisher-status-filter').value;
    
    const filtered = publishers.filter(publisher => {
        const matchesSearch = publisher.name.toLowerCase().includes(search) || 
                            publisher.email.toLowerCase().includes(search);
        const matchesStatus = !statusFilter || publisher.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    renderFilteredPublishers(filtered);
}

// Render filtered publishers
function renderFilteredPublishers(filteredPublishers) {
    const tableBody = document.getElementById('publishers-table-body');
    if (!tableBody) return;
    
    // Store original publishers and update with filtered
    const originalPublishers = [...publishers];
    publishers = filteredPublishers;
    renderPublishersTable();
    publishers = originalPublishers; // Restore original
}

// Handle publisher sorting
function handlePublisherSort(sortKey) {
    const header = document.querySelector(`#publishers-table .sortable[data-sort="${sortKey}"]`);
    
    // Update sort direction
    if (sortConfig.key === sortKey) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.key = sortKey;
        sortConfig.direction = 'asc';
    }
    
    // Update UI
    document.querySelectorAll('#publishers-table .sortable').forEach(h => {
        h.classList.remove('asc', 'desc');
    });
    header.classList.add(sortConfig.direction);
    
    // Sort publishers
    publishers.sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        
        // Handle different data types
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (sortConfig.direction === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    renderPublishersTable();
}

// Sort publishers from select dropdown
function sortPublishers() {
    const sortBy = document.getElementById('publisher-sort').value;
    handlePublisherSort(sortBy);
}

// Update publisher stats
function updatePublisherStats() {
    const totalPublishers = publishers.length;
    const activePublishers = publishers.filter(p => p.status === 'active').length;
    const totalRevenue = publishers.reduce((sum, p) => sum + p.revenue, 0);
    const totalLeads = publishers.reduce((sum, p) => sum + p.totalLeads, 0);
    const activeApis = publishers.filter(p => p.apiKey).length;
    const apiCallsToday = Math.floor(Math.random() * 5000) + 1000; // Mock data
    
    // Update stat elements
    const elements = {
        'total-publishers': totalPublishers,
        'active-apis': activeApis,
        'api-calls-today': apiCallsToday
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (typeof CountUp !== 'undefined' && !isNaN(value)) {
                new CountUp(id, value, { duration: 1.5 }).start();
            } else {
                element.textContent = value.toLocaleString();
            }
        }
    });
}

// Render top publishers
function renderTopPublishers() {
    const topList = document.getElementById('top-publishers-list');
    if (!topList) return;
    
    const topPublishers = [...publishers]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    
    topList.innerHTML = topPublishers.map((publisher, index) => `
        <div class="top-item">
            <div class="top-item-rank">${index + 1}</div>
            <div class="top-item-info">
                <div class="top-item-name">${publisher.name}</div>
                <div class="top-item-stats">
                    ${publisher.totalLeads} leads • $${publisher.revenue.toLocaleString()}
                </div>
            </div>
        </div>
    `).join('');
}

// Update publisher chart
function updatePublisherChart() {
    const ctx = document.getElementById('publisher-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (publisherChart) {
        publisherChart.destroy();
    }
    
    publisherChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: publishers.map(p => p.name),
            datasets: [{
                data: publishers.map(p => p.revenue),
                backgroundColor: [
                    '#4299e1',
                    '#10b981', 
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#f97316'
                ],
                borderWidth: 2,
                borderColor: 'var(--bg-primary)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'var(--text-primary)',
                        usePointStyle: true,
                        padding: 15
                    }
                }
            }
        }
    });
}

// Open publisher modal
function openPublisherModal(publisherId = null) {
    const modal = document.getElementById('publisherModal');
    const form = document.getElementById('publisher-form');
    const title = document.getElementById('publisher-modal-title');
    const apiInfo = document.getElementById('api-info');
    
    if (publisherId) {
        // Edit mode
        const publisher = publishers.find(p => p.id === publisherId);
        if (publisher) {
            title.textContent = 'Edit Publisher';
            populatePublisherForm(publisher);
            
            // Show API info if publisher has API key
            if (publisher.apiKey) {
                document.getElementById('generated-api-key').value = publisher.apiKey;
                apiInfo.style.display = 'block';
            }
        }
    } else {
        // Add mode
        title.textContent = 'Add New Publisher';
        form.reset();
        document.getElementById('generate-api').checked = true;
        apiInfo.style.display = 'none';
    }
    
    openModal('publisherModal');
}

// Generate API key
async function generateApiKey() {
    try {
        showToast('🔑 Generating new API key...', 'info');
        
        // Generate a secure API key
        const apiKey = 'pk_live_' + generateSecureToken(32);
        
        // Mock API call to save the key
        const response = await mockApiCall('/api/admin/generate-api-key', {
            method: 'POST',
            body: JSON.stringify({
                keyType: 'publisher',
                permissions: ['leads:submit', 'leads:status']
            })
        });
        
        if (response.success) {
            showToast('✅ API key generated successfully!', 'success');
            
            // Show the key in a modal or alert
            showApiKeyModal(apiKey);
        }
        
    } catch (error) {
        console.error('Error generating API key:', error);
        showToast('❌ Failed to generate API key', 'error');
    }
}

// Generate secure token
function generateSecureToken(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Show API key modal
function showApiKeyModal(apiKey) {
    // Create a temporary modal to display the API key
    const modalHtml = `
        <div class="modal" id="apiKeyDisplayModal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔑 New API Key Generated</h3>
                </div>
                <div class="modal-body">
                    <p><strong>⚠️ Important:</strong> Copy this API key now. For security reasons, it won't be shown again.</p>
                    <div class="api-key-container">
                        <input type="text" value="${apiKey}" class="form-input" readonly id="new-api-key">
                        <button type="button" class="btn btn-secondary" onclick="copyToClipboard('new-api-key')">📋 Copy</button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-primary" onclick="closeApiKeyModal()">Got it!</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Initialize vendor pricing functionality
function initializeVendorPricing() {
    const updateAllBtn = document.getElementById('update-all-prices');
    if (updateAllBtn) {
        updateAllBtn.addEventListener('click', updateAllVendorPrices);
    }
    
    // Ensure modal is hidden on page load
    const customPricingModal = document.getElementById('custom-pricing-modal');
    if (customPricingModal) {
        customPricingModal.classList.remove('active');
    }
}

// Handle price updates for publishers
function updateAllVendorPrices() {
    const pricingInputs = document.querySelectorAll('.pricing-input');
    let updatedCount = 0;
    
    pricingInputs.forEach(input => {
        const publisherId = input.getAttribute('data-publisher-id');
        const newCommission = parseFloat(input.value) || 0;
        
        // Find and update publisher
        const publisher = publishers.find(p => p.id === publisherId);
        if (publisher) {
            publisher.commission = newCommission;
            updatedCount++;
        }
    });
    
    if (updatedCount > 0) {
        showToast(`Updated commission rates for ${updatedCount} publisher${updatedCount > 1 ? 's' : ''}`, 'success');
        addActivity('💰', `Updated commission rates for ${updatedCount} publishers`, 'just now');
        
        // Update publisher displays
        renderPublishersTable();
        updatePublisherStats();
    }
    
    closeModal('custom-pricing-modal');
}

// Vendor pricing management - only called when needed
function openVendorPricingModal() {
    const modal = document.getElementById('custom-pricing-modal');
    const pricingList = document.getElementById('vendor-pricing-list');
    
    // Check if we have publishers that can act as vendors
    if (publishers && publishers.length > 0) {
        const pricingHTML = publishers.map(publisher => `
            <div class="pricing-item">
                <div class="pricing-vendor">${publisher.name}</div>
                <div class="pricing-input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" class="pricing-input" value="${publisher.commission || 15}" 
                           data-publisher-id="${publisher.id}" min="0" max="100" step="0.1">
                    <span style="margin-left: 0.5rem; color: var(--text-secondary);">%</span>
                </div>
            </div>
        `).join('');
        
        pricingList.innerHTML = pricingHTML;
    } else {
        pricingList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏢</div>
                <div class="empty-state-title">No Publishers Available</div>
                <div class="empty-state-text">Add publishers first to configure custom pricing and commission rates.</div>
                <button type="button" class="btn btn-primary" onclick="closeModal('custom-pricing-modal'); openPublisherModal();">
                    ➕ Add First Publisher
                </button>
            </div>
        `;
    }
    
    // Open the modal
    openModal('custom-pricing-modal');
}

// Show bulk publisher actions
function showBulkPublisherActions() {
    if (selectedPublishers.size === 0) {
        showToast('Please select publishers first', 'warning');
        return;
    }
    
    const actions = [
        { label: 'Download PDFs', action: 'downloadPdfs', icon: '📄' },
        { label: 'Export Data', action: 'export', icon: '📊' },
        { label: 'Update Status', action: 'updateStatus', icon: '🔄' },
        { label: 'Delete Selected', action: 'delete', icon: '🗑️' }
    ];
    
    const actionList = actions.map(action => 
        `<button class="bulk-action-btn" onclick="performBulkPublisherAction('${action.action}')">
            ${action.icon} ${action.label}
        </button>`
    ).join('');
    
    const modalHtml = `
        <div class="modal show" id="bulkPublisherActionsModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Bulk Actions (${selectedPublishers.size} publishers)</h3>
                    <span class="close" onclick="closeModal('bulkPublisherActionsModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="bulk-actions-grid">
                        ${actionList}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Perform bulk publisher action
function performBulkPublisherAction(action) {
    const selectedIds = Array.from(selectedPublishers);
    const selectedPublisherData = publishers.filter(p => selectedIds.includes(p.id));
    
    switch (action) {
        case 'downloadPdfs':
            downloadBulkPublisherPdfs(selectedPublisherData);
            break;
        case 'export':
            exportSelectedPublishers(selectedPublisherData);
            break;
        case 'updateStatus':
            showBulkStatusUpdateModal(selectedPublisherData);
            break;
        case 'delete':
            if (confirm(`Delete ${selectedIds.length} selected publishers? This cannot be undone.`)) {
                deleteSelectedPublishers(selectedIds);
            }
            break;
    }
    
    closeModal('bulkPublisherActionsModal');
}

// Download PDFs for multiple publishers
function downloadBulkPublisherPdfs(publisherList) {
    if (publisherList.length === 0) return;
    
    showToast(`Generating ${publisherList.length} PDF files...`, 'info');
    
    // Download each PDF with a small delay to prevent browser blocking
    publisherList.forEach((publisher, index) => {
        setTimeout(() => {
            if (publisher.apiKey) {
                downloadPublisherInstructionsAsPdf(
                    publisher.name, 
                    publisher.email, 
                    publisher.vendorCode, 
                    publisher.apiKey
                );
            } else {
                console.warn(`Skipping ${publisher.name} - no API key`);
            }
        }, index * 500); // 500ms delay between downloads
    });
    
    setTimeout(() => {
        showToast(`✅ Generated ${publisherList.length} PDF files`, 'success');
    }, publisherList.length * 500 + 1000);
} 