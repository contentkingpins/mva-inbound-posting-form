/**
 * Advanced Search & Filter System
 * Global search, advanced filters, saved presets, and search history
 */

class SearchSystem {
    constructor() {
        this.searchHistory = [];
        this.savedFilters = new Map();
        this.activeFilters = {};
        this.searchResults = [];
        this.searchIndex = new Map();
        this.maxHistoryItems = 50;
        this.maxSuggestions = 10;
        this.debounceTimeout = null;
        this.debounceDelay = 300;
        
        // Search configuration for different entities
        this.searchConfig = {
            leads: {
                displayName: 'Leads',
                icon: '📋',
                searchFields: ['name', 'email', 'phone', 'status', 'source'],
                filterFields: {
                    status: {
                        label: 'Status',
                        type: 'select',
                        options: ['New', 'Contacted', 'Qualified', 'Converted', 'Lost']
                    },
                    dateRange: {
                        label: 'Date Range',
                        type: 'daterange'
                    },
                    source: {
                        label: 'Source',
                        type: 'select',
                        options: ['Website', 'Phone', 'Email', 'Referral', 'Social Media']
                    },
                    assignedTo: {
                        label: 'Assigned To',
                        type: 'user-select'
                    },
                    value: {
                        label: 'Lead Value',
                        type: 'range',
                        min: 0,
                        max: 100000
                    }
                }
            },
            agents: {
                displayName: 'Agents',
                icon: '👥',
                searchFields: ['name', 'email', 'role', 'status'],
                filterFields: {
                    status: {
                        label: 'Status',
                        type: 'select',
                        options: ['Online', 'Offline', 'Away']
                    },
                    role: {
                        label: 'Role',
                        type: 'select',
                        options: ['Admin', 'Agent', 'Viewer']
                    },
                    performance: {
                        label: 'Performance',
                        type: 'select',
                        options: ['Top Performer', 'Average', 'Needs Improvement']
                    }
                }
            },
            vendors: {
                displayName: 'Vendors',
                icon: '🏢',
                searchFields: ['name', 'code', 'email', 'status'],
                filterFields: {
                    status: {
                        label: 'Status',
                        type: 'select',
                        options: ['Active', 'Inactive', 'Pending']
                    },
                    tier: {
                        label: 'Tier',
                        type: 'select',
                        options: ['Premium', 'Standard', 'Basic']
                    }
                }
            },
            activities: {
                displayName: 'Activities',
                icon: '📊',
                searchFields: ['description', 'user', 'type'],
                filterFields: {
                    type: {
                        label: 'Activity Type',
                        type: 'select',
                        options: ['Lead Created', 'Status Changed', 'Note Added', 'Call Made', 'Email Sent']
                    },
                    dateRange: {
                        label: 'Date Range',
                        type: 'daterange'
                    },
                    user: {
                        label: 'User',
                        type: 'user-select'
                    }
                }
            }
        };
        
        this.init();
    }
    
    init() {
        // Create search UI
        this.createSearchUI();
        
        // Load saved data
        this.loadSearchHistory();
        this.loadSavedFilters();
        
        // Build initial search index
        this.buildSearchIndex();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('🔍 Advanced search system initialized');
    }
    
