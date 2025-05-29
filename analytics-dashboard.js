// Analytics Dashboard JavaScript

// Chart.js default configuration
Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
Chart.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
Chart.defaults.font.size = 12;

// Global variables
let leadVolumeChart = null;
let conversionFunnelChart = null;
let activityHeatmapChart = null;
let updateInterval = null;
let activityCount = 0;

// Agent names for demo
const agentNames = [
    'Sarah Chen', 'Michael Rodriguez', 'Emily Johnson', 'David Kim', 'Jessica Martinez',
    'Alex Thompson', 'Maria Garcia', 'James Wilson', 'Sophia Patel', 'Daniel Lee',
    'Rachel Anderson', 'Chris Taylor', 'Amanda Brown', 'Kevin Nguyen', 'Lisa Davis'
];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    updateMetrics();
    updateLeaderboard('today');
    startRealTimeUpdates();
    
    // Event listeners
    document.getElementById('leaderboard-filter').addEventListener('change', (e) => {
        updateLeaderboard(e.target.value);
    });
    
    // Period buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateLeadVolumeChart(e.target.dataset.period);
        });
    });
});

// Initialize all charts
function initializeCharts() {
    initLeadVolumeChart();
    initConversionFunnelChart();
    initActivityHeatmap();
}

// Lead Volume Chart
function initLeadVolumeChart() {
    const ctx = document.getElementById('leadVolumeChart').getContext('2d');
    
    leadVolumeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'New Leads',
                data: [],
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#6366F1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }, {
                label: 'Conversions',
                data: [],
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#10B981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + ' leads';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
    
    updateLeadVolumeChart('30d');
}

// Update lead volume chart data
function updateLeadVolumeChart(period) {
    const now = new Date();
    const labels = [];
    const newLeads = [];
    const conversions = [];
    
    let days = 30;
    if (period === '7d') days = 7;
    if (period === '24h') days = 1;
    
    if (period === '24h') {
        // Hourly data for last 24 hours
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now - i * 60 * 60 * 1000);
            labels.push(hour.toLocaleTimeString('en-US', { hour: 'numeric' }));
            newLeads.push(Math.floor(Math.random() * 15) + 5);
            conversions.push(Math.floor(Math.random() * 8) + 2);
        }
    } else {
        // Daily data
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            newLeads.push(Math.floor(Math.random() * 40) + 20);
            conversions.push(Math.floor(Math.random() * 20) + 10);
        }
    }
    
    leadVolumeChart.data.labels = labels;
    leadVolumeChart.data.datasets[0].data = newLeads;
    leadVolumeChart.data.datasets[1].data = conversions;
    leadVolumeChart.update();
}

