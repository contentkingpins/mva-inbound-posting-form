/**
 * Unified Widget System
 * A powerful widget framework for all MVA dashboards
 */

class UnifiedWidgetSystem {
    constructor() {
        this.widgets = new Map();
        this.layouts = new Map();
        this.activeLayout = null;
        this.isDragging = false;
        this.isResizing = false;
        this.currentWidget = null;
        this.gridSize = 20; // Grid snap size
        this.widgetDefaults = {
            minWidth: 200,
            minHeight: 200,
            maxWidth: 800,
            maxHeight: 600
        };
        
        this.init();
    }

    init() {
        this.createWidgetContainer();
        this.loadLayouts();
        this.registerEventListeners();
        this.initializeWidgetLibrary();
    }

    createWidgetContainer() {
        // Create main widget container if it doesn't exist
        if (!document.getElementById('widget-container')) {
            const container = document.createElement('div');
            container.id = 'widget-container';
            container.className = 'widget-container';
            document.body.appendChild(container);
        }
    }

    // Widget Library with pre-built widgets
    initializeWidgetLibrary() {
        this.widgetLibrary = {
            'stats-overview': {
                name: 'Statistics Overview',
                icon: '📊',
                category: 'analytics',
                defaultSize: { width: 400, height: 300 },
                component: StatsOverviewWidget
            },
            'real-time-metrics': {
                name: 'Real-Time Metrics',
                icon: '📈',
                category: 'monitoring',
                defaultSize: { width: 350, height: 250 },
                component: RealTimeMetricsWidget
            },
            'quick-actions': {
                name: 'Quick Actions',
                icon: '⚡',
                category: 'productivity',
                defaultSize: { width: 300, height: 400 },
                component: QuickActionsWidget
            },
            'lead-funnel': {
                name: 'Lead Funnel',
                icon: '🔔',
                category: 'sales',
                defaultSize: { width: 450, height: 350 },
                component: LeadFunnelWidget
            },
            'performance-gauge': {
                name: 'Performance Gauge',
                icon: '🎯',
                category: 'performance',
                defaultSize: { width: 300, height: 300 },
                component: PerformanceGaugeWidget
            },
            'activity-feed': {
                name: 'Activity Feed',
                icon: '📰',
                category: 'communication',
                defaultSize: { width: 350, height: 500 },
                component: ActivityFeedWidget
            },
            'calendar-view': {
                name: 'Calendar View',
                icon: '📅',
                category: 'scheduling',
                defaultSize: { width: 400, height: 400 },
                component: CalendarViewWidget
            },
            'revenue-tracker': {
                name: 'Revenue Tracker',
                icon: '💰',
                category: 'finance',
                defaultSize: { width: 400, height: 300 },
                component: RevenueTrackerWidget
            }
        };
    }

    // Create a new widget instance
    createWidget(type, options = {}) {
        const widgetDef = this.widgetLibrary[type];
        if (!widgetDef) {
            console.error(`Widget type "${type}" not found`);
            return null;
        }

        const id = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const widget = {
            id,
            type,
            position: options.position || { x: 100, y: 100 },
            size: options.size || widgetDef.defaultSize,
            title: options.title || widgetDef.name,
            data: options.data || {},
            settings: options.settings || {},
            component: new widgetDef.component(id, options)
        };

        this.widgets.set(id, widget);
        this.renderWidget(widget);
        this.saveLayout();
        
        return widget;
    }

