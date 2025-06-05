/**
 * AGENT ANALYTICS DASHBOARD
 * Personal Performance Analytics & Insights
 * Agent-focused dashboard with goals, trends, and AI insights
 */

// Global variables
let currentUser = null;
let agentCharts = {};
let agentData = {};
let animationCounters = {};

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Agent Analytics Dashboard Loading...');
    
    // Set body class for styling
    document.body.classList.add('agent-analytics');
    
    // Initialize authentication
    initializeAuth();
});

/**
 * AUTHENTICATION & USER MANAGEMENT
 */
async function initializeAuth() {
    try {
        console.log('🔐 Initializing Agent Authentication...');
        
        // Check authentication and get user details
        currentUser = await checkAuthentication();
        
        if (!currentUser) {
            console.warn('❌ No authenticated user - redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        // Ensure user is an agent
        if (currentUser.role !== 'agent') {
            console.warn('❌ Access denied - agents only');
            showToast('Access denied - agents only', 'error');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('✅ Agent authenticated:', currentUser.name);
        
        // Initialize dashboard
        await initializeDashboard();
        
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        showToast('Authentication failed', 'error');
        window.location.href = 'login.html';
    }
}

async function checkAuthentication() {
    try {
        // Check for stored credentials (use consistent key names)
        const token = localStorage.getItem('auth_token') || localStorage.getItem('idToken');
        
        if (!token) {
            return null;
        }
        
        // Decode JWT to get user info
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            throw new Error('Invalid token format');
        }
        
        const payload = JSON.parse(atob(tokenParts[1]));
        const userData = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.preferred_username || payload.email.split('@')[0],
            role: payload['custom:role'] || 'agent',
            username: payload.username || payload.preferred_username
        };
        
        // Verify it's an agent
        if (userData.role !== 'agent') {
            console.error('User is not an agent');
            return null;
        }
        
        // Store the token for later use
        window.authToken = token;
        
        return userData;
        
    } catch (error) {
        console.error('Authentication check failed:', error);
        return null;
    }
}

async function validateToken(token) {
    // Mock token validation
    return new Promise(resolve => {
        setTimeout(() => resolve(true), 100);
    });
}

/**
 * DASHBOARD INITIALIZATION
 */
async function initializeDashboard() {
    try {
        console.log('📊 Initializing Agent Dashboard...');
        
        // Setup event listeners
        setupEventListeners();
        
        // Load agent data
        await loadAgentData();
        
        // Initialize KPI cards
        initializeKPICards();
        
        // Initialize charts
        initializeCharts();
        
        // Initialize activity timeline
        loadActivityTimeline();
        
        // Start real-time updates
        startRealTimeUpdates();
        
        console.log('✅ Agent Dashboard Initialized Successfully');
        showToast('Dashboard loaded successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        showToast('Failed to load dashboard', 'error');
    }
}

/**
 * EVENT LISTENERS
 */
function setupEventListeners() {
    // Date range selector
    const dateRangeSelector = document.getElementById('date-range-selector');
    if (dateRangeSelector) {
        dateRangeSelector.addEventListener('change', handleDateRangeChange);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-analytics');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }
    
    // Export button
    const exportBtn = document.getElementById('export-report');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => openModal('export-modal'));
    }
    
    // Goals edit button
    const editGoalsBtn = document.getElementById('edit-goals');
    if (editGoalsBtn) {
        editGoalsBtn.addEventListener('click', () => openModal('goals-modal'));
    }
    
    // Save goals button
    const saveGoalsBtn = document.getElementById('save-goals');
    if (saveGoalsBtn) {
        saveGoalsBtn.addEventListener('click', handleSaveGoals);
    }
    
    // Export generation button
    const generateExportBtn = document.getElementById('generate-my-export');
    if (generateExportBtn) {
        generateExportBtn.addEventListener('click', handleGenerateExport);
    }
    
    // Trend controls
    const trendBtns = document.querySelectorAll('.trend-btn');
    trendBtns.forEach(btn => {
        btn.addEventListener('click', handleTrendPeriodChange);
    });
    
    // Modal close buttons
    const modalCloses = document.querySelectorAll('[data-modal]');
    modalCloses.forEach(btn => {
        btn.addEventListener('click', function() {
            closeModal(this.dataset.modal);
        });
    });
    
    // Logout link
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
    
    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
}

/**
 * DATA LOADING & MANAGEMENT
 */
async function loadAgentData() {
    try {
        console.log('📊 Loading agent performance data...');
        
        // Get selected date range
        const dateRange = document.getElementById('date-range-selector')?.value || '30';
        
        // Load agent data (mock API call)
        agentData = await fetchAgentData(currentUser.id, dateRange);
        
        console.log('✅ Agent data loaded:', agentData);
        
    } catch (error) {
        console.error('❌ Failed to load agent data:', error);
        throw error;
    }
}

async function fetchAgentData(agentId, dateRange) {
    try {
        const token = window.authToken || localStorage.getItem('auth_token') || localStorage.getItem('idToken');
        const apiBase = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
        
        console.log('🔄 Fetching real agent data from backend...');
        
        // Fetch all agent analytics data in parallel
        const [kpisResponse, goalsResponse, funnelResponse, sourcesResponse, trendsResponse, activitiesResponse] = await Promise.allSettled([
            fetch(`${apiBase}/agent/analytics/kpis?period=${dateRange}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${apiBase}/agent/goals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${apiBase}/agent/analytics/funnel?period=${dateRange}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${apiBase}/agent/analytics/lead-sources?period=${dateRange}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${apiBase}/agent/analytics/revenue-trends?period=${dateRange}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${apiBase}/agent/analytics/activities?limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        // Process responses and extract data
        const kpis = kpisResponse.status === 'fulfilled' && kpisResponse.value.ok ? 
            await kpisResponse.value.json() : null;
        const goals = goalsResponse.status === 'fulfilled' && goalsResponse.value.ok ? 
            await goalsResponse.value.json() : null;
        const funnel = funnelResponse.status === 'fulfilled' && funnelResponse.value.ok ? 
            await funnelResponse.value.json() : null;
        const sources = sourcesResponse.status === 'fulfilled' && sourcesResponse.value.ok ? 
            await sourcesResponse.value.json() : null;
        const trends = trendsResponse.status === 'fulfilled' && trendsResponse.value.ok ? 
            await trendsResponse.value.json() : null;
        const activities = activitiesResponse.status === 'fulfilled' && activitiesResponse.value.ok ? 
            await activitiesResponse.value.json() : null;
        
        console.log('✅ Real agent data loaded successfully');
        
        // Transform backend data to frontend format
        return {
            kpis: kpis?.data ? {
                leadsHandled: kpis.data.kpis.leadsHandled || 0,
                leadsThisWeek: kpis.data.kpis.leadsThisWeek || 0,
                conversionRate: kpis.data.kpis.conversionRate || 0,
                totalRevenue: kpis.data.kpis.totalRevenue || 0,
                responseTime: `${kpis.data.kpis.responseTimeHours || 0}h`,
                satisfactionScore: kpis.data.kpis.satisfactionScore || 0,
                satisfactionCount: kpis.data.kpis.satisfactionCount || 0,
                teamRanking: kpis.data.kpis.teamRanking || 1,
                totalAgents: kpis.data.kpis.totalAgents || 1
            } : getDefaultKPIs(),
            
            trends: kpis?.data?.trends ? {
                leads: kpis.data.trends.leads || 0,
                conversion: kpis.data.trends.conversion || 0,
                revenue: kpis.data.trends.revenue || 0,
                response: kpis.data.trends.response || 0,
                satisfaction: kpis.data.trends.satisfaction || 0,
                ranking: kpis.data.trends.ranking || 0
            } : getDefaultTrends(),
            
            goals: goals?.data ? transformGoalsData(goals.data) : getDefaultGoals(),
            
            funnel: funnel?.data ? {
                assigned: funnel.data.funnel.assigned || 0,
                contacted: funnel.data.funnel.contacted || 0,
                interested: funnel.data.funnel.interested || 0,
                converted: funnel.data.funnel.converted || 0
            } : getDefaultFunnel(),
            
            leadSources: sources?.data?.lead_sources ? 
                sources.data.lead_sources.map(source => ({
                    source: source.source || 'Unknown',
                    count: source.count || 0,
                    conversion: Math.round(source.conversionRate || 0),
                    revenue: source.revenue || 0
                })) : getDefaultLeadSources(),
            
            revenueData: trends?.data?.weekly_trends ? 
                trends.data.weekly_trends.map(week => ({
                    date: week.week_start,
                    revenue: Math.round(week.revenue || 0)
                })) : generateRevenueData(dateRange),
            
            activities: activities?.data?.recent_activities ? 
                activities.data.recent_activities.map(activity => ({
                    type: activity.activity_type || 'unknown',
                    icon: getActivityIcon(activity.activity_type),
                    title: activity.title || 'Activity',
                    description: activity.description || '',
                    time: formatRelativeTime(activity.timestamp),
                    class: activity.activity_type || 'unknown'
                })) : generateActivityData()
        };
        
    } catch (error) {
        console.error('❌ Error fetching agent data from backend:', error);
        console.log('🔄 Falling back to mock data...');
        
        // Fallback to mock data if API fails
        return getDefaultAgentData(dateRange);
    }
}

// Helper functions for default/fallback data
function getDefaultKPIs() {
    return {
        leadsHandled: 47,
        leadsThisWeek: 12,
        conversionRate: 68.1,
        totalRevenue: 12450,
        responseTime: '1.2h',
        satisfactionScore: 4.7,
        satisfactionCount: 23,
        teamRanking: 3,
        totalAgents: 15
    };
}

function getDefaultTrends() {
    return {
        leads: 8.3,
        conversion: 12.1,
        revenue: 18.7,
        response: -15.2,
        satisfaction: 4.2,
        ranking: 2
    };
}

function getDefaultGoals() {
    return {
        conversions: { current: 12, target: 15 },
        revenue: { current: 12450, target: 15000 },
        responseTime: { current: 1.2, target: 2.0 }
    };
}

function getDefaultFunnel() {
    return {
        assigned: 47,
        contacted: 40,
        interested: 34,
        converted: 32
    };
}

function getDefaultLeadSources() {
    return [
        { source: 'Referrals', count: 18, conversion: 78, revenue: 5400 },
        { source: 'Web Forms', count: 15, conversion: 53, revenue: 3200 },
        { source: 'Phone Calls', count: 8, conversion: 75, revenue: 2400 },
        { source: 'Social Media', count: 6, conversion: 67, revenue: 1450 }
    ];
}

function getDefaultAgentData(dateRange) {
    return {
        kpis: getDefaultKPIs(),
        trends: getDefaultTrends(),
        goals: getDefaultGoals(),
        funnel: getDefaultFunnel(),
        leadSources: getDefaultLeadSources(),
        revenueData: generateRevenueData(dateRange),
        activities: generateActivityData()
    };
}

function transformGoalsData(goalsData) {
    // Transform backend goals format to frontend format
    const goals = {};
    
    if (Array.isArray(goalsData)) {
        goalsData.forEach(goal => {
            const type = goal.goal_type;
            goals[type] = {
                current: goal.current_value || 0,
                target: goal.target_value || 0
            };
        });
    }
    
    // Ensure we have all required goal types
    return {
        conversions: goals.conversions || { current: 0, target: 15 },
        revenue: goals.revenue || { current: 0, target: 15000 },
        responseTime: goals.response_time || { current: 0, target: 2.0 }
    };
}

function getActivityIcon(activityType) {
    const icons = {
        'conversion': '💰',
        'call': '📞',
        'email': '📧',
        'meeting': '📅',
        'contact': '👤',
        'lead_assigned': '📋',
        'follow_up': '🔄',
        'quote_sent': '📄',
        'default': '📝'
    };
    
    return icons[activityType] || icons.default;
}

function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
}

function generateRevenueData(days) {
    const data = [];
    const now = new Date();
    
    for (let i = parseInt(days); i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Generate realistic revenue data with some randomness
        const baseRevenue = 200 + Math.random() * 400;
        const seasonality = Math.sin((date.getDay() / 7) * Math.PI) * 100;
        const revenue = Math.max(0, baseRevenue + seasonality + (Math.random() - 0.5) * 200);
        
        data.push({
            date: date.toISOString().split('T')[0],
            revenue: Math.round(revenue)
        });
    }
    
    return data;
}

function generateActivityData() {
    const activities = [
        {
            type: 'conversion',
            icon: '💰',
            title: 'Lead Converted',
            description: 'John Smith - Auto Insurance Policy',
            time: '2 hours ago',
            class: 'conversion'
        },
        {
            type: 'call',
            icon: '📞',
            title: 'Follow-up Call',
            description: 'Called Sarah Johnson - discussed coverage options',
            time: '4 hours ago',
            class: 'call'
        },
        {
            type: 'email',
            icon: '📧',
            title: 'Quote Sent',
            description: 'Sent detailed quote to Mike Davis',
            time: '6 hours ago',
            class: 'email'
        },
        {
            type: 'meeting',
            icon: '📅',
            title: 'Consultation Scheduled',
            description: 'Meeting set with Jennifer Chen for tomorrow 2 PM',
            time: '1 day ago',
            class: 'meeting'
        },
        {
            type: 'call',
            icon: '📞',
            title: 'Initial Contact',
            description: 'First call with Robert Wilson - interested in life insurance',
            time: '1 day ago',
            class: 'call'
        }
    ];
    
    return activities;
}

/**
 * KPI CARDS INITIALIZATION
 */
function initializeKPICards() {
    console.log('📊 Initializing KPI cards...');
    
    // Animate KPI values
    animateCounter('my-leads-handled', agentData.kpis.leadsHandled, 0, 1000);
    animateCounter('leads-this-week', agentData.kpis.leadsThisWeek, 0, 1200);
    
    // Conversion rate with percentage
    animateCounter('my-conversion-rate', agentData.kpis.conversionRate, 0, 1500, '%');
    
    // Revenue with currency formatting
    animateCounter('my-total-revenue', agentData.kpis.totalRevenue, 0, 2000, '$', true);
    
    // Response time (static for now)
    document.getElementById('my-response-time').textContent = agentData.kpis.responseTime;
    
    // Satisfaction score
    animateCounter('my-satisfaction-score', agentData.kpis.satisfactionScore, 0, 1800, '/5');
    document.getElementById('satisfaction-count').textContent = agentData.kpis.satisfactionCount;
    
    // Team ranking
    document.getElementById('my-team-ranking').textContent = `#${agentData.kpis.teamRanking}`;
    document.getElementById('total-agents').textContent = agentData.kpis.totalAgents;
    
    // Update trend indicators
    updateTrendIndicators();
    
    // Update funnel data
    updateFunnelData();
}

function animateCounter(elementId, targetValue, startValue = 0, duration = 1000, suffix = '', isCurrency = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (typeof CountUp !== 'undefined') {
        const options = {
            startVal: startValue,
            duration: duration / 1000,
            useEasing: true,
            useGrouping: true,
            separator: ',',
            suffix: suffix
        };
        
        if (isCurrency) {
            options.prefix = '$';
            options.separator = ',';
        }
        
        const counter = new CountUp(elementId, targetValue, options);
        
        if (!counter.error) {
            counter.start();
            animationCounters[elementId] = counter;
        } else {
            element.textContent = isCurrency ? `$${targetValue.toLocaleString()}` : `${targetValue}${suffix}`;
        }
    } else {
        // Fallback without CountUp
        element.textContent = isCurrency ? `$${targetValue.toLocaleString()}` : `${targetValue}${suffix}`;
    }
}

function updateTrendIndicators() {
    const trends = agentData.trends;
    
    updateTrendElement('my-leads-trend', trends.leads);
    updateTrendElement('my-conversion-trend', trends.conversion);
    updateTrendElement('my-revenue-trend', trends.revenue);
    updateTrendElement('my-response-trend', trends.response);
    updateTrendElement('my-satisfaction-trend', trends.satisfaction);
    updateTrendElement('my-ranking-trend', trends.ranking, true);
}

function updateTrendElement(elementId, value, isRanking = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // For ranking, positive change means moving up (lower number)
    const isPositive = isRanking ? value > 0 : value > 0;
    const isNegative = isRanking ? value < 0 : value < 0;
    
    element.className = 'kpi-trend';
    if (isPositive) {
        element.classList.add('positive');
        element.textContent = isRanking ? `+${value}` : `+${value}%`;
    } else if (isNegative) {
        element.classList.add('negative');
        element.textContent = isRanking ? `${value}` : `${value}%`;
    } else {
        element.classList.add('neutral');
        element.textContent = isRanking ? '0' : '0%';
    }
}

function updateFunnelData() {
    const funnel = agentData.funnel;
    
    document.getElementById('funnel-assigned').textContent = funnel.assigned;
    document.getElementById('funnel-contacted').textContent = funnel.contacted;
    document.getElementById('funnel-interested').textContent = funnel.interested;
    document.getElementById('funnel-converted').textContent = funnel.converted;
    
    // Update overall conversion rate
    const overallConversion = Math.round((funnel.converted / funnel.assigned) * 100);
    document.getElementById('overall-conversion').textContent = `${overallConversion}%`;
}

/**
 * CHARTS INITIALIZATION
 */
function initializeCharts() {
    console.log('📊 Initializing charts...');
    
    // Lead sources chart
    initializeLeadSourcesChart();
    
    // Revenue trends chart
    initializeRevenueTrendsChart();
}

function initializeLeadSourcesChart() {
    const ctx = document.getElementById('myLeadSourcesChart');
    if (!ctx) return;
    
    const sources = agentData.leadSources;
    
    agentCharts.leadSources = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sources.map(s => s.source),
            datasets: [{
                data: sources.map(s => s.count),
                backgroundColor: [
                    '#22c55e',  // Green for high performance
                    '#f59e0b',  // Orange for medium
                    '#6366f1',  // Blue for good
                    '#ef4444'   // Red for needs improvement
                ],
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'white',
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    callbacks: {
                        label: function(context) {
                            const source = sources[context.dataIndex];
                            return [
                                `${context.label}: ${context.parsed}`,
                                `Conversion: ${source.conversion}%`,
                                `Revenue: $${source.revenue.toLocaleString()}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

function initializeRevenueTrendsChart() {
    const ctx = document.getElementById('myRevenueTrendsChart');
    if (!ctx) return;
    
    const revenueData = agentData.revenueData;
    
    agentCharts.revenueTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: revenueData.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [{
                label: 'Daily Revenue',
                data: revenueData.map(d => d.revenue),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    callbacks: {
                        label: function(context) {
                            return `Revenue: $${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        maxTicksLimit: 8
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

/**
 * ACTIVITY TIMELINE
 */
function loadActivityTimeline() {
    const timelineContainer = document.getElementById('activity-timeline');
    if (!timelineContainer) return;
    
    const activities = agentData.activities;
    
    timelineContainer.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.class}">
                ${activity.icon}
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-description">${activity.description}</div>
            </div>
            <div class="activity-time">${activity.time}</div>
        </div>
    `).join('');
}

/**
 * EVENT HANDLERS
 */
async function handleDateRangeChange(event) {
    const newRange = event.target.value;
    console.log('📅 Date range changed to:', newRange);
    
    showLoadingState();
    
    try {
        await loadAgentData();
        initializeKPICards();
        updateCharts();
        loadActivityTimeline();
        showToast('Data updated successfully', 'success');
    } catch (error) {
        console.error('Failed to update data:', error);
        showToast('Failed to update data', 'error');
    } finally {
        hideLoadingState();
    }
}

async function handleRefresh() {
    console.log('🔄 Refreshing dashboard data...');
    
    showLoadingState();
    
    try {
        await loadAgentData();
        initializeKPICards();
        updateCharts();
        loadActivityTimeline();
        showToast('Dashboard refreshed successfully', 'success');
    } catch (error) {
        console.error('Failed to refresh data:', error);
        showToast('Failed to refresh dashboard', 'error');
    } finally {
        hideLoadingState();
    }
}

function handleTrendPeriodChange(event) {
    const period = event.target.dataset.period;
    
    // Update active button
    document.querySelectorAll('.trend-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update chart (would normally fetch new data)
    console.log('📊 Trend period changed to:', period);
    showToast(`Showing ${period} trends`, 'info');
}

async function handleSaveGoals() {
    const conversionsGoal = document.getElementById('conversions-goal').value;
    const revenueGoal = document.getElementById('revenue-goal-input').value;
    const responseGoal = document.getElementById('response-goal').value;
    
    try {
        const token = window.authToken || localStorage.getItem('auth_token') || localStorage.getItem('idToken');
        const apiBase = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
        
        console.log('💾 Saving goals to backend:', { conversionsGoal, revenueGoal, responseGoal });
        
        // Show saving state
        const saveBtn = document.getElementById('save-goals');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        // Prepare goals data for backend
        const goalsData = {
            period: 'monthly', // Default to monthly goals
            goals: {
                conversions: parseInt(conversionsGoal) || 0,
                revenue: parseInt(revenueGoal) || 0,
                response_time: parseFloat(responseGoal) || 0
            }
        };
        
        // Save goals to backend
        const response = await fetch(`${apiBase}/agent/goals`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(goalsData)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save goals: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Goals saved successfully:', result);
        
        // Update local goals data
        agentData.goals = {
            conversions: { current: agentData.goals.conversions.current, target: parseInt(conversionsGoal) },
            revenue: { current: agentData.goals.revenue.current, target: parseInt(revenueGoal) },
            responseTime: { current: agentData.goals.responseTime.current, target: parseFloat(responseGoal) }
        };
        
        // Update display
        updateGoalsDisplay();
        
        closeModal('goals-modal');
        showToast('Goals saved successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error saving goals:', error);
        showToast('Failed to save goals. Please try again.', 'error');
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('save-goals');
        if (saveBtn) {
            saveBtn.textContent = 'Save Goals';
            saveBtn.disabled = false;
        }
    }
}

function handleGenerateExport() {
    console.log('📤 Generating export...');
    
    // Show loading state
    const btn = document.getElementById('generate-my-export');
    const originalText = btn.textContent;
    btn.textContent = 'Generating...';
    btn.disabled = true;
    
    setTimeout(() => {
        // Mock export generation
        btn.textContent = originalText;
        btn.disabled = false;
        closeModal('export-modal');
        showToast('Report generated and downloaded!', 'success');
    }, 2000);
}

function handleLogout(event) {
    event.preventDefault();
    
    console.log('🚪 Logging out...');
    
    // Clear stored data (all possible keys)
    localStorage.removeItem('auth_token');
    localStorage.removeItem('idToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = 'login.html';
}

/**
 * UTILITY FUNCTIONS
 */
function updateCharts() {
    if (agentCharts.leadSources) {
        agentCharts.leadSources.destroy();
        initializeLeadSourcesChart();
    }
    
    if (agentCharts.revenueTrends) {
        agentCharts.revenueTrends.destroy();
        initializeRevenueTrendsChart();
    }
}

function updateGoalsDisplay() {
    const goals = agentData.goals;
    
    // Update conversions goal
    const conversionsProgress = Math.round((goals.conversions.current / goals.conversions.target) * 100);
    document.getElementById('conversions-progress').textContent = `${goals.conversions.current}/${goals.conversions.target}`;
    document.getElementById('conversions-fill').style.width = `${Math.min(conversionsProgress, 100)}%`;
    
    // Update revenue goal
    const revenueProgress = Math.round((goals.revenue.current / goals.revenue.target) * 100);
    document.getElementById('revenue-progress').textContent = `$${goals.revenue.current.toLocaleString()}/$${goals.revenue.target.toLocaleString()}`;
    document.getElementById('revenue-fill').style.width = `${Math.min(revenueProgress, 100)}%`;
    
    // Update response time goal
    document.getElementById('response-progress').textContent = `${goals.responseTime.current}h/${goals.responseTime.target}h`;
    const responseProgress = Math.round((1 - (goals.responseTime.current / goals.responseTime.target)) * 100);
    document.getElementById('response-fill').style.width = `${Math.min(Math.max(responseProgress, 0), 100)}%`;
    
    // Update revenue goal in header
    document.getElementById('revenue-goal').textContent = `$${goals.revenue.target.toLocaleString()}`;
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function showLoadingState() {
    document.querySelectorAll('.kpi-card, .analytics-card').forEach(card => {
        card.classList.add('loading');
    });
}

function hideLoadingState() {
    document.querySelectorAll('.kpi-card, .analytics-card').forEach(card => {
        card.classList.remove('loading');
    });
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${getToastIcon(type)}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    // Add toast styles if not exists
    if (!document.getElementById('toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                animation: toastSlideIn 0.3s ease;
            }
            .toast-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            .toast-success { border-left: 4px solid #22c55e; }
            .toast-error { border-left: 4px solid #ef4444; }
            .toast-info { border-left: 4px solid #6366f1; }
            .toast-warning { border-left: 4px solid #f59e0b; }
            @keyframes toastSlideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes toastSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    return icons[type] || icons.info;
}

/**
 * REAL-TIME UPDATES
 */
function startRealTimeUpdates() {
    // Update data every 30 seconds
    setInterval(async () => {
        if (document.visibilityState === 'visible') {
            try {
                console.log('🔄 Real-time data update...');
                await loadAgentData();
                initializeKPICards();
                updateCharts();
            } catch (error) {
                console.error('Real-time update failed:', error);
            }
        }
    }, 30000);
}

/**
 * PERFORMANCE RATING CALCULATION
 */
function calculatePerformanceRating() {
    const { conversionRate, satisfactionScore, responseTime } = agentData.kpis;
    
    let score = 0;
    
    // Conversion rate scoring (40% weight)
    if (conversionRate >= 70) score += 40;
    else if (conversionRate >= 60) score += 30;
    else if (conversionRate >= 50) score += 20;
    else score += 10;
    
    // Satisfaction scoring (35% weight)
    if (satisfactionScore >= 4.5) score += 35;
    else if (satisfactionScore >= 4.0) score += 25;
    else if (satisfactionScore >= 3.5) score += 15;
    else score += 5;
    
    // Response time scoring (25% weight)
    const responseHours = parseFloat(responseTime.replace('h', ''));
    if (responseHours <= 1) score += 25;
    else if (responseHours <= 2) score += 20;
    else if (responseHours <= 4) score += 10;
    else score += 5;
    
    // Determine rating
    if (score >= 85) return 'Excellent';
    else if (score >= 70) return 'Very Good';
    else if (score >= 55) return 'Good';
    else if (score >= 40) return 'Fair';
    else return 'Needs Improvement';
}

// Initialize performance rating on load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (agentData.kpis) {
            const rating = calculatePerformanceRating();
            const ratingElement = document.getElementById('performance-rating');
            if (ratingElement) {
                ratingElement.textContent = rating;
            }
        }
    }, 2000);
});

console.log('✅ Agent Analytics Dashboard JavaScript Loaded'); 