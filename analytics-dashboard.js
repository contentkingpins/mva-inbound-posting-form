// Advanced Analytics Dashboard JavaScript
// Comprehensive Business Intelligence & Performance Analytics

// Global variables
let charts = {};
let analyticsData = {};
let updateInterval;
let isRefreshing = false;

// Initialize dashboard when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Advanced Analytics Dashboard...');
    initializeDashboard();
});

// Main initialization function
async function initializeDashboard() {
    try {
        // Check authentication
        if (!checkAuthentication()) {
            return;
        }
        
        // Initialize components
        initializeEventListeners();
        initializeTimeControls();
        initializeModals();
        
        // Load initial data
        await loadAnalyticsData();
        
        // Initialize charts
        initializeCharts();
        
        // Start real-time updates
        startRealTimeUpdates();
        
        // Add loading animations
        addLoadingAnimations();
        
        console.log('✅ Advanced Analytics Dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
        showToast('Failed to initialize analytics dashboard', 'error');
    }
}

// Authentication check
function checkAuthentication() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user.email) {
        console.log('❌ Authentication required, redirecting to login');
        window.location.href = 'login.html';
        return false;
    }
    
    // Check for admin access
    const userRole = user['custom:role'] || user.role || 'agent';
    const knownAdminEmails = ['george@contentkingpins.com', 'admin@contentkingpins.com'];
    const isAdmin = userRole === 'admin' || knownAdminEmails.includes(user.email.toLowerCase());
    
    if (!isAdmin) {
        console.log('❌ Admin access required for analytics dashboard');
        window.location.href = 'login.html';
        return false;
    }
    
    console.log('✅ Authentication verified for analytics dashboard');
    return true;
}

// Initialize event listeners
function initializeEventListeners() {
    // Header controls
    const refreshBtn = document.getElementById('refresh-analytics');
    const exportBtn = document.getElementById('export-report');
    const dateRangeSelector = document.getElementById('date-range-selector');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefreshAnalytics);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => openModal('export-modal'));
    }
    
    if (dateRangeSelector) {
        dateRangeSelector.addEventListener('change', handleDateRangeChange);
    }
    
    // Chart controls
    const trendBtns = document.querySelectorAll('.trend-btn');
    trendBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleTrendPeriodChange(e.target);
        });
    });
    
    // Funnel settings
    const funnelPeriod = document.getElementById('funnel-period');
    if (funnelPeriod) {
        funnelPeriod.addEventListener('change', updateConversionFunnel);
    }
    
    // Performance metric selector
    const performanceMetric = document.getElementById('performance-metric');
    if (performanceMetric) {
        performanceMetric.addEventListener('change', updateAgentLeaderboard);
    }
    
    // Export modal
    const generateExportBtn = document.getElementById('generate-export');
    if (generateExportBtn) {
        generateExportBtn.addEventListener('click', handleExportGeneration);
    }
    
    console.log('✅ Event listeners initialized');
}

// Load analytics data from API
async function loadAnalyticsData() {
    try {
        showLoadingState();
        
        console.log('📊 Loading analytics data...');
        
        // Simulate API calls with realistic data
        const [kpiData, leadsData, agentsData, publishersData, predictiveData] = await Promise.all([
            loadKPIData(),
            loadLeadsAnalytics(),
            loadAgentPerformance(),
            loadPublisherAnalytics(),
            loadPredictiveInsights()
        ]);
        
        analyticsData = {
            kpis: kpiData,
            leads: leadsData,
            agents: agentsData,
            publishers: publishersData,
            predictions: predictiveData,
            lastUpdated: new Date()
        };
        
        // Update UI with loaded data
        updateKPICards(analyticsData.kpis);
        updateConversionFunnel(analyticsData.leads.funnel);
        updateAgentLeaderboard(analyticsData.agents);
        updatePublisherROI(analyticsData.publishers);
        updatePredictiveAnalytics(analyticsData.predictions);
        updateInsightsPanel();
        
        hideLoadingState();
        updateLastRefreshTime();
        
        console.log('✅ Analytics data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading analytics data:', error);
        showToast('Failed to load analytics data', 'error');
        hideLoadingState();
    }
}

