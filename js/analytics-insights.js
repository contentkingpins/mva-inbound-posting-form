/**
 * Performance Analytics & Insights Dashboard
 * Comprehensive business intelligence and actionable insights
 */

class AnalyticsInsights {
    constructor() {
        this.metrics = new Map();
        this.kpis = new Map();
        this.reports = new Map();
        this.insights = [];
        this.anomalies = [];
        this.forecasts = new Map();
        this.goals = new Map();
        this.cohorts = new Map();
        
        // Default KPIs
        this.defaultKPIs = [
            { id: 'revenue', name: 'Revenue', type: 'currency', target: 100000, period: 'month' },
            { id: 'leads', name: 'New Leads', type: 'number', target: 500, period: 'month' },
            { id: 'conversion', name: 'Conversion Rate', type: 'percentage', target: 15, period: 'month' },
            { id: 'avgDealSize', name: 'Avg Deal Size', type: 'currency', target: 5000, period: 'month' },
            { id: 'responseTime', name: 'Avg Response Time', type: 'time', target: 30, period: 'day' },
            { id: 'customerSatisfaction', name: 'CSAT Score', type: 'percentage', target: 90, period: 'month' }
        ];
        
        // Time periods
        this.periods = {
            today: { label: 'Today', days: 1 },
            yesterday: { label: 'Yesterday', days: 1, offset: 1 },
            week: { label: 'This Week', days: 7 },
            lastWeek: { label: 'Last Week', days: 7, offset: 7 },
            month: { label: 'This Month', days: 30 },
            lastMonth: { label: 'Last Month', days: 30, offset: 30 },
            quarter: { label: 'This Quarter', days: 90 },
            year: { label: 'This Year', days: 365 }
        };
        
        // Chart configurations
        this.chartConfigs = {
            revenue: { type: 'line', color: '#10b981' },
            leads: { type: 'bar', color: '#3b82f6' },
            conversion: { type: 'area', color: '#8b5cf6' },
            funnel: { type: 'funnel', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] }
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        // Load saved data
        this.loadSavedData();
        
        // Initialize KPIs
        this.initializeKPIs();
        
        // Create UI
        this.createAnalyticsUI();
        
        // Generate initial data
        this.generateMockData();
        
        // Start real-time updates
        this.startRealtimeUpdates();
        
        // Generate insights
        this.generateInsights();
        
        console.log('📊 Analytics insights engine initialized');
    }
    
    // KPI Management
    initializeKPIs() {
        this.defaultKPIs.forEach(kpi => {
            this.kpis.set(kpi.id, {
                ...kpi,
                current: 0,
                previous: 0,
                trend: 'stable',
                progress: 0,
                history: []
            });
        });
    }
    
    updateKPI(kpiId, value) {
        const kpi = this.kpis.get(kpiId);
        if (!kpi) return;
        
        // Store previous value
        kpi.previous = kpi.current;
        kpi.current = value;
        
        // Calculate progress
        kpi.progress = (value / kpi.target) * 100;
        
        // Calculate trend
        if (value > kpi.previous * 1.05) kpi.trend = 'up';
        else if (value < kpi.previous * 0.95) kpi.trend = 'down';
        else kpi.trend = 'stable';
        
        // Add to history
        kpi.history.push({
            value,
            timestamp: new Date().toISOString()
        });
        
        // Keep history size manageable
        if (kpi.history.length > 100) {
            kpi.history = kpi.history.slice(-50);
        }
        
        // Check for anomalies
        this.checkForAnomalies(kpiId, value);
        
        // Update UI
        this.updateKPIDisplay(kpiId);
    }
    
    // Analytics Calculations
    calculateConversionFunnel() {
        const funnel = [
            { stage: 'Visitors', count: 10000, rate: 100 },
            { stage: 'Leads', count: 2500, rate: 25 },
            { stage: 'Qualified', count: 750, rate: 30 },
            { stage: 'Customers', count: 150, rate: 20 }
        ];
        
        // Calculate drop-off rates
        for (let i = 1; i < funnel.length; i++) {
            const dropOff = ((funnel[i-1].count - funnel[i].count) / funnel[i-1].count) * 100;
            funnel[i].dropOff = dropOff.toFixed(1);
        }
        
        return funnel;
    }
    
    calculateCohortAnalysis() {
        const cohorts = [];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        
        months.forEach((month, index) => {
            const cohort = {
                month,
                size: Math.floor(Math.random() * 200) + 100,
                retention: []
            };
            
            // Generate retention data
            for (let i = 0; i <= index; i++) {
                const retention = 100 - (i * 15) + Math.random() * 10;
                cohort.retention.push(Math.max(0, Math.round(retention)));
            }
            
            cohorts.push(cohort);
        });
        
        return cohorts;
    }
    
