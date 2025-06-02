/**
 * Lead Assignment Module
 * Handles lead assignment UI and functionality
 */

class LeadAssignment {
    constructor() {
        this.selectedLeads = new Set();
        this.agents = [];
        this.modal = null;
        this.init();
    }

    async init() {
        await this.loadAgents();
        this.createAssignmentModal();
        this.setupEventListeners();
        console.log('📋 Lead Assignment module initialized');
    }

    async loadAgents() {
        try {
            const response = await fetch(`${window.APP_CONFIG.apiEndpoint}/agents`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.agents = data.agents || data;
            }
        } catch (error) {
            console.error('Failed to load agents:', error);
            // Use mock data if API fails
            this.agents = [
                { id: 'agent_1', name: 'John Doe', status: 'active', capacity: 45, maxCapacity: 100 },
                { id: 'agent_2', name: 'Jane Smith', status: 'active', capacity: 67, maxCapacity: 100 },
                { id: 'agent_3', name: 'Bob Johnson', status: 'active', capacity: 23, maxCapacity: 100 }
            ];
        }
    }

    createAssignmentModal() {
        const modalHTML = `
            <div class="modal-overlay" id="assignment-modal" style="display: none;">
                <div class="modal glass-modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Assign Leads</h3>
                        <button class="modal-close" onclick="leadAssignment.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="assignment-summary">
                            <p>Assigning <strong id="selected-count">0</strong> lead(s)</p>
                        </div>
                        
                        <div class="agent-selection">
                            <label>Select Agent</label>
                            <div class="agent-list" id="agent-list">
                                <!-- Agents will be populated here -->
                            </div>
                        </div>
                        
                        <div class="assignment-options">
                            <label class="checkbox-label">
                                <input type="checkbox" id="notify-agent" checked>
                                Send notification to agent
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="high-priority">
                                Mark as high priority
                            </label>
                        </div>
                        
                        <div class="assignment-notes">
                            <label>Assignment Notes (Optional)</label>
                            <textarea id="assignment-notes" rows="3" placeholder="Add any special instructions..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="leadAssignment.closeModal()">Cancel</button>
                        <button class="btn btn-primary" id="confirm-assignment" onclick="leadAssignment.confirmAssignment()">
                            <span class="btn-text">Assign Leads</span>
                            <span class="btn-loader" style="display: none;">⏳</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('assignment-modal');
        
        // Add styles
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .assignment-summary {
                background: var(--bg-primary, #0f172a);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            
            .agent-selection {
                margin-bottom: 20px;
            }
            
            .agent-list {
                display: grid;
                gap: 10px;
                margin-top: 10px;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .agent-card {
                background: var(--bg-primary, #0f172a);
                border: 2px solid var(--border-color, #334155);
                border-radius: 8px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .agent-card:hover {
                border-color: var(--primary, #4299e1);
                transform: translateY(-1px);
            }
            
            .agent-card.selected {
                border-color: var(--primary, #4299e1);
                background: rgba(66, 153, 225, 0.1);
            }
            
            .agent-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .agent-name {
                font-weight: 600;
                color: var(--text-primary, #f1f5f9);
            }
            
            .agent-status {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .agent-status.active {
                background: rgba(16, 185, 129, 0.2);
                color: #10b981;
            }
            
            .agent-capacity {
                margin-top: 10px;
            }
            
            .capacity-bar {
                width: 100%;
                height: 8px;
                background: var(--bg-secondary, #1e293b);
                border-radius: 4px;
                overflow: hidden;
                margin-top: 5px;
            }
            
            .capacity-fill {
                height: 100%;
                background: var(--primary, #4299e1);
                transition: width 0.3s ease;
            }
            
            .capacity-text {
                font-size: 12px;
                color: var(--text-secondary, #94a3b8);
                margin-top: 5px;
            }
            
            .assignment-options {
                margin-bottom: 20px;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                cursor: pointer;
            }
            
            .checkbox-label input {
                margin-right: 8px;
            }
            
            .assignment-notes textarea {
                width: 100%;
                padding: 10px;
                background: var(--bg-primary, #0f172a);
                border: 1px solid var(--border-color, #334155);
                border-radius: 6px;
                color: var(--text-primary, #f1f5f9);
                resize: vertical;
            }
            
            /* Lead selection checkboxes */
            .lead-checkbox {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            
            .bulk-select-bar {
                background: var(--bg-secondary, #1e293b);
                padding: 15px;
                border-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .bulk-select-info {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .bulk-select-actions {
                display: flex;
                gap: 10px;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Add checkboxes to lead cards/rows
        this.addLeadCheckboxes();
        
        // Listen for checkbox changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('lead-checkbox')) {
                this.handleLeadSelection(e.target);
            }
        });
    }

    addLeadCheckboxes() {
        // Add to lead cards
        const leadCards = document.querySelectorAll('.lead-card');
        leadCards.forEach(card => {
            if (!card.querySelector('.lead-checkbox')) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'lead-checkbox';
                checkbox.dataset.leadId = card.dataset.leadId;
                card.insertBefore(checkbox, card.firstChild);
            }
        });
        
        // Add to lead table rows
        const leadRows = document.querySelectorAll('.lead-row');
        leadRows.forEach(row => {
            if (!row.querySelector('.lead-checkbox')) {
                const td = document.createElement('td');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'lead-checkbox';
                checkbox.dataset.leadId = row.dataset.leadId;
                td.appendChild(checkbox);
                row.insertBefore(td, row.firstChild);
            }
        });
    }

    handleLeadSelection(checkbox) {
        const leadId = checkbox.dataset.leadId;
        
        if (checkbox.checked) {
            this.selectedLeads.add(leadId);
        } else {
            this.selectedLeads.delete(leadId);
        }
        
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const count = this.selectedLeads.size;
        
        // Show/hide bulk action bar
        let bulkBar = document.getElementById('bulk-select-bar');
        if (!bulkBar && count > 0) {
            bulkBar = this.createBulkActionBar();
        }
        
        if (bulkBar) {
            bulkBar.style.display = count > 0 ? 'flex' : 'none';
            const countElement = bulkBar.querySelector('.selected-count');
            if (countElement) {
                countElement.textContent = `${count} lead${count !== 1 ? 's' : ''} selected`;
            }
        }
    }

    createBulkActionBar() {
        const bar = document.createElement('div');
        bar.id = 'bulk-select-bar';
        bar.className = 'bulk-select-bar';
        bar.innerHTML = `
            <div class="bulk-select-info">
                <span class="selected-count">0 leads selected</span>
                <button class="btn btn-sm btn-secondary" onclick="leadAssignment.clearSelection()">
                    Clear Selection
                </button>
            </div>
            <div class="bulk-select-actions">
                <button class="btn btn-sm btn-primary" onclick="leadAssignment.openAssignmentModal()">
                    Assign Selected
                </button>
                <button class="btn btn-sm btn-secondary" onclick="leadAssignment.exportSelected()">
                    Export Selected
                </button>
            </div>
        `;
        
        // Insert before leads container
        const leadsContainer = document.querySelector('.leads-container, .leads-table-container');
        if (leadsContainer) {
            leadsContainer.parentNode.insertBefore(bar, leadsContainer);
        }
        
        return bar;
    }

    openAssignmentModal() {
        if (this.selectedLeads.size === 0) {
            this.showToast('Please select at least one lead', 'warning');
            return;
        }
        
        // Update modal content
        document.getElementById('selected-count').textContent = this.selectedLeads.size;
        this.renderAgentList();
        
        // Show modal
        this.modal.style.display = 'block';
    }

    renderAgentList() {
        const agentList = document.getElementById('agent-list');
        
        agentList.innerHTML = this.agents
            .filter(agent => agent.status === 'active')
            .map(agent => {
                const capacityPercent = (agent.capacity / agent.maxCapacity) * 100;
                
                return `
                    <div class="agent-card" data-agent-id="${agent.id}" onclick="leadAssignment.selectAgent('${agent.id}')">
                        <div class="agent-card-header">
                            <span class="agent-name">${agent.name}</span>
                            <span class="agent-status ${agent.status}">${agent.status}</span>
                        </div>
                        <div class="agent-capacity">
                            <div class="capacity-bar">
                                <div class="capacity-fill" style="width: ${capacityPercent}%"></div>
                            </div>
                            <div class="capacity-text">
                                ${agent.capacity} / ${agent.maxCapacity} leads
                                (${Math.round(capacityPercent)}% capacity)
                            </div>
                        </div>
                    </div>
                `;
            })
            .join('');
    }

    selectAgent(agentId) {
        // Update UI
        document.querySelectorAll('.agent-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.agentId === agentId);
        });
        
        this.selectedAgent = agentId;
    }

    async confirmAssignment() {
        if (!this.selectedAgent) {
            this.showToast('Please select an agent', 'warning');
            return;
        }
        
        const btn = document.getElementById('confirm-assignment');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        
        // Show loading
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        
        try {
            const leadIds = Array.from(this.selectedLeads);
            const payload = {
                leadIds: leadIds,
                agentId: this.selectedAgent,
                notify: document.getElementById('notify-agent').checked,
                priority: document.getElementById('high-priority').checked ? 'high' : 'normal',
                notes: document.getElementById('assignment-notes').value
            };
            
            const response = await fetch(`${window.APP_CONFIG.apiEndpoint}/api/leads/bulk-assign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showToast(`Successfully assigned ${result.assigned} leads`, 'success');
                
                // Clear selection and close modal
                this.clearSelection();
                this.closeModal();
                
                // Refresh leads view
                if (window.refreshLeads) {
                    window.refreshLeads();
                }
            } else {
                throw new Error('Assignment failed');
            }
        } catch (error) {
            console.error('Assignment error:', error);
            this.showToast('Failed to assign leads. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }

    clearSelection() {
        this.selectedLeads.clear();
        document.querySelectorAll('.lead-checkbox').forEach(cb => cb.checked = false);
        this.updateSelectionUI();
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.selectedAgent = null;
        document.getElementById('assignment-notes').value = '';
    }

    async exportSelected() {
        if (this.selectedLeads.size === 0) {
            this.showToast('Please select leads to export', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${window.APP_CONFIG.apiEndpoint}/api/leads/bulk-export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    leadIds: Array.from(this.selectedLeads)
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showToast('Export started. You will receive the file shortly.', 'success');
                
                // Poll for export completion
                this.pollExportStatus(result.exportId);
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Export failed. Please try again.', 'error');
        }
    }

    async pollExportStatus(exportId) {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${window.APP_CONFIG.apiEndpoint}/api/exports/${exportId}/status`);
                const data = await response.json();
                
                if (data.status === 'completed') {
                    // Download the file
                    window.location.href = data.downloadUrl;
                } else if (data.status === 'failed') {
                    this.showToast('Export failed', 'error');
                } else {
                    // Check again in 2 seconds
                    setTimeout(checkStatus, 2000);
                }
            } catch (error) {
                console.error('Status check error:', error);
            }
        };
        
        checkStatus();
    }

    showToast(message, type = 'info') {
        // Use existing toast system or create simple one
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toast-container') || document.body;
        container.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize lead assignment module
window.leadAssignment = new LeadAssignment();

export default LeadAssignment; 