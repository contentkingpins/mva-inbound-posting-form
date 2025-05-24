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
    
    if (!token || !user.username) {
        window.location.href = 'login.html';
        return;
    }
    
    if (user.role !== 'admin') {
        window.location.href = 'index.html';
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

// Load dashboard data
async function loadDashboardData() {
    try {
        // This would be replaced with actual API calls
        // For now, using the sample data initialized in each section
        
        // Show loading states if needed
        // const loadingEls = document.querySelectorAll('.skeleton');
        // loadingEls.forEach(el => el.classList.add('show'));
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Data is already loaded in initialize functions
        // Just show a success message
        console.log('Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading dashboard data', 'error');
    }
} 