// Mock API functions
async function loadKPIData() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
        totalLeads: 2847,
        newLeadsToday: 23,
        conversionRate: 73.2,
        totalRevenue: 289750,
        arrValue: 3477000,
        avgResponseTime: '1.8h',
        customerSatisfaction: 4.6,
        npsScore: 67,
        revenueForecast: 127500,
        trends: {
            leads: 12.5,
            conversion: 8.3,
            revenue: 15.7,
            response: -5.2,
            satisfaction: 3.1,
            forecast: 22.1
        }
    };
}

async function loadLeadsAnalytics() {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
        funnel: {
            leads: 2847,
            qualified: 2221,
            contacted: 1850,
            interested: 1282,
            converted: 797
        },
        sources: {
            'Publisher API': { leads: 1247, conversion: 78.2, performance: 'high' },
            'Direct Website': { leads: 892, conversion: 65.4, performance: 'high' },
            'Referrals': { leads: 456, conversion: 71.8, performance: 'high' },
            'Social Media': { leads: 252, conversion: 34.7, performance: 'low' }
        },
        quality: {
            completeness: 92,
            responsiveness: 78,
            authority: 85,
            budget: 73
        }
    };
}

async function loadAgentPerformance() {
    await new Promise(resolve => setTimeout(resolve, 700));
    
    return [
        { 
            id: 'a1', 
            name: 'Sarah Johnson', 
            leads: 156, 
            conversion: 78.4, 
            revenue: 89250, 
            satisfaction: 4.8,
            trend: 'up'
        },
        { 
            id: 'a2', 
            name: 'Mike Chen', 
            leads: 203, 
            conversion: 72.1, 
            revenue: 76890, 
            satisfaction: 4.6,
            trend: 'up'
        },
        { 
            id: 'a3', 
            name: 'Emily Davis', 
            leads: 89, 
            conversion: 85.2, 
            revenue: 95400, 
            satisfaction: 4.9,
            trend: 'stable'
        },
        { 
            id: 'a4', 
            name: 'John Smith', 
            leads: 134, 
            conversion: 69.7, 
            revenue: 67800, 
            satisfaction: 4.4,
            trend: 'down'
        },
        { 
            id: 'a5', 
            name: 'Lisa Brown', 
            leads: 97, 
            conversion: 76.3, 
            revenue: 72100, 
            satisfaction: 4.7,
            trend: 'up'
        }
    ];
}

async function loadPublisherAnalytics() {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
        { 
            name: 'Legal Lead Pro', 
            leads: 1247, 
            revenue: 34567.89, 
            roi: 425, 
            conversionRate: 78.2,
            avgDealSize: 287
        },
        { 
            name: 'AccidentClaims.net', 
            leads: 892, 
            revenue: 23456.78, 
            roi: 312, 
            conversionRate: 65.4,
            avgDealSize: 234
        },
        { 
            name: 'InjuryLeads Direct', 
            leads: 234, 
            revenue: 5678.90, 
            roi: 189, 
            conversionRate: 45.7,
            avgDealSize: 198
        }
    ];
}

async function loadPredictiveInsights() {
    await new Promise(resolve => setTimeout(resolve, 900));
    
    return {
        conversionPredictions: {
            highValueLeads: 23,
            optimalContactTime: '2-4 PM EST',
            nextWeekConversions: 47,
            modelAccuracy: 94.2
        },
        revenuePredictions: {
            next7Days: { amount: 28400, confidence: 89 },
            next30Days: { amount: 127500, confidence: 85 },
            nextQuarter: { amount: 425000, confidence: 78 }
        },
        churnRisk: {
            high: { count: 3, action: 'Immediate attention needed' },
            medium: { count: 8, action: 'Schedule check-in' },
            low: { count: 45, action: 'Continue monitoring' }
        }
    };
}

