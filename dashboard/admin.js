// Admin Dashboard JavaScript

// Global variables
let performanceChart;
let agencies = [];
let agents = [];
let vendorPrices = {};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    
    // Initialize components
    initializeDateTime();
    initializeThemeToggle();
    initializeStats();
    initializeChart();
    initializePricingControls();
    initializeAgencies();
    initializeAgents();
    initializeReports();
    initializeFAB();
    initializeModals();
    
    // Load data
    loadDashboardData();
});

// Authentication check
function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user.username || user.role !== 'admin') {
        // Not logged in or not admin, redirect to login page
        window.location.href = '/login.html';
        return;
    }
    
    // Set admin name
    document.getElementById('admin-name').textContent = user.name || user.username;
}

// Initialize date/time
function initializeDateTime() {
    const updateDateTime = () => {
        const now = new Date();
        const hours = now.getHours();
        
        // Update greeting
        let greeting = 'morning';
        if (hours >= 12 && hours < 17) greeting = 'afternoon';
        else if (hours >= 17) greeting = 'evening';
        document.getElementById('time-greeting').textContent = greeting;
        
        // Update date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').textContent = now.toLocaleDateString(undefined, options);
    };
    
    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute
}

// Theme toggle functionality
function initializeThemeToggle() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Set initial theme
    setTheme(currentTheme);
    
    themeButtons.forEach(btn => {
        if (btn.dataset.theme === currentTheme) {
            btn.classList.add('active');
        }
        
        btn.addEventListener('click', () => {
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setTheme(btn.dataset.theme);
        });
    });
}

function setTheme(theme) {
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
}

// Initialize animated stats
function initializeStats() {
    // These will be populated with real data
    const stats = {
        revenue: 42350,
        revenueChange: 12,
        cpa: 28,
        cpaChange: 15,
        agents: 23,
        agentsOnline: 12,
        conversion: 68,
        conversionChange: 5
    };
    
    // Animate numbers with CountUp
    if (typeof CountUp !== 'undefined') {
        new CountUp('revenue-stat', stats.revenue, {
            duration: 2.5,
            separator: ',',
            decimal: '.'
        }).start();
        
        new CountUp('revenue-change', stats.revenueChange, {
            duration: 2,
            suffix: ''
        }).start();
        
        new CountUp('cpa-stat', stats.cpa, {
            duration: 2,
            suffix: ''
        }).start();
        
        new CountUp('cpa-change', stats.cpaChange, {
            duration: 2,
            suffix: ''
        }).start();
        
        new CountUp('agents-stat', stats.agents, {
            duration: 2
        }).start();
        
        new CountUp('agents-online', stats.agentsOnline, {
            duration: 2
        }).start();
        
        new CountUp('conversion-stat', stats.conversion, {
            duration: 2.5,
            suffix: ''
        }).start();
        
        new CountUp('conversion-change', stats.conversionChange, {
            duration: 2,
            suffix: ''
        }).start();
    }
}

// Initialize performance chart
function initializeChart() {
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;
    
    // Chart configuration
    const config = {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Leads',
                data: [],
                borderColor: '#4299e1',
                backgroundColor: 'rgba(66, 153, 225, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#4299e1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }, {
                label: 'Revenue',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1e293b',
                    bodyColor: '#64748b',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.label === 'Revenue') {
                                    label += '$' + context.parsed.y.toLocaleString();
                                } else {
                                    label += context.parsed.y;
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        borderDash: [5, 5],
                        color: '#e2e8f0'
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#64748b',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    };
    
    performanceChart = new Chart(ctx, config);
    
    // Handle period buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateChartData(btn.dataset.period);
        });
    });
    
    // Load initial data
    updateChartData('today');
}

// Update chart data based on period
function updateChartData(period) {
    const now = new Date();
    let labels = [];
    let leadsData = [];
    let revenueData = [];
    
    switch(period) {
        case 'today':
            // Hourly data for today
            for (let i = 0; i < 24; i++) {
                labels.push(`${i}:00`);
                leadsData.push(Math.floor(Math.random() * 10) + 5);
                revenueData.push(Math.floor(Math.random() * 500) + 200);
            }
            break;
            
        case 'week':
            // Daily data for last 7 days
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(days[date.getDay()]);
                leadsData.push(Math.floor(Math.random() * 50) + 20);
                revenueData.push(Math.floor(Math.random() * 2000) + 1000);
            }
            break;
            
        case 'month':
            // Daily data for last 30 days
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(date.getDate());
                leadsData.push(Math.floor(Math.random() * 50) + 20);
                revenueData.push(Math.floor(Math.random() * 2000) + 1000);
            }
            break;
    }
    
    // Update chart
    performanceChart.data.labels = labels;
    performanceChart.data.datasets[0].data = leadsData;
    performanceChart.data.datasets[1].data = revenueData;
    performanceChart.update();
}

