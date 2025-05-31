/**
 * Workflow Automation Engine
 * Visual workflow builder with triggers, actions, and rule execution
 */

class WorkflowEngine {
    constructor() {
        this.workflows = new Map();
        this.activeWorkflows = new Map();
        this.executionHistory = [];
        this.templates = new Map();
        this.triggers = new Map();
        this.actions = new Map();
        this.conditions = new Map();
        this.maxHistoryItems = 1000;
        this.executionQueue = [];
        this.isProcessing = false;
        
        // Workflow templates
        this.workflowTemplates = {
            leadAssignment: {
                id: 'template_lead_assignment',
                name: 'Smart Lead Assignment',
                description: 'Automatically assign leads based on agent availability and performance',
                icon: '🎯',
                category: 'leads',
                nodes: [
                    {
                        id: 'trigger_1',
                        type: 'trigger',
                        subtype: 'lead_created',
                        position: { x: 100, y: 100 }
                    },
                    {
                        id: 'condition_1',
                        type: 'condition',
                        subtype: 'lead_value',
                        config: { operator: '>', value: 5000 },
                        position: { x: 300, y: 100 }
                    },
                    {
                        id: 'action_1',
                        type: 'action',
                        subtype: 'assign_to_top_agent',
                        position: { x: 500, y: 50 }
                    },
                    {
                        id: 'action_2',
                        type: 'action',
                        subtype: 'assign_round_robin',
                        position: { x: 500, y: 150 }
                    }
                ],
                connections: [
                    { from: 'trigger_1', to: 'condition_1' },
                    { from: 'condition_1', to: 'action_1', label: 'Yes' },
                    { from: 'condition_1', to: 'action_2', label: 'No' }
                ]
            },
            followUpReminder: {
                id: 'template_follow_up',
                name: 'Follow-up Reminder',
                description: 'Send reminders for leads that haven\'t been contacted',
                icon: '⏰',
                category: 'engagement',
                nodes: [
                    {
                        id: 'trigger_1',
                        type: 'trigger',
                        subtype: 'time_based',
                        config: { schedule: '0 9 * * *' }, // Daily at 9 AM
                        position: { x: 100, y: 100 }
                    },
                    {
                        id: 'condition_1',
                        type: 'condition',
                        subtype: 'lead_status',
                        config: { status: 'New', daysOld: 2 },
                        position: { x: 300, y: 100 }
                    },
                    {
                        id: 'action_1',
                        type: 'action',
                        subtype: 'send_notification',
                        config: { type: 'email', template: 'follow_up_reminder' },
                        position: { x: 500, y: 100 }
                    }
                ],
                connections: [
                    { from: 'trigger_1', to: 'condition_1' },
                    { from: 'condition_1', to: 'action_1', label: 'Match' }
                ]
            },
            performanceAlert: {
                id: 'template_performance',
                name: 'Performance Milestone Alert',
                description: 'Celebrate agent achievements and milestones',
                icon: '🏆',
                category: 'agents',
                nodes: [
                    {
                        id: 'trigger_1',
                        type: 'trigger',
                        subtype: 'agent_milestone',
                        config: { milestone: 'conversion_rate', threshold: 25 },
                        position: { x: 100, y: 100 }
                    },
                    {
                        id: 'action_1',
                        type: 'action',
                        subtype: 'send_notification',
                        config: { type: 'in_app', priority: 'high' },
                        position: { x: 300, y: 50 }
                    },
                    {
                        id: 'action_2',
                        type: 'action',
                        subtype: 'update_agent_tier',
                        config: { tier: 'premium' },
                        position: { x: 300, y: 150 }
                    }
                ],
                connections: [
                    { from: 'trigger_1', to: 'action_1' },
                    { from: 'trigger_1', to: 'action_2' }
                ]
            }
        };
        
        // Available trigger types
        this.triggerTypes = {
            lead_created: {
                name: 'New Lead',
                icon: '📋',
                category: 'leads',
                description: 'Triggered when a new lead is created',
                configurable: false
            },
            lead_status_changed: {
                name: 'Lead Status Changed',
                icon: '🔄',
                category: 'leads',
                description: 'Triggered when lead status changes',
                configurable: true,
                config: {
                    fromStatus: { type: 'select', label: 'From Status', options: ['Any', 'New', 'Contacted', 'Qualified'] },
                    toStatus: { type: 'select', label: 'To Status', options: ['Any', 'Contacted', 'Qualified', 'Converted'] }
                }
            },
            time_based: {
                name: 'Schedule',
                icon: '⏰',
                category: 'system',
                description: 'Triggered on a schedule',
                configurable: true,
                config: {
                    schedule: { type: 'cron', label: 'Schedule', placeholder: '0 9 * * *' },
                    timezone: { type: 'select', label: 'Timezone', options: ['UTC', 'EST', 'PST'] }
                }
            },
            agent_login: {
                name: 'Agent Login',
                icon: '👤',
                category: 'agents',
                description: 'Triggered when an agent logs in',
                configurable: false
            },
            api_webhook: {
                name: 'Webhook',
                icon: '🔗',
                category: 'integrations',
                description: 'Triggered by external webhook',
                configurable: true,
                config: {
                    endpoint: { type: 'text', label: 'Webhook URL', readonly: true }
                }
            }
        };
        
        // Available action types
        this.actionTypes = {
            assign_lead: {
                name: 'Assign Lead',
                icon: '👥',
                category: 'leads',
                description: 'Assign lead to an agent',
                configurable: true,
                config: {
                    method: { 
                        type: 'select', 
                        label: 'Assignment Method',
                        options: ['Round Robin', 'Top Performer', 'Least Busy', 'Specific Agent']
                    },
                    agentId: { type: 'agent-select', label: 'Agent', showIf: 'method:Specific Agent' }
                }
            },
            send_notification: {
                name: 'Send Notification',
                icon: '📧',
                category: 'communication',
                description: 'Send email, SMS, or in-app notification',
                configurable: true,
                config: {
                    type: { type: 'select', label: 'Type', options: ['Email', 'SMS', 'In-App', 'All'] },
                    template: { type: 'template-select', label: 'Template' },
                    recipients: { type: 'multi-select', label: 'Recipients', options: ['Lead', 'Assigned Agent', 'All Agents', 'Admin'] }
                }
            },
            update_field: {
                name: 'Update Field',
                icon: '✏️',
                category: 'data',
                description: 'Update a field value',
                configurable: true,
                config: {
                    entity: { type: 'select', label: 'Entity', options: ['Lead', 'Agent'] },
                    field: { type: 'field-select', label: 'Field' },
                    value: { type: 'text', label: 'Value' }
                }
            },
            create_task: {
                name: 'Create Task',
                icon: '📝',
                category: 'tasks',
                description: 'Create a follow-up task',
                configurable: true,
                config: {
                    title: { type: 'text', label: 'Task Title' },
                    dueIn: { type: 'number', label: 'Due in (hours)' },
                    assignTo: { type: 'select', label: 'Assign To', options: ['Lead Owner', 'Specific Agent'] }
                }
            },
            webhook_call: {
                name: 'Call Webhook',
                icon: '🌐',
                category: 'integrations',
                description: 'Make an HTTP request',
                configurable: true,
                config: {
                    url: { type: 'text', label: 'URL' },
                    method: { type: 'select', label: 'Method', options: ['GET', 'POST', 'PUT'] },
                    headers: { type: 'json', label: 'Headers' },
                    body: { type: 'json', label: 'Body' }
                }
            },
            wait: {
                name: 'Wait',
                icon: '⏸️',
                category: 'control',
                description: 'Wait before continuing',
                configurable: true,
                config: {
                    duration: { type: 'number', label: 'Duration (minutes)' }
                }
            }
        };
        
        // Available condition types
        this.conditionTypes = {
            lead_value: {
                name: 'Lead Value',
                icon: '💰',
                category: 'leads',
                description: 'Check lead monetary value',
                configurable: true,
                config: {
                    operator: { type: 'select', label: 'Operator', options: ['>', '<', '>=', '<=', '=='] },
                    value: { type: 'number', label: 'Value' }
                }
            },
            lead_status: {
                name: 'Lead Status',
                icon: '📊',
                category: 'leads',
                description: 'Check lead status',
                configurable: true,
                config: {
                    status: { type: 'select', label: 'Status', options: ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'] },
                    daysOld: { type: 'number', label: 'Days Old (optional)' }
                }
            },
            agent_availability: {
                name: 'Agent Available',
                icon: '🟢',
                category: 'agents',
                description: 'Check if agents are available',
                configurable: true,
                config: {
                    minAgents: { type: 'number', label: 'Minimum Agents', default: 1 }
                }
            },
            time_window: {
                name: 'Time Window',
                icon: '🕐',
                category: 'system',
                description: 'Check if within time window',
                configurable: true,
                config: {
                    startTime: { type: 'time', label: 'Start Time' },
                    endTime: { type: 'time', label: 'End Time' },
                    days: { type: 'multi-select', label: 'Days', options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
                }
            },
            custom_script: {
                name: 'Custom Script',
                icon: '🔧',
                category: 'advanced',
                description: 'Custom JavaScript condition',
                configurable: true,
                config: {
                    script: { type: 'code', label: 'Script', language: 'javascript' }
                }
            }
        };
        
        this.init();
    }
    
    init() {
        // Create UI components
        this.createWorkflowUI();
        
        // Load saved workflows
        this.loadWorkflows();
        
        // Initialize execution engine
        this.startExecutionEngine();
        
        // Register system event listeners
        this.registerSystemListeners();
        
        console.log('🤖 Workflow engine initialized');
    }
    
    createWorkflowUI() {
        // Create main workflow management UI
        this.createWorkflowManager();
        
        // Create visual workflow builder
        this.createWorkflowBuilder();
        
        // Create execution history viewer
        this.createExecutionHistory();
        
        // Add styles
        this.addStyles();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    createWorkflowManager() {
        const container = document.createElement('div');
        container.className = 'workflow-manager-container';
        container.id = 'workflow-manager';
        container.innerHTML = `
            <div class="workflow-header">
                <h2>🤖 Workflow Automation</h2>
                <div class="workflow-actions">
                    <button class="btn btn-primary" onclick="workflowEngine.createNewWorkflow()">
                        <span>➕</span> Create Workflow
                    </button>
                    <button class="btn btn-secondary" onclick="workflowEngine.showTemplates()">
                        <span>📋</span> Templates
                    </button>
                </div>
            </div>
            
            <div class="workflow-stats">
                <div class="stat-card">
                    <div class="stat-value" id="active-workflows-count">0</div>
                    <div class="stat-label">Active Workflows</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="executions-today">0</div>
                    <div class="stat-label">Executions Today</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="success-rate">0%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
            </div>
            
            <div class="workflow-list" id="workflow-list">
                <!-- Workflows will be listed here -->
            </div>
        `;
        
        // Add to page if admin section exists
        const adminMain = document.querySelector('.admin-main');
        if (adminMain) {
            const section = document.createElement('section');
            section.className = 'workflow-section';
            section.appendChild(container);
            adminMain.appendChild(section);
        }
    }
    
    createWorkflowBuilder() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'workflow-builder-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal workflow-builder-modal">
                <div class="modal-header">
                    <h3 id="workflow-builder-title">Workflow Builder</h3>
                    <div class="builder-actions">
                        <button class="btn btn-sm btn-secondary" onclick="workflowEngine.testWorkflow()">
                            🧪 Test
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="workflowEngine.saveWorkflow()">
                            💾 Save
                        </button>
                        <button class="modal-close" onclick="workflowEngine.closeBuilder()">&times;</button>
                    </div>
                </div>
                <div class="modal-body workflow-builder-body">
                    <div class="builder-sidebar">
                        <div class="builder-section">
                            <h4>Workflow Details</h4>
                            <input type="text" id="workflow-name" placeholder="Workflow Name" class="form-input">
                            <textarea id="workflow-description" placeholder="Description" class="form-input" rows="3"></textarea>
                        </div>
                        
                        <div class="builder-section">
                            <h4>Triggers</h4>
                            <div class="node-palette" id="trigger-palette">
                                ${Object.entries(this.triggerTypes).map(([key, trigger]) => `
                                    <div class="palette-item" draggable="true" data-type="trigger" data-subtype="${key}">
                                        <span class="palette-icon">${trigger.icon}</span>
                                        <span class="palette-name">${trigger.name}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="builder-section">
                            <h4>Actions</h4>
                            <div class="node-palette" id="action-palette">
                                ${Object.entries(this.actionTypes).map(([key, action]) => `
                                    <div class="palette-item" draggable="true" data-type="action" data-subtype="${key}">
                                        <span class="palette-icon">${action.icon}</span>
                                        <span class="palette-name">${action.name}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="builder-section">
                            <h4>Conditions</h4>
                            <div class="node-palette" id="condition-palette">
                                ${Object.entries(this.conditionTypes).map(([key, condition]) => `
                                    <div class="palette-item" draggable="true" data-type="condition" data-subtype="${key}">
                                        <span class="palette-icon">${condition.icon}</span>
                                        <span class="palette-name">${condition.name}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="builder-canvas-container">
                        <div class="canvas-toolbar">
                            <button class="btn-icon" onclick="workflowEngine.zoomIn()" data-tooltip="Zoom In">➕</button>
                            <button class="btn-icon" onclick="workflowEngine.zoomOut()" data-tooltip="Zoom Out">➖</button>
                            <button class="btn-icon" onclick="workflowEngine.fitToScreen()" data-tooltip="Fit to Screen">⛶</button>
                            <button class="btn-icon" onclick="workflowEngine.clearCanvas()" data-tooltip="Clear">🗑️</button>
                        </div>
                        <div class="builder-canvas" id="workflow-canvas">
                            <svg id="workflow-svg" width="100%" height="100%">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                                            refX="9" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                                    </marker>
                                </defs>
                                <g id="connections-group"></g>
                                <g id="nodes-group"></g>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    createExecutionHistory() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'execution-history-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal glass-modal large">
                <div class="modal-header">
                    <h3>Workflow Execution History</h3>
                    <button class="modal-close" onclick="workflowEngine.closeExecutionHistory()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="execution-filters">
                        <select id="workflow-filter" class="form-input">
                            <option value="">All Workflows</option>
                        </select>
                        <select id="status-filter" class="form-input">
                            <option value="">All Status</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                            <option value="running">Running</option>
                        </select>
                        <input type="date" id="date-filter" class="form-input">
                    </div>
                    
                    <div class="execution-list" id="execution-list">
                        <!-- Execution history will be displayed here -->
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Workflow Manager */
            .workflow-section {
                margin-top: 2rem;
            }
            
            .workflow-manager-container {
                background: var(--bg-secondary);
                border-radius: 12px;
                padding: 1.5rem;
                border: 1px solid var(--border-color);
            }
            
            .workflow-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
            }
            
            .workflow-header h2 {
                margin: 0;
                color: var(--text-primary);
            }
            
            .workflow-actions {
                display: flex;
                gap: 1rem;
            }
            
            .workflow-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .workflow-list {
                display: grid;
                gap: 1rem;
            }
            
            .workflow-item {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.2s ease;
            }
            
            .workflow-item:hover {
                border-color: var(--primary);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .workflow-info {
                flex: 1;
            }
            
            .workflow-name {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 0.25rem;
            }
            
            .workflow-meta {
                font-size: 0.875rem;
                color: var(--text-secondary);
            }
            
            .workflow-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            .workflow-status.active {
                background: rgba(16, 185, 129, 0.1);
                color: var(--success);
            }
            
            .workflow-status.inactive {
                background: rgba(107, 114, 128, 0.1);
                color: var(--text-secondary);
            }
            
            .workflow-controls {
                display: flex;
                gap: 0.5rem;
            }
            
            /* Workflow Builder */
            .workflow-builder-modal {
                width: 90vw;
                max-width: 1400px;
                height: 80vh;
            }
            
            .workflow-builder-body {
                display: flex;
                height: 100%;
                gap: 1rem;
                padding: 0;
            }
            
            .builder-sidebar {
                width: 300px;
                background: var(--bg-primary);
                border-right: 1px solid var(--border-color);
                padding: 1rem;
                overflow-y: auto;
            }
            
            .builder-section {
                margin-bottom: 2rem;
            }
            
            .builder-section h4 {
                margin-bottom: 1rem;
                color: var(--text-primary);
            }
            
            .node-palette {
                display: grid;
                gap: 0.5rem;
            }
            
            .palette-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                cursor: move;
                transition: all 0.2s ease;
            }
            
            .palette-item:hover {
                border-color: var(--primary);
                background: rgba(66, 153, 225, 0.05);
            }
            
            .palette-item.dragging {
                opacity: 0.5;
            }
            
            .palette-icon {
                font-size: 1.25rem;
            }
            
            .palette-name {
                font-size: 0.875rem;
                color: var(--text-primary);
            }
            
            /* Canvas */
            .builder-canvas-container {
                flex: 1;
                display: flex;
                flex-direction: column;
                background: var(--bg-primary);
            }
            
            .canvas-toolbar {
                display: flex;
                gap: 0.5rem;
                padding: 0.5rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .builder-canvas {
                flex: 1;
                position: relative;
                overflow: hidden;
                background-image: 
                    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
                background-size: 20px 20px;
            }
            
            #workflow-svg {
                position: absolute;
                top: 0;
                left: 0;
            }
            
            /* Workflow Nodes */
            .workflow-node {
                position: absolute;
                background: var(--bg-secondary);
                border: 2px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
                min-width: 150px;
                cursor: move;
                transition: all 0.2s ease;
            }
            
            .workflow-node.selected {
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
            }
            
            .workflow-node.trigger {
                border-color: var(--success);
            }
            
            .workflow-node.action {
                border-color: var(--primary);
            }
            
            .workflow-node.condition {
                border-color: var(--warning);
                border-radius: 0;
                transform: rotate(45deg);
            }
            
            .workflow-node.condition .node-content {
                transform: rotate(-45deg);
            }
            
            .node-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }
            
            .node-icon {
                font-size: 1.25rem;
            }
            
            .node-title {
                font-weight: 600;
                color: var(--text-primary);
                font-size: 0.875rem;
            }
            
            .node-config {
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .node-ports {
                position: absolute;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
                pointer-events: none;
            }
            
            .node-port {
                position: absolute;
                width: 12px;
                height: 12px;
                background: var(--primary);
                border: 2px solid var(--bg-secondary);
                border-radius: 50%;
                cursor: crosshair;
                pointer-events: all;
                transition: all 0.2s ease;
            }
            
            .node-port:hover {
                transform: scale(1.2);
            }
            
            .node-port.input {
                left: -6px;
                top: 50%;
                transform: translateY(-50%);
            }
            
            .node-port.output {
                right: -6px;
                top: 50%;
                transform: translateY(-50%);
            }
            
            /* Connections */
            .workflow-connection {
                stroke: var(--border-color);
                stroke-width: 2;
                fill: none;
                pointer-events: stroke;
                transition: all 0.2s ease;
            }
            
            .workflow-connection:hover {
                stroke: var(--primary);
                stroke-width: 3;
            }
            
            .workflow-connection.selected {
                stroke: var(--primary);
                stroke-width: 3;
            }
            
            /* Execution History */
            .execution-filters {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }
            
            .execution-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                max-height: 500px;
                overflow-y: auto;
            }
            
            .execution-item {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
            }
            
            .execution-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .execution-workflow {
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .execution-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            .execution-status.success {
                background: rgba(16, 185, 129, 0.1);
                color: var(--success);
            }
            
            .execution-status.failed {
                background: rgba(239, 68, 68, 0.1);
                color: var(--danger);
            }
            
            .execution-status.running {
                background: rgba(59, 130, 246, 0.1);
                color: var(--primary);
            }
            
            .execution-details {
                font-size: 0.875rem;
                color: var(--text-secondary);
            }
            
            .execution-timeline {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border-color);
            }
            
            .timeline-step {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
                font-size: 0.75rem;
            }
            
            .timeline-time {
                color: var(--text-secondary);
                min-width: 60px;
            }
            
            .timeline-event {
                color: var(--text-primary);
            }
            
            /* Node Configuration Modal */
            .node-config-modal {
                position: absolute;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
                box-shadow: var(--shadow-lg);
                z-index: 1000;
                min-width: 300px;
            }
            
            .config-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .config-title {
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .config-form {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            
            .config-field {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            
            .config-label {
                font-size: 0.875rem;
                font-weight: 500;
                color: var(--text-primary);
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .workflow-builder-modal {
                    width: 100vw;
                    height: 100vh;
                    max-width: none;
                }
                
                .builder-sidebar {
                    width: 250px;
                }
                
                .workflow-stats {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Drag and drop for workflow builder
        this.setupDragAndDrop();
        
        // Canvas interactions
        this.setupCanvasInteractions();
        
        // Node interactions
        this.setupNodeInteractions();
        
        // Connection interactions
        this.setupConnectionInteractions();
    }
    
    setupDragAndDrop() {
        // Palette items drag start
        document.querySelectorAll('.palette-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('nodeType', item.dataset.type);
                e.dataTransfer.setData('nodeSubtype', item.dataset.subtype);
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
            });
        });
        
        // Canvas drop
        const canvas = document.getElementById('workflow-canvas');
        if (canvas) {
            canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });
            
            canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('nodeType');
                const subtype = e.dataTransfer.getData('nodeSubtype');
                
                if (type && subtype) {
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    this.addNode(type, subtype, { x, y });
                }
            });
        }
    }
    
    setupCanvasInteractions() {
        const canvas = document.getElementById('workflow-canvas');
        if (!canvas) return;
        
        let isPanning = false;
        let startX = 0;
        let startY = 0;
        let scrollLeft = 0;
        let scrollTop = 0;
        
        canvas.addEventListener('mousedown', (e) => {
            if (e.target === canvas || e.target.id === 'workflow-svg') {
                isPanning = true;
                startX = e.pageX - canvas.offsetLeft;
                startY = e.pageY - canvas.offsetTop;
                scrollLeft = canvas.scrollLeft;
                scrollTop = canvas.scrollTop;
                canvas.style.cursor = 'grabbing';
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            e.preventDefault();
            const x = e.pageX - canvas.offsetLeft;
            const y = e.pageY - canvas.offsetTop;
            const walkX = (x - startX) * 1;
            const walkY = (y - startY) * 1;
            canvas.scrollLeft = scrollLeft - walkX;
            canvas.scrollTop = scrollTop - walkY;
        });
        
        canvas.addEventListener('mouseup', () => {
            isPanning = false;
            canvas.style.cursor = 'default';
        });
        
        canvas.addEventListener('mouseleave', () => {
            isPanning = false;
            canvas.style.cursor = 'default';
        });
    }
    
    setupNodeInteractions() {
        // Node selection, dragging, and configuration
        // Implemented in addNode method
    }
    
    setupConnectionInteractions() {
        // Connection creation and deletion
        // Implemented in node port interactions
    }
    
    // Workflow Management Methods
    createNewWorkflow() {
        this.currentWorkflow = {
            id: `workflow_${Date.now()}`,
            name: '',
            description: '',
            nodes: [],
            connections: [],
            isActive: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.openBuilder();
    }
    
    showTemplates() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal glass-modal">
                <div class="modal-header">
                    <h3>Workflow Templates</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="template-grid">
                        ${Object.values(this.workflowTemplates).map(template => `
                            <div class="template-card" onclick="workflowEngine.useTemplate('${template.id}')">
                                <div class="template-icon">${template.icon}</div>
                                <div class="template-name">${template.name}</div>
                                <div class="template-description">${template.description}</div>
                                <div class="template-category">${template.category}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add template styles
        const style = document.createElement('style');
        style.textContent = `
            .template-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 1rem;
            }
            
            .template-card {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1.5rem;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: center;
            }
            
            .template-card:hover {
                border-color: var(--primary);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .template-icon {
                font-size: 2.5rem;
                margin-bottom: 0.5rem;
            }
            
            .template-name {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 0.5rem;
            }
            
            .template-description {
                font-size: 0.875rem;
                color: var(--text-secondary);
                margin-bottom: 0.5rem;
            }
            
            .template-category {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                background: var(--bg-secondary);
                border-radius: 20px;
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
        `;
        document.head.appendChild(style);
    }
    
    useTemplate(templateId) {
        const template = this.workflowTemplates[templateId];
        if (!template) return;
        
        this.currentWorkflow = {
            id: `workflow_${Date.now()}`,
            name: template.name,
            description: template.description,
            nodes: [...template.nodes],
            connections: [...template.connections],
            isActive: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Close template modal
        document.querySelector('.modal-overlay')?.remove();
        
        // Open builder with template
        this.openBuilder();
        
        // Render template nodes
        this.renderWorkflow();
    }
    
    openBuilder() {
        const modal = document.getElementById('workflow-builder-modal');
        if (modal) {
            modal.style.display = 'block';
            
            // Set workflow details
            document.getElementById('workflow-name').value = this.currentWorkflow.name || '';
            document.getElementById('workflow-description').value = this.currentWorkflow.description || '';
            
            // Clear canvas
            this.clearCanvas();
            
            // Render existing nodes if any
            if (this.currentWorkflow.nodes.length > 0) {
                this.renderWorkflow();
            }
        }
    }
    
    closeBuilder() {
        document.getElementById('workflow-builder-modal').style.display = 'none';
        this.currentWorkflow = null;
    }
    
    // Canvas Methods
    addNode(type, subtype, position) {
        const nodeId = `node_${Date.now()}`;
        const typeConfig = this[`${type}Types`][subtype];
        
        if (!typeConfig) return;
        
        const node = {
            id: nodeId,
            type: type,
            subtype: subtype,
            position: position,
            config: {}
        };
        
        // Add to current workflow
        if (this.currentWorkflow) {
            this.currentWorkflow.nodes.push(node);
        }
        
        // Create DOM element
        const nodeElement = document.createElement('div');
        nodeElement.className = `workflow-node ${type}`;
        nodeElement.id = nodeId;
        nodeElement.style.left = `${position.x}px`;
        nodeElement.style.top = `${position.y}px`;
        nodeElement.innerHTML = `
            <div class="node-content">
                <div class="node-header">
                    <span class="node-icon">${typeConfig.icon}</span>
                    <span class="node-title">${typeConfig.name}</span>
                </div>
                <div class="node-config">Click to configure</div>
            </div>
            <div class="node-ports">
                ${type !== 'trigger' ? '<div class="node-port input"></div>' : ''}
                ${type !== 'action' || subtype === 'wait' ? '<div class="node-port output"></div>' : ''}
            </div>
        `;
        
        // Add to canvas
        document.getElementById('workflow-canvas').appendChild(nodeElement);
        
        // Make draggable
        this.makeNodeDraggable(nodeElement);
        
        // Add click handler for configuration
        nodeElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('node-port')) {
                this.configureNode(node);
            }
        });
        
        // Add port handlers
        nodeElement.querySelectorAll('.node-port').forEach(port => {
            port.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handlePortClick(nodeId, port.classList.contains('output') ? 'output' : 'input');
            });
        });
    }
    
    makeNodeDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        
        element.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        
        function dragStart(e) {
            if (e.target.classList.contains('node-port')) return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            
            if (e.target.closest('.workflow-node') === element) {
                isDragging = true;
            }
        }
        
        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                
                xOffset = currentX;
                yOffset = currentY;
                
                element.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        }
        
        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            
            // Update node position in workflow
            const node = workflowEngine.currentWorkflow?.nodes.find(n => n.id === element.id);
            if (node) {
                const rect = element.getBoundingClientRect();
                const canvas = document.getElementById('workflow-canvas');
                const canvasRect = canvas.getBoundingClientRect();
                node.position = {
                    x: rect.left - canvasRect.left + canvas.scrollLeft,
                    y: rect.top - canvasRect.top + canvas.scrollTop
                };
            }
        }
    }
    
    configureNode(node) {
        const typeConfig = this[`${node.type}Types`][node.subtype];
        if (!typeConfig.configurable) return;
        
        // Create configuration modal
        const modal = document.createElement('div');
        modal.className = 'node-config-modal';
        modal.innerHTML = `
            <div class="config-header">
                <span class="config-title">${typeConfig.icon} ${typeConfig.name}</span>
                <button class="btn-icon" onclick="this.closest('.node-config-modal').remove()">✕</button>
            </div>
            <div class="config-form">
                ${Object.entries(typeConfig.config).map(([key, field]) => `
                    <div class="config-field">
                        <label class="config-label">${field.label}</label>
                        ${this.renderConfigField(key, field, node.config[key])}
                    </div>
                `).join('')}
            </div>
            <div class="config-actions">
                <button class="btn btn-primary btn-sm" onclick="workflowEngine.saveNodeConfig('${node.id}', this)">
                    Save
                </button>
            </div>
        `;
        
        // Position near node
        const nodeElement = document.getElementById(node.id);
        const rect = nodeElement.getBoundingClientRect();
        modal.style.left = `${rect.right + 10}px`;
        modal.style.top = `${rect.top}px`;
        
        document.body.appendChild(modal);
    }
    
    renderConfigField(key, field, value) {
        switch (field.type) {
            case 'text':
                return `<input type="text" class="form-input" data-key="${key}" value="${value || ''}" placeholder="${field.placeholder || ''}">`;
            
            case 'number':
                return `<input type="number" class="form-input" data-key="${key}" value="${value || field.default || ''}" min="${field.min || 0}">`;
            
            case 'select':
                return `
                    <select class="form-input" data-key="${key}">
                        ${field.options.map(opt => `
                            <option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>
                        `).join('')}
                    </select>
                `;
            
            case 'multi-select':
                return `
                    <select class="form-input" data-key="${key}" multiple>
                        ${field.options.map(opt => `
                            <option value="${opt}" ${value?.includes(opt) ? 'selected' : ''}>${opt}</option>
                        `).join('')}
                    </select>
                `;
            
            case 'time':
                return `<input type="time" class="form-input" data-key="${key}" value="${value || ''}">`;
            
            case 'cron':
                return `<input type="text" class="form-input" data-key="${key}" value="${value || ''}" placeholder="${field.placeholder || '* * * * *'}">`;
            
            case 'json':
            case 'code':
                return `<textarea class="form-input" data-key="${key}" rows="4" placeholder="${field.placeholder || ''}">${value || ''}</textarea>`;
            
            default:
                return `<input type="text" class="form-input" data-key="${key}" value="${value || ''}">`;
        }
    }
    
    saveNodeConfig(nodeId, button) {
        const modal = button.closest('.node-config-modal');
        const node = this.currentWorkflow?.nodes.find(n => n.id === nodeId);
        
        if (!node) return;
        
        // Collect config values
        modal.querySelectorAll('[data-key]').forEach(input => {
            const key = input.dataset.key;
            if (input.multiple) {
                node.config[key] = Array.from(input.selectedOptions).map(opt => opt.value);
            } else {
                node.config[key] = input.value;
            }
        });
        
        // Update node display
        const nodeElement = document.getElementById(nodeId);
        const configDiv = nodeElement.querySelector('.node-config');
        if (configDiv) {
            const configSummary = Object.entries(node.config)
                .filter(([k, v]) => v)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join(', ');
            configDiv.textContent = configSummary || 'Click to configure';
        }
        
        // Close modal
        modal.remove();
    }
    
    handlePortClick(nodeId, portType) {
        if (!this.connectionStart) {
            // Start connection
            if (portType === 'output') {
                this.connectionStart = { nodeId, portType };
                // Visual feedback
                document.getElementById(nodeId).classList.add('connecting');
            }
        } else {
            // Complete connection
            if (portType === 'input' && this.connectionStart.nodeId !== nodeId) {
                this.createConnection(this.connectionStart.nodeId, nodeId);
                
                // Clear visual feedback
                document.getElementById(this.connectionStart.nodeId).classList.remove('connecting');
                this.connectionStart = null;
            } else {
                // Cancel connection
                document.getElementById(this.connectionStart.nodeId).classList.remove('connecting');
                this.connectionStart = null;
            }
        }
    }
    
    createConnection(fromNodeId, toNodeId) {
        const connection = {
            id: `conn_${Date.now()}`,
            from: fromNodeId,
            to: toNodeId
        };
        
        // Add to workflow
        if (this.currentWorkflow) {
            this.currentWorkflow.connections.push(connection);
        }
        
        // Draw connection
        this.drawConnection(connection);
    }
    
    drawConnection(connection) {
        const svg = document.getElementById('workflow-svg');
        const fromNode = document.getElementById(connection.from);
        const toNode = document.getElementById(connection.to);
        
        if (!fromNode || !toNode) return;
        
        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        
        const fromX = fromRect.right - svgRect.left;
        const fromY = fromRect.top + fromRect.height / 2 - svgRect.top;
        const toX = toRect.left - svgRect.left;
        const toY = toRect.top + toRect.height / 2 - svgRect.top;
        
        // Create curved path
        const midX = (fromX + toX) / 2;
        const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
        
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', path);
        pathElement.setAttribute('class', 'workflow-connection');
        pathElement.setAttribute('id', connection.id);
        pathElement.setAttribute('marker-end', 'url(#arrowhead)');
        
        document.getElementById('connections-group').appendChild(pathElement);
    }
    
    renderWorkflow() {
        // Clear canvas
        this.clearCanvas();
        
        // Render nodes
        this.currentWorkflow.nodes.forEach(node => {
            this.addNode(node.type, node.subtype, node.position);
            
            // Restore node config
            const nodeElement = document.getElementById(node.id);
            if (nodeElement && Object.keys(node.config).length > 0) {
                const configDiv = nodeElement.querySelector('.node-config');
                if (configDiv) {
                    const configSummary = Object.entries(node.config)
                        .filter(([k, v]) => v)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join(', ');
                    configDiv.textContent = configSummary || 'Click to configure';
                }
            }
        });
        
        // Render connections
        setTimeout(() => {
            this.currentWorkflow.connections.forEach(conn => {
                this.drawConnection(conn);
            });
        }, 100);
    }
    
    clearCanvas() {
        const canvas = document.getElementById('workflow-canvas');
        if (canvas) {
            // Remove all nodes
            canvas.querySelectorAll('.workflow-node').forEach(node => node.remove());
            
            // Clear connections
            const connectionsGroup = document.getElementById('connections-group');
            if (connectionsGroup) {
                connectionsGroup.innerHTML = '';
            }
        }
    }
    
    // Workflow Actions
    saveWorkflow() {
        if (!this.currentWorkflow) return;
        
        // Update workflow details
        this.currentWorkflow.name = document.getElementById('workflow-name').value || 'Untitled Workflow';
        this.currentWorkflow.description = document.getElementById('workflow-description').value || '';
        this.currentWorkflow.updatedAt = new Date().toISOString();
        
        // Validate workflow
        const validation = this.validateWorkflow();
        if (!validation.isValid) {
            this.showToast(validation.message, 'error');
            return;
        }
        
        // Save to storage
        this.workflows.set(this.currentWorkflow.id, this.currentWorkflow);
        this.saveWorkflows();
        
        // Update UI
        this.renderWorkflowList();
        this.closeBuilder();
        
        this.showToast('Workflow saved successfully', 'success');
    }
    
    validateWorkflow() {
        const workflow = this.currentWorkflow;
        
        // Check for at least one trigger
        const triggers = workflow.nodes.filter(n => n.type === 'trigger');
        if (triggers.length === 0) {
            return { isValid: false, message: 'Workflow must have at least one trigger' };
        }
        
        // Check for at least one action
        const actions = workflow.nodes.filter(n => n.type === 'action');
        if (actions.length === 0) {
            return { isValid: false, message: 'Workflow must have at least one action' };
        }
        
        // Check for orphaned nodes
        const connectedNodes = new Set();
        workflow.connections.forEach(conn => {
            connectedNodes.add(conn.from);
            connectedNodes.add(conn.to);
        });
        
        const orphanedNodes = workflow.nodes.filter(node => 
            !connectedNodes.has(node.id) && workflow.nodes.length > 1
        );
        
        if (orphanedNodes.length > 0) {
            return { isValid: false, message: 'All nodes must be connected' };
        }
        
        return { isValid: true };
    }
    
    testWorkflow() {
        if (!this.currentWorkflow) return;
        
        const validation = this.validateWorkflow();
        if (!validation.isValid) {
            this.showToast(validation.message, 'error');
            return;
        }
        
        // Create test execution
        const execution = {
            id: `exec_${Date.now()}`,
            workflowId: this.currentWorkflow.id,
            workflowName: this.currentWorkflow.name || 'Test Workflow',
            status: 'running',
            startTime: new Date().toISOString(),
            steps: [],
            testMode: true
        };
        
        // Simulate execution
        this.simulateExecution(execution);
        
        this.showToast('Test execution started', 'info');
    }
    
    async simulateExecution(execution) {
        const workflow = this.currentWorkflow;
        
        // Find trigger nodes
        const triggers = workflow.nodes.filter(n => n.type === 'trigger');
        
        for (const trigger of triggers) {
            execution.steps.push({
                nodeId: trigger.id,
                type: 'trigger',
                status: 'success',
                timestamp: new Date().toISOString(),
                message: `Trigger "${this.triggerTypes[trigger.subtype].name}" fired`
            });
            
            // Execute connected nodes
            await this.executeConnectedNodes(trigger.id, execution);
        }
        
        // Complete execution
        execution.status = 'success';
        execution.endTime = new Date().toISOString();
        
        // Add to history
        this.addToExecutionHistory(execution);
        
        this.showToast('Test execution completed', 'success');
    }
    
    async executeConnectedNodes(nodeId, execution) {
        const workflow = this.currentWorkflow;
        const connections = workflow.connections.filter(c => c.from === nodeId);
        
        for (const connection of connections) {
            const node = workflow.nodes.find(n => n.id === connection.to);
            if (!node) continue;
            
            // Simulate node execution
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (node.type === 'condition') {
                // Simulate condition evaluation
                const passed = Math.random() > 0.5;
                execution.steps.push({
                    nodeId: node.id,
                    type: 'condition',
                    status: 'success',
                    timestamp: new Date().toISOString(),
                    message: `Condition "${this.conditionTypes[node.subtype].name}" evaluated to ${passed}`,
                    result: passed
                });
                
                // Execute appropriate branch
                if (passed) {
                    await this.executeConnectedNodes(node.id, execution);
                }
            } else if (node.type === 'action') {
                // Simulate action execution
                execution.steps.push({
                    nodeId: node.id,
                    type: 'action',
                    status: 'success',
                    timestamp: new Date().toISOString(),
                    message: `Action "${this.actionTypes[node.subtype].name}" executed`
                });
                
                // Continue to connected nodes
                await this.executeConnectedNodes(node.id, execution);
            }
        }
    }
    
    // Workflow List Management
    renderWorkflowList() {
        const container = document.getElementById('workflow-list');
        if (!container) return;
        
        const workflowsArray = Array.from(this.workflows.values());
        
        if (workflowsArray.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No workflows created yet</p>
                    <button class="btn btn-primary" onclick="workflowEngine.createNewWorkflow()">
                        Create Your First Workflow
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = workflowsArray.map(workflow => `
            <div class="workflow-item">
                <div class="workflow-info">
                    <div class="workflow-name">${workflow.name}</div>
                    <div class="workflow-meta">
                        ${workflow.description || 'No description'} • 
                        Created ${this.formatDate(workflow.createdAt)}
                    </div>
                </div>
                <div class="workflow-status ${workflow.isActive ? 'active' : 'inactive'}">
                    <span class="status-dot"></span>
                    ${workflow.isActive ? 'Active' : 'Inactive'}
                </div>
                <div class="workflow-controls">
                    <button class="btn-icon" onclick="workflowEngine.editWorkflow('${workflow.id}')" data-tooltip="Edit">
                        ✏️
                    </button>
                    <button class="btn-icon" onclick="workflowEngine.toggleWorkflow('${workflow.id}')" data-tooltip="${workflow.isActive ? 'Deactivate' : 'Activate'}">
                        ${workflow.isActive ? '⏸️' : '▶️'}
                    </button>
                    <button class="btn-icon" onclick="workflowEngine.viewExecutions('${workflow.id}')" data-tooltip="View History">
                        📊
                    </button>
                    <button class="btn-icon" onclick="workflowEngine.deleteWorkflow('${workflow.id}')" data-tooltip="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
        
        // Update stats
        this.updateStats();
    }
    
    editWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return;
        
        this.currentWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone
        this.openBuilder();
    }
    
    toggleWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return;
        
        workflow.isActive = !workflow.isActive;
        workflow.updatedAt = new Date().toISOString();
        
        if (workflow.isActive) {
            this.activateWorkflow(workflow);
        } else {
            this.deactivateWorkflow(workflow);
        }
        
        this.saveWorkflows();
        this.renderWorkflowList();
        
        this.showToast(
            `Workflow ${workflow.isActive ? 'activated' : 'deactivated'}`,
            workflow.isActive ? 'success' : 'info'
        );
    }
    
    deleteWorkflow(workflowId) {
        if (!confirm('Are you sure you want to delete this workflow?')) return;
        
        const workflow = this.workflows.get(workflowId);
        if (workflow?.isActive) {
            this.deactivateWorkflow(workflow);
        }
        
        this.workflows.delete(workflowId);
        this.saveWorkflows();
        this.renderWorkflowList();
        
        this.showToast('Workflow deleted', 'success');
    }
    
    viewExecutions(workflowId) {
        const modal = document.getElementById('execution-history-modal');
        if (modal) {
            modal.style.display = 'block';
            
            // Filter by workflow
            const filterSelect = document.getElementById('workflow-filter');
            if (filterSelect) {
                filterSelect.value = workflowId;
            }
            
            this.renderExecutionHistory(workflowId);
        }
    }
    
    closeExecutionHistory() {
        document.getElementById('execution-history-modal').style.display = 'none';
    }
    
    // Execution Engine
    startExecutionEngine() {
        // Process execution queue
        setInterval(() => {
            if (!this.isProcessing && this.executionQueue.length > 0) {
                this.processNextExecution();
            }
        }, 1000);
        
        // Clean up old history
        setInterval(() => {
            this.cleanupExecutionHistory();
        }, 3600000); // Every hour
    }
    
    async processNextExecution() {
        if (this.executionQueue.length === 0) return;
        
        this.isProcessing = true;
        const execution = this.executionQueue.shift();
        
        try {
            await this.executeWorkflow(execution);
        } catch (error) {
            console.error('Workflow execution failed:', error);
            execution.status = 'failed';
            execution.error = error.message;
        }
        
        this.isProcessing = false;
    }
    
    async executeWorkflow(execution) {
        // This would integrate with the actual backend
        // For now, we'll simulate execution
        console.log('Executing workflow:', execution);
        
        // Add to history
        this.addToExecutionHistory(execution);
    }
    
    // Workflow Activation
    activateWorkflow(workflow) {
        // Register triggers
        workflow.nodes
            .filter(n => n.type === 'trigger')
            .forEach(trigger => {
                this.registerTrigger(workflow.id, trigger);
            });
        
        this.activeWorkflows.set(workflow.id, workflow);
    }
    
    deactivateWorkflow(workflow) {
        // Unregister triggers
        workflow.nodes
            .filter(n => n.type === 'trigger')
            .forEach(trigger => {
                this.unregisterTrigger(workflow.id, trigger);
            });
        
        this.activeWorkflows.delete(workflow.id);
    }
    
    registerTrigger(workflowId, trigger) {
        const triggerId = `${workflowId}_${trigger.id}`;
        
        switch (trigger.subtype) {
            case 'time_based':
                // Schedule cron job
                console.log('Scheduling cron job:', trigger.config.schedule);
                break;
                
            case 'lead_created':
                // Listen for lead creation events
                this.triggers.set(triggerId, {
                    type: 'event',
                    event: 'lead.created',
                    handler: (data) => this.handleTrigger(workflowId, trigger.id, data)
                });
                break;
                
            // Add other trigger types...
        }
    }
    
    unregisterTrigger(workflowId, trigger) {
        const triggerId = `${workflowId}_${trigger.id}`;
        this.triggers.delete(triggerId);
    }
    
    handleTrigger(workflowId, triggerId, data) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) return;
        
        const execution = {
            id: `exec_${Date.now()}`,
            workflowId: workflowId,
            workflowName: workflow.name,
            triggerId: triggerId,
            triggerData: data,
            status: 'queued',
            queuedAt: new Date().toISOString()
        };
        
        this.executionQueue.push(execution);
    }
    
    // System Event Listeners
    registerSystemListeners() {
        // Listen for system events
        document.addEventListener('lead.created', (e) => {
            this.triggers.forEach(trigger => {
                if (trigger.event === 'lead.created') {
                    trigger.handler(e.detail);
                }
            });
        });
        
        // Add other system event listeners...
    }
    
    // Execution History
    addToExecutionHistory(execution) {
        this.executionHistory.unshift(execution);
        
        if (this.executionHistory.length > this.maxHistoryItems) {
            this.executionHistory = this.executionHistory.slice(0, this.maxHistoryItems);
        }
        
        this.saveExecutionHistory();
        this.updateStats();
    }
    
    renderExecutionHistory(workflowId = null) {
        const container = document.getElementById('execution-list');
        if (!container) return;
        
        let executions = this.executionHistory;
        
        // Apply filters
        if (workflowId) {
            executions = executions.filter(e => e.workflowId === workflowId);
        }
        
        if (executions.length === 0) {
            container.innerHTML = '<p class="empty-state">No executions found</p>';
            return;
        }
        
        container.innerHTML = executions.map(execution => `
            <div class="execution-item">
                <div class="execution-header">
                    <span class="execution-workflow">${execution.workflowName}</span>
                    <span class="execution-status ${execution.status}">${execution.status}</span>
                </div>
                <div class="execution-details">
                    Started: ${this.formatDateTime(execution.startTime || execution.queuedAt)}
                    ${execution.endTime ? ` • Duration: ${this.calculateDuration(execution.startTime, execution.endTime)}` : ''}
                </div>
                ${execution.steps && execution.steps.length > 0 ? `
                    <div class="execution-timeline">
                        ${execution.steps.map(step => `
                            <div class="timeline-step">
                                <span class="timeline-time">${this.formatTime(step.timestamp)}</span>
                                <span class="timeline-event">${step.message}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    cleanupExecutionHistory() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days
        
        this.executionHistory = this.executionHistory.filter(execution => {
            const executionDate = new Date(execution.startTime || execution.queuedAt);
            return executionDate > cutoffDate;
        });
        
        this.saveExecutionHistory();
    }
    
    // Stats
    updateStats() {
        // Active workflows
        const activeCount = Array.from(this.workflows.values()).filter(w => w.isActive).length;
        const activeElement = document.getElementById('active-workflows-count');
        if (activeElement) {
            activeElement.textContent = activeCount;
        }
        
        // Executions today
        const today = new Date().toDateString();
        const todayExecutions = this.executionHistory.filter(e => {
            const execDate = new Date(e.startTime || e.queuedAt).toDateString();
            return execDate === today;
        });
        
        const todayElement = document.getElementById('executions-today');
        if (todayElement) {
            todayElement.textContent = todayExecutions.length;
        }
        
        // Success rate
        const recentExecutions = this.executionHistory.slice(0, 100);
        const successCount = recentExecutions.filter(e => e.status === 'success').length;
        const successRate = recentExecutions.length > 0 
            ? Math.round((successCount / recentExecutions.length) * 100)
            : 0;
        
        const rateElement = document.getElementById('success-rate');
        if (rateElement) {
            rateElement.textContent = `${successRate}%`;
        }
    }
    
    // Persistence
    loadWorkflows() {
        const saved = localStorage.getItem('workflows');
        if (saved) {
            const workflowsArray = JSON.parse(saved);
            workflowsArray.forEach(workflow => {
                this.workflows.set(workflow.id, workflow);
                if (workflow.isActive) {
                    this.activateWorkflow(workflow);
                }
            });
        }
        
        this.renderWorkflowList();
    }
    
    saveWorkflows() {
        const workflowsArray = Array.from(this.workflows.values());
        localStorage.setItem('workflows', JSON.stringify(workflowsArray));
    }
    
    saveExecutionHistory() {
        localStorage.setItem('workflowExecutions', JSON.stringify(this.executionHistory));
    }
    
    loadExecutionHistory() {
        const saved = localStorage.getItem('workflowExecutions');
        if (saved) {
            this.executionHistory = JSON.parse(saved);
        }
    }
    
    // Helper Methods
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
    
    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }
    
    calculateDuration(start, end) {
        const duration = new Date(end) - new Date(start);
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    showToast(message, type = 'info') {
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'system_alert',
                title: 'Workflow Engine',
                message: message
            });
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
    
    // Canvas Controls
    zoomIn() {
        // Implement zoom functionality
        console.log('Zoom in');
    }
    
    zoomOut() {
        // Implement zoom functionality
        console.log('Zoom out');
    }
    
    fitToScreen() {
        // Implement fit to screen
        console.log('Fit to screen');
    }
}

// Initialize workflow engine
window.workflowEngine = new WorkflowEngine();

// Export for use in other modules
export default WorkflowEngine; 