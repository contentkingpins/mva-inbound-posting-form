/**
 * Advanced Filters Module
 * Provides comprehensive filtering for leads with presets and saved filters
 */

class AdvancedFilters {
    constructor() {
        this.filters = {
            dateRange: { start: null, end: null },
            status: [],
            source: [],
            assignedTo: [],
            tags: [],
            scoreRange: { min: null, max: null }
        };
        
        this.presets = this.loadPresets();
        this.isOpen = false;
        this.container = null;
        
        this.init();
    }
    
    init() {
        this.createFilterUI();
        this.attachEventListeners();
        this.loadSavedFilters();
        console.log('🔍 Advanced Filters initialized');
    }
    
    createFilterUI() {
        // Create filter button
        const filterButton = document.createElement('button');
        filterButton.className = 'btn btn-secondary filter-toggle';
        filterButton.innerHTML = `
            <span class="filter-icon">🔍</span>
            <span>Advanced Filters</span>
            <span class="filter-count" id="active-filter-count" style="display: none;">0</span>
        `;
        filterButton.onclick = () => this.toggleFilterPanel();
        
        // Add button to appropriate location
        const searchContainer = document.querySelector('.search-filters, .header-actions');
        if (searchContainer) {
            searchContainer.appendChild(filterButton);
        }
        
        // Create filter panel
        const filterPanel = document.createElement('div');
        filterPanel.id = 'advanced-filter-panel';
        filterPanel.className = 'advanced-filter-panel';
        filterPanel.style.display = 'none';
        filterPanel.innerHTML = this.getFilterPanelHTML();
        
        document.body.appendChild(filterPanel);
        this.container = filterPanel;
        
        // Add styles
        this.addStyles();
    }
    