    calculateRevenueAttribution() {
        const channels = [
            { name: 'Direct', revenue: 45000, percentage: 30 },
            { name: 'Organic Search', revenue: 37500, percentage: 25 },
            { name: 'Paid Ads', revenue: 30000, percentage: 20 },
            { name: 'Social Media', revenue: 22500, percentage: 15 },
            { name: 'Referrals', revenue: 15000, percentage: 10 }
        ];
        
        return channels;
    }
    
    // Forecasting
    generateForecast(metric, periods = 6) {
        const historical = this.getHistoricalData(metric);
        const forecast = [];
        
        // Simple linear regression for demo
        const trend = this.calculateTrend(historical);
        const lastValue = historical[historical.length - 1]?.value || 0;
        
        for (let i = 1; i <= periods; i++) {
            const value = lastValue + (trend * i);
            const variance = value * 0.1; // 10% variance
            
            forecast.push({
                period: `Period ${i}`,
                predicted: Math.round(value),
                lower: Math.round(value - variance),
                upper: Math.round(value + variance),
                confidence: 0.85 - (i * 0.05) // Confidence decreases over time
            });
        }
        
        return forecast;
    }
    
    calculateTrend(data) {
        if (data.length < 2) return 0;
        
        // Simple trend calculation
        const firstHalf = data.slice(0, Math.floor(data.length / 2));
        const secondHalf = data.slice(Math.floor(data.length / 2));
        
        const avgFirst = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;
        
        return (avgSecond - avgFirst) / firstHalf.length;
    }
    
    // Insights Generation
    generateInsights() {
        this.insights = [];
        
        // Revenue insights
        const revenueKPI = this.kpis.get('revenue');
        if (revenueKPI) {
            if (revenueKPI.progress > 100) {
                this.insights.push({
                    type: 'success',
                    category: 'revenue',
                    title: 'Revenue Target Exceeded',
                    description: `Revenue is ${revenueKPI.progress.toFixed(0)}% of target, exceeding goals by ${(revenueKPI.progress - 100).toFixed(0)}%`,
                    action: 'Consider raising targets for next period',
                    priority: 'high'
                });
            } else if (revenueKPI.progress < 70) {
                this.insights.push({
                    type: 'warning',
                    category: 'revenue',
                    title: 'Revenue Below Target',
                    description: `Revenue is only ${revenueKPI.progress.toFixed(0)}% of target`,
                    action: 'Review sales pipeline and conversion rates',
                    priority: 'high'
                });
            }
        }
        
        // Conversion insights
        const conversionKPI = this.kpis.get('conversion');
        if (conversionKPI && conversionKPI.trend === 'down') {
            this.insights.push({
                type: 'alert',
                category: 'conversion',
                title: 'Declining Conversion Rate',
                description: 'Conversion rate has decreased compared to previous period',
                action: 'Analyze lead quality and sales process',
                priority: 'medium'
            });
        }
        
        // Response time insights
        const responseKPI = this.kpis.get('responseTime');
        if (responseKPI && responseKPI.current > responseKPI.target) {
            this.insights.push({
                type: 'warning',
                category: 'performance',
                title: 'Slow Response Times',
                description: `Average response time is ${responseKPI.current} minutes, above target of ${responseKPI.target} minutes`,
                action: 'Consider adding more agents or improving automation',
                priority: 'medium'
            });
        }
        
        // Add seasonal insights
        const currentMonth = new Date().getMonth();
        if (currentMonth === 11) { // December
            this.insights.push({
                type: 'info',
                category: 'seasonal',
                title: 'Year-End Opportunity',
                description: 'December typically sees increased buyer activity',
                action: 'Prepare year-end campaigns and offers',
                priority: 'low'
            });
        }
        
        // Sort by priority
        this.insights.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        
        // Update UI
        this.updateInsightsDisplay();
    }
    
    // Anomaly Detection
    checkForAnomalies(metric, value) {
        const history = this.getHistoricalData(metric);
        if (history.length < 10) return;
        
        // Calculate statistics
        const values = history.map(h => h.value);
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const stdDev = Math.sqrt(
            values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
        );
        
        // Check if value is outside 2 standard deviations
        if (Math.abs(value - mean) > 2 * stdDev) {
            this.anomalies.push({
                metric,
                value,
                expected: mean,
                deviation: Math.abs(value - mean) / stdDev,
                timestamp: new Date().toISOString(),
                type: value > mean ? 'spike' : 'drop'
            });
            
            // Keep anomaly list size manageable
            if (this.anomalies.length > 50) {
                this.anomalies = this.anomalies.slice(-25);
            }
            
            // Generate alert
            this.generateAnomalyAlert(metric, value, mean);
        }
    }
    