// Initialize pricing controls
function initializePricingControls() {
    const priceInput = document.getElementById('default-price');
    const priceSlider = document.getElementById('price-slider');
    const updateBtn = document.getElementById('update-default-price');
    
    // Sync input and slider
    priceInput.addEventListener('input', () => {
        priceSlider.value = priceInput.value;
    });
    
    priceSlider.addEventListener('input', () => {
        priceInput.value = priceSlider.value;
    });
    
    // Update button
    updateBtn.addEventListener('click', () => {
        const newPrice = priceInput.value;
        updateDefaultPrice(newPrice);
    });
    
    // Smart pricing toggle
    document.getElementById('smart-pricing-toggle').addEventListener('change', (e) => {
        if (e.target.checked) {
            showToast('Smart Pricing enabled! AI will optimize prices based on demand.', 'success');
        } else {
            showToast('Smart Pricing disabled', 'info');
        }
    });
    
    // Custom pricing button
    document.getElementById('custom-pricing-btn').addEventListener('click', () => {
        showCustomPricingModal();
    });
}

// Update default price
function updateDefaultPrice(price) {
    // Here you would make an API call to update the price
    showToast(`Default price updated to $${price}`, 'success');
    
    // Update all agencies that use default pricing
    agencies.forEach(agency => {
        if (!vendorPrices[agency.code]) {
            // Update UI if needed
        }
    });
}

// Initialize agencies
function initializeAgencies() {
    // Sample data - replace with API call
    agencies = [
        {
            code: 'ACME',
            name: 'Acme Corp',
            leads: 523,
            monthlyGoal: 600,
            cpa: 28,
            revenue: 14644,
            topCampaign: 'Google Ads',
            grade: 'A'
        },
        {
            code: 'BETA',
            name: 'Beta Inc',
            leads: 234,
            monthlyGoal: 400,
            cpa: 42,
            revenue: 9828,
            topCampaign: 'Facebook',
            grade: 'B'
        },
        {
            code: 'GAMMA',
            name: 'Gamma LLC',
            leads: 445,
            monthlyGoal: 500,
            cpa: 35,
            revenue: 15575,
            topCampaign: 'Direct',
            grade: 'A'
        }
    ];
    
    renderAgencies();
}