    getFilterPanelHTML() {
        return `
            <div class="filter-panel-header">
                <h3>Advanced Filters</h3>
                <button class="close-btn" onclick="advancedFilters.toggleFilterPanel()">×</button>
            </div>
            
            <div class="filter-panel-body">
                <!-- Quick Presets -->
                <div class="filter-section">
                    <h4>Quick Filters</h4>
                    <div class="preset-buttons">
                        <button class="preset-btn" onclick="advancedFilters.applyPreset('today')">
                            Today's Leads
                        </button>
                        <button class="preset-btn" onclick="advancedFilters.applyPreset('unassigned')">
                            Unassigned
                        </button>
                        <button class="preset-btn" onclick="advancedFilters.applyPreset('highValue')">
                            High Value
                        </button>
                        <button class="preset-btn" onclick="advancedFilters.applyPreset('needsFollowUp')">
                            Needs Follow-up
                        </button>
                    </div>
                </div>
                
                <!-- Date Range -->
                <div class="filter-section">
                    <h4>Date Range</h4>
                    <div class="date-range-container">
                        <input type="date" id="filter-date-start" class="filter-input">
                        <span class="date-separator">to</span>
                        <input type="date" id="filter-date-end" class="filter-input">
                        <button class="btn btn-sm" onclick="advancedFilters.setDateRange('today')">Today</button>
                        <button class="btn btn-sm" onclick="advancedFilters.setDateRange('week')">This Week</button>
                        <button class="btn btn-sm" onclick="advancedFilters.setDateRange('month')">This Month</button>
                    </div>
                </div>
                
                <!-- Status Filter -->
                <div class="filter-section">
                    <h4>Lead Status</h4>
                    <div class="checkbox-group" id="status-filters">
                        <label class="checkbox-label">
                            <input type="checkbox" value="new">
                            <span class="status-badge new">New</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="contacted">
                            <span class="status-badge contacted">Contacted</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="qualified">
                            <span class="status-badge qualified">Qualified</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="retained">
                            <span class="status-badge retained">Retained</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="closed">
                            <span class="status-badge closed">Closed</span>
                        </label>
                    </div>
                </div>
                
                <!-- Source Filter -->
                <div class="filter-section">
                    <h4>Lead Source</h4>
                    <div class="checkbox-group" id="source-filters">
                        <label class="checkbox-label">
                            <input type="checkbox" value="web">
                            <span>Website Form</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="phone">
                            <span>Phone Call</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="api">
                            <span>API/Publisher</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="referral">
                            <span>Referral</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" value="social">
                            <span>Social Media</span>
                        </label>
                    </div>
                </div>
                
                <!-- Agent Filter -->
                <div class="filter-section">
                    <h4>Assigned To</h4>
                    <select id="assigned-to-filter" class="filter-select" multiple>
                        <option value="unassigned">Unassigned</option>
                        <!-- Agents will be populated here -->
                    </select>
                </div>
                
                <!-- Lead Score Range -->
                <div class="filter-section">
                    <h4>Lead Score</h4>
                    <div class="range-container">
                        <input type="number" id="score-min" class="filter-input" placeholder="Min" min="0" max="100">
                        <span class="range-separator">-</span>
                        <input type="number" id="score-max" class="filter-input" placeholder="Max" min="0" max="100">
                    </div>
                </div>
                
                <!-- Tags Filter -->
                <div class="filter-section">
                    <h4>Tags</h4>
                    <div class="tags-input-container">
                        <input type="text" id="tags-input" class="filter-input" placeholder="Type to add tags...">
                        <div id="selected-tags" class="selected-tags"></div>
                    </div>
                </div>
                
                <!-- Saved Filters -->
                <div class="filter-section">
                    <h4>Saved Filters</h4>
                    <div class="saved-filters-container">
                        <select id="saved-filters-select" class="filter-select">
                            <option value="">Select a saved filter...</option>
                            <!-- Saved filters will be populated here -->
                        </select>
                        <button class="btn btn-sm" onclick="advancedFilters.saveCurrentFilter()">
                            Save Current
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="filter-panel-footer">
                <button class="btn btn-secondary" onclick="advancedFilters.clearFilters()">
                    Clear All
                </button>
                <button class="btn btn-primary" onclick="advancedFilters.applyFilters()">
                    Apply Filters
                </button>
            </div>
        `;
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .filter-toggle {
                position: relative;
            }
            
            .filter-count {
                position: absolute;
                top: -8px;
                right: -8px;
                background: var(--primary, #4299e1);
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
            }
            
            .advanced-filter-panel {
                position: fixed;
                right: 20px;
                top: 80px;
                width: 400px;
                max-width: 90vw;
                max-height: 80vh;
                background: var(--bg-secondary, #1e293b);
                border: 1px solid var(--border-color, #334155);
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                display: flex;
                flex-direction: column;
            }
            
            .filter-panel-header {
                padding: 20px;
                border-bottom: 1px solid var(--border-color, #334155);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .filter-panel-header h3 {
                margin: 0;
                color: var(--text-primary, #f1f5f9);
            }
            
            .filter-panel-body {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            
            .filter-section {
                margin-bottom: 25px;
            }
            
            .filter-section h4 {
                margin: 0 0 10px 0;
                color: var(--text-primary, #f1f5f9);
                font-size: 14px;
                font-weight: 600;
            }
            
            .preset-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            
            .preset-btn {
                padding: 10px;
                background: var(--bg-primary, #0f172a);
                border: 1px solid var(--border-color, #334155);
                border-radius: 6px;
                color: var(--text-primary, #f1f5f9);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .preset-btn:hover {
                background: var(--primary, #4299e1);
                border-color: var(--primary, #4299e1);
            }
            
            .date-range-container {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .filter-input {
                flex: 1;
                padding: 8px 12px;
                background: var(--bg-primary, #0f172a);
                border: 1px solid var(--border-color, #334155);
                border-radius: 6px;
                color: var(--text-primary, #f1f5f9);
            }
            
            .filter-select {
                width: 100%;
                padding: 8px 12px;
                background: var(--bg-primary, #0f172a);
                border: 1px solid var(--border-color, #334155);
                border-radius: 6px;
                color: var(--text-primary, #f1f5f9);
            }
            
            .checkbox-group {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
            }
            
            .status-badge {
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .status-badge.new {
                background: rgba(59, 130, 246, 0.2);
                color: #3b82f6;
            }
            
            .status-badge.contacted {
                background: rgba(245, 158, 11, 0.2);
                color: #f59e0b;
            }
            
            .status-badge.qualified {
                background: rgba(16, 185, 129, 0.2);
                color: #10b981;
            }
            
            .status-badge.retained {
                background: rgba(139, 92, 246, 0.2);
                color: #8b5cf6;
            }
            
            .range-container {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .selected-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-top: 10px;
            }
            
            .tag-chip {
                background: var(--primary, #4299e1);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .tag-chip .remove {
                cursor: pointer;
                font-weight: bold;
            }
            
            .filter-panel-footer {
                padding: 20px;
                border-top: 1px solid var(--border-color, #334155);
                display: flex;
                justify-content: space-between;
                gap: 10px;
            }
        `;
        document.head.appendChild(style);
    }
    
    attachEventListeners() {
        // Date range inputs
        document.getElementById('filter-date-start')?.addEventListener('change', (e) => {
            this.filters.dateRange.start = e.target.value;
        });
        
        document.getElementById('filter-date-end')?.addEventListener('change', (e) => {
            this.filters.dateRange.end = e.target.value;
        });
        
        // Status checkboxes
        document.querySelectorAll('#status-filters input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateCheckboxFilter('status');
            });
        });
        
        // Source checkboxes
        document.querySelectorAll('#source-filters input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateCheckboxFilter('source');
            });
        });
        
        // Score range
        document.getElementById('score-min')?.addEventListener('input', (e) => {
            this.filters.scoreRange.min = e.target.value ? parseInt(e.target.value) : null;
        });
        
        document.getElementById('score-max')?.addEventListener('input', (e) => {
            this.filters.scoreRange.max = e.target.value ? parseInt(e.target.value) : null;
        });
        
        // Tags input
        document.getElementById('tags-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTag(e.target.value);
                e.target.value = '';
            }
        });
        
        // Load agents for filter
        this.loadAgentsForFilter();
    }
    
    updateCheckboxFilter(filterType) {
        const container = document.getElementById(`${filterType}-filters`);
        const checked = Array.from(container.querySelectorAll('input:checked'))
            .map(cb => cb.value);
        this.filters[filterType] = checked;
    }
    
    async loadAgentsForFilter() {
        try {
            const response = await fetch(`${window.APP_CONFIG.apiEndpoint}/agents`);
            const agents = await response.json();
            
            const select = document.getElementById('assigned-to-filter');
            agents.forEach(agent => {
                const option = document.createElement('option');
                option.value = agent.id;
                option.textContent = agent.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load agents:', error);
        }
    }
    
    toggleFilterPanel() {
        this.isOpen = !this.isOpen;
        this.container.style.display = this.isOpen ? 'flex' : 'none';
    }
    
    setDateRange(preset) {
        const today = new Date();
        const start = new Date();
        
        switch (preset) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'week':
                start.setDate(today.getDate() - today.getDay());
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
        }
        
        document.getElementById('filter-date-start').value = start.toISOString().split('T')[0];
        document.getElementById('filter-date-end').value = today.toISOString().split('T')[0];
        
        this.filters.dateRange = {
            start: start.toISOString(),
            end: today.toISOString()
        };
    }
    
    applyPreset(presetName) {
        const presets = {
            today: {
                dateRange: { start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] }
            },
            unassigned: {
                assignedTo: ['unassigned']
            },
            highValue: {
                scoreRange: { min: 80, max: 100 }
            },
            needsFollowUp: {
                status: ['contacted', 'qualified'],
                tags: ['follow-up']
            }
        };
        
        if (presets[presetName]) {
            this.clearFilters();
            Object.assign(this.filters, presets[presetName]);
            this.updateUI();
            this.applyFilters();
        }
    }
    
    addTag(tag) {
        if (tag && !this.filters.tags.includes(tag)) {
            this.filters.tags.push(tag);
            this.renderTags();
        }
    }
    
    removeTag(tag) {
        this.filters.tags = this.filters.tags.filter(t => t !== tag);
        this.renderTags();
    }
    
    renderTags() {
        const container = document.getElementById('selected-tags');
        container.innerHTML = this.filters.tags.map(tag => `
            <div class="tag-chip">
                ${tag}
                <span class="remove" onclick="advancedFilters.removeTag('${tag}')">×</span>
            </div>
        `).join('');
    }
    
    async applyFilters() {
        // Show loading state
        const applyBtn = this.container.querySelector('.btn-primary');
        applyBtn.disabled = true;
        applyBtn.textContent = 'Applying...';
        
        try {
            const response = await fetch(`${window.APP_CONFIG.apiEndpoint}/api/leads/advanced-search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    filters: this.cleanFilters(),
                    pagination: { page: 1, limit: 50 }
                })
            });
            
            const results = await response.json();
            
            // Update filter count
            this.updateFilterCount();
            
            // Close panel
            this.toggleFilterPanel();
            
            // Trigger leads refresh with filtered results
            if (window.displayFilteredLeads) {
                window.displayFilteredLeads(results.data);
            }
            
            // Save to session
            this.saveToSession();
            
        } catch (error) {
            console.error('Filter error:', error);
            this.showToast('Failed to apply filters', 'error');
        } finally {
            applyBtn.disabled = false;
            applyBtn.textContent = 'Apply Filters';
        }
    }
    
    cleanFilters() {
        const cleaned = {};
        
        Object.entries(this.filters).forEach(([key, value]) => {
            if (Array.isArray(value) && value.length > 0) {
                cleaned[key] = value;
            } else if (typeof value === 'object' && value !== null) {
                const hasValues = Object.values(value).some(v => v !== null && v !== '');
                if (hasValues) {
                    cleaned[key] = value;
                }
            } else if (value) {
                cleaned[key] = value;
            }
        });
        
        return cleaned;
    }
    
    updateFilterCount() {
        const count = Object.values(this.cleanFilters()).length;
        const countElement = document.getElementById('active-filter-count');
        
        if (count > 0) {
            countElement.textContent = count;
            countElement.style.display = 'flex';
        } else {
            countElement.style.display = 'none';
        }
    }
    
    clearFilters() {
        this.filters = {
            dateRange: { start: null, end: null },
            status: [],
            source: [],
            assignedTo: [],
            tags: [],
            scoreRange: { min: null, max: null }
        };
        
        this.updateUI();
        this.updateFilterCount();
    }
    
    updateUI() {
        // Update all UI elements to match current filters
        document.getElementById('filter-date-start').value = this.filters.dateRange.start || '';
        document.getElementById('filter-date-end').value = this.filters.dateRange.end || '';
        
        // Update checkboxes
        document.querySelectorAll('#status-filters input').forEach(cb => {
            cb.checked = this.filters.status.includes(cb.value);
        });
        
        document.querySelectorAll('#source-filters input').forEach(cb => {
            cb.checked = this.filters.source.includes(cb.value);
        });
        
        // Update other fields...
    }
    
    async saveCurrentFilter() {
        const name = prompt('Enter a name for this filter:');
        if (!name) return;
        
        const savedFilters = JSON.parse(localStorage.getItem('savedFilters') || '{}');
        savedFilters[name] = {
            name: name,
            filters: this.cleanFilters(),
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('savedFilters', JSON.stringify(savedFilters));
        this.loadSavedFilters();
        this.showToast('Filter saved successfully', 'success');
    }
    
    loadSavedFilters() {
        const savedFilters = JSON.parse(localStorage.getItem('savedFilters') || '{}');
        const select = document.getElementById('saved-filters-select');
        
        // Clear existing options except the first one
        select.innerHTML = '<option value="">Select a saved filter...</option>';
        
        Object.entries(savedFilters).forEach(([key, filter]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = filter.name;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            if (e.target.value && savedFilters[e.target.value]) {
                this.filters = savedFilters[e.target.value].filters;
                this.updateUI();
            }
        });
    }
    
    saveToSession() {
        sessionStorage.setItem('activeFilters', JSON.stringify(this.filters));
    }
    
    loadFromSession() {
        const saved = sessionStorage.getItem('activeFilters');
        if (saved) {
            this.filters = JSON.parse(saved);
            this.updateUI();
            this.updateFilterCount();
        }
    }
    
    loadPresets() {
        return {
            today: {
                name: "Today's Leads",
                filters: {
                    dateRange: { start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] }
                }
            },
            thisWeek: {
                name: "This Week",
                filters: {
                    dateRange: { 
                        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        end: new Date().toISOString().split('T')[0]
                    }
                }
            }
        };
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

// Initialize advanced filters
window.advancedFilters = new AdvancedFilters();

export default AdvancedFilters; 