// Conversion Funnel Chart
function initConversionFunnelChart() {
    const ctx = document.getElementById('conversionFunnelChart').getContext('2d');
    
    conversionFunnelChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['New', 'Contacted', 'Qualified', 'Retained', 'Completed'],
            datasets: [{
                label: 'Leads',
                data: [450, 380, 250, 180, 150],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgba(99, 102, 241, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(6, 182, 212, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8,
                barPercentage: 0.8
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
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const total = context.dataset.data[0];
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${value} leads (${percentage}% of total)`;
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
                        color: 'rgba(255, 255, 255, 0.6)',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Activity Heatmap
function initActivityHeatmap() {
    const ctx = document.getElementById('activityHeatmap').getContext('2d');
    
    // Generate heatmap data
    const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const datasets = [];
    
    days.forEach((day, dayIndex) => {
        const data = hours.map(hour => ({
            x: hour,
            y: Math.floor(Math.random() * 20) + 5
        }));
        
        datasets.push({
            label: day,
            data: data,
            backgroundColor: `rgba(99, 102, 241, ${0.3 + (dayIndex * 0.1)})`,
            borderColor: 'rgba(99, 102, 241, 0.8)',
            borderWidth: 1
        });
    });
    
    activityHeatmapChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [{
                label: 'Lead Activity',
                data: hours.map(() => Math.floor(Math.random() * 30) + 10),
                backgroundColor: (context) => {
                    const value = context.parsed.y;
                    const alpha = value / 40; // Normalize to 0-1
                    return `rgba(99, 102, 241, ${alpha})`;
                },
                borderColor: 'rgba(99, 102, 241, 0.8)',
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.9
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
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} leads at ${context.label}`;
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
                        color: 'rgba(255, 255, 255, 0.5)',
                        font: {
                            size: 10
                        },
                        maxRotation: 0
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Update metrics
function updateMetrics() {
    // Simulate metrics
    const totalLeadsToday = Math.floor(Math.random() * 50) + 30;
    const conversionRate = Math.floor(Math.random() * 20) + 60;
    const avgResponseTime = Math.floor(Math.random() * 4) + 1;
    const activeAgents = Math.floor(Math.random() * 8) + 12;
    
    // Update DOM
    document.getElementById('total-leads-today').textContent = totalLeadsToday;
    document.getElementById('conversion-rate-today').textContent = conversionRate + '%';
    document.getElementById('avg-response-time').textContent = avgResponseTime + 'h';
    document.getElementById('active-agents').textContent = activeAgents;
    
    // Update change indicators
    updateChangeIndicator('total-leads-today', Math.random() > 0.5);
    updateChangeIndicator('conversion-rate-today', Math.random() > 0.7);
    updateChangeIndicator('avg-response-time', Math.random() > 0.5, true);
    updateChangeIndicator('active-agents', null);
}

// Update change indicator
function updateChangeIndicator(metricId, isPositive, inverse = false) {
    const element = document.querySelector(`#${metricId}`).parentElement.querySelector('.metric-change');
    if (isPositive === null) {
        element.className = 'metric-change neutral';
        element.textContent = '0';
    } else {
        const change = Math.floor(Math.random() * 15) + 5;
        const actualPositive = inverse ? !isPositive : isPositive;
        element.className = `metric-change ${actualPositive ? 'positive' : 'negative'}`;
        element.textContent = `${actualPositive ? '+' : '-'}${change}%`;
    }
}

// Update leaderboard
function updateLeaderboard(period) {
    const leaderboardRows = document.getElementById('leaderboard-rows');
    leaderboardRows.innerHTML = '';
    
    // Generate leaderboard data
    const agents = agentNames.map(name => ({
        name,
        leads: Math.floor(Math.random() * 100) + 20,
        converted: Math.floor(Math.random() * 50) + 10,
        responseTime: (Math.random() * 3 + 0.5).toFixed(1),
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'neutral'
    }));
    
    // Calculate conversion rates
    agents.forEach(agent => {
        agent.conversionRate = ((agent.converted / agent.leads) * 100).toFixed(1);
    });
    
    // Sort by conversion rate
    agents.sort((a, b) => b.conversionRate - a.conversionRate);
    
    // Create rows
    agents.slice(0, 10).forEach((agent, index) => {
        const row = createLeaderboardRow(agent, index + 1);
        leaderboardRows.appendChild(row);
    });
}

// Create leaderboard row
function createLeaderboardRow(agent, rank) {
    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const trendIcon = agent.trend === 'up' ? '↑' : agent.trend === 'down' ? '↓' : '→';
    const trendClass = `trend-${agent.trend}`;
    
    row.innerHTML = `
        <div class="rank-badge ${rankClass}">${rank}</div>
        <div class="agent-info">
            <div class="agent-avatar">${agent.name.split(' ').map(n => n[0]).join('')}</div>
            <div class="agent-name">${agent.name}</div>
        </div>
        <div class="metric-cell">${agent.leads}</div>
        <div class="metric-cell">${agent.converted}</div>
        <div class="metric-cell conversion-rate">${agent.conversionRate}%</div>
        <div class="metric-cell response-time">${agent.responseTime}h</div>
        <div class="trend-indicator ${trendClass}">
            <span>${trendIcon}</span>
            <span>${Math.floor(Math.random() * 10) + 1}%</span>
        </div>
    `;
    
    return row;
}

// Start real-time updates
function startRealTimeUpdates() {
    // Update every 5 seconds
    updateInterval = setInterval(() => {
        updateMetrics();
        updateChartData();
        addActivityItem();
    }, 5000);
    
    // Initial activity items
    for (let i = 0; i < 5; i++) {
        addActivityItem();
    }
}

// Update chart data (simulate real-time)
function updateChartData() {
    // Update lead volume chart with new data point
    if (leadVolumeChart) {
        const datasets = leadVolumeChart.data.datasets;
        datasets.forEach(dataset => {
            // Shift and add new data
            if (dataset.data.length > 30) {
                dataset.data.shift();
            }
            const lastValue = dataset.data[dataset.data.length - 1] || 20;
            const variation = (Math.random() - 0.5) * 10;
            dataset.data.push(Math.max(5, lastValue + variation));
        });
        leadVolumeChart.update('none'); // No animation for real-time updates
    }
    
    // Update conversion funnel with slight variations
    if (conversionFunnelChart) {
        const data = conversionFunnelChart.data.datasets[0].data;
        conversionFunnelChart.data.datasets[0].data = data.map(value => 
            Math.max(50, value + (Math.random() - 0.5) * 20)
        );
        conversionFunnelChart.update('none');
    }
}

// Add activity item
function addActivityItem() {
    const activities = [
        { type: 'lead', icon: '📥', text: 'New lead received from website form' },
        { type: 'conversion', icon: '✅', text: 'Lead converted to client' },
        { type: 'contact', icon: '📞', text: 'Agent contacted lead' },
        { type: 'lead', icon: '📧', text: 'Email sent to qualified lead' },
        { type: 'conversion', icon: '📝', text: 'Retainer agreement signed' }
    ];
    
    const activity = activities[Math.floor(Math.random() * activities.length)];
    const agent = agentNames[Math.floor(Math.random() * agentNames.length)];
    const time = new Date();
    
    const activityList = document.getElementById('activity-list');
    
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
        <div class="activity-icon ${activity.type}">${activity.icon}</div>
        <div class="activity-content">
            <div class="activity-text">${agent}: ${activity.text}</div>
            <div class="activity-time">${time.toLocaleTimeString()}</div>
        </div>
    `;
    
    // Add to top of list
    activityList.insertBefore(item, activityList.firstChild);
    
    // Keep only last 20 items
    while (activityList.children.length > 20) {
        activityList.removeChild(activityList.lastChild);
    }
    
    // Update activity count
    activityCount++;
    document.getElementById('activity-count').textContent = Math.min(activityCount, 50);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
}); 