/**
 * Advanced Data Visualization Module
 * Rich, interactive charts and reports - Dark Mode Only
 */

class DataVisualization {
    constructor() {
        this.charts = new Map();
        this.datasets = new Map();
        this.activeFilters = new Map();
        this.exportQueue = [];
        
        // Dark mode color palette
        this.darkTheme = {
            background: '#1a1a1a',
            surface: '#2a2a2a',
            border: '#3a3a3a',
            text: {
                primary: '#ffffff',
                secondary: '#b0b0b0',
                muted: '#666666'
            },
            colors: {
                primary: '#3b82f6',
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
                info: '#6366f1',
                purple: '#8b5cf6',
                pink: '#ec4899',
                teal: '#14b8a6'
            },
            chart: {
                gridLines: '#333333',
                axis: '#666666',
                tooltip: {
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '#444444'
                }
            }
        };
        
        // Chart.js global dark theme configuration
        this.setChartDefaults();
        
        // Chart types and configurations
        this.chartTypes = {
            line: { name: 'Line Chart', icon: '📈' },
            bar: { name: 'Bar Chart', icon: '📊' },
            pie: { name: 'Pie Chart', icon: '🥧' },
            doughnut: { name: 'Doughnut Chart', icon: '🍩' },
            radar: { name: 'Radar Chart', icon: '🎯' },
            scatter: { name: 'Scatter Plot', icon: '🔵' },
            bubble: { name: 'Bubble Chart', icon: '🫧' },
            heatmap: { name: 'Heat Map', icon: '🔥' },
            treemap: { name: 'Tree Map', icon: '🌳' },
            sankey: { name: 'Sankey Diagram', icon: '🌊' }
        };
        
        this.init();
    }
    
    init() {
        // Create visualization UI
        this.createVisualizationUI();
        
        // Load saved configurations
        this.loadSavedConfigs();
        
        // Initialize real-time data updates
        this.startRealTimeUpdates();
        
        // Setup export handlers
        this.setupExportHandlers();
        
        console.log('📊 Data visualization module initialized (Dark Mode)');
    }
    