    generateAnomalyAlert(metric, value, expected) {
        const kpi = this.kpis.get(metric);
        if (!kpi) return;
        
        const change = ((value - expected) / expected * 100).toFixed(0);
        const direction = value > expected ? 'increase' : 'decrease';
        
        if (window.notificationSystem) {
            window.notificationSystem.showNotification({
                type: 'analytics',
                title: `Anomaly Detected: ${kpi.name}`,
                message: `Unusual ${direction} of ${Math.abs(change)}% detected`,
                priority: 'high',
                actions: [
                    { label: 'View Details', action: () => this.showAnomalyDetails(metric) },
                    { label: 'Dismiss', action: 'dismiss' }
                ]
            });
        }
    }
    
    // Report Generation
    generateReport(config) {
        const report = {
            id: `report_${Date.now()}`,
            name: config.name,
            type: config.type,
            period: config.period,
            metrics: config.metrics,
            generatedAt: new Date().toISOString(),
            data: {}
        };
        
        // Gather data for each metric
        config.metrics.forEach(metric => {
            report.data[metric] = {
                current: this.getCurrentValue(metric),
                previous: this.getPreviousValue(metric),
                trend: this.getTrend(metric),
                history: this.getHistoricalData(metric)
            };
        });
        
        // Add insights
        report.insights = this.insights.filter(i => 
            config.metrics.includes(i.category)
        );
        
        // Store report
        this.reports.set(report.id, report);
        
        return report;
    }
    
    exportReport(reportId, format = 'pdf') {
        const report = this.reports.get(reportId);
        if (!report) return;
        
        switch (format) {
            case 'pdf':
                this.exportToPDF(report);
                break;
            case 'csv':
                this.exportToCSV(report);
                break;
            case 'json':
                this.exportToJSON(report);
                break;
        }
    }
    
    exportToPDF(report) {
        // In a real implementation, use a library like jsPDF
        console.log('Exporting report to PDF:', report);
        alert('PDF export would generate here with charts and formatted data');
    }
    