// Update KPI cards with real data
function updateKPICards(kpiData) {
    console.log('📊 Updating KPI cards...');
    
    if (typeof CountUp !== 'undefined') {
        // Animate numbers with CountUp.js
        new CountUp('total-leads-kpi', kpiData.totalLeads, { 
            duration: 2, 
            separator: ',' 
        }).start();
        
        new CountUp('conversion-rate-kpi', kpiData.conversionRate, { 
            duration: 2, 
            suffix: '%',
            decimal: '.',
            decimalPlaces: 1
        }).start();
        
        new CountUp('total-revenue-kpi', kpiData.totalRevenue, { 
            duration: 2.5, 
            prefix: '$',
            separator: ','
        }).start();
        
        new CountUp('customer-satisfaction', kpiData.customerSatisfaction, { 
            duration: 2, 
            suffix: '/5',
            decimal: '.',
            decimalPlaces: 1
        }).start();
        
        new CountUp('revenue-forecast', kpiData.revenueForecast, { 
            duration: 2.5, 
            prefix: '$',
            separator: ','
        }).start();
    } else {
        // Fallback without animations
        document.getElementById('total-leads-kpi').textContent = kpiData.totalLeads.toLocaleString();
        document.getElementById('conversion-rate-kpi').textContent = kpiData.conversionRate + '%';
        document.getElementById('total-revenue-kpi').textContent = '$' + kpiData.totalRevenue.toLocaleString();
        document.getElementById('customer-satisfaction').textContent = kpiData.customerSatisfaction + '/5';
        document.getElementById('revenue-forecast').textContent = '$' + kpiData.revenueForecast.toLocaleString();
    }
    
    // Update additional details
    const newLeadsElement = document.getElementById('new-leads-today');
    if (newLeadsElement) {
        newLeadsElement.textContent = kpiData.newLeadsToday;
    }
    
    const arrElement = document.getElementById('arr-value');
    if (arrElement) {
        arrElement.textContent = '$' + kpiData.arrValue.toLocaleString();
    }
    
    const responseTimeElement = document.getElementById('avg-response-time');
    if (responseTimeElement) {
        responseTimeElement.textContent = kpiData.avgResponseTime;
    }
    
    const npsElement = document.getElementById('nps-score');
    if (npsElement) {
        npsElement.textContent = 'NPS: ' + kpiData.npsScore;
    }
    
    // Update trend indicators
    updateTrendIndicators(kpiData.trends);
}

// Update trend indicators
function updateTrendIndicators(trends) {
    const trendElements = {
        'leads-trend': trends.leads,
        'conversion-trend': trends.conversion,
        'revenue-trend': trends.revenue,
        'response-trend': trends.response,
        'satisfaction-trend': trends.satisfaction,
        'forecast-trend': trends.forecast
    };
    
    Object.entries(trendElements).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) {
            const sign = value >= 0 ? '+' : '';
            element.textContent = sign + value + '%';
            element.className = value >= 0 ? 'kpi-trend positive' : 'kpi-trend negative';
        }
    });
}

// Initialize charts
function initializeCharts() {
    console.log('📈 Initializing charts...');
    
    try {
        initializeLeadSourcesChart();
        initializeRevenueTrendsChart();
        initializeConversionPredictionChart();
        
        console.log('✅ Charts initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing charts:', error);
    }
}