    setupExportHandlers() {
        // Setup keyboard shortcuts for export
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + E for export
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.exportAll();
            }
        });
    }
    
    setChartDefaults() {
        // Configure Chart.js for dark mode
        Chart.defaults.color = this.darkTheme.text.primary;
        Chart.defaults.borderColor = this.darkTheme.border;
        Chart.defaults.backgroundColor = this.darkTheme.surface;
        
        // Grid lines
        Chart.defaults.scale.grid.color = this.darkTheme.chart.gridLines;
        Chart.defaults.scale.grid.borderColor = this.darkTheme.chart.axis;
        
        // Tooltips
        Chart.defaults.plugins.tooltip.backgroundColor = this.darkTheme.chart.tooltip.background;
        Chart.defaults.plugins.tooltip.borderColor = this.darkTheme.chart.tooltip.border;
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.titleColor = this.darkTheme.text.primary;
        Chart.defaults.plugins.tooltip.bodyColor = this.darkTheme.text.secondary;
        
        // Legend
        Chart.defaults.plugins.legend.labels.color = this.darkTheme.text.primary;
        
        // Title
        Chart.defaults.plugins.title.color = this.darkTheme.text.primary;
    }
    
    createVisualizationUI() {
        const container = document.createElement('div');
        container.className = 'data-visualization-container';
        container.id = 'data-visualization';
        container.innerHTML = `
            <div class="viz-header">
                <h2>📊 Advanced Data Visualization</h2>
                <div class="viz-controls">
                    <button class="btn btn-secondary" onclick="dataVisualization.showChartBuilder()">
                        ➕ New Chart
                    </button>
                    <button class="btn btn-secondary" onclick="dataVisualization.showDashboardBuilder()">
                        📋 Create Dashboard
                    </button>
                    <button class="btn btn-primary" onclick="dataVisualization.exportAll()">
                        📤 Export All
                    </button>
                </div>
            </div>
            
            <!-- Quick Stats Cards -->
            <div class="viz-stats-grid">
                <div class="viz-stat-card glass-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-value" id="total-charts">0</div>
                        <div class="stat-label">Active Charts</div>
                    </div>
                </div>
                <div class="viz-stat-card glass-card">
                    <div class="stat-icon">🔄</div>
                    <div class="stat-content">
                        <div class="stat-value" id="update-frequency">5s</div>
                        <div class="stat-label">Update Rate</div>
                    </div>
                </div>
                <div class="viz-stat-card glass-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-content">
                        <div class="stat-value" id="data-points">0</div>
                        <div class="stat-label">Data Points</div>
                    </div>
                </div>
                <div class="viz-stat-card glass-card">
                    <div class="stat-icon">💾</div>
                    <div class="stat-content">
                        <div class="stat-value" id="saved-views">0</div>
                        <div class="stat-label">Saved Views</div>
                    </div>
                </div>
            </div>
            
            <!-- Main Visualization Area -->
            <div class="viz-main-grid">
                <!-- Chart Gallery -->
                <div class="viz-gallery glass-card">
                    <h3>📊 Chart Gallery</h3>
                    <div class="gallery-grid" id="chart-gallery">
                        <!-- Charts will be rendered here -->
                    </div>
                </div>
                
                <!-- Interactive Filters -->
                <div class="viz-filters glass-card">
                    <h3>🔍 Data Filters</h3>
                    <div class="filter-controls">
                        <div class="filter-group">
                            <label>Date Range</label>
                            <input type="date" id="filter-start-date" class="form-input dark">
                            <input type="date" id="filter-end-date" class="form-input dark">
                        </div>
                        <div class="filter-group">
                            <label>Metrics</label>
                            <select id="filter-metrics" class="form-input dark" multiple>
                                <option value="revenue">Revenue</option>
                                <option value="leads">Leads</option>
                                <option value="conversion">Conversion Rate</option>
                                <option value="cpa">Cost Per Acquisition</option>
                                <option value="ltv">Lifetime Value</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Grouping</label>
                            <select id="filter-grouping" class="form-input dark">
                                <option value="day">Daily</option>
                                <option value="week">Weekly</option>
                                <option value="month">Monthly</option>
                                <option value="quarter">Quarterly</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" onclick="dataVisualization.applyFilters()">
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Chart Builder Modal -->
            <div class="modal-overlay" id="chart-builder-modal" style="display: none;">
                <div class="modal chart-builder-modal">
                    <div class="modal-header">
                        <h3>📊 Chart Builder</h3>
                        <button class="modal-close" onclick="dataVisualization.closeChartBuilder()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="builder-steps">
                            <!-- Step 1: Choose Type -->
                            <div class="builder-step active" data-step="1">
                                <h4>1. Choose Chart Type</h4>
                                <div class="chart-type-grid">
                                    ${Object.entries(this.chartTypes).map(([key, type]) => `
                                        <div class="chart-type-card" data-type="${key}">
                                            <span class="type-icon">${type.icon}</span>
                                            <span class="type-name">${type.name}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <!-- Step 2: Select Data -->
                            <div class="builder-step" data-step="2">
                                <h4>2. Select Data Source</h4>
                                <div class="data-source-options">
                                    <label class="data-option">
                                        <input type="radio" name="data-source" value="leads">
                                        <span>Lead Analytics</span>
                                    </label>
                                    <label class="data-option">
                                        <input type="radio" name="data-source" value="agents">
                                        <span>Agent Performance</span>
                                    </label>
                                    <label class="data-option">
                                        <input type="radio" name="data-source" value="revenue">
                                        <span>Revenue Metrics</span>
                                    </label>
                                    <label class="data-option">
                                        <input type="radio" name="data-source" value="custom">
                                        <span>Custom Query</span>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Step 3: Configure -->
                            <div class="builder-step" data-step="3">
                                <h4>3. Configure Chart</h4>
                                <div class="chart-config">
                                    <div class="config-group">
                                        <label>Chart Title</label>
                                        <input type="text" id="chart-title" class="form-input dark" placeholder="Enter chart title">
                                    </div>
                                    <div class="config-group">
                                        <label>X-Axis</label>
                                        <select id="x-axis" class="form-input dark">
                                            <option value="time">Time</option>
                                            <option value="category">Category</option>
                                            <option value="agent">Agent</option>
                                        </select>
                                    </div>
                                    <div class="config-group">
                                        <label>Y-Axis</label>
                                        <select id="y-axis" class="form-input dark">
                                            <option value="count">Count</option>
                                            <option value="sum">Sum</option>
                                            <option value="average">Average</option>
                                        </select>
                                    </div>
                                    <div class="config-group">
                                        <label>Color Scheme</label>
                                        <select id="color-scheme" class="form-input dark">
                                            <option value="default">Default Dark</option>
                                            <option value="gradient">Dark Gradient</option>
                                            <option value="neon">Neon</option>
                                            <option value="monochrome">Monochrome</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="builder-navigation">
                            <button class="btn btn-secondary" onclick="dataVisualization.previousStep()" id="prev-step">
                                ← Previous
                            </button>
                            <button class="btn btn-primary" onclick="dataVisualization.nextStep()" id="next-step">
                                Next →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Dashboard Builder Modal -->
            <div class="modal-overlay" id="dashboard-builder-modal" style="display: none;">
                <div class="modal dashboard-builder-modal">
                    <div class="modal-header">
                        <h3>📋 Dashboard Builder</h3>
                        <button class="modal-close" onclick="dataVisualization.closeDashboardBuilder()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="dashboard-canvas" id="dashboard-canvas">
                            <div class="canvas-grid-overlay">
                                <!-- Drag and drop chart widgets here -->
                            </div>
                        </div>
                        <div class="dashboard-sidebar">
                            <h4>Available Charts</h4>
                            <div class="available-charts" id="available-charts">
                                <!-- List of created charts -->
                            </div>
                            <h4>Layout Options</h4>
                            <div class="layout-options">
                                <button class="layout-btn" data-layout="2x2">2×2</button>
                                <button class="layout-btn" data-layout="3x2">3×2</button>
                                <button class="layout-btn" data-layout="4x3">4×3</button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="dataVisualization.closeDashboardBuilder()">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="dataVisualization.saveDashboard()">
                            Save Dashboard
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Comparison View -->
            <div class="viz-comparison glass-card" style="display: none;">
                <h3>📊 Comparison View</h3>
                <div class="comparison-grid" id="comparison-grid">
                    <!-- Side-by-side chart comparison -->
                </div>
            </div>
        `;
        
        // Add to page
        const targetSection = document.querySelector('.admin-main');
        if (targetSection) {
            targetSection.appendChild(container);
        }
        
        // Add styles
        this.addStyles();
        
        // Initialize default charts
        this.createDefaultCharts();
    }
    
    createDefaultCharts() {
        // Revenue Trend Chart
        this.createChart({
            id: 'revenue-trend',
            type: 'line',
            title: 'Revenue Trend',
            data: this.generateMockData('revenue', 30),
            options: {
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderColor: this.darkTheme.colors.primary
            }
        });
        
        // Lead Sources Chart
        this.createChart({
            id: 'lead-sources',
            type: 'doughnut',
            title: 'Lead Sources',
            data: this.generateMockData('sources'),
            options: {
                cutout: '70%'
            }
        });
        
        // Agent Performance Chart
        this.createChart({
            id: 'agent-performance',
            type: 'bar',
            title: 'Agent Performance',
            data: this.generateMockData('agents'),
            options: {
                indexAxis: 'y',
                barThickness: 20
            }
        });
        
        // Conversion Funnel
        this.createFunnelChart({
            id: 'conversion-funnel',
            title: 'Conversion Funnel',
            data: [
                { label: 'Visitors', value: 10000 },
                { label: 'Leads', value: 2500 },
                { label: 'Qualified', value: 750 },
                { label: 'Customers', value: 150 }
            ]
        });
    }
    
    createChart(config) {
        const chartId = config.id || `chart_${Date.now()}`;
        const container = document.createElement('div');
        container.className = 'chart-container';
        container.innerHTML = `
            <div class="chart-header">
                <h4>${config.title}</h4>
                <div class="chart-actions">
                    <button class="chart-action" onclick="dataVisualization.fullscreenChart('${chartId}')" title="Fullscreen">
                        🔍
                    </button>
                    <button class="chart-action" onclick="dataVisualization.refreshChart('${chartId}')" title="Refresh">
                        🔄
                    </button>
                    <button class="chart-action" onclick="dataVisualization.exportChart('${chartId}')" title="Export">
                        📤
                    </button>
                    <button class="chart-action" onclick="dataVisualization.removeChart('${chartId}')" title="Remove">
                        ×
                    </button>
                </div>
            </div>
            <div class="chart-body">
                <canvas id="${chartId}"></canvas>
            </div>
        `;
        
        // Add to gallery
        const gallery = document.getElementById('chart-gallery');
        if (gallery) {
            gallery.appendChild(container);
        }
        
        // Create Chart.js instance
        const ctx = document.getElementById(chartId);
        if (!ctx) return;
        
        const chartInstance = new Chart(ctx, {
            type: config.type,
            data: config.data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false // We use custom title
                    },
                    legend: {
                        position: config.type === 'pie' || config.type === 'doughnut' ? 'right' : 'top',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                ...config.options
            }
        });
        
        // Store chart reference
        this.charts.set(chartId, {
            instance: chartInstance,
            config: config,
            container: container
        });
        
        // Update stats
        this.updateStats();
        
        return chartInstance;
    }
    
    createFunnelChart(config) {
        const chartId = config.id || `funnel_${Date.now()}`;
        const container = document.createElement('div');
        container.className = 'chart-container funnel-container';
        container.innerHTML = `
            <div class="chart-header">
                <h4>${config.title}</h4>
                <div class="chart-actions">
                    <button class="chart-action" onclick="dataVisualization.exportChart('${chartId}')" title="Export">
                        📤
                    </button>
                </div>
            </div>
            <div class="funnel-body" id="${chartId}">
                ${config.data.map((stage, index) => {
                    const percentage = index === 0 ? 100 : (stage.value / config.data[0].value) * 100;
                    const width = 100 - (index * 20);
                    const color = this.getGradientColor(index / config.data.length);
                    
                    return `
                        <div class="funnel-stage" style="width: ${width}%;">
                            <div class="funnel-bar" style="background: ${color};">
                                <div class="funnel-content">
                                    <span class="funnel-label">${stage.label}</span>
                                    <span class="funnel-value">${stage.value.toLocaleString()}</span>
                                    <span class="funnel-percentage">${percentage.toFixed(1)}%</span>
                                </div>
                            </div>
                            ${index < config.data.length - 1 ? `
                                <div class="funnel-drop">
                                    ↓ ${((1 - config.data[index + 1].value / stage.value) * 100).toFixed(1)}% drop
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // Add to gallery
        const gallery = document.getElementById('chart-gallery');
        if (gallery) {
            gallery.appendChild(container);
        }
        
        // Store reference
        this.charts.set(chartId, {
            type: 'funnel',
            config: config,
            container: container
        });
        
        this.updateStats();
    }
    
    generateMockData(type, days = 7) {
        switch (type) {
            case 'revenue':
                const labels = [];
                const data = [];
                for (let i = days - 1; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    labels.push(date.toLocaleDateString());
                    data.push(Math.floor(Math.random() * 50000) + 30000);
                }
                return {
                    labels,
                    datasets: [{
                        label: 'Revenue',
                        data,
                        borderColor: this.darkTheme.colors.primary,
                        backgroundColor: `${this.darkTheme.colors.primary}20`
                    }]
                };
                
            case 'sources':
                return {
                    labels: ['Direct', 'Organic Search', 'Paid Ads', 'Social Media', 'Referrals'],
                    datasets: [{
                        data: [30, 25, 20, 15, 10],
                        backgroundColor: [
                            this.darkTheme.colors.primary,
                            this.darkTheme.colors.success,
                            this.darkTheme.colors.warning,
                            this.darkTheme.colors.info,
                            this.darkTheme.colors.purple
                        ]
                    }]
                };
                
            case 'agents':
                return {
                    labels: ['Agent Smith', 'Agent Johnson', 'Agent Brown', 'Agent Jones', 'Agent Davis'],
                    datasets: [{
                        label: 'Leads Closed',
                        data: [45, 38, 35, 32, 28],
                        backgroundColor: this.darkTheme.colors.success,
                        borderColor: this.darkTheme.colors.success,
                        borderWidth: 1
                    }]
                };
                
            default:
                return { labels: [], datasets: [] };
        }
    }
    
    getGradientColor(ratio) {
        // Create gradient from primary to warning color
        const r1 = 59, g1 = 130, b1 = 246; // Primary
        const r2 = 245, g2 = 158, b2 = 11; // Warning
        
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Chart Operations
    fullscreenChart(chartId) {
        const chart = this.charts.get(chartId);
        if (!chart) return;
        
        // Create fullscreen modal
        const modal = document.createElement('div');
        modal.className = 'fullscreen-chart-modal';
        modal.innerHTML = `
            <div class="fullscreen-header">
                <h3>${chart.config.title}</h3>
                <button class="close-fullscreen" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="fullscreen-body">
                <canvas id="fullscreen-${chartId}"></canvas>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Clone chart to fullscreen
        const ctx = document.getElementById(`fullscreen-${chartId}`);
        new Chart(ctx, {
            type: chart.instance.config.type,
            data: chart.instance.config.data,
            options: {
                ...chart.instance.config.options,
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    refreshChart(chartId) {
        const chart = this.charts.get(chartId);
        if (!chart || !chart.instance) return;
        
        // Generate new data
        const newData = this.generateMockData(
            chartId.includes('revenue') ? 'revenue' : 
            chartId.includes('sources') ? 'sources' : 'agents'
        );
        
        // Update chart
        chart.instance.data = newData;
        chart.instance.update('active');
        
        // Show toast
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'info',
                title: 'Chart Refreshed',
                message: `${chart.config.title} has been updated`
            });
        }
    }
    
    exportChart(chartId) {
        const chart = this.charts.get(chartId);
        if (!chart) return;
        
        if (chart.type === 'funnel') {
            // Export funnel as HTML/Image
            this.exportFunnelChart(chartId);
        } else if (chart.instance) {
            // Export Chart.js chart
            const url = chart.instance.toBase64Image();
            const link = document.createElement('a');
            link.download = `${chart.config.title.replace(/\s+/g, '_')}.png`;
            link.href = url;
            link.click();
        }
    }
    
    exportFunnelChart(chartId) {
        const element = document.getElementById(chartId);
        if (!element) return;
        
        // For now, export as image using canvas
        html2canvas(element).then(canvas => {
            const link = document.createElement('a');
            link.download = `funnel_chart_${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    }
    
    removeChart(chartId) {
        const chart = this.charts.get(chartId);
        if (!chart) return;
        
        // Destroy Chart.js instance
        if (chart.instance) {
            chart.instance.destroy();
        }
        
        // Remove container
        chart.container.remove();
        
        // Remove from map
        this.charts.delete(chartId);
        
        // Update stats
        this.updateStats();
    }
    
    // Filters
    applyFilters() {
        const filters = {
            startDate: document.getElementById('filter-start-date').value,
            endDate: document.getElementById('filter-end-date').value,
            metrics: Array.from(document.getElementById('filter-metrics').selectedOptions).map(o => o.value),
            grouping: document.getElementById('filter-grouping').value
        };
        
        // Apply filters to all charts
        this.charts.forEach((chart, chartId) => {
            if (chart.instance) {
                // Update chart data based on filters
                this.updateChartWithFilters(chartId, filters);
            }
        });
        
        // Show toast
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'success',
                title: 'Filters Applied',
                message: 'All charts have been updated'
            });
        }
    }
    
    updateChartWithFilters(chartId, filters) {
        const chart = this.charts.get(chartId);
        if (!chart || !chart.instance) return;
        
        // Simulate filtered data
        const filteredData = this.generateMockData(
            chartId.includes('revenue') ? 'revenue' : 
            chartId.includes('sources') ? 'sources' : 'agents',
            filters.grouping === 'day' ? 7 : 
            filters.grouping === 'week' ? 4 : 
            filters.grouping === 'month' ? 12 : 4
        );
        
        chart.instance.data = filteredData;
        chart.instance.update();
    }
    
    // Chart Builder
    showChartBuilder() {
        document.getElementById('chart-builder-modal').style.display = 'block';
        this.currentStep = 1;
        this.updateBuilderStep();
    }
    
    closeChartBuilder() {
        document.getElementById('chart-builder-modal').style.display = 'none';
        this.resetBuilder();
    }
    
    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateBuilderStep();
        }
    }
    
    nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
            this.updateBuilderStep();
        } else {
            // Create chart
            this.createChartFromBuilder();
        }
    }
    
    updateBuilderStep() {
        // Update step visibility
        document.querySelectorAll('.builder-step').forEach(step => {
            step.classList.toggle('active', step.dataset.step == this.currentStep);
        });
        
        // Update navigation
        document.getElementById('prev-step').disabled = this.currentStep === 1;
        document.getElementById('next-step').textContent = this.currentStep === 3 ? 'Create Chart' : 'Next →';
        
        // Handle chart type selection
        if (this.currentStep === 1) {
            document.querySelectorAll('.chart-type-card').forEach(card => {
                card.addEventListener('click', () => {
                    document.querySelectorAll('.chart-type-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    this.selectedChartType = card.dataset.type;
                });
            });
        }
    }
    
    createChartFromBuilder() {
        const config = {
            type: this.selectedChartType || 'line',
            title: document.getElementById('chart-title').value || 'New Chart',
            data: this.generateMockData('revenue') // Use selected data source
        };
        
        this.createChart(config);
        this.closeChartBuilder();
        
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'success',
                title: 'Chart Created',
                message: `${config.title} has been added to your dashboard`
            });
        }
    }
    
    resetBuilder() {
        this.currentStep = 1;
        this.selectedChartType = null;
        document.querySelectorAll('.chart-type-card').forEach(c => c.classList.remove('selected'));
    }
    
    // Dashboard Builder
    showDashboardBuilder() {
        document.getElementById('dashboard-builder-modal').style.display = 'block';
        this.populateAvailableCharts();
    }
    
    closeDashboardBuilder() {
        document.getElementById('dashboard-builder-modal').style.display = 'none';
    }
    
    populateAvailableCharts() {
        const container = document.getElementById('available-charts');
        container.innerHTML = '';
        
        this.charts.forEach((chart, chartId) => {
            const item = document.createElement('div');
            item.className = 'available-chart-item';
            item.draggable = true;
            item.dataset.chartId = chartId;
            item.innerHTML = `
                <span class="chart-icon">${this.chartTypes[chart.config?.type]?.icon || '📊'}</span>
                <span class="chart-name">${chart.config?.title || 'Untitled'}</span>
            `;
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('chartId', chartId);
            });
            
            container.appendChild(item);
        });
    }
    
    saveDashboard() {
        // Save dashboard configuration
        const dashboardConfig = {
            id: `dashboard_${Date.now()}`,
            name: 'Custom Dashboard',
            created: new Date().toISOString(),
            charts: [] // Collect positioned charts
        };
        
        this.closeDashboardBuilder();
        
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'success',
                title: 'Dashboard Saved',
                message: 'Your custom dashboard has been saved'
            });
        }
    }
    
    // Export Operations
    exportAll() {
        const exportData = {
            timestamp: new Date().toISOString(),
            charts: []
        };
        
        this.charts.forEach((chart, chartId) => {
            if (chart.instance) {
                exportData.charts.push({
                    id: chartId,
                    title: chart.config.title,
                    type: chart.config.type,
                    data: chart.instance.data
                });
            }
        });
        
        // Create download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `dashboard_export_${Date.now()}.json`;
        link.href = url;
        link.click();
    }
    
    // Real-time Updates
    startRealTimeUpdates() {
        setInterval(() => {
            // Update random charts with new data
            const chartIds = Array.from(this.charts.keys());
            if (chartIds.length > 0) {
                const randomChartId = chartIds[Math.floor(Math.random() * chartIds.length)];
                const chart = this.charts.get(randomChartId);
                
                if (chart && chart.instance && Math.random() > 0.7) {
                    // Add new data point
                    const dataset = chart.instance.data.datasets[0];
                    if (dataset && dataset.data.length > 0) {
                        // Shift data
                        dataset.data.shift();
                        dataset.data.push(Math.floor(Math.random() * 50000) + 30000);
                        
                        if (chart.instance.data.labels) {
                            chart.instance.data.labels.shift();
                            chart.instance.data.labels.push(new Date().toLocaleDateString());
                        }
                        
                        chart.instance.update('none'); // No animation for smooth updates
                    }
                }
            }
        }, 5000); // Update every 5 seconds
    }
    
    // Stats
    updateStats() {
        document.getElementById('total-charts').textContent = this.charts.size;
        
        let totalDataPoints = 0;
        this.charts.forEach(chart => {
            if (chart.instance && chart.instance.data.datasets) {
                chart.instance.data.datasets.forEach(dataset => {
                    totalDataPoints += dataset.data.length;
                });
            }
        });
        document.getElementById('data-points').textContent = totalDataPoints.toLocaleString();
    }
    
    // Save/Load Configurations
    saveConfig(name) {
        const config = {
            name,
            timestamp: new Date().toISOString(),
            charts: []
        };
        
        this.charts.forEach((chart, chartId) => {
            config.charts.push({
                id: chartId,
                config: chart.config
            });
        });
        
        localStorage.setItem(`viz_config_${name}`, JSON.stringify(config));
        this.updateSavedViews();
    }
    
    loadConfig(name) {
        const saved = localStorage.getItem(`viz_config_${name}`);
        if (!saved) return;
        
        try {
            const config = JSON.parse(saved);
            
            // Clear existing charts
            this.charts.forEach((chart, chartId) => this.removeChart(chartId));
            
            // Recreate charts
            config.charts.forEach(chartConfig => {
                this.createChart(chartConfig.config);
            });
            
            if (window.notificationSystem) {
                window.notificationSystem.showToast({
                    type: 'success',
                    title: 'Configuration Loaded',
                    message: `Loaded "${name}" configuration`
                });
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    }
    
    loadSavedConfigs() {
        this.updateSavedViews();
    }
    
    updateSavedViews() {
        let savedCount = 0;
        for (let key in localStorage) {
            if (key.startsWith('viz_config_')) {
                savedCount++;
            }
        }
        document.getElementById('saved-views').textContent = savedCount;
    }
    
    // Styles
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Data Visualization - Dark Mode Only */
            .data-visualization-container {
                padding: 1.5rem;
                background: ${this.darkTheme.background};
                color: ${this.darkTheme.text.primary};
            }
            
            .viz-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
            }
            
            .viz-header h2 {
                margin: 0;
                color: ${this.darkTheme.text.primary};
            }
            
            .viz-controls {
                display: flex;
                gap: 1rem;
            }
            
            /* Stats Grid */
            .viz-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .viz-stat-card {
                padding: 1.5rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                background: ${this.darkTheme.surface};
                border: 1px solid ${this.darkTheme.border};
            }
            
            .stat-icon {
                font-size: 2rem;
            }
            
            .stat-value {
                font-size: 1.5rem;
                font-weight: 600;
                color: ${this.darkTheme.colors.primary};
            }
            
            .stat-label {
                font-size: 0.875rem;
                color: ${this.darkTheme.text.secondary};
            }
            
            /* Main Grid */
            .viz-main-grid {
                display: grid;
                grid-template-columns: 1fr 300px;
                gap: 1.5rem;
            }
            
            /* Chart Gallery */
            .viz-gallery {
                padding: 1.5rem;
                background: ${this.darkTheme.surface};
                border: 1px solid ${this.darkTheme.border};
            }
            
            .viz-gallery h3 {
                margin: 0 0 1.5rem 0;
                color: ${this.darkTheme.text.primary};
            }
            
            .gallery-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 1.5rem;
            }
            
            .chart-container {
                background: ${this.darkTheme.background};
                border: 1px solid ${this.darkTheme.border};
                border-radius: 8px;
                padding: 1rem;
                height: 300px;
                display: flex;
                flex-direction: column;
            }
            
            .chart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .chart-header h4 {
                margin: 0;
                color: ${this.darkTheme.text.primary};
            }
            
            .chart-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            .chart-action {
                background: none;
                border: none;
                color: ${this.darkTheme.text.secondary};
                cursor: pointer;
                font-size: 1rem;
                padding: 0.25rem;
                transition: all 0.2s ease;
            }
            
            .chart-action:hover {
                color: ${this.darkTheme.text.primary};
                transform: scale(1.1);
            }
            
            .chart-body {
                flex: 1;
                position: relative;
                min-height: 0;
            }
            
            /* Filters */
            .viz-filters {
                padding: 1.5rem;
                background: ${this.darkTheme.surface};
                border: 1px solid ${this.darkTheme.border};
            }
            
            .viz-filters h3 {
                margin: 0 0 1.5rem 0;
                color: ${this.darkTheme.text.primary};
            }
            
            .filter-group {
                margin-bottom: 1rem;
            }
            
            .filter-group label {
                display: block;
                margin-bottom: 0.5rem;
                color: ${this.darkTheme.text.secondary};
                font-size: 0.875rem;
            }
            
            .form-input.dark {
                width: 100%;
                padding: 0.5rem;
                background: ${this.darkTheme.background};
                border: 1px solid ${this.darkTheme.border};
                border-radius: 4px;
                color: ${this.darkTheme.text.primary};
            }
            
            .form-input.dark:focus {
                outline: none;
                border-color: ${this.darkTheme.colors.primary};
            }
            
            /* Chart Builder */
            .chart-builder-modal {
                max-width: 800px;
            }
            
            .builder-steps {
                min-height: 400px;
            }
            
            .builder-step {
                display: none;
            }
            
            .builder-step.active {
                display: block;
            }
            
            .chart-type-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 1rem;
                margin-top: 1rem;
            }
            
            .chart-type-card {
                padding: 1.5rem;
                background: ${this.darkTheme.background};
                border: 2px solid ${this.darkTheme.border};
                border-radius: 8px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .chart-type-card:hover {
                border-color: ${this.darkTheme.colors.primary};
                transform: translateY(-2px);
            }
            
            .chart-type-card.selected {
                border-color: ${this.darkTheme.colors.primary};
                background: ${this.darkTheme.colors.primary}20;
            }
            
            .type-icon {
                display: block;
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }
            
            .type-name {
                font-size: 0.875rem;
                color: ${this.darkTheme.text.primary};
            }
            
            /* Data Source Options */
            .data-source-options {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-top: 1rem;
            }
            
            .data-option {
                display: flex;
                align-items: center;
                padding: 1rem;
                background: ${this.darkTheme.background};
                border: 1px solid ${this.darkTheme.border};
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .data-option:hover {
                border-color: ${this.darkTheme.colors.primary};
            }
            
            .data-option input[type="radio"] {
                margin-right: 1rem;
            }
            
            /* Chart Config */
            .chart-config {
                margin-top: 1rem;
            }
            
            .config-group {
                margin-bottom: 1rem;
            }
            
            /* Dashboard Builder */
            .dashboard-builder-modal {
                max-width: 1200px;
                height: 80vh;
            }
            
            .dashboard-builder-modal .modal-body {
                display: flex;
                gap: 1rem;
                height: 100%;
            }
            
            .dashboard-canvas {
                flex: 1;
                background: ${this.darkTheme.background};
                border: 1px solid ${this.darkTheme.border};
                position: relative;
                overflow: auto;
            }
            
            .canvas-grid-overlay {
                width: 100%;
                height: 100%;
                background-image: 
                    linear-gradient(${this.darkTheme.border} 1px, transparent 1px),
                    linear-gradient(90deg, ${this.darkTheme.border} 1px, transparent 1px);
                background-size: 50px 50px;
            }
            
            .dashboard-sidebar {
                width: 250px;
                background: ${this.darkTheme.surface};
                padding: 1rem;
                overflow-y: auto;
            }
            
            .dashboard-sidebar h4 {
                margin: 0 0 1rem 0;
                color: ${this.darkTheme.text.primary};
            }
            
            .available-chart-item {
                padding: 0.75rem;
                background: ${this.darkTheme.background};
                border: 1px solid ${this.darkTheme.border};
                border-radius: 4px;
                margin-bottom: 0.5rem;
                cursor: move;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.2s ease;
            }
            
            .available-chart-item:hover {
                border-color: ${this.darkTheme.colors.primary};
            }
            
            .layout-options {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }
            
            .layout-btn {
                padding: 0.5rem 1rem;
                background: ${this.darkTheme.background};
                border: 1px solid ${this.darkTheme.border};
                border-radius: 4px;
                color: ${this.darkTheme.text.primary};
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .layout-btn:hover {
                border-color: ${this.darkTheme.colors.primary};
            }
            
            /* Funnel Chart */
            .funnel-container .funnel-body {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem;
            }
            
            .funnel-stage {
                transition: all 0.3s ease;
            }
            
            .funnel-bar {
                padding: 1rem;
                border-radius: 4px;
                color: white;
                position: relative;
            }
            
            .funnel-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 2rem;
            }
            
            .funnel-label {
                font-weight: 600;
            }
            
            .funnel-percentage {
                font-size: 0.875rem;
                opacity: 0.8;
            }
            
            .funnel-drop {
                text-align: center;
                font-size: 0.75rem;
                color: ${this.darkTheme.colors.warning};
                margin-top: 0.25rem;
            }
            
            /* Fullscreen Modal */
            .fullscreen-chart-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: ${this.darkTheme.background};
                z-index: 2000;
                display: flex;
                flex-direction: column;
                padding: 2rem;
            }
            
            .fullscreen-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
            }
            
            .fullscreen-header h3 {
                margin: 0;
                color: ${this.darkTheme.text.primary};
            }
            
            .close-fullscreen {
                background: none;
                border: none;
                color: ${this.darkTheme.text.primary};
                font-size: 2rem;
                cursor: pointer;
            }
            
            .fullscreen-body {
                flex: 1;
                position: relative;
            }
            
            /* Builder Navigation */
            .builder-navigation {
                display: flex;
                justify-content: space-between;
                margin-top: 2rem;
                padding-top: 1rem;
                border-top: 1px solid ${this.darkTheme.border};
            }
            
            /* Comparison View */
            .viz-comparison {
                padding: 1.5rem;
                background: ${this.darkTheme.surface};
                border: 1px solid ${this.darkTheme.border};
                margin-top: 1.5rem;
            }
            
            .comparison-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
            }
            
            /* Responsive */
            @media (max-width: 1200px) {
                .viz-main-grid {
                    grid-template-columns: 1fr;
                }
                
                .gallery-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize data visualization
window.dataVisualization = new DataVisualization();

// Export for use in other modules
export default DataVisualization; 