/**
 * Dashboard Widget System
 * Customizable, draggable widgets with persistent layouts
 */

class DashboardWidgets {
    constructor() {
        this.widgets = new Map();
        this.layouts = {};
        this.currentLayout = 'default';
        this.draggedWidget = null;
        this.gridSize = 20; // Grid snap size
        
        // Available widget types
        this.widgetTypes = {
            revenue: {
                title: 'Revenue Overview',
                icon: '💰',
                defaultSize: { width: 400, height: 300 },
                minSize: { width: 300, height: 200 },
                refreshInterval: 60000 // 1 minute
            },
            leadFunnel: {
                title: 'Lead Funnel',
                icon: '🎯',
                defaultSize: { width: 400, height: 350 },
                minSize: { width: 300, height: 250 },
                refreshInterval: 30000
            },
            agentPerformance: {
                title: 'Agent Performance',
                icon: '👥',
                defaultSize: { width: 500, height: 400 },
                minSize: { width: 400, height: 300 },
                refreshInterval: 60000
            },
            activityFeed: {
                title: 'Activity Feed',
                icon: '📊',
                defaultSize: { width: 350, height: 500 },
                minSize: { width: 300, height: 400 },
                refreshInterval: 15000
            },
            leadStats: {
                title: 'Lead Statistics',
                icon: '📈',
                defaultSize: { width: 300, height: 250 },
                minSize: { width: 250, height: 200 },
                refreshInterval: 30000
            },
            conversionRate: {
                title: 'Conversion Metrics',
                icon: '🔄',
                defaultSize: { width: 350, height: 300 },
                minSize: { width: 300, height: 250 },
                refreshInterval: 60000
            }
        };
        
        this.init();
    }
    
    init() {
        this.createWidgetContainer();
        this.loadLayouts();
        this.setupEventListeners();
        this.addStyles();
        console.log('📊 Dashboard Widgets initialized');
    }
    
    createWidgetContainer() {
        // Create main container
        const container = document.createElement('div');
        container.id = 'dashboard-widgets-container';
        container.className = 'widgets-container';
        
        // Create widget controls
        const controls = document.createElement('div');
        controls.className = 'widget-controls';
        controls.innerHTML = `
            <div class="controls-left">
                <button class="btn btn-primary" id="add-widget-btn">
                    <span>➕</span> Add Widget
                </button>
                <select id="layout-selector" class="layout-selector">
                    <option value="default">Default Layout</option>
                    <option value="compact">Compact Layout</option>
                    <option value="analytics">Analytics Focus</option>
                    <option value="custom">Custom Layout</option>
                </select>
            </div>
            <div class="controls-right">
                <button class="btn btn-secondary" id="save-layout-btn">
                    <span>💾</span> Save Layout
                </button>
                <button class="btn btn-secondary" id="reset-layout-btn">
                    <span>🔄</span> Reset Layout
                </button>
                <button class="btn btn-secondary" id="toggle-edit-mode">
                    <span>✏️</span> Edit Mode
                </button>
            </div>
        `;
        
        // Create widget grid
        const grid = document.createElement('div');
        grid.id = 'widget-grid';
        grid.className = 'widget-grid';
        
        // Add to page
        const targetElement = document.querySelector('.admin-main') || document.body;
        targetElement.insertBefore(controls, targetElement.firstChild);
        targetElement.insertBefore(container, controls.nextSibling);
        container.appendChild(grid);
        
        this.container = container;
        this.grid = grid;
        
        // Create add widget modal
        this.createAddWidgetModal();
        
        // Create widget settings modal
        this.createWidgetSettingsModal();
    }
    
    createAddWidgetModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay widget-modal';
        modal.id = 'add-widget-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal glass-modal">
                <div class="modal-header">
                    <h3>Add Widget to Dashboard</h3>
                    <button class="modal-close" onclick="dashboardWidgets.closeAddModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="widget-gallery">
                        ${Object.entries(this.widgetTypes).map(([type, config]) => `
                            <div class="widget-preview" data-widget-type="${type}">
                                <div class="preview-icon">${config.icon}</div>
                                <div class="preview-title">${config.title}</div>
                                <div class="preview-size">Size: ${config.defaultSize.width}x${config.defaultSize.height}</div>
                                <button class="btn btn-primary btn-sm" onclick="dashboardWidgets.addWidget('${type}')">
                                    Add to Dashboard
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    createWidgetSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay widget-settings-modal';
        modal.id = 'widget-settings-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal glass-modal">
                <div class="modal-header">
                    <h3>Widget Settings</h3>
                    <button class="modal-close" onclick="dashboardWidgets.closeSettingsModal()">&times;</button>
                </div>
                <div class="modal-body" id="widget-settings-content">
                    <!-- Settings content will be populated dynamically -->
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="dashboardWidgets.closeSettingsModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="dashboardWidgets.saveWidgetSettings()">Save Settings</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .widget-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                background: var(--bg-secondary, #1e293b);
                border-radius: 12px;
                margin-bottom: 20px;
            }
            
            .controls-left,
            .controls-right {
                display: flex;
                gap: 15px;
                align-items: center;
            }
            
            .layout-selector {
                padding: 8px 15px;
                background: var(--bg-primary, #0f172a);
                border: 1px solid var(--border-color, #334155);
                border-radius: 6px;
                color: var(--text-primary, #f1f5f9);
            }
            
            .widgets-container {
                position: relative;
                min-height: 600px;
                margin-bottom: 40px;
            }
            
            .widget-grid {
                position: relative;
                width: 100%;
                min-height: 600px;
                background-image: 
                    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
                background-size: 20px 20px;
                border-radius: 12px;
            }
            
            .widget-grid.edit-mode {
                background-image: 
                    linear-gradient(rgba(66, 153, 225, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(66, 153, 225, 0.1) 1px, transparent 1px);
            }
            
            /* Widget Styles */
            .dashboard-widget {
                position: absolute;
                background: var(--bg-secondary, #1e293b);
                border: 1px solid var(--border-color, #334155);
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                transition: box-shadow 0.2s ease;
                overflow: hidden;
            }
            
            .dashboard-widget:hover {
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            }
            
            .dashboard-widget.dragging {
                opacity: 0.8;
                z-index: 1000;
                cursor: grabbing;
            }
            
            .widget-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                background: var(--bg-primary, #0f172a);
                border-bottom: 1px solid var(--border-color, #334155);
                cursor: grab;
            }
            
            .widget-header.dragging {
                cursor: grabbing;
            }
            
            .widget-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                color: var(--text-primary, #f1f5f9);
            }
            
            .widget-icon {
                font-size: 20px;
            }
            
            .widget-actions {
                display: flex;
                gap: 8px;
            }
            
            .widget-action {
                background: none;
                border: none;
                color: var(--text-secondary, #94a3b8);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .widget-action:hover {
                background: var(--bg-secondary, #1e293b);
                color: var(--text-primary, #f1f5f9);
            }
            
            .widget-body {
                padding: 20px;
                height: calc(100% - 60px);
                overflow: auto;
            }
            
            /* Resize Handle */
            .resize-handle {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 20px;
                height: 20px;
                cursor: nwse-resize;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .dashboard-widget:hover .resize-handle,
            .widget-grid.edit-mode .resize-handle {
                opacity: 1;
            }
            
            .resize-handle::before {
                content: '';
                position: absolute;
                bottom: 3px;
                right: 3px;
                width: 10px;
                height: 10px;
                border-right: 2px solid var(--primary, #4299e1);
                border-bottom: 2px solid var(--primary, #4299e1);
            }
            
            /* Widget Gallery */
            .widget-gallery {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 20px;
                padding: 20px;
            }
            
            .widget-preview {
                background: var(--bg-primary, #0f172a);
                border: 2px solid var(--border-color, #334155);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                transition: all 0.2s ease;
            }
            
            .widget-preview:hover {
                border-color: var(--primary, #4299e1);
                transform: translateY(-2px);
            }
            
            .preview-icon {
                font-size: 48px;
                margin-bottom: 10px;
            }
            
            .preview-title {
                font-weight: 600;
                color: var(--text-primary, #f1f5f9);
                margin-bottom: 5px;
            }
            
            .preview-size {
                font-size: 12px;
                color: var(--text-secondary, #94a3b8);
                margin-bottom: 15px;
            }
            
            /* Widget Content Styles */
            .widget-chart {
                width: 100%;
                height: 100%;
                min-height: 200px;
            }
            
            .widget-stat {
                text-align: center;
                padding: 20px;
            }
            
            .widget-stat-value {
                font-size: 36px;
                font-weight: 700;
                color: var(--primary, #4299e1);
                margin-bottom: 10px;
            }
            
            .widget-stat-label {
                font-size: 14px;
                color: var(--text-secondary, #94a3b8);
            }
            
            .widget-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .widget-list-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: var(--bg-primary, #0f172a);
                border-radius: 6px;
            }
            
            /* Loading State */
            .widget-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: var(--text-secondary, #94a3b8);
            }
            
            .widget-loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid var(--border-color, #334155);
                border-top-color: var(--primary, #4299e1);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            /* Edit Mode Styles */
            .widget-grid.edit-mode .dashboard-widget {
                border-color: var(--primary, #4299e1);
            }
            
            .widget-grid.edit-mode .widget-header {
                background: rgba(66, 153, 225, 0.1);
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .widget-controls {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .controls-left,
                .controls-right {
                    width: 100%;
                    justify-content: center;
                }
                
                .widget-gallery {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Add widget button
        document.getElementById('add-widget-btn').addEventListener('click', () => {
            document.getElementById('add-widget-modal').style.display = 'block';
        });
        
        // Layout selector
        document.getElementById('layout-selector').addEventListener('change', (e) => {
            this.loadLayout(e.target.value);
        });
        
        // Save layout
        document.getElementById('save-layout-btn').addEventListener('click', () => {
            this.saveCurrentLayout();
        });
        
        // Reset layout
        document.getElementById('reset-layout-btn').addEventListener('click', () => {
            if (confirm('Reset to default layout?')) {
                this.resetLayout();
            }
        });
        
        // Edit mode toggle
        document.getElementById('toggle-edit-mode').addEventListener('click', () => {
            this.toggleEditMode();
        });
        
        // Grid click to deselect
        this.grid.addEventListener('click', (e) => {
            if (e.target === this.grid) {
                this.deselectAllWidgets();
            }
        });
    }
    
    addWidget(type) {
        const config = this.widgetTypes[type];
        if (!config) return;
        
        const widget = {
            id: `widget_${Date.now()}`,
            type: type,
            title: config.title,
            icon: config.icon,
            position: this.findAvailablePosition(config.defaultSize),
            size: { ...config.defaultSize },
            settings: this.getDefaultSettings(type),
            refreshInterval: config.refreshInterval
        };
        
        this.widgets.set(widget.id, widget);
        this.renderWidget(widget);
        this.closeAddModal();
        this.saveCurrentLayout();
        
        // Start data refresh
        this.startWidgetRefresh(widget);
    }
    
    renderWidget(widget) {
        const element = document.createElement('div');
        element.className = 'dashboard-widget';
        element.id = widget.id;
        element.style.left = `${widget.position.x}px`;
        element.style.top = `${widget.position.y}px`;
        element.style.width = `${widget.size.width}px`;
        element.style.height = `${widget.size.height}px`;
        
        element.innerHTML = `
            <div class="widget-header" data-widget-id="${widget.id}">
                <div class="widget-title">
                    <span class="widget-icon">${widget.icon}</span>
                    <span>${widget.title}</span>
                </div>
                <div class="widget-actions">
                    <button class="widget-action" onclick="dashboardWidgets.refreshWidget('${widget.id}')" title="Refresh">
                        🔄
                    </button>
                    <button class="widget-action" onclick="dashboardWidgets.openWidgetSettings('${widget.id}')" title="Settings">
                        ⚙️
                    </button>
                    <button class="widget-action" onclick="dashboardWidgets.removeWidget('${widget.id}')" title="Remove">
                        ❌
                    </button>
                </div>
            </div>
            <div class="widget-body" id="${widget.id}-body">
                <div class="widget-loading">
                    <div class="widget-loading-spinner"></div>
                </div>
            </div>
            <div class="resize-handle" data-widget-id="${widget.id}"></div>
        `;
        
        this.grid.appendChild(element);
        
        // Setup drag and resize
        this.setupDragAndDrop(element);
        this.setupResize(element);
        
        // Load widget content
        this.loadWidgetContent(widget);
    }
    
    setupDragAndDrop(element) {
        const header = element.querySelector('.widget-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.widget-actions')) return;
            
            isDragging = true;
            this.draggedWidget = element;
            
            startX = e.clientX;
            startY = e.clientY;
            startLeft = element.offsetLeft;
            startTop = element.offsetTop;
            
            element.classList.add('dragging');
            header.classList.add('dragging');
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.draggedWidget) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newLeft = startLeft + dx;
            let newTop = startTop + dy;
            
            // Snap to grid
            newLeft = Math.round(newLeft / this.gridSize) * this.gridSize;
            newTop = Math.round(newTop / this.gridSize) * this.gridSize;
            
            // Boundary checking
            newLeft = Math.max(0, Math.min(newLeft, this.grid.offsetWidth - this.draggedWidget.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, this.grid.offsetHeight - this.draggedWidget.offsetHeight));
            
            this.draggedWidget.style.left = `${newLeft}px`;
            this.draggedWidget.style.top = `${newTop}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging && this.draggedWidget) {
                const widgetId = this.draggedWidget.id;
                const widget = this.widgets.get(widgetId);
                
                if (widget) {
                    widget.position = {
                        x: parseInt(this.draggedWidget.style.left),
                        y: parseInt(this.draggedWidget.style.top)
                    };
                    this.saveCurrentLayout();
                }
                
                this.draggedWidget.classList.remove('dragging');
                this.draggedWidget.querySelector('.widget-header').classList.remove('dragging');
                this.draggedWidget = null;
            }
            isDragging = false;
        });
    }
    
    setupResize(element) {
        const handle = element.querySelector('.resize-handle');
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = element.offsetWidth;
            startHeight = element.offsetHeight;
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newWidth = startWidth + dx;
            let newHeight = startHeight + dy;
            
            // Snap to grid
            newWidth = Math.round(newWidth / this.gridSize) * this.gridSize;
            newHeight = Math.round(newHeight / this.gridSize) * this.gridSize;
            
            // Apply minimum size
            const widgetId = element.id;
            const widget = this.widgets.get(widgetId);
            if (widget) {
                const minSize = this.widgetTypes[widget.type].minSize;
                newWidth = Math.max(minSize.width, newWidth);
                newHeight = Math.max(minSize.height, newHeight);
            }
            
            element.style.width = `${newWidth}px`;
            element.style.height = `${newHeight}px`;
            
            // Update chart if present
            const chart = element.querySelector('.widget-chart canvas');
            if (chart && window.Chart) {
                const chartInstance = Chart.getChart(chart);
                if (chartInstance) {
                    chartInstance.resize();
                }
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                const widgetId = element.id;
                const widget = this.widgets.get(widgetId);
                
                if (widget) {
                    widget.size = {
                        width: element.offsetWidth,
                        height: element.offsetHeight
                    };
                    this.saveCurrentLayout();
                }
            }
            isResizing = false;
        });
    }
    
    async loadWidgetContent(widget) {
        const body = document.getElementById(`${widget.id}-body`);
        
        try {
            switch (widget.type) {
                case 'revenue':
                    await this.loadRevenueWidget(widget, body);
                    break;
                case 'leadFunnel':
                    await this.loadLeadFunnelWidget(widget, body);
                    break;
                case 'agentPerformance':
                    await this.loadAgentPerformanceWidget(widget, body);
                    break;
                case 'activityFeed':
                    await this.loadActivityFeedWidget(widget, body);
                    break;
                case 'leadStats':
                    await this.loadLeadStatsWidget(widget, body);
                    break;
                case 'conversionRate':
                    await this.loadConversionRateWidget(widget, body);
                    break;
            }
        } catch (error) {
            console.error(`Failed to load widget ${widget.id}:`, error);
            body.innerHTML = '<div class="widget-error">Failed to load widget data</div>';
        }
    }
    
    async loadRevenueWidget(widget, container) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const data = {
            total: 125000,
            change: 12.5,
            chart: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                data: [65000, 75000, 85000, 95000, 110000, 125000]
            }
        };
        
        container.innerHTML = `
            <div class="widget-stat">
                <div class="widget-stat-value">$${data.total.toLocaleString()}</div>
                <div class="widget-stat-label">Total Revenue</div>
                <div class="widget-stat-change ${data.change > 0 ? 'positive' : 'negative'}">
                    ${data.change > 0 ? '↑' : '↓'} ${Math.abs(data.change)}%
                </div>
            </div>
            <div class="widget-chart">
                <canvas id="${widget.id}-chart"></canvas>
            </div>
        `;
        
        // Create chart
        const ctx = document.getElementById(`${widget.id}-chart`).getContext('2d');
        new Chart(ctx, {
            type: widget.settings.chartType || 'line',
            data: {
                labels: data.chart.labels,
                datasets: [{
                    label: 'Revenue',
                    data: data.chart.data,
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
    
    async loadLeadFunnelWidget(widget, container) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const data = {
            stages: [
                { name: 'New Leads', count: 450, percentage: 100 },
                { name: 'Contacted', count: 320, percentage: 71 },
                { name: 'Qualified', count: 180, percentage: 40 },
                { name: 'Retained', count: 95, percentage: 21 },
                { name: 'Closed Won', count: 45, percentage: 10 }
            ]
        };
        
        container.innerHTML = `
            <div class="funnel-widget">
                ${data.stages.map((stage, index) => `
                    <div class="funnel-stage" style="width: ${100 - (index * 15)}%">
                        <div class="funnel-bar" style="background: rgba(66, 153, 225, ${1 - (index * 0.2)})">
                            <span class="funnel-count">${stage.count}</span>
                        </div>
                        <div class="funnel-label">${stage.name}</div>
                        <div class="funnel-percentage">${stage.percentage}%</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    async loadAgentPerformanceWidget(widget, container) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const agents = [
            { name: 'Sarah Johnson', leads: 45, conversions: 12, rate: 26.7 },
            { name: 'Mike Smith', leads: 38, conversions: 9, rate: 23.7 },
            { name: 'Lisa Chen', leads: 52, conversions: 15, rate: 28.8 },
            { name: 'John Doe', leads: 41, conversions: 10, rate: 24.4 }
        ];
        
        container.innerHTML = `
            <div class="widget-list">
                ${agents.map(agent => `
                    <div class="widget-list-item">
                        <div>
                            <div style="font-weight: 600">${agent.name}</div>
                            <div style="font-size: 12px; color: var(--text-secondary)">${agent.leads} leads</div>
                        </div>
                        <div style="text-align: right">
                            <div style="font-weight: 600; color: var(--primary)">${agent.rate}%</div>
                            <div style="font-size: 12px">${agent.conversions} converted</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    async loadActivityFeedWidget(widget, container) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const activities = [
            { time: '2 min ago', user: 'Sarah J.', action: 'Updated lead status', target: 'John Doe' },
            { time: '15 min ago', user: 'Mike S.', action: 'Added note to', target: 'ABC Corp' },
            { time: '1 hour ago', user: 'System', action: 'New lead received', target: 'Jane Smith' },
            { time: '2 hours ago', user: 'Lisa C.', action: 'Closed deal with', target: 'XYZ Inc' }
        ];
        
        container.innerHTML = `
            <div class="activity-list">
                ${activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-time">${activity.time}</div>
                        <div class="activity-content">
                            <strong>${activity.user}</strong> ${activity.action} <em>${activity.target}</em>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add activity styles
        const style = document.createElement('style');
        style.textContent = `
            .activity-list { display: flex; flex-direction: column; gap: 15px; }
            .activity-item { padding: 12px; background: var(--bg-primary); border-radius: 6px; }
            .activity-time { font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; }
            .activity-content { font-size: 14px; }
            
            .funnel-widget { display: flex; flex-direction: column; gap: 15px; align-items: center; }
            .funnel-stage { position: relative; margin: 0 auto; }
            .funnel-bar { 
                height: 40px; 
                border-radius: 4px; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                color: white;
                font-weight: 600;
            }
            .funnel-label { 
                text-align: center; 
                margin-top: 8px; 
                font-size: 14px;
                color: var(--text-primary);
            }
            .funnel-percentage {
                text-align: center;
                font-size: 12px;
                color: var(--text-secondary);
                margin-top: 4px;
            }
            
            .widget-stat-change {
                margin-top: 10px;
                font-size: 14px;
                font-weight: 600;
            }
            .widget-stat-change.positive { color: #10b981; }
            .widget-stat-change.negative { color: #ef4444; }
        `;
        if (!document.getElementById('widget-custom-styles')) {
            style.id = 'widget-custom-styles';
            document.head.appendChild(style);
        }
    }
    
    async loadLeadStatsWidget(widget, container) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        container.innerHTML = `
            <div class="widget-stat">
                <div class="widget-stat-value">847</div>
                <div class="widget-stat-label">Total Leads</div>
                <div class="widget-stat-change positive">↑ 23%</div>
            </div>
        `;
    }
    
    async loadConversionRateWidget(widget, container) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        container.innerHTML = `
            <div class="widget-stat">
                <div class="widget-stat-value">24.5%</div>
                <div class="widget-stat-label">Conversion Rate</div>
                <div class="widget-stat-change positive">↑ 3.2%</div>
            </div>
            <div class="widget-chart">
                <canvas id="${widget.id}-chart"></canvas>
            </div>
        `;
        
        // Create gauge chart
        const ctx = document.getElementById(`${widget.id}-chart`).getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [24.5, 75.5],
                    backgroundColor: ['#4299e1', '#334155'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                circumference: 180,
                rotation: 270,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }
    
    startWidgetRefresh(widget) {
        if (widget.refreshInterval) {
            widget.refreshTimer = setInterval(() => {
                this.refreshWidget(widget.id);
            }, widget.refreshInterval);
        }
    }
    
    refreshWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            const body = document.getElementById(`${widgetId}-body`);
            body.innerHTML = '<div class="widget-loading"><div class="widget-loading-spinner"></div></div>';
            this.loadWidgetContent(widget);
        }
    }
    
    removeWidget(widgetId) {
        if (!confirm('Remove this widget?')) return;
        
        const widget = this.widgets.get(widgetId);
        if (widget) {
            // Clear refresh timer
            if (widget.refreshTimer) {
                clearInterval(widget.refreshTimer);
            }
            
            // Remove from DOM
            const element = document.getElementById(widgetId);
            if (element) {
                element.remove();
            }
            
            // Remove from widgets map
            this.widgets.delete(widgetId);
            
            // Save layout
            this.saveCurrentLayout();
        }
    }
    
    openWidgetSettings(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (!widget) return;
        
        this.currentSettingsWidget = widget;
        
        const content = document.getElementById('widget-settings-content');
        content.innerHTML = `
            <div class="settings-form">
                <div class="form-group">
                    <label>Widget Title</label>
                    <input type="text" id="widget-title-input" value="${widget.title}" class="form-input">
                </div>
                
                ${widget.type === 'revenue' || widget.type === 'conversionRate' ? `
                    <div class="form-group">
                        <label>Chart Type</label>
                        <select id="widget-chart-type" class="form-input">
                            <option value="line" ${widget.settings.chartType === 'line' ? 'selected' : ''}>Line</option>
                            <option value="bar" ${widget.settings.chartType === 'bar' ? 'selected' : ''}>Bar</option>
                            <option value="area" ${widget.settings.chartType === 'area' ? 'selected' : ''}>Area</option>
                        </select>
                    </div>
                ` : ''}
                
                <div class="form-group">
                    <label>Refresh Interval (seconds)</label>
                    <input type="number" id="widget-refresh-interval" 
                           value="${widget.refreshInterval / 1000}" 
                           min="10" 
                           class="form-input">
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="widget-show-header" 
                               ${widget.settings.showHeader !== false ? 'checked' : ''}>
                        Show widget header
                    </label>
                </div>
            </div>
        `;
        
        document.getElementById('widget-settings-modal').style.display = 'block';
    }
    
    saveWidgetSettings() {
        if (!this.currentSettingsWidget) return;
        
        const widget = this.currentSettingsWidget;
        
        // Update settings
        widget.title = document.getElementById('widget-title-input').value;
        widget.refreshInterval = parseInt(document.getElementById('widget-refresh-interval').value) * 1000;
        widget.settings.showHeader = document.getElementById('widget-show-header').checked;
        
        const chartTypeInput = document.getElementById('widget-chart-type');
        if (chartTypeInput) {
            widget.settings.chartType = chartTypeInput.value;
        }
        
        // Update widget display
        const element = document.getElementById(widget.id);
        if (element) {
            const titleElement = element.querySelector('.widget-title span:last-child');
            if (titleElement) {
                titleElement.textContent = widget.title;
            }
            
            // Update header visibility
            const header = element.querySelector('.widget-header');
            if (header) {
                header.style.display = widget.settings.showHeader !== false ? 'flex' : 'none';
            }
        }
        
        // Restart refresh timer
        if (widget.refreshTimer) {
            clearInterval(widget.refreshTimer);
        }
        this.startWidgetRefresh(widget);
        
        // Refresh content if chart type changed
        if (chartTypeInput) {
            this.refreshWidget(widget.id);
        }
        
        // Save layout
        this.saveCurrentLayout();
        
        this.closeSettingsModal();
    }
    
    findAvailablePosition(size) {
        // Simple algorithm to find empty space
        const positions = Array.from(this.widgets.values()).map(w => ({
            x: w.position.x,
            y: w.position.y,
            right: w.position.x + w.size.width,
            bottom: w.position.y + w.size.height
        }));
        
        let x = 20;
        let y = 20;
        
        // Try to find a position that doesn't overlap
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 5; col++) {
                x = col * 200 + 20;
                y = row * 200 + 20;
                
                const overlaps = positions.some(pos => 
                    !(x + size.width <= pos.x || 
                      x >= pos.right || 
                      y + size.height <= pos.y || 
                      y >= pos.bottom)
                );
                
                if (!overlaps) {
                    return { x, y };
                }
            }
        }
        
        // If no space found, stack at bottom
        const maxY = Math.max(0, ...positions.map(p => p.bottom));
        return { x: 20, y: maxY + 20 };
    }
    
    getDefaultSettings(type) {
        const defaults = {
            showHeader: true,
            refreshEnabled: true
        };
        
        switch (type) {
            case 'revenue':
            case 'conversionRate':
                defaults.chartType = 'line';
                break;
        }
        
        return defaults;
    }
    
    toggleEditMode() {
        this.grid.classList.toggle('edit-mode');
        const btn = document.getElementById('toggle-edit-mode');
        btn.classList.toggle('active');
    }
    
    deselectAllWidgets() {
        // Implementation for widget selection if needed
    }
    
    saveCurrentLayout() {
        const layoutData = {
            widgets: Array.from(this.widgets.values()).map(widget => ({
                id: widget.id,
                type: widget.type,
                title: widget.title,
                position: widget.position,
                size: widget.size,
                settings: widget.settings,
                refreshInterval: widget.refreshInterval
            }))
        };
        
        this.layouts[this.currentLayout] = layoutData;
        localStorage.setItem('dashboardLayouts', JSON.stringify(this.layouts));
        
        this.showToast('Layout saved', 'success');
    }
    
    loadLayouts() {
        const saved = localStorage.getItem('dashboardLayouts');
        if (saved) {
            this.layouts = JSON.parse(saved);
        } else {
            // Default layouts
            this.layouts = {
                default: {
                    widgets: [
                        {
                            type: 'revenue',
                            position: { x: 20, y: 20 },
                            size: { width: 400, height: 300 }
                        },
                        {
                            type: 'leadFunnel',
                            position: { x: 440, y: 20 },
                            size: { width: 400, height: 350 }
                        }
                    ]
                },
                compact: { widgets: [] },
                analytics: { widgets: [] },
                custom: { widgets: [] }
            };
        }
        
        // Load default layout
        this.loadLayout('default');
    }
    
    loadLayout(layoutName) {
        this.currentLayout = layoutName;
        const layout = this.layouts[layoutName];
        
        if (!layout) return;
        
        // Clear existing widgets
        this.widgets.forEach(widget => {
            if (widget.refreshTimer) {
                clearInterval(widget.refreshTimer);
            }
            const element = document.getElementById(widget.id);
            if (element) element.remove();
        });
        this.widgets.clear();
        
        // Load new widgets
        layout.widgets.forEach(widgetData => {
            const widget = {
                ...widgetData,
                icon: this.widgetTypes[widgetData.type]?.icon || '📊',
                title: widgetData.title || this.widgetTypes[widgetData.type]?.title || 'Widget'
            };
            
            this.widgets.set(widget.id || `widget_${Date.now()}_${Math.random()}`, widget);
            this.renderWidget(widget);
            this.startWidgetRefresh(widget);
        });
    }
    
    resetLayout() {
        this.loadLayout('default');
        this.showToast('Layout reset to default', 'info');
    }
    
    closeAddModal() {
        document.getElementById('add-widget-modal').style.display = 'none';
    }
    
    closeSettingsModal() {
        document.getElementById('widget-settings-modal').style.display = 'none';
        this.currentSettingsWidget = null;
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toast-container') || document.body;
        container.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize dashboard widgets
window.dashboardWidgets = new DashboardWidgets();

export default DashboardWidgets; 