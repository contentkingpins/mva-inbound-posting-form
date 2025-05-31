/**
 * Workflow Automation Engine
 * Create and manage automated workflows for lead management and business processes
 */

class WorkflowAutomation {
    constructor() {
        this.workflows = new Map();
        this.triggers = new Map();
        this.actions = new Map();
        this.conditions = new Map();
        this.activeInstances = new Map();
        this.executionHistory = [];
        
        // Pre-defined trigger types
        this.triggerTypes = {
            leadCreated: { name: 'New Lead Created', icon: '📥', category: 'leads' },
            leadUpdated: { name: 'Lead Updated', icon: '📝', category: 'leads' },
            leadStatusChanged: { name: 'Lead Status Changed', icon: '🔄', category: 'leads' },
            leadAssigned: { name: 'Lead Assigned', icon: '👤', category: 'leads' },
            timeSchedule: { name: 'Time-Based Schedule', icon: '⏰', category: 'system' },
            webhook: { name: 'Webhook Received', icon: '🔗', category: 'integration' },
            formSubmitted: { name: 'Form Submitted', icon: '📋', category: 'forms' },
            agentAction: { name: 'Agent Action', icon: '🎯', category: 'agents' },
            metricThreshold: { name: 'Metric Threshold', icon: '📊', category: 'analytics' }
        };
        
        // Pre-defined action types
        this.actionTypes = {
            sendEmail: { name: 'Send Email', icon: '📧', category: 'communication' },
            sendSMS: { name: 'Send SMS', icon: '💬', category: 'communication' },
            assignLead: { name: 'Assign Lead', icon: '👥', category: 'leads' },
            updateLeadStatus: { name: 'Update Lead Status', icon: '🏷️', category: 'leads' },
            createTask: { name: 'Create Task', icon: '📌', category: 'tasks' },
            addNote: { name: 'Add Note', icon: '📝', category: 'leads' },
            sendWebhook: { name: 'Send Webhook', icon: '🔗', category: 'integration' },
            updateCRM: { name: 'Update CRM', icon: '💼', category: 'integration' },
            sendNotification: { name: 'Send Notification', icon: '🔔', category: 'communication' },
            runScript: { name: 'Run Custom Script', icon: '⚙️', category: 'advanced' }
        };
        
        // Pre-defined condition types
        this.conditionTypes = {
            leadField: { name: 'Lead Field Value', icon: '🏷️' },
            timeOfDay: { name: 'Time of Day', icon: '🕐' },
            dayOfWeek: { name: 'Day of Week', icon: '📅' },
            agentAvailability: { name: 'Agent Availability', icon: '🟢' },
            leadScore: { name: 'Lead Score', icon: '⭐' },
            previousAction: { name: 'Previous Action Result', icon: '🔗' },
            customCondition: { name: 'Custom Condition', icon: '⚙️' }
        };
        
        // Workflow templates
        this.templates = [
            {
                id: 'lead_nurture',
                name: 'Lead Nurturing Campaign',
                description: 'Automatically nurture new leads with email sequence',
                category: 'marketing',
                nodes: [
                    { type: 'trigger', data: { type: 'leadCreated' } },
                    { type: 'action', data: { type: 'sendEmail', template: 'welcome' } },
                    { type: 'delay', data: { duration: 3, unit: 'days' } },
                    { type: 'action', data: { type: 'sendEmail', template: 'follow_up_1' } }
                ]
            },
            {
                id: 'lead_assignment',
                name: 'Smart Lead Assignment',
                description: 'Assign leads based on agent availability and expertise',
                category: 'sales',
                nodes: [
                    { type: 'trigger', data: { type: 'leadCreated' } },
                    { type: 'condition', data: { type: 'leadScore', operator: '>', value: 70 } },
                    { type: 'action', data: { type: 'assignLead', priority: 'high' } }
                ]
            },
            {
                id: 'abandoned_lead',
                name: 'Abandoned Lead Recovery',
                description: 'Re-engage leads that haven\'t been contacted',
                category: 'retention',
                nodes: [
                    { type: 'trigger', data: { type: 'timeSchedule', schedule: 'daily' } },
                    { type: 'condition', data: { type: 'lastContact', operator: '>', value: 7 } },
                    { type: 'action', data: { type: 'createTask', priority: 'high' } }
                ]
            }
        ];
        
        this.init();
    }
    
    init() {
        // Create UI
        this.createWorkflowUI();
        
        // Initialize builder
        this.initializeBuilder();
        
        // Load saved workflows
        this.loadSavedWorkflows();
        
        // Start execution engine
        this.startExecutionEngine();
        
        // Register default handlers
        this.registerDefaultHandlers();
        
        console.log('🤖 Workflow automation engine initialized');
    }
    