// Render agency cards
function renderAgencies() {
    const grid = document.getElementById('agencies-grid');
    grid.innerHTML = '';
    
    agencies.forEach((agency, index) => {
        const progress = Math.round((agency.leads / agency.monthlyGoal) * 100);
        const card = document.createElement('div');
        card.className = 'agency-card glass-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <div class="agency-card-header">
                <h3 class="agency-name">${agency.name}</h3>
                <button class="agency-menu">⋮</button>
            </div>
            
            <div class="agency-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%" data-progress="${progress}"></div>
                </div>
                <div class="progress-text">${progress}% of monthly goal</div>
            </div>
            
            <div class="agency-stats">
                <span class="agency-stat">${agency.leads} leads</span>
                <span class="agency-stat">$${agency.cpa} CPA</span>
                <span class="agency-stat grade grade-${agency.grade}">Grade: ${agency.grade}</span>
            </div>
            
            <div class="agency-stat">
                Top Campaign: ${agency.topCampaign} ($${agency.cpa - 10} CPA)
            </div>
            
            <div class="agency-actions">
                <button class="btn btn-sm btn-secondary" onclick="viewAgencyDetails('${agency.code}')">View Details</button>
                <button class="btn btn-sm btn-secondary" onclick="editAgencyPricing('${agency.code}')">Edit Pricing</button>
                <button class="btn btn-sm btn-secondary" onclick="viewAgencyReports('${agency.code}')">Reports</button>
            </div>
        `;
        
        grid.appendChild(card);
        
        // Animate progress bar after card is added
        setTimeout(() => {
            const progressBar = card.querySelector('.progress-fill');
            progressBar.style.width = progress + '%';
        }, 100 + (index * 100));
    });
}

// Initialize agents table
function initializeAgents() {
    // Sample data - replace with API call
    agents = [
        { name: 'John Smith', email: 'john@agency.com', status: 'online', leads: 145, conversion: 72 },
        { name: 'Sarah Johnson', email: 'sarah@agency.com', status: 'online', leads: 223, conversion: 68 },
        { name: 'Mike Davis', email: 'mike@agency.com', status: 'offline', leads: 98, conversion: 71 }
    ];
    
    renderAgents();
    
    // Search functionality
    document.getElementById('agent-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredAgents = agents.filter(agent => 
            agent.name.toLowerCase().includes(searchTerm) ||
            agent.email.toLowerCase().includes(searchTerm)
        );
        renderAgents(filteredAgents);
    });
    
    // Add agent button
    document.getElementById('add-agent-btn').addEventListener('click', () => {
        showAddAgentModal();
    });
}

// Render agents table
function renderAgents(agentList = agents) {
    const tbody = document.getElementById('agents-tbody');
    tbody.innerHTML = '';
    
    agentList.forEach(agent => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${agent.name}</td>
            <td>
                <div class="status-indicator">
                    <span class="status-dot ${agent.status === 'offline' ? 'offline' : ''}"></span>
                    ${agent.status === 'online' ? 'Online' : 'Away'}
                </div>
            </td>
            <td>${agent.leads}</td>
            <td>${agent.conversion}%</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="removeAgent('${agent.email}')">Remove</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Initialize reports
function initializeReports() {
    updateReportSummary();
    
    // Period change handler
    document.getElementById('report-period').addEventListener('change', () => {
        updateReportSummary();
    });
    
    // Export handler
    document.getElementById('export-report').addEventListener('click', () => {
        exportReport();
    });
}

// Update report summary
function updateReportSummary() {
    const period = document.getElementById('report-period').value;
    const summaryDiv = document.getElementById('report-summary');
    
    // Sample data - replace with API call
    const reportData = [
        { agency: 'Acme Corp', leads: 523, revenue: 14644, cpa: 28 },
        { agency: 'Beta Inc', leads: 234, revenue: 9828, cpa: 42 },
        { agency: 'Gamma LLC', leads: 445, revenue: 15575, cpa: 35 }
    ];
    
    const totals = reportData.reduce((acc, curr) => ({
        leads: acc.leads + curr.leads,
        revenue: acc.revenue + curr.revenue
    }), { leads: 0, revenue: 0 });
    
    const avgCPA = Math.round(totals.revenue / totals.leads);
    
    summaryDiv.innerHTML = `
        <h3>📈 ${period === 'month' ? 'This Month' : period === 'week' ? 'This Week' : 'Today'} Summary</h3>
        <table class="report-table data-table">
            <thead>
                <tr>
                    <th>Agency</th>
                    <th>Leads</th>
                    <th>Revenue</th>
                    <th>CPA</th>
                </tr>
            </thead>
            <tbody>
                ${reportData.map(data => `
                    <tr>
                        <td>${data.agency}</td>
                        <td>${data.leads.toLocaleString()}</td>
                        <td>$${data.revenue.toLocaleString()}</td>
                        <td>$${data.cpa}</td>
                    </tr>
                `).join('')}
                <tr>
                    <td><strong>TOTAL</strong></td>
                    <td><strong>${totals.leads.toLocaleString()}</strong></td>
                    <td><strong>$${totals.revenue.toLocaleString()}</strong></td>
                    <td><strong>$${avgCPA}</strong></td>
                </tr>
            </tbody>
        </table>
    `;
}

// Initialize floating action button
function initializeFAB() {
    const fab = document.getElementById('fab-button');
    const fabMenu = document.getElementById('fab-menu');
    
    fab.addEventListener('click', () => {
        fab.classList.toggle('active');
        fabMenu.classList.toggle('active');
    });
    
    // FAB actions
    document.querySelectorAll('.fab-action').forEach(action => {
        action.addEventListener('click', () => {
            const actionType = action.dataset.action;
            switch(actionType) {
                case 'report':
                    document.querySelector('.reports-section').scrollIntoView({ behavior: 'smooth' });
                    break;
                case 'agent':
                    showAddAgentModal();
                    break;
                case 'pricing':
                    showCustomPricingModal();
                    break;
            }
            fab.classList.remove('active');
            fabMenu.classList.remove('active');
        });
    });
    
    // Close FAB menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!fab.contains(e.target) && !fabMenu.contains(e.target)) {
            fab.classList.remove('active');
            fabMenu.classList.remove('active');
        }
    });
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
    document.getElementById('send-agent-invite').addEventListener('click', () => {
        const email = document.getElementById('new-agent-email').value;
        const role = document.querySelector('input[name="agent-role"]:checked').value;
        
        if (!email) {
            showToast('Please enter an email address', 'error');
            return;
        }
        
        // Add agent logic here
        agents.push({
            name: email.split('@')[0],
            email: email,
            status: 'offline',
            leads: 0,
            conversion: 0
        });
        
        renderAgents();
        document.getElementById('add-agent-modal').style.display = 'none';
        showToast(`Invitation sent to ${email}`, 'success');
        
        // Reset form
        document.getElementById('new-agent-email').value = '';
    });
    
    // Custom pricing modal
    document.getElementById('update-all-prices').addEventListener('click', () => {
        updateAllCustomPrices();
    });
}

// Show add agent modal
function showAddAgentModal() {
    document.getElementById('add-agent-modal').style.display = 'flex';
}

// Show custom pricing modal
function showCustomPricingModal() {
    const modal = document.getElementById('custom-pricing-modal');
    const list = document.getElementById('vendor-pricing-list');
    
    list.innerHTML = agencies.map(agency => `
        <div class="pricing-item">
            <span class="pricing-vendor">${agency.name}:</span>
            <div class="pricing-input-wrapper">
                <span>$</span>
                <input type="number" class="pricing-input" value="${vendorPrices[agency.code] || 35}" 
                       data-vendor="${agency.code}" min="10" max="100">
            </div>
        </div>
    `).join('');
    
    modal.style.display = 'flex';
}

// Update all custom prices
function updateAllCustomPrices() {
    const inputs = document.querySelectorAll('.pricing-input');
    inputs.forEach(input => {
        const vendor = input.dataset.vendor;
        const price = input.value;
        vendorPrices[vendor] = price;
    });
    
    document.getElementById('custom-pricing-modal').style.display = 'none';
    showToast('Custom pricing updated successfully', 'success');
}

// Helper functions
function viewAgencyDetails(code) {
    // Navigate to agency details or show modal
    console.log('View details for', code);
}

function editAgencyPricing(code) {
    // Show pricing modal for specific agency
    console.log('Edit pricing for', code);
}

function viewAgencyReports(code) {
    // Show reports for specific agency
    console.log('View reports for', code);
}

function removeAgent(email) {
    if (confirm(`Remove agent ${email}?`)) {
        agents = agents.filter(a => a.email !== email);
        renderAgents();
        showToast('Agent removed successfully', 'success');
    }
}

function exportReport() {
    // Export report logic
    showToast('Report exported successfully', 'success');
}

// Toast notification system
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
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

// Load dashboard data from API
async function loadDashboardData() {
    try {
        // Show loading state
        showLoading(true);
        
        // Fetch admin stats from backend
        await fetchAdminStats();
        
        // Fetch analytics data from backend
        await fetchAnalyticsData();
        
        // Initialize with real data
        renderDashboardWithRealData();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading dashboard data. Using sample data.', 'warning');
        
        // Fall back to mock data if API fails
        initializeWithMockData();
    } finally {
        showLoading(false);
    }
}

// Fetch admin statistics from backend
async function fetchAdminStats() {
    try {
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch('https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/admin/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            // Token expired or invalid, redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const stats = await response.json();
        updateStatsDisplay(stats);
        
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        throw error;
    }
}

// Fetch analytics data from backend
async function fetchAnalyticsData() {
    try {
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch('https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/admin/analytics', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            // Token expired or invalid, redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const analytics = await response.json();
        updateAnalyticsDisplay(analytics);
        
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        throw error;
    }
}

// Update stats display with real data
function updateStatsDisplay(stats) {
    // Update stats with CountUp animation if available
    if (typeof CountUp !== 'undefined') {
        // Total Leads
        if (stats.totalLeads !== undefined) {
            new CountUp('total-leads-stat', stats.totalLeads, {
                duration: 2.5,
                separator: ',',
                decimal: '.'
            }).start();
        }
        
        // Leads This Month
        if (stats.leadsThisMonth !== undefined) {
            new CountUp('leads-month-stat', stats.leadsThisMonth, {
                duration: 2.5,
                separator: ','
            }).start();
        }
        
        // Total Vendors
        if (stats.totalVendors !== undefined) {
            new CountUp('vendors-stat', stats.totalVendors, {
                duration: 2
            }).start();
        }
        
        // Total Users
        if (stats.totalUsers !== undefined) {
            new CountUp('users-stat', stats.totalUsers, {
                duration: 2
            }).start();
        }
        
        // Conversion Rate
        if (stats.conversionRate !== undefined) {
            new CountUp('conversion-stat', stats.conversionRate, {
                duration: 2.5,
                suffix: '%'
            }).start();
        }
    } else {
        // Fallback to direct display if CountUp not available
        if (stats.totalLeads !== undefined) {
            document.getElementById('total-leads-stat').textContent = stats.totalLeads.toLocaleString();
        }
        if (stats.leadsThisMonth !== undefined) {
            document.getElementById('leads-month-stat').textContent = stats.leadsThisMonth.toLocaleString();
        }
        if (stats.totalVendors !== undefined) {
            document.getElementById('vendors-stat').textContent = stats.totalVendors;
        }
        if (stats.totalUsers !== undefined) {
            document.getElementById('users-stat').textContent = stats.totalUsers;
        }
        if (stats.conversionRate !== undefined) {
            document.getElementById('conversion-stat').textContent = stats.conversionRate + '%';
        }
    }
    
    // Store stats for other uses
    window.adminStats = stats;
}

// Update analytics display with real data
function updateAnalyticsDisplay(analytics) {
    // Update charts with real analytics data
    if (analytics.leadsByMonth && performanceChart) {
        updateChartWithRealData(analytics);
    }
    
    // Store analytics for other uses
    window.adminAnalytics = analytics;
}

// Update chart with real analytics data
function updateChartWithRealData(analytics) {
    if (!performanceChart || !analytics.leadsByMonth) return;
    
    // Extract data from analytics
    const labels = analytics.leadsByMonth.map(item => {
        const date = new Date(item.month);
        return date.toLocaleDateString('en-US', { month: 'short' });
    });
    
    const leadsData = analytics.leadsByMonth.map(item => item.leads || 0);
    const revenueData = analytics.leadsByMonth.map(item => item.revenue || 0);
    
    // Update chart
    performanceChart.data.labels = labels;
    performanceChart.data.datasets[0].data = leadsData;
    performanceChart.data.datasets[1].data = revenueData;
    performanceChart.update();
}

// Render dashboard with real data
function renderDashboardWithRealData() {
    // Update vendor performance if analytics available
    if (window.adminAnalytics && window.adminAnalytics.vendorPerformance) {
        updateVendorPerformanceDisplay(window.adminAnalytics.vendorPerformance);
    }
    
    // Update other real-time elements
    updateLastRefreshTime();
}

// Update vendor performance display
function updateVendorPerformanceDisplay(vendorPerformance) {
    // This function can be expanded to show vendor-specific data
    // For now, just log the data
    console.log('Vendor Performance Data:', vendorPerformance);
}

// Update last refresh time
function updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    // If there's a last updated element, update it
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = `Last updated: ${timeString}`;
    }
}

// Show loading state
function showLoading(show) {
    const loader = document.getElementById('admin-loader');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
    
    // Could also show skeleton loaders for individual components
    const statsCards = document.querySelectorAll('.stat-card');
    statsCards.forEach(card => {
        if (show) {
            card.classList.add('loading');
        } else {
            card.classList.remove('loading');
        }
    });
}

// Initialize with mock data (fallback)
function initializeWithMockData() {
    // Use the existing mock data initialization
    const mockStats = {
        totalLeads: 1250,
        leadsThisMonth: 320,
        totalVendors: 8,
        totalUsers: 15,
        conversionRate: 68
    };
    
    updateStatsDisplay(mockStats);
    
    // Use existing chart update with mock data
    updateChartData('month');
}

// Add refresh button functionality
function addRefreshFunctionality() {
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadDashboardData();
        });
    }
}

// Initialize refresh functionality when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    addRefreshFunctionality();
    
    // Auto-refresh every 5 minutes
    setInterval(() => {
        loadDashboardData();
    }, 5 * 60 * 1000);
}); 