    // Render widget to DOM
    renderWidget(widget) {
        const container = document.getElementById('widget-container');
        
        const widgetEl = document.createElement('div');
        widgetEl.id = widget.id;
        widgetEl.className = 'widget glass-card';
        widgetEl.style.cssText = `
            left: ${widget.position.x}px;
            top: ${widget.position.y}px;
            width: ${widget.size.width}px;
            height: ${widget.size.height}px;
        `;

        // Widget header
        const header = document.createElement('div');
        header.className = 'widget-header';
        header.innerHTML = `
            <div class="widget-title">
                <span class="widget-icon">${this.widgetLibrary[widget.type].icon}</span>
                <span>${widget.title}</span>
            </div>
            <div class="widget-controls">
                <button class="widget-btn" data-action="settings" title="Settings">
                    <i class="fas fa-cog"></i>
                </button>
                <button class="widget-btn" data-action="minimize" title="Minimize">
                    <i class="fas fa-minus"></i>
                </button>
                <button class="widget-btn" data-action="maximize" title="Maximize">
                    <i class="fas fa-expand"></i>
                </button>
                <button class="widget-btn" data-action="close" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Widget content
        const content = document.createElement('div');
        content.className = 'widget-content';
        
        // Resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'widget-resize-handle';
        
        widgetEl.appendChild(header);
        widgetEl.appendChild(content);
        widgetEl.appendChild(resizeHandle);
        
        container.appendChild(widgetEl);

        // Initialize widget component
        widget.component.render(content);

        // Attach event listeners
        this.attachWidgetEvents(widgetEl, widget);
    }

    // Attach drag and resize events
    attachWidgetEvents(element, widget) {
        const header = element.querySelector('.widget-header');
        const resizeHandle = element.querySelector('.widget-resize-handle');
        const controls = element.querySelectorAll('.widget-btn');

        // Drag events
        header.addEventListener('mousedown', (e) => this.startDrag(e, widget));
        
        // Resize events
        resizeHandle.addEventListener('mousedown', (e) => this.startResize(e, widget));
        
        // Control buttons
        controls.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleWidgetAction(widget, action);
            });
        });
    }

    // Drag functionality
    startDrag(e, widget) {
        if (e.target.closest('.widget-controls')) return;
        
        this.isDragging = true;
        this.currentWidget = widget;
        
        const element = document.getElementById(widget.id);
        element.classList.add('dragging');
        
        const rect = element.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        document.addEventListener('mousemove', this.handleDrag);
        document.addEventListener('mouseup', this.endDrag);
        
        e.preventDefault();
    }

    handleDrag = (e) => {
        if (!this.isDragging || !this.currentWidget) return;
        
        const container = document.getElementById('widget-container');
        const containerRect = container.getBoundingClientRect();
        
        let x = e.clientX - containerRect.left - this.dragOffset.x;
        let y = e.clientY - containerRect.top - this.dragOffset.y;
        
        // Snap to grid
        x = Math.round(x / this.gridSize) * this.gridSize;
        y = Math.round(y / this.gridSize) * this.gridSize;
        
        // Boundaries
        x = Math.max(0, Math.min(x, containerRect.width - this.currentWidget.size.width));
        y = Math.max(0, Math.min(y, containerRect.height - this.currentWidget.size.height));
        
        const element = document.getElementById(this.currentWidget.id);
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        
        this.currentWidget.position = { x, y };
    }

    endDrag = () => {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        const element = document.getElementById(this.currentWidget.id);
        element.classList.remove('dragging');
        
        this.saveLayout();
        this.currentWidget = null;
        
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.endDrag);
    }

    // Resize functionality
    startResize(e, widget) {
        this.isResizing = true;
        this.currentWidget = widget;
        
        const element = document.getElementById(widget.id);
        element.classList.add('resizing');
        
        this.resizeStart = {
            x: e.clientX,
            y: e.clientY,
            width: widget.size.width,
            height: widget.size.height
        };

        document.addEventListener('mousemove', this.handleResize);
        document.addEventListener('mouseup', this.endResize);
        
        e.preventDefault();
        e.stopPropagation();
    }

    handleResize = (e) => {
        if (!this.isResizing || !this.currentWidget) return;
        
        const deltaX = e.clientX - this.resizeStart.x;
        const deltaY = e.clientY - this.resizeStart.y;
        
        let width = this.resizeStart.width + deltaX;
        let height = this.resizeStart.height + deltaY;
        
        // Snap to grid
        width = Math.round(width / this.gridSize) * this.gridSize;
        height = Math.round(height / this.gridSize) * this.gridSize;
        
        // Apply constraints
        width = Math.max(this.widgetDefaults.minWidth, 
                Math.min(width, this.widgetDefaults.maxWidth));
        height = Math.max(this.widgetDefaults.minHeight, 
                 Math.min(height, this.widgetDefaults.maxHeight));
        
        const element = document.getElementById(this.currentWidget.id);
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        
        this.currentWidget.size = { width, height };
        this.currentWidget.component.onResize(width, height);
    }

    endResize = () => {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        const element = document.getElementById(this.currentWidget.id);
        element.classList.remove('resizing');
        
        this.saveLayout();
        this.currentWidget = null;
        
        document.removeEventListener('mousemove', this.handleResize);
        document.removeEventListener('mouseup', this.endResize);
    }

    // Widget actions
    handleWidgetAction(widget, action) {
        const element = document.getElementById(widget.id);
        
        switch (action) {
            case 'close':
                this.removeWidget(widget.id);
                break;
                
            case 'minimize':
                element.classList.toggle('minimized');
                break;
                
            case 'maximize':
                element.classList.toggle('maximized');
                if (element.classList.contains('maximized')) {
                    element.style.width = '100%';
                    element.style.height = '100%';
                    element.style.left = '0';
                    element.style.top = '0';
                } else {
                    element.style.width = `${widget.size.width}px`;
                    element.style.height = `${widget.size.height}px`;
                    element.style.left = `${widget.position.x}px`;
                    element.style.top = `${widget.position.y}px`;
                }
                break;
                
            case 'settings':
                this.openWidgetSettings(widget);
                break;
        }
    }

    // Remove widget
    removeWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (!widget) return;
        
        const element = document.getElementById(widgetId);
        if (element) {
            element.classList.add('removing');
            setTimeout(() => {
                element.remove();
                widget.component.destroy();
                this.widgets.delete(widgetId);
                this.saveLayout();
            }, 300);
        }
    }

    // Widget settings modal
    openWidgetSettings(widget) {
        // Create settings modal
        const modal = document.createElement('div');
        modal.className = 'widget-settings-modal modal-overlay active';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Widget Settings: ${widget.title}</h3>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Widget Title</label>
                        <input type="text" class="form-input" id="widget-title" value="${widget.title}">
                    </div>
                    <div class="form-group">
                        <label>Refresh Interval (seconds)</label>
                        <input type="number" class="form-input" id="refresh-interval" 
                               value="${widget.settings.refreshInterval || 30}" min="5" max="300">
                    </div>
                    ${widget.component.getSettingsHTML ? widget.component.getSettingsHTML() : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="widgetSystem.saveWidgetSettings('${widget.id}')">
                        Save Settings
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Save widget settings
    saveWidgetSettings(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (!widget) return;
        
        const title = document.getElementById('widget-title').value;
        const refreshInterval = parseInt(document.getElementById('refresh-interval').value);
        
        widget.title = title;
        widget.settings.refreshInterval = refreshInterval;
        
        // Update widget header
        const element = document.getElementById(widgetId);
        element.querySelector('.widget-title span:last-child').textContent = title;
        
        // Let widget handle its own settings
        if (widget.component.saveSettings) {
            widget.component.saveSettings();
        }
        
        this.saveLayout();
        document.querySelector('.widget-settings-modal').remove();
    }

    // Layout management
    saveLayout() {
        const layoutData = {
            name: this.activeLayout || 'default',
            widgets: Array.from(this.widgets.values()).map(w => ({
                type: w.type,
                position: w.position,
                size: w.size,
                title: w.title,
                settings: w.settings,
                data: w.data
            }))
        };
        
        localStorage.setItem(`widget-layout-${layoutData.name}`, JSON.stringify(layoutData));
    }

    loadLayouts() {
        // Load saved layouts
        const keys = Object.keys(localStorage).filter(k => k.startsWith('widget-layout-'));
        keys.forEach(key => {
            const layout = JSON.parse(localStorage.getItem(key));
            this.layouts.set(layout.name, layout);
        });
        
        // Load default layout
        const defaultLayout = this.layouts.get('default');
        if (defaultLayout) {
            this.loadLayout('default');
        }
    }

    loadLayout(name) {
        const layout = this.layouts.get(name);
        if (!layout) return;
        
        // Clear existing widgets
        this.widgets.forEach(widget => {
            const element = document.getElementById(widget.id);
            if (element) element.remove();
        });
        this.widgets.clear();
        
        // Create widgets from layout
        layout.widgets.forEach(widgetData => {
            this.createWidget(widgetData.type, widgetData);
        });
        
        this.activeLayout = name;
    }

    // Global event listeners
    registerEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'w':
                        e.preventDefault();
                        this.openWidgetLibrary();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveLayout();
                        break;
                }
            }
        });
    }

    // Widget library modal
    openWidgetLibrary() {
        const modal = document.createElement('div');
        modal.className = 'widget-library-modal modal-overlay active';
        
        const categories = [...new Set(Object.values(this.widgetLibrary).map(w => w.category))];
        
        modal.innerHTML = `
            <div class="modal widget-library">
                <div class="modal-header">
                    <h3>Widget Library</h3>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="widget-categories">
                        ${categories.map(cat => `
                            <button class="widget-category-btn" data-category="${cat}">
                                ${cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        `).join('')}
                    </div>
                    <div class="widget-grid">
                        ${Object.entries(this.widgetLibrary).map(([type, widget]) => `
                            <div class="widget-card" data-type="${type}" data-category="${widget.category}">
                                <div class="widget-card-icon">${widget.icon}</div>
                                <div class="widget-card-name">${widget.name}</div>
                                <button class="btn btn-primary btn-sm" 
                                        onclick="widgetSystem.createWidget('${type}'); 
                                                 this.closest('.modal-overlay').remove()">
                                    Add Widget
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Category filter
        modal.querySelectorAll('.widget-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                modal.querySelectorAll('.widget-card').forEach(card => {
                    card.style.display = card.dataset.category === category ? 'block' : 'none';
                });
            });
        });
    }
}

// Base Widget Class
class BaseWidget {
    constructor(id, options = {}) {
        this.id = id;
        this.options = options;
        this.data = options.data || {};
        this.settings = options.settings || {};
        this.refreshTimer = null;
    }

    render(container) {
        this.container = container;
        this.update();
        this.startAutoRefresh();
    }

    update() {
        // Override in subclasses
    }

    onResize(width, height) {
        // Handle resize
        if (this.chart) {
            this.chart.resize();
        }
    }

    startAutoRefresh() {
        if (this.settings.refreshInterval) {
            this.refreshTimer = setInterval(() => {
                this.update();
            }, this.settings.refreshInterval * 1000);
        }
    }

    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        if (this.chart) {
            this.chart.destroy();
        }
    }

    getSettingsHTML() {
        return '';
    }

    saveSettings() {
        // Override in subclasses
    }
}

// Example Widget: Stats Overview
class StatsOverviewWidget extends BaseWidget {
    update() {
        this.container.innerHTML = `
            <div class="stats-widget">
                <div class="stat-item">
                    <div class="stat-value">1,234</div>
                    <div class="stat-label">Total Leads</div>
                    <div class="stat-change positive">+12.5%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">$45.6K</div>
                    <div class="stat-label">Revenue</div>
                    <div class="stat-change positive">+8.3%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">89%</div>
                    <div class="stat-label">Conversion</div>
                    <div class="stat-change negative">-2.1%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">4.8</div>
                    <div class="stat-label">Rating</div>
                    <div class="stat-change positive">+0.3</div>
                </div>
            </div>
        `;
    }
}

// Example Widget: Real-Time Metrics
class RealTimeMetricsWidget extends BaseWidget {
    constructor(id, options) {
        super(id, options);
        this.chartData = [];
        this.maxDataPoints = 20;
    }

    update() {
        // Add new data point
        this.chartData.push({
            time: new Date(),
            value: Math.floor(Math.random() * 100) + 50
        });

        // Keep only recent data
        if (this.chartData.length > this.maxDataPoints) {
            this.chartData.shift();
        }

        this.renderChart();
    }

    renderChart() {
        if (!this.chart) {
            this.container.innerHTML = '<canvas id="' + this.id + '-chart"></canvas>';
            const ctx = this.container.querySelector('canvas').getContext('2d');
            
            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Real-Time Metric',
                        data: [],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { 
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: '#94a3b8' }
                        }
                    }
                }
            });
        }

        // Update chart data
        this.chart.data.labels = this.chartData.map(d => d.time.toLocaleTimeString());
        this.chart.data.datasets[0].data = this.chartData.map(d => d.value);
        this.chart.update('none');
    }
}

// Example Widget: Quick Actions
class QuickActionsWidget extends BaseWidget {
    update() {
        this.container.innerHTML = `
            <div class="quick-actions">
                <button class="quick-action-btn">
                    <i class="fas fa-plus-circle"></i>
                    <span>New Lead</span>
                </button>
                <button class="quick-action-btn">
                    <i class="fas fa-phone"></i>
                    <span>Make Call</span>
                </button>
                <button class="quick-action-btn">
                    <i class="fas fa-envelope"></i>
                    <span>Send Email</span>
                </button>
                <button class="quick-action-btn">
                    <i class="fas fa-calendar-plus"></i>
                    <span>Schedule Meeting</span>
                </button>
                <button class="quick-action-btn">
                    <i class="fas fa-file-export"></i>
                    <span>Export Data</span>
                </button>
                <button class="quick-action-btn">
                    <i class="fas fa-chart-line"></i>
                    <span>View Reports</span>
                </button>
            </div>
        `;

        // Add click handlers
        this.container.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.querySelector('span').textContent;
                console.log('Quick action:', action);
                // Handle action
            });
        });
    }
}

// Placeholder for other widgets
class LeadFunnelWidget extends BaseWidget {
    update() {
        this.container.innerHTML = `
            <div class="lead-funnel-widget">
                <div class="funnel-stage" style="width: 100%">
                    <div class="funnel-bar" style="background: #3b82f6;">
                        <span>New Leads</span>
                        <span>245</span>
                    </div>
                </div>
                <div class="funnel-stage" style="width: 80%">
                    <div class="funnel-bar" style="background: #60a5fa;">
                        <span>Contacted</span>
                        <span>196</span>
                    </div>
                </div>
                <div class="funnel-stage" style="width: 60%">
                    <div class="funnel-bar" style="background: #93c5fd;">
                        <span>Qualified</span>
                        <span>147</span>
                    </div>
                </div>
                <div class="funnel-stage" style="width: 40%">
                    <div class="funnel-bar" style="background: #dbeafe;">
                        <span>Converted</span>
                        <span>98</span>
                    </div>
                </div>
            </div>
        `;
    }
}

class PerformanceGaugeWidget extends BaseWidget {
    update() {
        const performance = Math.floor(Math.random() * 100);
        const angle = (performance / 100) * 180 - 90;
        
        this.container.innerHTML = `
            <div class="performance-gauge">
                <div class="gauge-container">
                    <div class="gauge-background"></div>
                    <div class="gauge-fill" style="transform: rotate(${angle}deg);"></div>
                    <div class="gauge-center">
                        <div class="gauge-value">${performance}%</div>
                        <div class="gauge-label">Performance</div>
                    </div>
                </div>
                <div class="gauge-legend">
                    <div class="legend-item">
                        <span class="legend-color" style="background: #22c55e;"></span>
                        <span>Excellent (90-100)</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #eab308;"></span>
                        <span>Good (70-89)</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #ef4444;"></span>
                        <span>Needs Improvement</span>
                    </div>
                </div>
            </div>
        `;
    }
}

class ActivityFeedWidget extends BaseWidget {
    update() {
        const activities = [
            { icon: '📞', text: 'Call with John Doe', time: '2 min ago', type: 'call' },
            { icon: '✉️', text: 'Email sent to Jane Smith', time: '15 min ago', type: 'email' },
            { icon: '🤝', text: 'Meeting scheduled', time: '1 hour ago', type: 'meeting' },
            { icon: '✅', text: 'Lead converted', time: '2 hours ago', type: 'conversion' },
            { icon: '📝', text: 'Note added to lead', time: '3 hours ago', type: 'note' }
        ];

        this.container.innerHTML = `
            <div class="activity-feed">
                ${activities.map(activity => `
                    <div class="activity-item ${activity.type}">
                        <div class="activity-icon">${activity.icon}</div>
                        <div class="activity-content">
                            <div class="activity-text">${activity.text}</div>
                            <div class="activity-time">${activity.time}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

class CalendarViewWidget extends BaseWidget {
    update() {
        const today = new Date();
        const events = [
            { time: '09:00', title: 'Team Meeting', type: 'meeting' },
            { time: '11:00', title: 'Client Call', type: 'call' },
            { time: '14:00', title: 'Product Demo', type: 'demo' },
            { time: '16:00', title: 'Follow-up Email', type: 'task' }
        ];

        this.container.innerHTML = `
            <div class="calendar-widget">
                <div class="calendar-header">
                    <h4>${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                </div>
                <div class="calendar-events">
                    ${events.map(event => `
                        <div class="calendar-event ${event.type}">
                            <div class="event-time">${event.time}</div>
                            <div class="event-title">${event.title}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

class RevenueTrackerWidget extends BaseWidget {
    update() {
        this.container.innerHTML = `
            <div class="revenue-tracker">
                <div class="revenue-summary">
                    <div class="revenue-current">
                        <div class="revenue-label">Current Month</div>
                        <div class="revenue-value">$125,430</div>
                        <div class="revenue-change positive">+18.5% vs last month</div>
                    </div>
                    <div class="revenue-chart-mini">
                        <canvas id="${this.id}-revenue-chart"></canvas>
                    </div>
                </div>
                <div class="revenue-breakdown">
                    <div class="breakdown-item">
                        <span class="breakdown-label">New Clients</span>
                        <span class="breakdown-value">$45,200</span>
                    </div>
                    <div class="breakdown-item">
                        <span class="breakdown-label">Existing Clients</span>
                        <span class="breakdown-value">$80,230</span>
                    </div>
                </div>
            </div>
        `;

        // Mini chart
        const ctx = this.container.querySelector('canvas').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['W1', 'W2', 'W3', 'W4'],
                datasets: [{
                    data: [28000, 32000, 30000, 35430],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }
}

// Initialize widget system
let widgetSystem;
document.addEventListener('DOMContentLoaded', () => {
    widgetSystem = new UnifiedWidgetSystem();
    
    // Expose to global scope for debugging
    window.widgetSystem = widgetSystem;
}); 