    // UI Creation
    createWorkflowUI() {
        const container = document.createElement('div');
        container.className = 'workflow-automation-container';
        container.id = 'workflow-automation';
        container.innerHTML = `
            <div class="workflow-header">
                <h2>🤖 Workflow Automation</h2>
                <div class="workflow-controls">
                    <button class="btn btn-secondary" onclick="workflowAutomation.showTemplates()">
                        📋 Templates
                    </button>
                    <button class="btn btn-primary" onclick="workflowAutomation.createNewWorkflow()">
                        ➕ Create Workflow
                    </button>
                </div>
            </div>
            
            <!-- Workflow List -->
            <div class="workflow-list glass-card">
                <div class="list-header">
                    <h3>Active Workflows</h3>
                    <div class="list-stats">
                        <span class="stat-item">
                            <span class="stat-value" id="workflow-count">0</span>
                            <span class="stat-label">Workflows</span>
                        </span>
                        <span class="stat-item">
                            <span class="stat-value" id="execution-count">0</span>
                            <span class="stat-label">Executions Today</span>
                        </span>
                    </div>
                </div>
                
                <div class="workflow-grid" id="workflow-grid">
                    <!-- Workflow cards will be rendered here -->
                </div>
            </div>
            
            <!-- Workflow Builder Modal -->
            <div class="workflow-builder-modal" id="workflow-builder" style="display: none;">
                <div class="builder-container">
                    <div class="builder-header">
                        <h3>Workflow Builder</h3>
                        <div class="builder-actions">
                            <button class="btn btn-secondary" onclick="workflowAutomation.testWorkflow()">
                                🧪 Test
                            </button>
                            <button class="btn btn-primary" onclick="workflowAutomation.saveWorkflow()">
                                💾 Save
                            </button>
                            <button class="btn btn-text" onclick="workflowAutomation.closeBuilder()">
                                ✕ Close
                            </button>
                        </div>
                    </div>
                    
                    <div class="builder-content">
                        <!-- Sidebar with components -->
                        <div class="builder-sidebar">
                            <div class="component-section">
                                <h4>🎯 Triggers</h4>
                                <div class="component-list" id="trigger-components">
                                    <!-- Trigger components -->
                                </div>
                            </div>
                            
                            <div class="component-section">
                                <h4>⚡ Actions</h4>
                                <div class="component-list" id="action-components">
                                    <!-- Action components -->
                                </div>
                            </div>
                            
                            <div class="component-section">
                                <h4>🔀 Flow Control</h4>
                                <div class="component-list">
                                    <div class="component-item" draggable="true" data-type="condition">
                                        <span class="component-icon">❓</span>
                                        <span>Condition</span>
                                    </div>
                                    <div class="component-item" draggable="true" data-type="delay">
                                        <span class="component-icon">⏱️</span>
                                        <span>Delay</span>
                                    </div>
                                    <div class="component-item" draggable="true" data-type="split">
                                        <span class="component-icon">🔀</span>
                                        <span>Split</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Canvas for workflow -->
                        <div class="builder-canvas" id="workflow-canvas">
                            <div class="canvas-grid">
                                <!-- Workflow nodes will be placed here -->
                            </div>
                        </div>
                        
                        <!-- Properties panel -->
                        <div class="builder-properties" id="properties-panel">
                            <h4>Properties</h4>
                            <div class="properties-content">
                                <p class="empty-state">Select a node to view properties</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Execution History -->
            <div class="execution-history glass-card">
                <div class="history-header">
                    <h3>📊 Execution History</h3>
                    <button class="btn btn-sm btn-secondary" onclick="workflowAutomation.clearHistory()">
                        Clear
                    </button>
                </div>
                <div class="history-list" id="execution-history">
                    <!-- History entries -->
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
    }
    
    initializeBuilder() {
        // Populate component lists
        this.populateTriggerComponents();
        this.populateActionComponents();
        
        // Setup drag and drop
        this.setupDragAndDrop();
        
        // Setup canvas interactions
        this.setupCanvasInteractions();
    }
    
    populateTriggerComponents() {
        const container = document.getElementById('trigger-components');
        if (!container) return;
        
        container.innerHTML = Object.entries(this.triggerTypes).map(([key, trigger]) => `
            <div class="component-item" draggable="true" data-type="trigger" data-trigger="${key}">
                <span class="component-icon">${trigger.icon}</span>
                <span>${trigger.name}</span>
            </div>
        `).join('');
    }
    
    populateActionComponents() {
        const container = document.getElementById('action-components');
        if (!container) return;
        
        container.innerHTML = Object.entries(this.actionTypes).map(([key, action]) => `
            <div class="component-item" draggable="true" data-type="action" data-action="${key}">
                <span class="component-icon">${action.icon}</span>
                <span>${action.name}</span>
            </div>
        `).join('');
    }
    
    // Drag and Drop
    setupDragAndDrop() {
        let draggedElement = null;
        
        // Make components draggable
        document.querySelectorAll('.component-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedElement = e.target;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', '');
                e.target.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });
        });
        
        // Canvas drop zone
        const canvas = document.getElementById('workflow-canvas');
        if (canvas) {
            canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                canvas.classList.add('drag-over');
            });
            
            canvas.addEventListener('dragleave', (e) => {
                if (e.target === canvas) {
                    canvas.classList.remove('drag-over');
                }
            });
            
            canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                canvas.classList.remove('drag-over');
                
                if (draggedElement) {
                    const type = draggedElement.dataset.type;
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    this.addNodeToCanvas(type, draggedElement.dataset, x, y);
                }
            });
        }
    }
    
    setupCanvasInteractions() {
        const canvas = document.getElementById('workflow-canvas');
        if (!canvas) return;
        
        // Node selection
        canvas.addEventListener('click', (e) => {
            const node = e.target.closest('.workflow-node');
            if (node) {
                this.selectNode(node);
            } else {
                this.deselectAllNodes();
            }
        });
        
        // Connection drawing
        let isConnecting = false;
        let connectionStart = null;
        
        canvas.addEventListener('mousedown', (e) => {
            const output = e.target.closest('.node-output');
            if (output) {
                isConnecting = true;
                connectionStart = output.parentElement;
                e.preventDefault();
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (isConnecting && connectionStart) {
                // Draw temporary connection line
                this.drawTemporaryConnection(connectionStart, e);
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (isConnecting && connectionStart) {
                const input = e.target.closest('.node-input');
                if (input && input.parentElement !== connectionStart) {
                    this.createConnection(connectionStart, input.parentElement);
                }
                
                isConnecting = false;
                connectionStart = null;
                this.clearTemporaryConnection();
            }
        });
    }
    
    // Node Management
    addNodeToCanvas(type, data, x, y) {
        const canvas = document.querySelector('.canvas-grid');
        if (!canvas) return;
        
        const nodeId = `node_${Date.now()}`;
        const node = document.createElement('div');
        node.className = `workflow-node ${type}-node`;
        node.id = nodeId;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        
        let nodeContent = '';
        let icon = '';
        let title = '';
        
        switch (type) {
            case 'trigger':
                const trigger = this.triggerTypes[data.trigger];
                icon = trigger.icon;
                title = trigger.name;
                break;
            case 'action':
                const action = this.actionTypes[data.action];
                icon = action.icon;
                title = action.name;
                break;
            case 'condition':
                icon = '❓';
                title = 'Condition';
                break;
            case 'delay':
                icon = '⏱️';
                title = 'Delay';
                break;
            case 'split':
                icon = '🔀';
                title = 'Split';
                break;
        }
        
        node.innerHTML = `
            <div class="node-header">
                <span class="node-icon">${icon}</span>
                <span class="node-title">${title}</span>
                <button class="node-delete" onclick="workflowAutomation.deleteNode('${nodeId}')">×</button>
            </div>
            <div class="node-body">
                ${type !== 'trigger' ? '<div class="node-input"></div>' : ''}
                ${type !== 'action' || type === 'split' ? '<div class="node-output"></div>' : ''}
            </div>
        `;
        
        canvas.appendChild(node);
        
        // Make node draggable
        this.makeNodeDraggable(node);
        
        // Store node data
        node.dataset.nodeType = type;
        Object.assign(node.dataset, data);
    }
    
    makeNodeDraggable(node) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        node.addEventListener('mousedown', (e) => {
            if (e.target.closest('.node-input, .node-output, .node-delete')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = node.offsetLeft;
            initialY = node.offsetTop;
            
            node.classList.add('dragging');
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            node.style.left = `${initialX + dx}px`;
            node.style.top = `${initialY + dy}px`;
            
            // Update connections
            this.updateConnections(node.id);
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                node.classList.remove('dragging');
            }
        });
    }
    
    selectNode(node) {
        this.deselectAllNodes();
        node.classList.add('selected');
        this.showNodeProperties(node);
    }
    
    deselectAllNodes() {
        document.querySelectorAll('.workflow-node').forEach(node => {
            node.classList.remove('selected');
        });
        this.hideNodeProperties();
    }
    
    deleteNode(nodeId) {
        const node = document.getElementById(nodeId);
        if (node) {
            // Remove connections
            this.removeNodeConnections(nodeId);
            
            // Remove node
            node.remove();
        }
    }
    
    // Properties Panel
    showNodeProperties(node) {
        const panel = document.querySelector('.properties-content');
        if (!panel) return;
        
        const type = node.dataset.nodeType;
        let content = '';
        
        switch (type) {
            case 'trigger':
                content = this.getTriggerProperties(node);
                break;
            case 'action':
                content = this.getActionProperties(node);
                break;
            case 'condition':
                content = this.getConditionProperties(node);
                break;
            case 'delay':
                content = this.getDelayProperties(node);
                break;
        }
        
        panel.innerHTML = content;
    }
    
    getTriggerProperties(node) {
        const triggerType = node.dataset.trigger;
        let properties = `
            <div class="property-group">
                <label>Trigger Type</label>
                <p>${this.triggerTypes[triggerType]?.name || 'Unknown'}</p>
            </div>
        `;
        
        // Add specific properties based on trigger type
        switch (triggerType) {
            case 'timeSchedule':
                properties += `
                    <div class="property-group">
                        <label>Schedule</label>
                        <select class="property-input" data-property="schedule">
                            <option value="hourly">Every Hour</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    <div class="property-group">
                        <label>Time</label>
                        <input type="time" class="property-input" data-property="time">
                    </div>
                `;
                break;
            case 'leadStatusChanged':
                properties += `
                    <div class="property-group">
                        <label>From Status</label>
                        <select class="property-input" data-property="fromStatus">
                            <option value="any">Any Status</option>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                        </select>
                    </div>
                    <div class="property-group">
                        <label>To Status</label>
                        <select class="property-input" data-property="toStatus">
                            <option value="any">Any Status</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                `;
                break;
            case 'metricThreshold':
                properties += `
                    <div class="property-group">
                        <label>Metric</label>
                        <select class="property-input" data-property="metric">
                            <option value="leadCount">Lead Count</option>
                            <option value="conversionRate">Conversion Rate</option>
                            <option value="responseTime">Response Time</option>
                            <option value="revenue">Revenue</option>
                        </select>
                    </div>
                    <div class="property-group">
                        <label>Operator</label>
                        <select class="property-input" data-property="operator">
                            <option value=">">Greater than</option>
                            <option value="<">Less than</option>
                            <option value="=">Equal to</option>
                        </select>
                    </div>
                    <div class="property-group">
                        <label>Value</label>
                        <input type="number" class="property-input" data-property="value">
                    </div>
                `;
                break;
        }
        
        return properties;
    }
    
    getActionProperties(node) {
        const actionType = node.dataset.action;
        let properties = `
            <div class="property-group">
                <label>Action Type</label>
                <p>${this.actionTypes[actionType]?.name || 'Unknown'}</p>
            </div>
        `;
        
        // Add specific properties based on action type
        switch (actionType) {
            case 'sendEmail':
                properties += `
                    <div class="property-group">
                        <label>To</label>
                        <select class="property-input" data-property="recipient">
                            <option value="lead">Lead Email</option>
                            <option value="agent">Assigned Agent</option>
                            <option value="custom">Custom Email</option>
                        </select>
                    </div>
                    <div class="property-group">
                        <label>Email Template</label>
                        <select class="property-input" data-property="template">
                            <option value="welcome">Welcome Email</option>
                            <option value="follow_up">Follow Up</option>
                            <option value="appointment">Appointment Reminder</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    <div class="property-group">
                        <label>Subject</label>
                        <input type="text" class="property-input" data-property="subject" placeholder="Email subject...">
                    </div>
                `;
                break;
            case 'assignLead':
                properties += `
                    <div class="property-group">
                        <label>Assignment Method</label>
                        <select class="property-input" data-property="method">
                            <option value="roundRobin">Round Robin</option>
                            <option value="leastBusy">Least Busy</option>
                            <option value="expertise">By Expertise</option>
                            <option value="specific">Specific Agent</option>
                        </select>
                    </div>
                    <div class="property-group">
                        <label>Priority</label>
                        <select class="property-input" data-property="priority">
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                `;
                break;
            case 'createTask':
                properties += `
                    <div class="property-group">
                        <label>Task Title</label>
                        <input type="text" class="property-input" data-property="title" placeholder="Task title...">
                    </div>
                    <div class="property-group">
                        <label>Due Date</label>
                        <select class="property-input" data-property="dueDate">
                            <option value="today">Today</option>
                            <option value="tomorrow">Tomorrow</option>
                            <option value="3days">In 3 Days</option>
                            <option value="1week">In 1 Week</option>
                        </select>
                    </div>
                    <div class="property-group">
                        <label>Assign To</label>
                        <select class="property-input" data-property="assignTo">
                            <option value="leadOwner">Lead Owner</option>
                            <option value="specific">Specific Agent</option>
                            <option value="team">Team</option>
                        </select>
                    </div>
                `;
                break;
        }
        
        return properties;
    }
    
    getConditionProperties(node) {
        return `
            <div class="property-group">
                <label>Condition Type</label>
                <select class="property-input" data-property="conditionType">
                    <option value="leadField">Lead Field</option>
                    <option value="leadScore">Lead Score</option>
                    <option value="timeOfDay">Time of Day</option>
                    <option value="agentAvailability">Agent Availability</option>
                </select>
            </div>
            <div class="property-group">
                <label>Field/Property</label>
                <input type="text" class="property-input" data-property="field" placeholder="e.g., status, score">
            </div>
            <div class="property-group">
                <label>Operator</label>
                <select class="property-input" data-property="operator">
                    <option value="equals">Equals</option>
                    <option value="notEquals">Not Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greaterThan">Greater Than</option>
                    <option value="lessThan">Less Than</option>
                </select>
            </div>
            <div class="property-group">
                <label>Value</label>
                <input type="text" class="property-input" data-property="value" placeholder="Comparison value">
            </div>
        `;
    }
    
    getDelayProperties(node) {
        return `
            <div class="property-group">
                <label>Delay Duration</label>
                <input type="number" class="property-input" data-property="duration" value="1" min="1">
            </div>
            <div class="property-group">
                <label>Unit</label>
                <select class="property-input" data-property="unit">
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                </select>
            </div>
        `;
    }
    
    hideNodeProperties() {
        const panel = document.querySelector('.properties-content');
        if (panel) {
            panel.innerHTML = '<p class="empty-state">Select a node to view properties</p>';
        }
    }
    
    // Connections
    createConnection(startNode, endNode) {
        const connectionId = `conn_${Date.now()}`;
        const svg = this.getOrCreateSVG();
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.id = connectionId;
        path.classList.add('workflow-connection');
        path.dataset.start = startNode.id;
        path.dataset.end = endNode.id;
        
        svg.appendChild(path);
        
        this.updateConnection(connectionId);
        
        // Store connection data
        startNode.dataset.outputs = (startNode.dataset.outputs || '') + ',' + endNode.id;
        endNode.dataset.inputs = (endNode.dataset.inputs || '') + ',' + startNode.id;
    }
    
    updateConnection(connectionId) {
        const path = document.getElementById(connectionId);
        if (!path) return;
        
        const startNode = document.getElementById(path.dataset.start);
        const endNode = document.getElementById(path.dataset.end);
        
        if (!startNode || !endNode) return;
        
        const startOutput = startNode.querySelector('.node-output');
        const endInput = endNode.querySelector('.node-input');
        
        if (!startOutput || !endInput) return;
        
        const startRect = startOutput.getBoundingClientRect();
        const endRect = endInput.getBoundingClientRect();
        const canvasRect = document.getElementById('workflow-canvas').getBoundingClientRect();
        
        const startX = startRect.left + startRect.width / 2 - canvasRect.left;
        const startY = startRect.top + startRect.height / 2 - canvasRect.top;
        const endX = endRect.left + endRect.width / 2 - canvasRect.left;
        const endY = endRect.top + endRect.height / 2 - canvasRect.top;
        
        const controlPointOffset = Math.abs(endY - startY) / 2;
        
        const d = `M ${startX} ${startY} C ${startX} ${startY + controlPointOffset}, ${endX} ${endY - controlPointOffset}, ${endX} ${endY}`;
        
        path.setAttribute('d', d);
    }
    
    updateConnections(nodeId) {
        document.querySelectorAll('.workflow-connection').forEach(path => {
            if (path.dataset.start === nodeId || path.dataset.end === nodeId) {
                this.updateConnection(path.id);
            }
        });
    }
    
    removeNodeConnections(nodeId) {
        document.querySelectorAll('.workflow-connection').forEach(path => {
            if (path.dataset.start === nodeId || path.dataset.end === nodeId) {
                path.remove();
            }
        });
    }
    
    getOrCreateSVG() {
        let svg = document.getElementById('workflow-connections');
        if (!svg) {
            const canvas = document.getElementById('workflow-canvas');
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'workflow-connections';
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            canvas.appendChild(svg);
        }
        return svg;
    }
    
    drawTemporaryConnection(startNode, event) {
        // Implementation for visual feedback during connection
    }
    
    clearTemporaryConnection() {
        // Clear temporary connection visual
    }
    
    // Workflow Management
    createNewWorkflow() {
        this.currentWorkflow = {
            id: `workflow_${Date.now()}`,
            name: 'New Workflow',
            description: '',
            status: 'draft',
            nodes: [],
            connections: [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        this.openBuilder();
    }
    
    openBuilder() {
        document.getElementById('workflow-builder').style.display = 'block';
        this.clearCanvas();
    }
    
    closeBuilder() {
        document.getElementById('workflow-builder').style.display = 'none';
    }
    
    clearCanvas() {
        const canvas = document.querySelector('.canvas-grid');
        if (canvas) {
            canvas.innerHTML = '';
        }
        
        const svg = document.getElementById('workflow-connections');
        if (svg) {
            svg.remove();
        }
    }
    
    saveWorkflow() {
        if (!this.currentWorkflow) return;
        
        // Collect nodes
        const nodes = [];
        document.querySelectorAll('.workflow-node').forEach(node => {
            nodes.push({
                id: node.id,
                type: node.dataset.nodeType,
                position: { x: node.offsetLeft, y: node.offsetTop },
                data: { ...node.dataset }
            });
        });
        
        // Collect connections
        const connections = [];
        document.querySelectorAll('.workflow-connection').forEach(path => {
            connections.push({
                id: path.id,
                start: path.dataset.start,
                end: path.dataset.end
            });
        });
        
        this.currentWorkflow.nodes = nodes;
        this.currentWorkflow.connections = connections;
        this.currentWorkflow.modified = new Date().toISOString();
        
        // Save to storage
        this.workflows.set(this.currentWorkflow.id, this.currentWorkflow);
        this.saveWorkflowsToStorage();
        
        // Update UI
        this.renderWorkflowList();
        this.closeBuilder();
        
        // Show success message
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'success',
                title: 'Workflow Saved',
                message: `${this.currentWorkflow.name} has been saved successfully`
            });
        }
    }
    
    testWorkflow() {
        if (!this.currentWorkflow) return;
        
        // Validate workflow
        const validation = this.validateWorkflow();
        if (!validation.valid) {
            if (window.notificationSystem) {
                window.notificationSystem.showToast({
                    type: 'error',
                    title: 'Validation Failed',
                    message: validation.errors.join(', ')
                });
            }
            return;
        }
        
        // Run test execution
        this.executeWorkflowTest();
    }
    
    validateWorkflow() {
        const errors = [];
        const nodes = document.querySelectorAll('.workflow-node');
        
        // Check for trigger
        const triggers = document.querySelectorAll('.trigger-node');
        if (triggers.length === 0) {
            errors.push('Workflow must have at least one trigger');
        }
        
        // Check for disconnected nodes
        nodes.forEach(node => {
            if (node.classList.contains('trigger-node')) return;
            
            const hasInput = node.dataset.inputs && node.dataset.inputs.trim() !== '';
            if (!hasInput) {
                errors.push(`Node "${node.querySelector('.node-title').textContent}" is not connected`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    executeWorkflowTest() {
        // Simulate workflow execution
        const testData = {
            lead: {
                id: 'test_lead_123',
                name: 'Test Lead',
                email: 'test@example.com',
                status: 'new',
                score: 75
            }
        };
        
        console.log('🧪 Testing workflow with data:', testData);
        
        // Show test results
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'info',
                title: 'Test Execution',
                message: 'Workflow test completed. Check console for details.'
            });
        }
    }
    
    // Workflow List
    renderWorkflowList() {
        const grid = document.getElementById('workflow-grid');
        if (!grid) return;
        
        const workflows = Array.from(this.workflows.values());
        
        grid.innerHTML = workflows.map(workflow => `
            <div class="workflow-card glass-card" data-workflow-id="${workflow.id}">
                <div class="workflow-status ${workflow.status}">
                    ${workflow.status === 'active' ? '🟢' : '⚫'} ${workflow.status}
                </div>
                <h4>${workflow.name}</h4>
                <p>${workflow.description || 'No description'}</p>
                <div class="workflow-stats">
                    <span>${workflow.nodes?.length || 0} nodes</span>
                    <span>•</span>
                    <span>${this.getWorkflowExecutions(workflow.id)} executions</span>
                </div>
                <div class="workflow-actions">
                    <button class="btn btn-sm btn-secondary" onclick="workflowAutomation.editWorkflow('${workflow.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-sm ${workflow.status === 'active' ? 'btn-danger' : 'btn-success'}" 
                            onclick="workflowAutomation.toggleWorkflow('${workflow.id}')">
                        ${workflow.status === 'active' ? '⏸️ Pause' : '▶️ Activate'}
                    </button>
                    <button class="btn btn-sm btn-text" onclick="workflowAutomation.deleteWorkflow('${workflow.id}')">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
        
        // Update stats
        document.getElementById('workflow-count').textContent = workflows.length;
        document.getElementById('execution-count').textContent = this.getTodayExecutions();
    }
    
    editWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return;
        
        this.currentWorkflow = workflow;
        this.openBuilder();
        
        // Load workflow into canvas
        this.loadWorkflowIntoCanvas(workflow);
    }
    
    loadWorkflowIntoCanvas(workflow) {
        this.clearCanvas();
        
        // Recreate nodes
        workflow.nodes.forEach(node => {
            this.addNodeToCanvas(node.type, node.data, node.position.x, node.position.y);
        });
        
        // Recreate connections
        setTimeout(() => {
            workflow.connections.forEach(conn => {
                const startNode = document.getElementById(conn.start);
                const endNode = document.getElementById(conn.end);
                if (startNode && endNode) {
                    this.createConnection(startNode, endNode);
                }
            });
        }, 100);
    }
    
    toggleWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return;
        
        workflow.status = workflow.status === 'active' ? 'paused' : 'active';
        workflow.modified = new Date().toISOString();
        
        this.saveWorkflowsToStorage();
        this.renderWorkflowList();
    }
    
    deleteWorkflow(workflowId) {
        if (confirm('Are you sure you want to delete this workflow?')) {
            this.workflows.delete(workflowId);
            this.saveWorkflowsToStorage();
            this.renderWorkflowList();
        }
    }
    
    // Templates
    showTemplates() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal template-modal">
                <div class="modal-header">
                    <h3>Workflow Templates</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="template-grid">
                        ${this.templates.map(template => `
                            <div class="template-card" onclick="workflowAutomation.useTemplate('${template.id}')">
                                <h4>${template.name}</h4>
                                <p>${template.description}</p>
                                <span class="template-category">${template.category}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    useTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;
        
        this.currentWorkflow = {
            id: `workflow_${Date.now()}`,
            name: template.name,
            description: template.description,
            status: 'draft',
            nodes: [],
            connections: [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        this.openBuilder();
        
        // Load template nodes
        // Implementation depends on template structure
        
        // Close template modal
        document.querySelector('.template-modal')?.parentElement.remove();
    }
    
    // Execution Engine
    startExecutionEngine() {
        // Monitor triggers
        setInterval(() => {
            this.checkTriggers();
        }, 5000); // Check every 5 seconds
        
        // Process execution queue
        setInterval(() => {
            this.processExecutionQueue();
        }, 1000); // Process every second
    }
    
    checkTriggers() {
        this.workflows.forEach(workflow => {
            if (workflow.status !== 'active') return;
            
            workflow.nodes.forEach(node => {
                if (node.type === 'trigger') {
                    this.evaluateTrigger(workflow, node);
                }
            });
        });
    }
    
    evaluateTrigger(workflow, triggerNode) {
        // Check if trigger conditions are met
        // This would integrate with real data sources
        
        // For demo, randomly trigger
        if (Math.random() > 0.95) {
            this.executeWorkflow(workflow.id, {
                trigger: triggerNode.id,
                data: { test: true }
            });
        }
    }
    
    executeWorkflow(workflowId, context) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return;
        
        const execution = {
            id: `exec_${Date.now()}`,
            workflowId,
            status: 'running',
            startTime: new Date().toISOString(),
            context,
            currentNode: null,
            results: []
        };
        
        this.activeInstances.set(execution.id, execution);
        
        // Start execution from trigger
        this.executeNextNode(execution, context.trigger);
        
        // Add to history
        this.addToExecutionHistory(execution);
    }
    
    executeNextNode(execution, nodeId) {
        const workflow = this.workflows.get(execution.workflowId);
        const node = workflow.nodes.find(n => n.id === nodeId);
        
        if (!node) {
            execution.status = 'completed';
            execution.endTime = new Date().toISOString();
            return;
        }
        
        execution.currentNode = nodeId;
        
        // Execute node based on type
        switch (node.type) {
            case 'action':
                this.executeAction(execution, node);
                break;
            case 'condition':
                this.evaluateCondition(execution, node);
                break;
            case 'delay':
                this.executeDelay(execution, node);
                break;
        }
    }
    
    executeAction(execution, node) {
        // Execute the action
        console.log(`Executing action: ${node.data.action}`);
        
        // Record result
        execution.results.push({
            nodeId: node.id,
            type: 'action',
            status: 'success',
            timestamp: new Date().toISOString()
        });
        
        // Find next node
        const nextNodeId = this.findNextNode(execution.workflowId, node.id);
        if (nextNodeId) {
            this.executeNextNode(execution, nextNodeId);
        } else {
            execution.status = 'completed';
            execution.endTime = new Date().toISOString();
        }
    }
    
    evaluateCondition(execution, node) {
        // Evaluate condition
        const result = Math.random() > 0.5; // Random for demo
        
        execution.results.push({
            nodeId: node.id,
            type: 'condition',
            status: 'evaluated',
            result,
            timestamp: new Date().toISOString()
        });
        
        // Find appropriate branch
        // Implementation depends on condition setup
    }
    
    executeDelay(execution, node) {
        const duration = parseInt(node.data.duration) || 1;
        const unit = node.data.unit || 'minutes';
        
        let delayMs = duration;
        switch (unit) {
            case 'minutes':
                delayMs *= 60 * 1000;
                break;
            case 'hours':
                delayMs *= 60 * 60 * 1000;
                break;
            case 'days':
                delayMs *= 24 * 60 * 60 * 1000;
                break;
        }
        
        setTimeout(() => {
            const nextNodeId = this.findNextNode(execution.workflowId, node.id);
            if (nextNodeId) {
                this.executeNextNode(execution, nextNodeId);
            }
        }, delayMs);
    }
    
    findNextNode(workflowId, currentNodeId) {
        const workflow = this.workflows.get(workflowId);
        const connection = workflow.connections.find(c => c.start === currentNodeId);
        return connection ? connection.end : null;
    }
    
    processExecutionQueue() {
        // Process any queued executions
    }
    
    // History
    addToExecutionHistory(execution) {
        this.executionHistory.unshift({
            ...execution,
            workflowName: this.workflows.get(execution.workflowId)?.name || 'Unknown'
        });
        
        // Keep history size manageable
        if (this.executionHistory.length > 100) {
            this.executionHistory = this.executionHistory.slice(0, 50);
        }
        
        this.renderExecutionHistory();
    }
    
    renderExecutionHistory() {
        const container = document.getElementById('execution-history');
        if (!container) return;
        
        container.innerHTML = this.executionHistory.slice(0, 10).map(exec => `
            <div class="history-entry ${exec.status}">
                <div class="history-icon">
                    ${exec.status === 'completed' ? '✅' : exec.status === 'failed' ? '❌' : '⏳'}
                </div>
                <div class="history-content">
                    <div class="history-title">${exec.workflowName}</div>
                    <div class="history-time">${new Date(exec.startTime).toLocaleString()}</div>
                </div>
                <div class="history-status">${exec.status}</div>
            </div>
        `).join('');
    }
    
    clearHistory() {
        this.executionHistory = [];
        this.renderExecutionHistory();
    }
    
    // Statistics
    getWorkflowExecutions(workflowId) {
        return this.executionHistory.filter(e => e.workflowId === workflowId).length;
    }
    
    getTodayExecutions() {
        const today = new Date().toDateString();
        return this.executionHistory.filter(e => 
            new Date(e.startTime).toDateString() === today
        ).length;
    }
    
    // Default Handlers
    registerDefaultHandlers() {
        // Register trigger handlers
        this.triggers.set('leadCreated', (context) => {
            console.log('Lead created trigger:', context);
            return true;
        });
        
        // Register action handlers
        this.actions.set('sendEmail', async (context, params) => {
            console.log('Sending email:', params);
            // Integrate with email service
            return { success: true };
        });
        
        this.actions.set('assignLead', async (context, params) => {
            console.log('Assigning lead:', params);
            // Integrate with lead assignment
            return { success: true, assignedTo: 'agent_123' };
        });
        
        // Register condition handlers
        this.conditions.set('leadScore', (context, params) => {
            const score = context.lead?.score || 0;
            const operator = params.operator || '>';
            const value = parseInt(params.value) || 0;
            
            switch (operator) {
                case '>':
                    return score > value;
                case '<':
                    return score < value;
                case '=':
                    return score === value;
                default:
                    return false;
            }
        });
    }
    
    // Storage
    saveWorkflowsToStorage() {
        const data = Array.from(this.workflows.entries());
        localStorage.setItem('workflowAutomation', JSON.stringify(data));
    }
    
    loadSavedWorkflows() {
        const saved = localStorage.getItem('workflowAutomation');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.workflows = new Map(data);
                this.renderWorkflowList();
            } catch (error) {
                console.error('Error loading workflows:', error);
            }
        }
    }
    
    // Styles
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Workflow Automation Styles */
            .workflow-automation-container {
                padding: 1.5rem;
            }
            
            .workflow-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
            }
            
            .workflow-header h2 {
                margin: 0;
                color: var(--text-primary);
            }
            
            .workflow-controls {
                display: flex;
                gap: 1rem;
            }
            
            /* Workflow List */
            .workflow-list {
                margin-bottom: 2rem;
                padding: 1.5rem;
            }
            
            .list-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
            }
            
            .list-header h3 {
                margin: 0;
            }
            
            .list-stats {
                display: flex;
                gap: 2rem;
            }
            
            .stat-item {
                text-align: center;
            }
            
            .stat-value {
                display: block;
                font-size: 1.5rem;
                font-weight: 600;
                color: var(--primary);
            }
            
            .stat-label {
                font-size: 0.875rem;
                color: var(--text-secondary);
            }
            
            .workflow-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 1.5rem;
            }
            
            .workflow-card {
                padding: 1.5rem;
                position: relative;
                transition: all 0.3s ease;
            }
            
            .workflow-card:hover {
                transform: translateY(-2px);
            }
            
            .workflow-status {
                position: absolute;
                top: 1rem;
                right: 1rem;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.75rem;
                text-transform: uppercase;
                background: var(--bg-primary);
            }
            
            .workflow-status.active {
                color: var(--success);
            }
            
            .workflow-status.paused {
                color: var(--warning);
            }
            
            .workflow-card h4 {
                margin: 0 0 0.5rem 0;
                color: var(--text-primary);
            }
            
            .workflow-card p {
                color: var(--text-secondary);
                font-size: 0.875rem;
                margin-bottom: 1rem;
            }
            
            .workflow-stats {
                display: flex;
                gap: 0.5rem;
                font-size: 0.75rem;
                color: var(--text-secondary);
                margin-bottom: 1rem;
            }
            
            .workflow-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            /* Workflow Builder */
            .workflow-builder-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: var(--bg-primary);
                z-index: 1000;
                display: flex;
                flex-direction: column;
            }
            
            .builder-container {
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            
            .builder-header {
                padding: 1rem 1.5rem;
                background: var(--bg-secondary);
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .builder-header h3 {
                margin: 0;
            }
            
            .builder-actions {
                display: flex;
                gap: 1rem;
            }
            
            .builder-content {
                flex: 1;
                display: flex;
                overflow: hidden;
            }
            
            /* Builder Sidebar */
            .builder-sidebar {
                width: 250px;
                background: var(--bg-secondary);
                border-right: 1px solid var(--border-color);
                padding: 1rem;
                overflow-y: auto;
            }
            
            .component-section {
                margin-bottom: 2rem;
            }
            
            .component-section h4 {
                margin: 0 0 1rem 0;
                color: var(--text-secondary);
                font-size: 0.875rem;
                text-transform: uppercase;
            }
            
            .component-list {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .component-item {
                padding: 0.75rem;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                cursor: move;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.2s ease;
            }
            
            .component-item:hover {
                background: var(--bg-hover);
                transform: translateX(2px);
            }
            
            .component-item.dragging {
                opacity: 0.5;
            }
            
            .component-icon {
                font-size: 1.25rem;
            }
            
            /* Builder Canvas */
            .builder-canvas {
                flex: 1;
                background: var(--bg-primary);
                position: relative;
                overflow: auto;
            }
            
            .builder-canvas.drag-over {
                background: var(--bg-hover);
            }
            
            .canvas-grid {
                width: 100%;
                height: 100%;
                background-image: 
                    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
                background-size: 20px 20px;
                position: relative;
            }
            
            /* Workflow Nodes */
            .workflow-node {
                position: absolute;
                background: var(--bg-secondary);
                border: 2px solid var(--border-color);
                border-radius: 8px;
                min-width: 180px;
                cursor: move;
                transition: all 0.2s ease;
            }
            
            .workflow-node:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            .workflow-node.selected {
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
            }
            
            .workflow-node.dragging {
                opacity: 0.7;
                cursor: grabbing;
            }
            
            .node-header {
                padding: 0.75rem;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .node-icon {
                font-size: 1.25rem;
            }
            
            .node-title {
                flex: 1;
                font-weight: 500;
                color: var(--text-primary);
            }
            
            .node-delete {
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                font-size: 1.25rem;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .node-delete:hover {
                background: var(--danger);
                color: white;
            }
            
            .node-body {
                padding: 0.5rem;
                position: relative;
            }
            
            /* Node Connections */
            .node-input,
            .node-output {
                position: absolute;
                width: 12px;
                height: 12px;
                background: var(--primary);
                border: 2px solid var(--bg-secondary);
                border-radius: 50%;
                cursor: pointer;
            }
            
            .node-input {
                left: -6px;
                top: 50%;
                transform: translateY(-50%);
            }
            
            .node-output {
                right: -6px;
                top: 50%;
                transform: translateY(-50%);
            }
            
            .node-input:hover,
            .node-output:hover {
                transform: translateY(-50%) scale(1.3);
            }
            
            /* Node Types */
            .trigger-node .node-header {
                background: rgba(16, 185, 129, 0.1);
                border-color: var(--success);
            }
            
            .action-node .node-header {
                background: rgba(59, 130, 246, 0.1);
                border-color: var(--primary);
            }
            
            .condition-node .node-header {
                background: rgba(245, 158, 11, 0.1);
                border-color: var(--warning);
            }
            
            .delay-node .node-header {
                background: rgba(139, 92, 246, 0.1);
                border-color: #8b5cf6;
            }
            
            /* Connections */
            .workflow-connection {
                stroke: var(--primary);
                stroke-width: 2;
                fill: none;
                pointer-events: none;
            }
            
            /* Properties Panel */
            .builder-properties {
                width: 300px;
                background: var(--bg-secondary);
                border-left: 1px solid var(--border-color);
                padding: 1rem;
                overflow-y: auto;
            }
            
            .builder-properties h4 {
                margin: 0 0 1rem 0;
                color: var(--text-primary);
            }
            
            .property-group {
                margin-bottom: 1rem;
            }
            
            .property-group label {
                display: block;
                margin-bottom: 0.5rem;
                color: var(--text-secondary);
                font-size: 0.875rem;
            }
            
            .property-input {
                width: 100%;
                padding: 0.5rem;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                color: var(--text-primary);
            }
            
            .empty-state {
                color: var(--text-secondary);
                text-align: center;
                padding: 2rem;
            }
            
            /* Execution History */
            .execution-history {
                padding: 1.5rem;
            }
            
            .history-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .history-header h3 {
                margin: 0;
            }
            
            .history-list {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .history-entry {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.75rem;
                background: var(--bg-primary);
                border-radius: 6px;
                border: 1px solid var(--border-color);
            }
            
            .history-icon {
                font-size: 1.25rem;
            }
            
            .history-content {
                flex: 1;
            }
            
            .history-title {
                font-weight: 500;
                color: var(--text-primary);
            }
            
            .history-time {
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .history-status {
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.75rem;
                text-transform: uppercase;
                background: var(--bg-secondary);
            }
            
            .history-entry.completed .history-status {
                color: var(--success);
            }
            
            .history-entry.failed .history-status {
                color: var(--danger);
            }
            
            .history-entry.running .history-status {
                color: var(--primary);
            }
            
            /* Templates */
            .template-modal {
                max-width: 800px;
            }
            
            .template-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 1rem;
            }
            
            .template-card {
                padding: 1.5rem;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .template-card:hover {
                transform: translateY(-2px);
                border-color: var(--primary);
            }
            
            .template-card h4 {
                margin: 0 0 0.5rem 0;
                color: var(--text-primary);
            }
            
            .template-card p {
                font-size: 0.875rem;
                color: var(--text-secondary);
                margin-bottom: 1rem;
            }
            
            .template-category {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                background: var(--bg-primary);
                border-radius: 20px;
                font-size: 0.75rem;
                color: var(--primary);
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .builder-sidebar {
                    width: 200px;
                }
                
                .builder-properties {
                    width: 250px;
                }
                
                .workflow-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize workflow automation
window.workflowAutomation = new WorkflowAutomation();

// Export for use in other modules
export default WorkflowAutomation; 