// Lead Sources Chart
function initializeLeadSourcesChart() {
    const ctx = document.getElementById('leadSourcesChart');
    if (!ctx) return;
    
    charts.leadSources = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Publisher API', 'Direct Website', 'Referrals', 'Social Media'],
            datasets: [{
                data: [1247, 892, 456, 252],
                backgroundColor: [
                    '#10b981',
                    '#3b82f6',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} leads (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Revenue Trends Chart
function initializeRevenueTrendsChart() {
    const ctx = document.getElementById('revenueTrendsChart');
    if (!ctx) return;
    
    // Generate sample data for the last 30 days
    const dates = [];
    const revenueData = [];
    const forecastData = [];
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date);
        
        // Generate realistic revenue data with some growth trend
        const baseRevenue = 8000 + Math.random() * 4000;
        const trendFactor = (30 - i) * 50; // Upward trend
        revenueData.push(baseRevenue + trendFactor + (Math.random() - 0.5) * 1000);
    }
    
    // Add forecast data for next 7 days
    for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        dates.push(date);
        
        const lastRevenue = revenueData[revenueData.length - 1];
        const forecastRevenue = lastRevenue * (1.02 + Math.random() * 0.05); // 2-7% growth
        forecastData.push(forecastRevenue);
        revenueData.push(null); // No actual data for future dates
    }
    
    charts.revenueTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Actual Revenue',
                    data: revenueData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Forecast',
                    data: [...Array(30).fill(null), ...forecastData],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM dd'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Revenue ($)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Conversion Prediction Chart
function initializeConversionPredictionChart() {
    const ctx = document.getElementById('conversionPredictionChart');
    if (!ctx) return;
    
    charts.conversionPrediction = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['High Probability', 'Medium Probability', 'Low Probability'],
            datasets: [{
                label: 'Leads',
                data: [23, 45, 67],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    '#10b981',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Leads'
                    }
                }
            }
        }
    });
}

// Update conversion funnel
function updateConversionFunnel(funnelData) {
    if (!funnelData && analyticsData.leads) {
        funnelData = analyticsData.leads.funnel;
    }
    
    if (!funnelData) return;
    
    console.log('🎯 Updating conversion funnel...');
    
    const stages = ['leads', 'qualified', 'contacted', 'interested', 'converted'];
    
    stages.forEach(stage => {
        const countElement = document.getElementById(`funnel-${stage}`);
        if (countElement && funnelData[stage]) {
            if (typeof CountUp !== 'undefined') {
                new CountUp(`funnel-${stage}`, funnelData[stage], {
                    duration: 1.5,
                    separator: ','
                }).start();
            } else {
                countElement.textContent = funnelData[stage].toLocaleString();
            }
        }
    });
    
    // Update conversion percentages
    const total = funnelData.leads;
    if (total > 0) {
        updateConversionRate('qualified', funnelData.qualified, total);
        updateConversionRate('contacted', funnelData.contacted, total);
        updateConversionRate('interested', funnelData.interested, total);
        updateConversionRate('converted', funnelData.converted, total);
    }
}

function updateConversionRate(stage, count, total) {
    const rate = Math.round((count / total) * 100);
    const stageElement = document.querySelector(`[data-stage="${stage}"] .conversion-rate`);
    if (stageElement) {
        stageElement.textContent = `${rate}% conversion`;
    }
    
    // Update progress bar width
    const fillElement = document.querySelector(`[data-stage="${stage}"] .stage-fill`);
    if (fillElement) {
        fillElement.style.width = `${rate}%`;
    }
}

// Update agent leaderboard
function updateAgentLeaderboard(agentsData) {
    if (!agentsData && analyticsData.agents) {
        agentsData = analyticsData.agents;
    }
    
    if (!agentsData) return;
    
    console.log('🏆 Updating agent leaderboard...');
    
    const leaderboardList = document.getElementById('agent-leaderboard');
    if (!leaderboardList) return;
    
    // Sort agents by the selected metric
    const metric = document.getElementById('performance-metric')?.value || 'conversion';
    const sortedAgents = [...agentsData].sort((a, b) => {
        switch (metric) {
            case 'revenue': return b.revenue - a.revenue;
            case 'leads': return b.leads - a.leads;
            case 'satisfaction': return b.satisfaction - a.satisfaction;
            default: return b.conversion - a.conversion;
        }
    });
    
    leaderboardList.innerHTML = sortedAgents.slice(0, 5).map((agent, index) => {
        const trendIcon = agent.trend === 'up' ? '📈' : agent.trend === 'down' ? '📉' : '➡️';
        
        return `
            <div class="leaderboard-item fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="leaderboard-rank">#${index + 1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${agent.name}</div>
                    <div class="leaderboard-stats">
                        ${agent.leads} leads • ${agent.conversion}% conv • $${agent.revenue.toLocaleString()}
                    </div>
                </div>
                <div class="leaderboard-score">
                    ${getMetricValue(agent, metric)} ${trendIcon}
                </div>
            </div>
        `;
    }).join('');
}