    createSearchUI() {
        // Create global search bar
        this.createGlobalSearchBar();
        
        // Create advanced filter modal
        this.createAdvancedFilterModal();
        
        // Create search results overlay
        this.createSearchResultsOverlay();
        
        // Add styles
        this.addStyles();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    createGlobalSearchBar() {
        const header = document.querySelector('.admin-header') || document.querySelector('.header-content');
        if (!header) return;
        
        const searchContainer = document.createElement('div');
        searchContainer.className = 'global-search-container';
        searchContainer.innerHTML = `
            <div class="global-search-wrapper">
                <input type="text" 
                       id="global-search-input" 
                       class="global-search-input" 
                       placeholder="Search everything... (Ctrl+K)"
                       autocomplete="off">
                <button class="search-btn" id="search-submit">
                    <span>🔍</span>
                </button>
                <button class="filter-btn" id="advanced-filter-btn" data-tooltip="Advanced Filters">
                    <span>⚙️</span>
                </button>
            </div>
            <div class="search-suggestions" id="search-suggestions" style="display: none;">
                <!-- Suggestions will appear here -->
            </div>
        `;
        
        // Insert after header title
        const headerTitle = header.querySelector('.header-left') || header.querySelector('h1');
        if (headerTitle) {
            headerTitle.parentNode.insertBefore(searchContainer, headerTitle.nextSibling);
        } else {
            header.appendChild(searchContainer);
        }
    }
    
    createAdvancedFilterModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'advanced-filter-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal glass-modal large">
                <div class="modal-header">
                    <h3>Advanced Search & Filters</h3>
                    <button class="modal-close" onclick="searchSystem.closeAdvancedFilter()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="filter-sections">
                        <!-- Search Query Section -->
                        <div class="filter-section">
                            <h4>Search Query</h4>
                            <input type="text" 
                                   id="advanced-search-query" 
                                   class="form-input" 
                                   placeholder="Enter search terms...">
                        </div>
                        
                        <!-- Entity Type Selection -->
                        <div class="filter-section">
                            <h4>Search In</h4>
                            <div class="entity-type-selector">
                                ${Object.entries(this.searchConfig).map(([key, config]) => `
                                    <label class="entity-type-option">
                                        <input type="checkbox" name="entity-type" value="${key}" checked>
                                        <span class="entity-type-label">
                                            <span>${config.icon}</span> ${config.displayName}
                                        </span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Dynamic Filters -->
                        <div class="filter-section" id="dynamic-filters">
                            <h4>Filters</h4>
                            <div class="filter-groups" id="filter-groups">
                                <!-- Dynamic filters will be populated here -->
                            </div>
                        </div>
                        
                        <!-- Saved Filters -->
                        <div class="filter-section">
                            <h4>Saved Filters</h4>
                            <div class="saved-filters-list" id="saved-filters-list">
                                <!-- Saved filters will be listed here -->
                            </div>
                            <button class="btn btn-secondary btn-sm" onclick="searchSystem.saveCurrentFilter()">
                                💾 Save Current Filter
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="searchSystem.clearAllFilters()">Clear All</button>
                    <button class="btn btn-primary" onclick="searchSystem.applyAdvancedFilters()">Apply Filters</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    createSearchResultsOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'search-results-overlay';
        overlay.id = 'search-results-overlay';
        overlay.style.display = 'none';
        overlay.innerHTML = `
            <div class="search-results-container">
                <div class="search-results-header">
                    <h3>Search Results</h3>
                    <div class="search-results-actions">
                        <span class="results-count" id="results-count">0 results</span>
                        <button class="btn btn-secondary btn-sm" onclick="searchSystem.exportResults()">
                            📤 Export
                        </button>
                        <button class="close-results" onclick="searchSystem.closeSearchResults()">
                            ✕
                        </button>
                    </div>
                </div>
                <div class="search-results-tabs">
                    <button class="result-tab active" data-entity="all">All</button>
                    ${Object.entries(this.searchConfig).map(([key, config]) => `
                        <button class="result-tab" data-entity="${key}">
                            ${config.icon} ${config.displayName}
                        </button>
                    `).join('')}
                </div>
                <div class="search-results-content" id="search-results-content">
                    <!-- Results will be displayed here -->
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Global Search Bar */
            .global-search-container {
                position: relative;
                flex: 1;
                max-width: 600px;
                margin: 0 2rem;
            }
            
            .global-search-wrapper {
                display: flex;
                align-items: center;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                transition: all 0.2s ease;
            }
            
            .global-search-wrapper:focus-within {
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
            }
            
            .global-search-input {
                flex: 1;
                background: none;
                border: none;
                padding: 0.75rem 1rem;
                font-size: 0.875rem;
                color: var(--text-primary);
                outline: none;
            }
            
            .global-search-input::placeholder {
                color: var(--text-secondary);
            }
            
            .search-btn,
            .filter-btn {
                background: none;
                border: none;
                padding: 0.75rem;
                cursor: pointer;
                color: var(--text-secondary);
                transition: all 0.2s ease;
            }
            
            .search-btn:hover,
            .filter-btn:hover {
                color: var(--primary);
            }
            
            /* Search Suggestions */
            .search-suggestions {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                margin-top: 0.5rem;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                box-shadow: var(--shadow-lg);
                max-height: 400px;
                overflow-y: auto;
                z-index: 1000;
            }
            
            .suggestion-category {
                padding: 0.5rem 1rem;
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                background: var(--bg-primary);
                border-bottom: 1px solid var(--border-color);
            }
            
            .suggestion-item {
                padding: 0.75rem 1rem;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .suggestion-item:hover {
                background: var(--bg-primary);
            }
            
            .suggestion-icon {
                font-size: 1.125rem;
                opacity: 0.8;
            }
            
            .suggestion-content {
                flex: 1;
                min-width: 0;
            }
            
            .suggestion-title {
                font-weight: 500;
                color: var(--text-primary);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .suggestion-meta {
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .suggestion-highlight {
                background: rgba(66, 153, 225, 0.2);
                color: var(--primary);
                padding: 0 2px;
                border-radius: 2px;
            }
            
            /* Advanced Filter Modal */
            .filter-sections {
                display: flex;
                flex-direction: column;
                gap: 2rem;
            }
            
            .filter-section {
                padding-bottom: 1.5rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .filter-section:last-child {
                border-bottom: none;
            }
            
            .filter-section h4 {
                margin-bottom: 1rem;
                color: var(--text-primary);
            }
            
            .entity-type-selector {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
            }
            
            .entity-type-option {
                display: flex;
                align-items: center;
                cursor: pointer;
            }
            
            .entity-type-option input {
                margin-right: 0.5rem;
            }
            
            .entity-type-label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                transition: all 0.2s ease;
            }
            
            .entity-type-option input:checked + .entity-type-label {
                background: var(--primary);
                color: white;
                border-color: var(--primary);
            }
            
            /* Filter Groups */
            .filter-groups {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 1rem;
            }
            
            .filter-group {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
            }
            
            .filter-group-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.75rem;
            }
            
            .filter-group-title {
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .filter-group-clear {
                font-size: 0.75rem;
                color: var(--primary);
                cursor: pointer;
                text-decoration: none;
            }
            
            .filter-group-clear:hover {
                text-decoration: underline;
            }
            
            /* Date Range Picker */
            .date-range-picker {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }
            
            .date-range-picker input {
                flex: 1;
            }
            
            /* Range Slider */
            .range-slider-container {
                margin-top: 1rem;
            }
            
            .range-slider {
                width: 100%;
                height: 6px;
                background: var(--border-color);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            
            .range-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                background: var(--primary);
                border-radius: 50%;
                cursor: pointer;
            }
            
            .range-values {
                display: flex;
                justify-content: space-between;
                margin-top: 0.5rem;
                font-size: 0.875rem;
                color: var(--text-secondary);
            }
            
            /* Saved Filters */
            .saved-filters-list {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 1rem;
                max-height: 200px;
                overflow-y: auto;
            }
            
            .saved-filter-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .saved-filter-item:hover {
                border-color: var(--primary);
                background: rgba(66, 153, 225, 0.05);
            }
            
            .saved-filter-name {
                font-weight: 500;
                color: var(--text-primary);
            }
            
            .saved-filter-actions {
                display: flex;
                gap: 0.5rem;
            }
            
            .saved-filter-action {
                background: none;
                border: none;
                cursor: pointer;
                color: var(--text-secondary);
                padding: 0.25rem;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .saved-filter-action:hover {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }
            
            /* Search Results Overlay */
            .search-results-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }
            
            .search-results-container {
                background: var(--bg-secondary);
                border-radius: 12px;
                box-shadow: var(--shadow-xl);
                width: 100%;
                max-width: 1200px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .search-results-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .search-results-header h3 {
                margin: 0;
                color: var(--text-primary);
            }
            
            .search-results-actions {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .results-count {
                font-size: 0.875rem;
                color: var(--text-secondary);
            }
            
            .close-results {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-secondary);
                padding: 0.25rem;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .close-results:hover {
                background: var(--bg-primary);
                color: var(--text-primary);
            }
            
            .search-results-tabs {
                display: flex;
                padding: 0 1.5rem;
                gap: 0.5rem;
                border-bottom: 1px solid var(--border-color);
                overflow-x: auto;
            }
            
            .result-tab {
                background: none;
                border: none;
                padding: 0.75rem 1rem;
                cursor: pointer;
                color: var(--text-secondary);
                border-bottom: 2px solid transparent;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            
            .result-tab.active {
                color: var(--primary);
                border-bottom-color: var(--primary);
            }
            
            .search-results-content {
                flex: 1;
                overflow-y: auto;
                padding: 1.5rem;
            }
            
            /* Result Items */
            .result-group {
                margin-bottom: 2rem;
            }
            
            .result-group-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 1rem;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .result-items {
                display: grid;
                gap: 1rem;
            }
            
            .result-item {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .result-item:hover {
                border-color: var(--primary);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .result-item-header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 0.5rem;
            }
            
            .result-item-title {
                font-weight: 600;
                color: var(--text-primary);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .result-item-meta {
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .result-item-body {
                font-size: 0.875rem;
                color: var(--text-secondary);
                margin-bottom: 0.5rem;
            }
            
            .result-item-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 0.75rem;
            }
            
            /* Search History */
            .search-history {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                margin-top: 0.5rem;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                box-shadow: var(--shadow-lg);
                max-height: 300px;
                overflow-y: auto;
                z-index: 1000;
            }
            
            .history-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .history-title {
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .clear-history {
                font-size: 0.75rem;
                color: var(--primary);
                cursor: pointer;
                text-decoration: none;
            }
            
            .clear-history:hover {
                text-decoration: underline;
            }
            
            .history-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                cursor: pointer;
                transition: background 0.2s ease;
            }
            
            .history-item:hover {
                background: var(--bg-primary);
            }
            
            .history-icon {
                color: var(--text-secondary);
            }
            
            .history-text {
                flex: 1;
                font-size: 0.875rem;
                color: var(--text-primary);
            }
            
            .history-time {
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            /* Loading State */
            .search-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 3rem;
                color: var(--text-secondary);
            }
            
            .search-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid var(--border-color);
                border-top-color: var(--primary);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 1rem;
            }
            
            /* Empty State */
            .search-empty {
                text-align: center;
                padding: 3rem;
                color: var(--text-secondary);
            }
            
            .search-empty-icon {
                font-size: 3rem;
                opacity: 0.3;
                margin-bottom: 1rem;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .global-search-container {
                    margin: 0 1rem;
                }
                
                .filter-groups {
                    grid-template-columns: 1fr;
                }
                
                .search-results-container {
                    margin: 1rem;
                }
                
                .search-results-tabs {
                    padding: 0 1rem;
                }
                
                .result-tab {
                    font-size: 0.875rem;
                    padding: 0.5rem 0.75rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Global search input
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
            searchInput.addEventListener('focus', () => this.showSearchHistory());
            searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        }
        
        // Search button
        document.getElementById('search-submit')?.addEventListener('click', () => {
            this.performSearch();
        });
        
        // Advanced filter button
        document.getElementById('advanced-filter-btn')?.addEventListener('click', () => {
            this.openAdvancedFilter();
        });
        
        // Entity type checkboxes
        document.querySelectorAll('input[name="entity-type"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateDynamicFilters());
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            const searchContainer = document.querySelector('.global-search-container');
            if (searchContainer && !searchContainer.contains(e.target)) {
                this.closeSuggestions();
                this.closeSearchHistory();
            }
        });
        
        // Result tabs
        document.querySelectorAll('.result-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchResultTab(e.target.dataset.entity);
            });
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('global-search-input')?.focus();
            }
            
            // Escape to close overlays
            if (e.key === 'Escape') {
                this.closeSearchResults();
                this.closeAdvancedFilter();
                this.closeSuggestions();
            }
        });
    }
    
    // Search Methods
    handleSearchInput(e) {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        // Debounce search
        this.debounceTimeout = setTimeout(() => {
            if (query.length >= 2) {
                this.showSuggestions(query);
            } else {
                this.closeSuggestions();
            }
        }, this.debounceDelay);
    }
    
    handleSearchKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.performSearch();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateSuggestions(e.key === 'ArrowDown' ? 'down' : 'up');
        }
    }
    
    async performSearch(query = null) {
        const searchQuery = query || document.getElementById('global-search-input')?.value.trim();
        if (!searchQuery) return;
        
        // Add to search history
        this.addToSearchHistory(searchQuery);
        
        // Show loading state
        this.showSearchResults();
        this.showLoadingState();
        
        try {
            // Get selected entity types
            const selectedTypes = Array.from(document.querySelectorAll('input[name="entity-type"]:checked'))
                .map(cb => cb.value);
            
            // Perform search for each entity type
            const results = await this.searchEntities(searchQuery, selectedTypes);
            
            // Store results
            this.searchResults = results;
            
            // Display results
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            this.showErrorState();
        }
    }
    
    async searchEntities(query, entityTypes) {
        // In a real implementation, this would call the backend API
        // For now, we'll simulate searching through the search index
        const results = {};
        
        for (const type of entityTypes) {
            const config = this.searchConfig[type];
            if (!config) continue;
            
            // Search in the index for this entity type
            const typeResults = [];
            const index = this.searchIndex.get(type) || [];
            
            for (const item of index) {
                const score = this.calculateSearchScore(query, item, config.searchFields);
                if (score > 0) {
                    typeResults.push({ ...item, _score: score });
                }
            }
            
            // Sort by score and limit results
            results[type] = typeResults
                .sort((a, b) => b._score - a._score)
                .slice(0, 20);
        }
        
        return results;
    }
    
    calculateSearchScore(query, item, searchFields) {
        const queryLower = query.toLowerCase();
        let score = 0;
        
        for (const field of searchFields) {
            const value = item[field];
            if (!value) continue;
            
            const valueLower = value.toString().toLowerCase();
            
            // Exact match
            if (valueLower === queryLower) {
                score += 10;
            }
            // Starts with query
            else if (valueLower.startsWith(queryLower)) {
                score += 5;
            }
            // Contains query
            else if (valueLower.includes(queryLower)) {
                score += 2;
            }
            // Fuzzy match (simple implementation)
            else if (this.fuzzyMatch(queryLower, valueLower)) {
                score += 1;
            }
        }
        
        return score;
    }
    
    fuzzyMatch(query, text) {
        // Simple fuzzy matching - checks if all query characters appear in order
        let queryIndex = 0;
        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
            if (text[i] === query[queryIndex]) {
                queryIndex++;
            }
        }
        return queryIndex === query.length;
    }
    
    // Suggestions Methods
    async showSuggestions(query) {
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (!suggestionsContainer) return;
        
        // Get suggestions for each entity type
        const suggestions = await this.generateSuggestions(query);
        
        if (suggestions.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        // Build suggestions HTML
        let html = '';
        const grouped = this.groupSuggestionsByType(suggestions);
        
        for (const [type, items] of Object.entries(grouped)) {
            const config = this.searchConfig[type];
            html += `
                <div class="suggestion-category">${config.icon} ${config.displayName}</div>
                ${items.map(item => `
                    <div class="suggestion-item" onclick="searchSystem.selectSuggestion('${item.id}', '${type}')">
                        <span class="suggestion-icon">${this.getItemIcon(type, item)}</span>
                        <div class="suggestion-content">
                            <div class="suggestion-title">${this.highlightMatch(item.title, query)}</div>
                            <div class="suggestion-meta">${item.meta}</div>
                        </div>
                    </div>
                `).join('')}
            `;
        }
        
        suggestionsContainer.innerHTML = html;
        suggestionsContainer.style.display = 'block';
    }
    
    async generateSuggestions(query) {
        const suggestions = [];
        const queryLower = query.toLowerCase();
        
        // Search through each entity type
        for (const [type, config] of Object.entries(this.searchConfig)) {
            const index = this.searchIndex.get(type) || [];
            
            for (const item of index) {
                // Quick match on primary fields
                const titleMatch = item.name?.toLowerCase().includes(queryLower) ||
                                 item.title?.toLowerCase().includes(queryLower);
                
                if (titleMatch) {
                    suggestions.push({
                        type,
                        id: item.id,
                        title: item.name || item.title,
                        meta: this.getItemMeta(type, item),
                        score: this.calculateSearchScore(query, item, config.searchFields)
                    });
                }
                
                if (suggestions.length >= this.maxSuggestions) break;
            }
        }
        
        // Sort by score and limit
        return suggestions
            .sort((a, b) => b.score - a.score)
            .slice(0, this.maxSuggestions);
    }
    
    groupSuggestionsByType(suggestions) {
        const grouped = {};
        for (const suggestion of suggestions) {
            if (!grouped[suggestion.type]) {
                grouped[suggestion.type] = [];
            }
            grouped[suggestion.type].push(suggestion);
        }
        return grouped;
    }
    
    highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="suggestion-highlight">$1</span>');
    }
    
    getItemIcon(type, item) {
        // Return appropriate icon based on item type and status
        switch (type) {
            case 'leads':
                return item.status === 'New' ? '🆕' : '📋';
            case 'agents':
                return item.status === 'Online' ? '🟢' : '🔴';
            case 'vendors':
                return item.status === 'Active' ? '✅' : '⏸️';
            default:
                return '📄';
        }
    }
    
    getItemMeta(type, item) {
        // Return appropriate metadata for display
        switch (type) {
            case 'leads':
                return `${item.status} • ${item.source || 'Unknown source'}`;
            case 'agents':
                return `${item.role} • ${item.status}`;
            case 'vendors':
                return `${item.code} • ${item.status}`;
            case 'activities':
                return `${item.type} • ${this.formatDate(item.timestamp)}`;
            default:
                return '';
        }
    }
    
    selectSuggestion(itemId, type) {
        // Navigate to the selected item
        switch (type) {
            case 'leads':
                window.location.href = `/leads/${itemId}`;
                break;
            case 'agents':
                window.location.href = `/agents/${itemId}`;
                break;
            case 'vendors':
                window.location.href = `/vendors/${itemId}`;
                break;
            case 'activities':
                window.location.href = `/activities/${itemId}`;
                break;
        }
        
        this.closeSuggestions();
    }
    
    closeSuggestions() {
        const container = document.getElementById('search-suggestions');
        if (container) {
            container.style.display = 'none';
        }
    }
    
    // Advanced Filter Methods
    openAdvancedFilter() {
        document.getElementById('advanced-filter-modal').style.display = 'block';
        this.updateDynamicFilters();
        this.renderSavedFilters();
    }
    
    closeAdvancedFilter() {
        document.getElementById('advanced-filter-modal').style.display = 'none';
    }
    
    updateDynamicFilters() {
        const container = document.getElementById('filter-groups');
        if (!container) return;
        
        // Get selected entity types
        const selectedTypes = Array.from(document.querySelectorAll('input[name="entity-type"]:checked'))
            .map(cb => cb.value);
        
        // Build filter UI for selected types
        let html = '';
        
        for (const type of selectedTypes) {
            const config = this.searchConfig[type];
            if (!config || !config.filterFields) continue;
            
            for (const [fieldName, fieldConfig] of Object.entries(config.filterFields)) {
                html += this.buildFilterControl(type, fieldName, fieldConfig);
            }
        }
        
        container.innerHTML = html;
        
        // Re-attach event listeners for new controls
        this.attachFilterControlListeners();
    }
    
    buildFilterControl(entityType, fieldName, fieldConfig) {
        const filterId = `filter_${entityType}_${fieldName}`;
        
        let controlHtml = '';
        switch (fieldConfig.type) {
            case 'select':
                controlHtml = `
                    <select id="${filterId}" class="form-input" data-entity="${entityType}" data-field="${fieldName}">
                        <option value="">All ${fieldConfig.label}</option>
                        ${fieldConfig.options.map(opt => 
                            `<option value="${opt}">${opt}</option>`
                        ).join('')}
                    </select>
                `;
                break;
                
            case 'daterange':
                controlHtml = `
                    <div class="date-range-picker">
                        <input type="date" id="${filterId}_from" class="form-input" 
                               data-entity="${entityType}" data-field="${fieldName}" data-range="from">
                        <span>to</span>
                        <input type="date" id="${filterId}_to" class="form-input"
                               data-entity="${entityType}" data-field="${fieldName}" data-range="to">
                    </div>
                `;
                break;
                
            case 'range':
                controlHtml = `
                    <div class="range-slider-container">
                        <input type="range" id="${filterId}" class="range-slider"
                               min="${fieldConfig.min}" max="${fieldConfig.max}" 
                               value="${fieldConfig.min}"
                               data-entity="${entityType}" data-field="${fieldName}">
                        <div class="range-values">
                            <span id="${filterId}_min">${fieldConfig.min}</span>
                            <span id="${filterId}_value">0</span>
                            <span id="${filterId}_max">${fieldConfig.max}</span>
                        </div>
                    </div>
                `;
                break;
                
            case 'user-select':
                controlHtml = `
                    <select id="${filterId}" class="form-input" data-entity="${entityType}" data-field="${fieldName}">
                        <option value="">All Users</option>
                        <!-- Users would be loaded dynamically -->
                    </select>
                `;
                break;
        }
        
        return `
            <div class="filter-group">
                <div class="filter-group-header">
                    <span class="filter-group-title">${fieldConfig.label}</span>
                    <a href="#" class="filter-group-clear" onclick="searchSystem.clearFilter('${filterId}')">Clear</a>
                </div>
                ${controlHtml}
            </div>
        `;
    }
    
    attachFilterControlListeners() {
        // Range sliders
        document.querySelectorAll('.range-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const valueDisplay = document.getElementById(`${e.target.id}_value`);
                if (valueDisplay) {
                    valueDisplay.textContent = e.target.value;
                }
            });
        });
    }
    
    applyAdvancedFilters() {
        // Collect all filter values
        this.activeFilters = {};
        
        // Get search query
        const searchQuery = document.getElementById('advanced-search-query')?.value.trim();
        
        // Get all filter inputs
        document.querySelectorAll('[data-entity][data-field]').forEach(input => {
            const entity = input.dataset.entity;
            const field = input.dataset.field;
            const value = input.value;
            
            if (value) {
                if (!this.activeFilters[entity]) {
                    this.activeFilters[entity] = {};
                }
                
                if (input.dataset.range) {
                    // Handle date range
                    if (!this.activeFilters[entity][field]) {
                        this.activeFilters[entity][field] = {};
                    }
                    this.activeFilters[entity][field][input.dataset.range] = value;
                } else {
                    this.activeFilters[entity][field] = value;
                }
            }
        });
        
        // Close modal and perform search
        this.closeAdvancedFilter();
        
        // Update main search input if query was provided
        if (searchQuery) {
            const mainInput = document.getElementById('global-search-input');
            if (mainInput) {
                mainInput.value = searchQuery;
            }
        }
        
        // Perform search with filters
        this.performSearch(searchQuery);
    }
    
    clearAllFilters() {
        // Clear all filter inputs
        document.querySelectorAll('[data-entity][data-field]').forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        
        // Clear active filters
        this.activeFilters = {};
        
        // Clear search query
        document.getElementById('advanced-search-query').value = '';
    }
    
    clearFilter(filterId) {
        const element = document.getElementById(filterId);
        if (element) {
            element.value = '';
            
            // Update range display if applicable
            const valueDisplay = document.getElementById(`${filterId}_value`);
            if (valueDisplay && element.type === 'range') {
                valueDisplay.textContent = element.min;
            }
        }
    }
    
    // Saved Filters Methods
    saveCurrentFilter() {
        const filterName = prompt('Enter a name for this filter:');
        if (!filterName) return;
        
        const filterData = {
            id: `filter_${Date.now()}`,
            name: filterName,
            query: document.getElementById('advanced-search-query')?.value || '',
            entityTypes: Array.from(document.querySelectorAll('input[name="entity-type"]:checked'))
                .map(cb => cb.value),
            filters: { ...this.activeFilters },
            createdAt: new Date().toISOString()
        };
        
        this.savedFilters.set(filterData.id, filterData);
        this.saveSavedFilters();
        this.renderSavedFilters();
        
        this.showToast('Filter saved successfully', 'success');
    }
    
    renderSavedFilters() {
        const container = document.getElementById('saved-filters-list');
        if (!container) return;
        
        if (this.savedFilters.size === 0) {
            container.innerHTML = '<p class="text-muted">No saved filters yet</p>';
            return;
        }
        
        const filtersArray = Array.from(this.savedFilters.values());
        container.innerHTML = filtersArray.map(filter => `
            <div class="saved-filter-item" onclick="searchSystem.loadSavedFilter('${filter.id}')">
                <span class="saved-filter-name">${filter.name}</span>
                <div class="saved-filter-actions">
                    <button class="saved-filter-action" onclick="event.stopPropagation(); searchSystem.deleteSavedFilter('${filter.id}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    loadSavedFilter(filterId) {
        const filter = this.savedFilters.get(filterId);
        if (!filter) return;
        
        // Set search query
        const queryInput = document.getElementById('advanced-search-query');
        if (queryInput) {
            queryInput.value = filter.query;
        }
        
        // Set entity types
        document.querySelectorAll('input[name="entity-type"]').forEach(cb => {
            cb.checked = filter.entityTypes.includes(cb.value);
        });
        
        // Update dynamic filters
        this.updateDynamicFilters();
        
        // Set filter values
        setTimeout(() => {
            for (const [entity, filters] of Object.entries(filter.filters)) {
                for (const [field, value] of Object.entries(filters)) {
                    if (typeof value === 'object') {
                        // Handle date ranges
                        for (const [range, rangeValue] of Object.entries(value)) {
                            const input = document.querySelector(`[data-entity="${entity}"][data-field="${field}"][data-range="${range}"]`);
                            if (input) input.value = rangeValue;
                        }
                    } else {
                        // Handle regular fields
                        const input = document.querySelector(`[data-entity="${entity}"][data-field="${field}"]`);
                        if (input) input.value = value;
                    }
                }
            }
        }, 100);
        
        this.showToast(`Loaded filter: ${filter.name}`, 'info');
    }
    
    deleteSavedFilter(filterId) {
        if (!confirm('Delete this saved filter?')) return;
        
        this.savedFilters.delete(filterId);
        this.saveSavedFilters();
        this.renderSavedFilters();
        
        this.showToast('Filter deleted', 'success');
    }
    
    // Search Results Methods
    showSearchResults() {
        document.getElementById('search-results-overlay').style.display = 'flex';
    }
    
    closeSearchResults() {
        document.getElementById('search-results-overlay').style.display = 'none';
    }
    
    showLoadingState() {
        const content = document.getElementById('search-results-content');
        if (content) {
            content.innerHTML = `
                <div class="search-loading">
                    <div class="search-spinner"></div>
                    <p>Searching...</p>
                </div>
            `;
        }
    }
    
    showErrorState() {
        const content = document.getElementById('search-results-content');
        if (content) {
            content.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty-icon">❌</div>
                    <h3>Search Failed</h3>
                    <p>An error occurred while searching. Please try again.</p>
                </div>
            `;
        }
    }
    
    displaySearchResults(results) {
        const content = document.getElementById('search-results-content');
        if (!content) return;
        
        // Calculate total results
        const totalResults = Object.values(results).reduce((sum, items) => sum + items.length, 0);
        
        // Update count
        const countElement = document.getElementById('results-count');
        if (countElement) {
            countElement.textContent = `${totalResults} result${totalResults !== 1 ? 's' : ''}`;
        }
        
        if (totalResults === 0) {
            content.innerHTML = `
                <div class="search-empty">
                    <div class="search-empty-icon">🔍</div>
                    <h3>No Results Found</h3>
                    <p>Try adjusting your search terms or filters</p>
                </div>
            `;
            return;
        }
        
        // Display results grouped by type
        let html = '';
        
        for (const [type, items] of Object.entries(results)) {
            if (items.length === 0) continue;
            
            const config = this.searchConfig[type];
            html += `
                <div class="result-group" data-entity-type="${type}">
                    <div class="result-group-header">
                        <span>${config.icon}</span>
                        <span>${config.displayName}</span>
                        <span class="badge">${items.length}</span>
                    </div>
                    <div class="result-items">
                        ${items.map(item => this.renderResultItem(type, item)).join('')}
                    </div>
                </div>
            `;
        }
        
        content.innerHTML = html;
    }
    
    renderResultItem(type, item) {
        switch (type) {
            case 'leads':
                return `
                    <div class="result-item" onclick="window.location.href='/leads/${item.id}'">
                        <div class="result-item-header">
                            <div class="result-item-title">
                                ${this.getItemIcon(type, item)} ${item.name}
                            </div>
                            <div class="result-item-meta">${item.status}</div>
                        </div>
                        <div class="result-item-body">
                            ${item.email || 'No email'} • ${item.phone || 'No phone'}
                        </div>
                        <div class="result-item-actions">
                            <button class="btn btn-sm btn-primary">View Lead</button>
                            <button class="btn btn-sm btn-secondary">Assign</button>
                        </div>
                    </div>
                `;
                
            case 'agents':
                return `
                    <div class="result-item" onclick="window.location.href='/agents/${item.id}'">
                        <div class="result-item-header">
                            <div class="result-item-title">
                                ${this.getItemIcon(type, item)} ${item.name}
                            </div>
                            <div class="result-item-meta">${item.status}</div>
                        </div>
                        <div class="result-item-body">
                            ${item.role} • ${item.email}
                        </div>
                        <div class="result-item-actions">
                            <button class="btn btn-sm btn-primary">View Profile</button>
                        </div>
                    </div>
                `;
                
            case 'vendors':
                return `
                    <div class="result-item" onclick="window.location.href='/vendors/${item.id}'">
                        <div class="result-item-header">
                            <div class="result-item-title">
                                ${this.getItemIcon(type, item)} ${item.name}
                            </div>
                            <div class="result-item-meta">${item.code}</div>
                        </div>
                        <div class="result-item-body">
                            ${item.status} • ${item.tier || 'Standard'} Tier
                        </div>
                        <div class="result-item-actions">
                            <button class="btn btn-sm btn-primary">View Details</button>
                        </div>
                    </div>
                `;
                
            default:
                return `
                    <div class="result-item">
                        <div class="result-item-header">
                            <div class="result-item-title">
                                ${item.title || item.name}
                            </div>
                        </div>
                    </div>
                `;
        }
    }
    
    switchResultTab(entityType) {
        // Update active tab
        document.querySelectorAll('.result-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.entity === entityType);
        });
        
        // Filter displayed results
        const groups = document.querySelectorAll('.result-group');
        groups.forEach(group => {
            if (entityType === 'all') {
                group.style.display = 'block';
            } else {
                group.style.display = group.dataset.entityType === entityType ? 'block' : 'none';
            }
        });
    }
    
    async exportResults() {
        const format = await this.showExportOptions();
        if (!format) return;
        
        switch (format) {
            case 'csv':
                this.exportToCSV();
                break;
            case 'json':
                this.exportToJSON();
                break;
            case 'pdf':
                this.exportToPDF();
                break;
        }
    }
    
    async showExportOptions() {
        // In a real implementation, this would show a modal
        // For now, using native prompt
        const format = prompt('Export format (csv, json, pdf):');
        return format?.toLowerCase();
    }
    
    exportToCSV() {
        let csv = '';
        
        for (const [type, items] of Object.entries(this.searchResults)) {
            if (items.length === 0) continue;
            
            // Add headers
            const headers = Object.keys(items[0]).filter(key => !key.startsWith('_'));
            csv += `\n${type.toUpperCase()}\n`;
            csv += headers.join(',') + '\n';
            
            // Add data
            for (const item of items) {
                const row = headers.map(header => {
                    const value = item[header] || '';
                    // Escape commas and quotes
                    return `"${value.toString().replace(/"/g, '""')}"`;
                });
                csv += row.join(',') + '\n';
            }
        }
        
        // Download file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `search_results_${new Date().getTime()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Results exported to CSV', 'success');
    }
    
    exportToJSON() {
        const json = JSON.stringify(this.searchResults, null, 2);
        
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `search_results_${new Date().getTime()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Results exported to JSON', 'success');
    }
    
    exportToPDF() {
        // This would require a PDF library like jsPDF
        this.showToast('PDF export not implemented yet', 'warning');
    }
    
    // Search History Methods
    showSearchHistory() {
        if (this.searchHistory.length === 0) return;
        
        const container = document.getElementById('search-suggestions');
        if (!container) return;
        
        const html = `
            <div class="search-history">
                <div class="history-header">
                    <span class="history-title">Recent Searches</span>
                    <a href="#" class="clear-history" onclick="searchSystem.clearSearchHistory(); return false;">Clear</a>
                </div>
                ${this.searchHistory.slice(0, 10).map(item => `
                    <div class="history-item" onclick="searchSystem.performSearch('${item.query}')">
                        <span class="history-icon">🕐</span>
                        <span class="history-text">${item.query}</span>
                        <span class="history-time">${this.getTimeAgo(item.timestamp)}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
    }
    
    closeSearchHistory() {
        const container = document.getElementById('search-suggestions');
        if (container && container.querySelector('.search-history')) {
            container.style.display = 'none';
        }
    }
    
    addToSearchHistory(query) {
        // Check if query already exists
        const existingIndex = this.searchHistory.findIndex(item => item.query === query);
        if (existingIndex !== -1) {
            this.searchHistory.splice(existingIndex, 1);
        }
        
        // Add to beginning
        this.searchHistory.unshift({
            query,
            timestamp: new Date().toISOString()
        });
        
        // Limit history
        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }
        
        this.saveSearchHistory();
    }
    
    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
        this.closeSearchHistory();
        this.showToast('Search history cleared', 'success');
    }
    
    // Data Persistence Methods
    loadSearchHistory() {
        const saved = localStorage.getItem('searchHistory');
        if (saved) {
            this.searchHistory = JSON.parse(saved);
        }
    }
    
    saveSearchHistory() {
        localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    }
    
    loadSavedFilters() {
        const saved = localStorage.getItem('savedFilters');
        if (saved) {
            const filters = JSON.parse(saved);
            this.savedFilters = new Map(filters);
        }
    }
    
    saveSavedFilters() {
        const filters = Array.from(this.savedFilters.entries());
        localStorage.setItem('savedFilters', JSON.stringify(filters));
    }
    
    // Search Index Methods
    buildSearchIndex() {
        // In a real implementation, this would be populated from the backend
        // For now, we'll create some sample data
        
        this.searchIndex.set('leads', [
            { id: 'lead_1', name: 'John Doe', email: 'john@example.com', phone: '555-0001', status: 'New', source: 'Website' },
            { id: 'lead_2', name: 'Jane Smith', email: 'jane@example.com', phone: '555-0002', status: 'Contacted', source: 'Phone' },
            { id: 'lead_3', name: 'Bob Johnson', email: 'bob@example.com', phone: '555-0003', status: 'Qualified', source: 'Email' }
        ]);
        
        this.searchIndex.set('agents', [
            { id: 'agent_1', name: 'Sarah Wilson', email: 'sarah@company.com', role: 'Admin', status: 'Online' },
            { id: 'agent_2', name: 'Mike Brown', email: 'mike@company.com', role: 'Agent', status: 'Online' },
            { id: 'agent_3', name: 'Lisa Davis', email: 'lisa@company.com', role: 'Agent', status: 'Offline' }
        ]);
        
        this.searchIndex.set('vendors', [
            { id: 'vendor_1', name: 'ABC Corp', code: 'ABC001', email: 'contact@abc.com', status: 'Active', tier: 'Premium' },
            { id: 'vendor_2', name: 'XYZ Inc', code: 'XYZ002', email: 'info@xyz.com', status: 'Active', tier: 'Standard' }
        ]);
        
        this.searchIndex.set('activities', [
            { id: 'activity_1', type: 'Lead Created', user: 'Sarah Wilson', description: 'New lead from website', timestamp: new Date().toISOString() }
        ]);
    }
    
    // Helper Methods
    navigateSuggestions(direction) {
        // Implement keyboard navigation for suggestions
        console.log('Navigate suggestions:', direction);
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }
    
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    showToast(message, type = 'info') {
        // Use notification system if available
        if (window.notificationSystem) {
            window.notificationSystem.showToast({
                type: 'system_alert',
                title: 'Search System',
                message: message
            });
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
}

// Initialize search system
window.searchSystem = new SearchSystem();

// Export for use in other modules
export default SearchSystem; 