    exportToCSV(report) {
        let csv = 'Metric,Current,Previous,Trend,Change\n';
        
        Object.entries(report.data).forEach(([metric, data]) => {
            const change = ((data.current - data.previous) / data.previous * 100).toFixed(2);
            csv += `${metric},${data.current},${data.previous},${data.trend},${change}%\n`;
        });
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name}_${report.generatedAt}.csv`;
        a.click();
    }
    
    exportToJSON(report) {
        const json = JSON.stringify(report, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name}_${report.generatedAt}.json`;
        a.click();
    }
    
    // Data Helpers
    getCurrentValue(metric) {
        const kpi = this.kpis.get(metric);
        return kpi ? kpi.current : 0;
    }
    
    getPreviousValue(metric) {
        const kpi = this.kpis.get(metric);
        return kpi ? kpi.previous : 0;
    }
    
    getTrend(metric) {
        const kpi = this.kpis.get(metric);
        return kpi ? kpi.trend : 'stable';
    }
    
    getHistoricalData(metric) {
        const kpi = this.kpis.get(metric);
        return kpi ? kpi.history : [];
    }
    
    // Mock Data Generation
    generateMockData() {
        // Generate historical data for KPIs
        this.kpis.forEach((kpi, id) => {
            const baseValue = kpi.target * 0.8;
            
            for (let i = 30; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                
                const variance = (Math.random() - 0.5) * 0.4; // ±20% variance
                let value = baseValue * (1 + variance);
                
                // Add some trends
                if (id === 'revenue') value *= (1 + i * 0.01); // Growing trend
                if (id === 'responseTime') value *= (1 - i * 0.005); // Improving trend
                
                kpi.history.push({
                    value: Math.round(value),
                    timestamp: date.toISOString()
                });
            }
            
            // Set current value
            this.updateKPI(id, kpi.history[kpi.history.length - 1].value);
        });
    }
    
    // Real-time Updates
    startRealtimeUpdates() {
        // Simulate real-time data updates
        setInterval(() => {
            // Update random KPIs
            const kpiIds = Array.from(this.kpis.keys());
            const randomKPI = kpiIds[Math.floor(Math.random() * kpiIds.length)];
            const kpi = this.kpis.get(randomKPI);
            
            if (kpi) {
                const variance = (Math.random() - 0.5) * 0.1; // ±5% variance
                const newValue = kpi.current * (1 + variance);
                this.updateKPI(randomKPI, Math.round(newValue));
            }
            
            // Occasionally generate new insights
            if (Math.random() > 0.9) {
                this.generateInsights();
            }
        }, 5000); // Update every 5 seconds
    }
    
    // UI Creation
    createAnalyticsUI() {
        // Create main dashboard
        this.createDashboard();
        
        // Create report builder
        this.createReportBuilder();
        
        // Add styles
        this.addStyles();
    }
    
    createDashboard() {
        const container = document.createElement('div');
        container.className = 'analytics-dashboard-container';
        container.id = 'analytics-dashboard';
        container.innerHTML = `
            <div class="analytics-header">
                <h2>📊 Performance Analytics & Insights</h2>
                <div class="analytics-controls">
                    <select class="period-selector" id="analytics-period">
                        <option value="today">Today</option>
                        <option value="week" selected>This Week</option>
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                    </select>
                    <button class="btn btn-secondary" onclick="analyticsInsights.refreshData()">
                        🔄 Refresh
                    </button>
                    <button class="btn btn-primary" onclick="analyticsInsights.openReportBuilder()">
                        📄 Create Report
                    </button>
                </div>
            </div>
            
            <!-- KPI Cards -->
            <div class="kpi-grid" id="kpi-grid">
                <!-- KPI cards will be rendered here -->
            </div>
            
            <!-- Insights Panel -->
            <div class="insights-panel glass-card">
                <div class="panel-header">
                    <h3>💡 Key Insights & Recommendations</h3>
                    <span class="insight-count" id="insight-count">0 insights</span>
                </div>
                <div class="insights-list" id="insights-list">
                    <!-- Insights will be rendered here -->
                </div>
            </div>
            
            <!-- Analytics Charts -->
            <div class="analytics-grid">
                <!-- Conversion Funnel -->
                <div class="analytics-card">
                    <h3>🔄 Conversion Funnel</h3>
                    <div class="funnel-chart" id="conversion-funnel">
                        <!-- Funnel visualization -->
                    </div>
                </div>
                
                <!-- Revenue Trend -->
                <div class="analytics-card">
                    <h3>💰 Revenue Trend</h3>
                    <canvas id="revenue-trend-chart"></canvas>
                </div>
                
                <!-- Cohort Analysis -->
                <div class="analytics-card">
                    <h3>👥 Cohort Retention</h3>
                    <div class="cohort-table" id="cohort-analysis">
                        <!-- Cohort table -->
                    </div>
                </div>
                
                <!-- Channel Attribution -->
                <div class="analytics-card">
                    <h3>📍 Revenue Attribution</h3>
                    <canvas id="attribution-chart"></canvas>
                </div>
            </div>
            
            <!-- Forecast Section -->
            <div class="forecast-section glass-card">
                <h3>🔮 Predictive Forecast</h3>
                <div class="forecast-controls">
                    <select id="forecast-metric" class="form-select">
                        <option value="revenue">Revenue</option>
                        <option value="leads">Leads</option>
                        <option value="conversion">Conversion Rate</option>
                    </select>
                    <button class="btn btn-secondary" onclick="analyticsInsights.updateForecast()">
                        Generate Forecast
                    </button>
                </div>
                <canvas id="forecast-chart"></canvas>
            </div>
        `;
        
        // Add to page
        const targetSection = document.querySelector('.admin-main');
        if (targetSection) {
            targetSection.appendChild(container);
        }
        
        // Initial render
        this.renderKPIs();
        this.renderCharts();
    }
    
    createReportBuilder() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'report-builder-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal report-builder-modal">
                <div class="modal-header">
                    <h3>📄 Create Custom Report</h3>
                    <button class="modal-close" onclick="analyticsInsights.closeReportBuilder()">×</button>
                </div>
                <div class="modal-body">
                    <form id="report-builder-form">
                        <div class="form-group">
                            <label>Report Name</label>
                            <input type="text" id="report-name" class="form-input" placeholder="Monthly Performance Report">
                        </div>
                        
                        <div class="form-group">
                            <label>Report Type</label>
                            <select id="report-type" class="form-input">
                                <option value="executive">Executive Summary</option>
                                <option value="detailed">Detailed Analysis</option>
                                <option value="comparison">Period Comparison</option>
                                <option value="forecast">Forecast Report</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Time Period</label>
                            <select id="report-period" class="form-input">
                                <option value="week">Last Week</option>
                                <option value="month">Last Month</option>
                                <option value="quarter">Last Quarter</option>
                                <option value="year">Last Year</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Include Metrics</label>
                            <div class="metric-checkboxes">
                                ${Array.from(this.kpis.entries()).map(([id, kpi]) => `
                                    <label class="checkbox-label">
                                        <input type="checkbox" value="${id}" checked>
                                        ${kpi.name}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Additional Options</label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="include-insights" checked>
                                Include Insights & Recommendations
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="include-forecast" checked>
                                Include Forecasts
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="include-charts" checked>
                                Include Charts & Visualizations
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label>Schedule Report</label>
                            <select id="report-schedule" class="form-input">
                                <option value="once">Generate Once</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="analyticsInsights.closeReportBuilder()">Cancel</button>
                    <button class="btn btn-primary" onclick="analyticsInsights.generateCustomReport()">
                        Generate Report
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // UI Update Methods
    renderKPIs() {
        const container = document.getElementById('kpi-grid');
        if (!container) return;
        
        container.innerHTML = Array.from(this.kpis.entries()).map(([id, kpi]) => `
            <div class="kpi-card glass-card" data-kpi="${id}">
                <div class="kpi-header">
                    <span class="kpi-name">${kpi.name}</span>
                    <span class="kpi-trend ${kpi.trend}">
                        ${this.getTrendIcon(kpi.trend)}
                    </span>
                </div>
                <div class="kpi-value">
                    ${this.formatValue(kpi.current, kpi.type)}
                </div>
                <div class="kpi-target">
                    Target: ${this.formatValue(kpi.target, kpi.type)}
                </div>
                <div class="kpi-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(100, kpi.progress)}%; background: ${this.getProgressColor(kpi.progress)}"></div>
                    </div>
                    <span class="progress-text">${kpi.progress.toFixed(0)}%</span>
                </div>
                <div class="kpi-sparkline" id="sparkline-${id}">
                    <!-- Mini chart -->
                </div>
            </div>
        `).join('');
        
        // Render sparklines
        this.kpis.forEach((kpi, id) => {
            this.renderSparkline(id, kpi.history);
        });
    }
    
    updateKPIDisplay(kpiId) {
        const kpi = this.kpis.get(kpiId);
        if (!kpi) return;
        
        const card = document.querySelector(`[data-kpi="${kpiId}"]`);
        if (!card) return;
        
        // Update value
        card.querySelector('.kpi-value').textContent = this.formatValue(kpi.current, kpi.type);
        
        // Update trend
        const trendElement = card.querySelector('.kpi-trend');
        trendElement.className = `kpi-trend ${kpi.trend}`;
        trendElement.textContent = this.getTrendIcon(kpi.trend);
        
        // Update progress
        const progressFill = card.querySelector('.progress-fill');
        progressFill.style.width = `${Math.min(100, kpi.progress)}%`;
        progressFill.style.background = this.getProgressColor(kpi.progress);
        card.querySelector('.progress-text').textContent = `${kpi.progress.toFixed(0)}%`;
        
        // Update sparkline
        this.renderSparkline(kpiId, kpi.history);
    }
    
    renderCharts() {
        // Render conversion funnel
        this.renderConversionFunnel();
        
        // Render revenue trend
        this.renderRevenueTrend();
        
        // Render cohort analysis
        this.renderCohortAnalysis();
        
        // Render attribution chart
        this.renderAttributionChart();
        
        // Render initial forecast
        this.updateForecast();
    }
    
    renderConversionFunnel() {
        const container = document.getElementById('conversion-funnel');
        if (!container) return;
        
        const funnel = this.calculateConversionFunnel();
        
        container.innerHTML = funnel.map((stage, index) => `
            <div class="funnel-stage" style="width: ${100 - index * 20}%;">
                <div class="funnel-bar" style="background: ${this.chartConfigs.funnel.colors[index]};">
                    <div class="funnel-content">
                        <span class="funnel-label">${stage.stage}</span>
                        <span class="funnel-count">${stage.count.toLocaleString()}</span>
                        <span class="funnel-rate">${stage.rate}%</span>
                    </div>
                </div>
                ${stage.dropOff ? `
                    <div class="funnel-dropoff">
                        ↓ ${stage.dropOff}% drop-off
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    renderRevenueTrend() {
        const canvas = document.getElementById('revenue-trend-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const revenueData = this.kpis.get('revenue')?.history || [];
        
        // Simple line chart
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        
        ctx.clearRect(0, 0, width, height);
        
        if (revenueData.length > 1) {
            const maxValue = Math.max(...revenueData.map(d => d.value));
            const minValue = Math.min(...revenueData.map(d => d.value));
            const range = maxValue - minValue || 1;
            
            ctx.strokeStyle = this.chartConfigs.revenue.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            revenueData.forEach((point, index) => {
                const x = padding + (index / (revenueData.length - 1)) * (width - padding * 2);
                const y = height - padding - ((point.value - minValue) / range) * (height - padding * 2);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
    }
    
    renderCohortAnalysis() {
        const container = document.getElementById('cohort-analysis');
        if (!container) return;
        
        const cohorts = this.calculateCohortAnalysis();
        
        // Create cohort table
        let html = '<table class="cohort-table"><thead><tr><th>Cohort</th>';
        
        // Add month headers
        for (let i = 0; i < 6; i++) {
            html += `<th>Month ${i}</th>`;
        }
        html += '</tr></thead><tbody>';
        
        // Add cohort rows
        cohorts.forEach(cohort => {
            html += `<tr><td>${cohort.month} (${cohort.size})</td>`;
            
            for (let i = 0; i < 6; i++) {
                const retention = cohort.retention[i];
                if (retention !== undefined) {
                    const color = this.getRetentionColor(retention);
                    html += `<td style="background: ${color}; color: white;">${retention}%</td>`;
                } else {
                    html += '<td>-</td>';
                }
            }
            
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }
    
    renderAttributionChart() {
        const canvas = document.getElementById('attribution-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const channels = this.calculateRevenueAttribution();
        
        // Simple donut chart
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        const innerRadius = radius * 0.6;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let currentAngle = -Math.PI / 2;
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        
        channels.forEach((channel, index) => {
            const sliceAngle = (channel.percentage / 100) * Math.PI * 2;
            
            // Draw slice
            ctx.fillStyle = colors[index % colors.length];
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            ctx.closePath();
            ctx.fill();
            
            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
            
            ctx.fillStyle = '#888';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(channel.name, labelX, labelY);
            
            currentAngle += sliceAngle;
        });
    }
    
    updateInsightsDisplay() {
        const container = document.getElementById('insights-list');
        const countElement = document.getElementById('insight-count');
        
        if (!container) return;
        
        countElement.textContent = `${this.insights.length} insights`;
        
        container.innerHTML = this.insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <div class="insight-header">
                    <span class="insight-icon">${this.getInsightIcon(insight.type)}</span>
                    <span class="insight-title">${insight.title}</span>
                    <span class="insight-priority ${insight.priority}">${insight.priority}</span>
                </div>
                <p class="insight-description">${insight.description}</p>
                <div class="insight-action">
                    <span class="action-icon">💡</span>
                    ${insight.action}
                </div>
            </div>
        `).join('');
    }
    
    renderSparkline(kpiId, data) {
        const container = document.getElementById(`sparkline-${kpiId}`);
        if (!container || data.length < 2) return;
        
        // Create simple SVG sparkline
        const width = 100;
        const height = 30;
        const values = data.slice(-20).map(d => d.value); // Last 20 points
        
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const range = maxValue - minValue || 1;
        
        const points = values.map((value, index) => {
            const x = (index / (values.length - 1)) * width;
            const y = height - ((value - minValue) / range) * height;
            return `${x},${y}`;
        }).join(' ');
        
        container.innerHTML = `
            <svg width="${width}" height="${height}" style="display: block;">
                <polyline points="${points}" 
                    fill="none" 
                    stroke="${this.chartConfigs.revenue.color}" 
                    stroke-width="2"/>
            </svg>
        `;
    }
    
    updateForecast() {
        const metric = document.getElementById('forecast-metric').value;
        const forecast = this.generateForecast(metric, 6);
        
        const canvas = document.getElementById('forecast-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw forecast
        const allValues = forecast.map(f => [f.lower, f.predicted, f.upper]).flat();
        const maxValue = Math.max(...allValues);
        const minValue = Math.min(...allValues);
        const range = maxValue - minValue || 1;
        
        // Draw confidence bands
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.beginPath();
        
        forecast.forEach((point, index) => {
            const x = padding + (index / (forecast.length - 1)) * (width - padding * 2);
            const yUpper = height - padding - ((point.upper - minValue) / range) * (height - padding * 2);
            
            if (index === 0) {
                ctx.moveTo(x, yUpper);
            } else {
                ctx.lineTo(x, yUpper);
            }
        });
        
        for (let i = forecast.length - 1; i >= 0; i--) {
            const point = forecast[i];
            const x = padding + (i / (forecast.length - 1)) * (width - padding * 2);
            const yLower = height - padding - ((point.lower - minValue) / range) * (height - padding * 2);
            ctx.lineTo(x, yLower);
        }
        
        ctx.closePath();
        ctx.fill();
        
        // Draw predicted line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        
        forecast.forEach((point, index) => {
            const x = padding + (index / (forecast.length - 1)) * (width - padding * 2);
            const y = height - padding - ((point.predicted - minValue) / range) * (height - padding * 2);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Helper Methods
    formatValue(value, type) {
        switch (type) {
            case 'currency':
                return `$${(value / 1000).toFixed(1)}k`;
            case 'percentage':
                return `${value}%`;
            case 'time':
                return `${value}m`;
            case 'number':
            default:
                return value.toLocaleString();
        }
    }
    
    getTrendIcon(trend) {
        switch (trend) {
            case 'up':
                return '📈';
            case 'down':
                return '📉';
            default:
                return '➡️';
        }
    }
    
    getProgressColor(progress) {
        if (progress >= 100) return '#10b981';
        if (progress >= 75) return '#3b82f6';
        if (progress >= 50) return '#f59e0b';
        return '#ef4444';
    }
    
    getRetentionColor(retention) {
        if (retention >= 80) return '#10b981';
        if (retention >= 60) return '#3b82f6';
        if (retention >= 40) return '#f59e0b';
        if (retention >= 20) return '#ef4444';
        return '#6b7280';
    }
    
    getInsightIcon(type) {
        switch (type) {
            case 'success':
                return '✅';
            case 'warning':
                return '⚠️';
            case 'alert':
                return '🚨';
            case 'info':
            default:
                return 'ℹ️';
        }
    }
    
    // Report Builder Methods
    openReportBuilder() {
        document.getElementById('report-builder-modal').style.display = 'block';
    }
    
    closeReportBuilder() {
        document.getElementById('report-builder-modal').style.display = 'none';
    }
    
    generateCustomReport() {
        const form = document.getElementById('report-builder-form');
        const selectedMetrics = Array.from(form.querySelectorAll('.metric-checkboxes input:checked'))
            .map(cb => cb.value);
        
        const config = {
            name: document.getElementById('report-name').value || 'Custom Report',
            type: document.getElementById('report-type').value,
            period: document.getElementById('report-period').value,
            metrics: selectedMetrics,
            includeInsights: document.getElementById('include-insights').checked,
            includeForecast: document.getElementById('include-forecast').checked,
            includeCharts: document.getElementById('include-charts').checked
        };
        
        const report = this.generateReport(config);
        
        // Show success message
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'success',
                title: 'Report Generated',
                message: `${report.name} has been created successfully`,
                actions: [
                    { label: 'Download PDF', action: () => this.exportReport(report.id, 'pdf') },
                    { label: 'Download CSV', action: () => this.exportReport(report.id, 'csv') }
                ]
            });
        }
        
        this.closeReportBuilder();
    }
    
    // Public Methods
    refreshData() {
        // Regenerate mock data
        this.generateMockData();
        
        // Regenerate insights
        this.generateInsights();
        
        // Update all displays
        this.renderKPIs();
        this.renderCharts();
        
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'info',
                title: 'Data Refreshed',
                message: 'Analytics data has been updated'
            });
        }
    }
    
    showAnomalyDetails(metric) {
        const kpi = this.kpis.get(metric);
        const anomaly = this.anomalies.find(a => a.metric === metric);
        
        if (!kpi || !anomaly) return;
        
        alert(`Anomaly Details:
        
Metric: ${kpi.name}
Current Value: ${this.formatValue(anomaly.value, kpi.type)}
Expected Value: ${this.formatValue(anomaly.expected, kpi.type)}
Deviation: ${anomaly.deviation.toFixed(1)} standard deviations
Type: ${anomaly.type}
Time: ${new Date(anomaly.timestamp).toLocaleString()}

This unusual ${anomaly.type} may indicate:
- System issue or data error
- Significant business event
- Market change or external factor

Recommended Actions:
1. Verify data accuracy
2. Check for system issues
3. Investigate business context
4. Monitor for continued anomalies`);
    }
    
    // Data Persistence
    saveData() {
        const data = {
            metrics: Array.from(this.metrics.entries()),
            kpis: Array.from(this.kpis.entries()),
            goals: Array.from(this.goals.entries()),
            insights: this.insights,
            anomalies: this.anomalies
        };
        
        localStorage.setItem('analyticsData', JSON.stringify(data));
    }
    
    loadSavedData() {
        const saved = localStorage.getItem('analyticsData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                if (data.metrics) this.metrics = new Map(data.metrics);
                if (data.goals) this.goals = new Map(data.goals);
                if (data.insights) this.insights = data.insights;
                if (data.anomalies) this.anomalies = data.anomalies;
                
                // KPIs are initialized fresh but we can restore history
                if (data.kpis) {
                    data.kpis.forEach(([id, savedKpi]) => {
                        const kpi = this.kpis.get(id);
                        if (kpi && savedKpi.history) {
                            kpi.history = savedKpi.history.slice(-50); // Keep last 50
                        }
                    });
                }
            } catch (error) {
                console.error('Error loading analytics data:', error);
            }
        }
    }
    
    // Styles
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Analytics Dashboard */
            .analytics-dashboard-container {
                padding: 1.5rem;
            }
            
            .analytics-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
            }
            
            .analytics-header h2 {
                margin: 0;
                color: var(--text-primary);
            }
            
            .analytics-controls {
                display: flex;
                gap: 1rem;
                align-items: center;
            }
            
            .period-selector {
                padding: 0.5rem 1rem;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                color: var(--text-primary);
            }
            
            /* KPI Grid */
            .kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }
            
            .kpi-card {
                padding: 1.5rem;
                position: relative;
                overflow: hidden;
            }
            
            .kpi-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .kpi-name {
                font-size: 0.875rem;
                color: var(--text-secondary);
                font-weight: 500;
            }
            
            .kpi-trend {
                font-size: 1.25rem;
            }
            
            .kpi-trend.up { color: var(--success); }
            .kpi-trend.down { color: var(--danger); }
            .kpi-trend.stable { color: var(--text-secondary); }
            
            .kpi-value {
                font-size: 2rem;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 0.5rem;
            }
            
            .kpi-target {
                font-size: 0.75rem;
                color: var(--text-secondary);
                margin-bottom: 0.75rem;
            }
            
            .kpi-progress {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .progress-bar {
                flex: 1;
                height: 6px;
                background: var(--bg-primary);
                border-radius: 3px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                transition: width 0.5s ease, background 0.5s ease;
            }
            
            .progress-text {
                font-size: 0.75rem;
                color: var(--text-secondary);
                min-width: 35px;
            }
            
            .kpi-sparkline {
                position: absolute;
                bottom: 0;
                right: 0;
                opacity: 0.3;
            }
            
            /* Insights Panel */
            .insights-panel {
                margin-bottom: 2rem;
                padding: 1.5rem;
            }
            
            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
            }
            
            .panel-header h3 {
                margin: 0;
                color: var(--text-primary);
            }
            
            .insight-count {
                font-size: 0.875rem;
                color: var(--text-secondary);
            }
            
            .insights-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .insight-card {
                padding: 1rem;
                border-radius: 8px;
                border-left: 4px solid;
            }
            
            .insight-card.success {
                background: rgba(16, 185, 129, 0.1);
                border-left-color: var(--success);
            }
            
            .insight-card.warning {
                background: rgba(245, 158, 11, 0.1);
                border-left-color: var(--warning);
            }
            
            .insight-card.alert {
                background: rgba(239, 68, 68, 0.1);
                border-left-color: var(--danger);
            }
            
            .insight-card.info {
                background: rgba(59, 130, 246, 0.1);
                border-left-color: var(--primary);
            }
            
            .insight-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }
            
            .insight-icon {
                font-size: 1.25rem;
            }
            
            .insight-title {
                flex: 1;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .insight-priority {
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.75rem;
                text-transform: uppercase;
            }
            
            .insight-priority.high {
                background: var(--danger);
                color: white;
            }
            
            .insight-priority.medium {
                background: var(--warning);
                color: white;
            }
            
            .insight-priority.low {
                background: var(--text-secondary);
                color: white;
            }
            
            .insight-description {
                margin: 0.5rem 0;
                color: var(--text-primary);
                font-size: 0.875rem;
            }
            
            .insight-action {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
                color: var(--primary);
                font-weight: 500;
            }
            
            /* Analytics Grid */
            .analytics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }
            
            .analytics-card {
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 1.5rem;
            }
            
            .analytics-card h3 {
                margin: 0 0 1rem 0;
                color: var(--text-primary);
            }
            
            /* Funnel Chart */
            .funnel-chart {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
            }
            
            .funnel-stage {
                transition: all 0.3s ease;
            }
            
            .funnel-bar {
                padding: 1rem;
                border-radius: 8px;
                color: white;
                position: relative;
            }
            
            .funnel-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .funnel-label {
                font-weight: 600;
            }
            
            .funnel-dropoff {
                text-align: center;
                font-size: 0.75rem;
                color: var(--danger);
                margin-top: 0.25rem;
            }
            
            /* Cohort Table */
            .cohort-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.875rem;
            }
            
            .cohort-table th,
            .cohort-table td {
                padding: 0.5rem;
                text-align: center;
                border: 1px solid var(--border-color);
            }
            
            .cohort-table th {
                background: var(--bg-primary);
                color: var(--text-primary);
                font-weight: 600;
            }
            
            .cohort-table td:first-child {
                text-align: left;
                font-weight: 500;
            }
            
            /* Forecast Section */
            .forecast-section {
                padding: 1.5rem;
            }
            
            .forecast-section h3 {
                margin: 0 0 1rem 0;
                color: var(--text-primary);
            }
            
            .forecast-controls {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }
            
            .form-select {
                flex: 1;
                padding: 0.5rem;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                color: var(--text-primary);
            }
            
            /* Report Builder */
            .report-builder-modal {
                max-width: 600px;
            }
            
            .metric-checkboxes {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 0.5rem;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
                padding: 0.25rem;
            }
            
            .checkbox-label:hover {
                background: var(--bg-primary);
                border-radius: 4px;
            }
            
            /* Charts */
            canvas {
                width: 100% !important;
                height: 200px !important;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .analytics-grid {
                    grid-template-columns: 1fr;
                }
                
                .kpi-grid {
                    grid-template-columns: 1fr;
                }
                
                .analytics-controls {
                    flex-wrap: wrap;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize analytics insights engine
window.analyticsInsights = new AnalyticsInsights();

// Export for use in other modules
export default AnalyticsInsights; 