function getMetricValue(agent, metric) {
    switch (metric) {
        case 'revenue': return '$' + agent.revenue.toLocaleString();
        case 'leads': return agent.leads.toString();
        case 'satisfaction': return agent.satisfaction.toFixed(1) + '/5';
        default: return agent.conversion.toFixed(1) + '%';
    }
}

// Update publisher ROI
function updatePublisherROI(publishersData) {
    if (!publishersData && analyticsData.publishers) {
        publishersData = analyticsData.publishers;
    }
    
    if (!publishersData) return;
    
    console.log('🏢 Updating publisher ROI...');
    
    const roiList = document.getElementById('publisher-roi-list');
    if (!roiList) return;
    
    roiList.innerHTML = publishersData.map((publisher, index) => `
        <div class="roi-item fade-in" style="animation-delay: ${index * 0.1}s">
            <div>
                <div class="roi-publisher">${publisher.name}</div>
                <div style="font-size: 0.875rem; color: var(--text-muted);">
                    ${publisher.leads} leads • ${publisher.conversionRate}% conv
                </div>
            </div>
            <div class="roi-value">${publisher.roi}% ROI</div>
        </div>
    `).join('');
}

// Update predictive analytics
function updatePredictiveAnalytics(predictionsData) {
    if (!predictionsData && analyticsData.predictions) {
        predictionsData = analyticsData.predictions;
    }
    
    if (!predictionsData) return;
    
    console.log('🔮 Updating predictive analytics...');
    
    // Update revenue predictions
    updateRevenuePredictions(predictionsData.revenuePredictions);
    
    // Update churn risk analysis
    updateChurnRiskAnalysis(predictionsData.churnRisk);
}

function updateRevenuePredictions(revenuePredictions) {
    const predictions = [
        { period: 'Next 7 Days', ...revenuePredictions.next7Days },
        { period: 'Next 30 Days', ...revenuePredictions.next30Days },
        { period: 'Next Quarter', ...revenuePredictions.nextQuarter }
    ];
    
    predictions.forEach((prediction, index) => {
        const predictionElements = document.querySelectorAll('.revenue-prediction');
        if (predictionElements[index]) {
            const element = predictionElements[index];
            element.querySelector('.period').textContent = prediction.period;
            element.querySelector('.amount').textContent = '$' + prediction.amount.toLocaleString();
            element.querySelector('.confidence').textContent = prediction.confidence + '% confidence';
        }
    });
}

function updateChurnRiskAnalysis(churnRisk) {
    const riskLevels = ['high', 'medium', 'low'];
    
    riskLevels.forEach(level => {
        const element = document.querySelector(`.risk-level.${level}`);
        if (element && churnRisk[level]) {
            element.querySelector('.risk-count').textContent = churnRisk[level].count + ' clients';
            element.querySelector('.risk-action').textContent = churnRisk[level].action;
        }
    });
}

// Update insights panel
function updateInsightsPanel() {
    const timestamp = document.getElementById('insights-timestamp');
    if (timestamp) {
        timestamp.textContent = new Date().toLocaleTimeString();
    }
}

// Time controls
function initializeTimeControls() {
    const dateRangeSelector = document.getElementById('date-range-selector');
    if (dateRangeSelector) {
        dateRangeSelector.value = '30'; // Default to 30 days
    }
}

// Modal functions
function initializeModals() {
    // Close modal buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            closeModal(modalId);
        });
    });
    
    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Event handlers
async function handleRefreshAnalytics() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    const refreshBtn = document.getElementById('refresh-analytics');
    const originalText = refreshBtn?.textContent;
    
    try {
        if (refreshBtn) {
            refreshBtn.textContent = '🔄 Refreshing...';
            refreshBtn.disabled = true;
            refreshBtn.style.transform = 'rotate(360deg)';
        }
        
        await loadAnalyticsData();
        showToast('Analytics data refreshed successfully', 'success');
        
    } catch (error) {
        console.error('Error refreshing analytics:', error);
        showToast('Failed to refresh analytics data', 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.textContent = originalText;
            refreshBtn.disabled = false;
            refreshBtn.style.transform = 'rotate(0deg)';
        }
        isRefreshing = false;
    }
}

function handleDateRangeChange(event) {
    const range = event.target.value;
    console.log('📅 Date range changed to:', range, 'days');
    
    // Reload data for new date range
    loadAnalyticsData();
}

function handleTrendPeriodChange(button) {
    // Update active state
    document.querySelectorAll('.trend-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    const period = button.getAttribute('data-period');
    console.log('📊 Trend period changed to:', period);
    
    // Update revenue chart with new period
    updateRevenueTrendsChart(period);
}

function handleExportGeneration() {
    const modal = document.getElementById('export-modal');
    const generateBtn = document.getElementById('generate-export');
    const originalText = generateBtn?.textContent;
    
    try {
        if (generateBtn) {
            generateBtn.textContent = 'Generating...';
            generateBtn.disabled = true;
        }
        
        // Simulate export generation
        setTimeout(() => {
            showToast('Analytics report generated successfully', 'success');
            closeModal('export-modal');
            
            // Reset button
            if (generateBtn) {
                generateBtn.textContent = originalText;
                generateBtn.disabled = false;
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error generating export:', error);
        showToast('Failed to generate report', 'error');
        
        if (generateBtn) {
            generateBtn.textContent = originalText;
            generateBtn.disabled = false;
        }
    }
}

// Real-time updates
function startRealTimeUpdates() {
    console.log('⚡ Starting real-time updates...');
    
    // Update every 30 seconds
    updateInterval = setInterval(() => {
        if (!isRefreshing) {
            simulateRealTimeUpdates();
        }
    }, 30000);
    
    // Update timestamp every minute
    setInterval(updateLastRefreshTime, 60000);
}

function simulateRealTimeUpdates() {
    // Simulate small changes in KPI data
    if (analyticsData.kpis) {
        const kpis = analyticsData.kpis;
        
        // Small random fluctuations
        kpis.totalLeads += Math.floor(Math.random() * 3);
        kpis.newLeadsToday = Math.floor(Math.random() * 10) + 15;
        kpis.conversionRate += (Math.random() - 0.5) * 0.5;
        
        // Update specific elements
        const newLeadsElement = document.getElementById('new-leads-today');
        if (newLeadsElement) {
            newLeadsElement.textContent = kpis.newLeadsToday;
        }
    }
    
    updateLastRefreshTime();
}

function updateLastRefreshTime() {
    const timestamp = document.getElementById('insights-timestamp');
    if (timestamp) {
        timestamp.textContent = new Date().toLocaleTimeString();
    }
}

// Utility functions
function showLoadingState() {
    document.querySelectorAll('.kpi-value, .stage-count').forEach(element => {
        element.classList.add('loading');
    });
}

function hideLoadingState() {
    document.querySelectorAll('.kpi-value, .stage-count').forEach(element => {
        element.classList.remove('loading');
    });
}

function addLoadingAnimations() {
    // Add fade-in animations to cards
    document.querySelectorAll('.kpi-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in');
    });
    
    document.querySelectorAll('.analytics-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.15}s`;
        card.classList.add('fade-in');
    });
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

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        z-index: 300;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    `;
    document.body.appendChild(container);
    return container;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // Destroy charts
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('❌ Global error in analytics dashboard:', event.error);
    showToast('An unexpected error occurred', 'error');
});

// Export functions for global access
window.analyticsDashboard = {
    refresh: handleRefreshAnalytics,
    openModal,
    closeModal,
    showToast
};

console.log('🚀 Advanced Analytics Dashboard script loaded successfully'); 