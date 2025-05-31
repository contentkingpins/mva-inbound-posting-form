/**
 * Global Search Module
 * Command palette style search with fuzzy matching and quick actions
 */

class GlobalSearchModule {
    constructor() {
        this.isOpen = false;
        this.searchIndex = new Map();
        this.searchHistory = [];
        this.maxHistoryItems = 10;
        this.selectedIndex = 0;
        this.searchResults = [];
        this.searchProviders = new Map();
        
        this.init();
    }

    init() {
        this.createSearchUI();
        this.registerEventListeners();
        this.registerDefaultProviders();
        this.loadSearchHistory();
    }

    createSearchUI() {
        // Create search overlay
        const overlay = document.createElement('div');
        overlay.id = 'global-search-overlay';
        overlay.className = 'search-overlay';
        overlay.innerHTML = `
            <div class="search-modal">
                <div class="search-header">
                    <div class="search-input-wrapper">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" 
                               id="global-search-input" 
                               class="search-input" 
                               placeholder="Search for anything... (leads, actions, settings)"
                               autocomplete="off">
                        <div class="search-shortcuts">
                            <span class="search-shortcut">ESC to close</span>
                        </div>
                    </div>
                </div>
                <div class="search-body">
                    <div id="search-results" class="search-results">
                        <div class="search-category">
                            <div class="search-category-title">Recent Searches</div>
                            <div id="search-history" class="search-items"></div>
                        </div>
                        <div class="search-category">
                            <div class="search-category-title">Quick Actions</div>
                            <div id="quick-actions" class="search-items"></div>
                        </div>
                    </div>
                </div>
                <div class="search-footer">
                    <div class="search-tips">
                        <span><kbd>↑↓</kbd> Navigate</span>
                        <span><kbd>Enter</kbd> Select</span>
                        <span><kbd>Tab</kbd> Next Category</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        this.overlay = overlay;
        this.searchInput = document.getElementById('global-search-input');
        this.resultsContainer = document.getElementById('search-results');
    }

    registerEventListeners() {
        // Global keyboard shortcut (Cmd/Ctrl + K)
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
        });

        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateResults(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateResults(-1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.selectResult();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.close();
                    break;
                case 'Tab':
                    e.preventDefault();
                    this.navigateCategories(e.shiftKey ? -1 : 1);
                    break;
            }
        });

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });
    }

    registerDefaultProviders() {
        // Leads search provider
        this.registerProvider('leads', {
            name: 'Leads',
            icon: 'fas fa-user',
            search: async (query) => {
                // Simulate lead search
                const mockLeads = [
                    { id: 1, name: 'John Doe', email: 'john@example.com', value: '$5,000' },
                    { id: 2, name: 'Jane Smith', email: 'jane@example.com', value: '$7,500' },
                    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', value: '$3,200' }
                ];
                
                return mockLeads
                    .filter(lead => 
                        lead.name.toLowerCase().includes(query.toLowerCase()) ||
                        lead.email.toLowerCase().includes(query.toLowerCase())
                    )
                    .map(lead => ({
                        id: `lead-${lead.id}`,
                        title: lead.name,
                        subtitle: `${lead.email} • ${lead.value}`,
                        icon: 'fas fa-user',
                        category: 'Leads',
                        action: () => this.navigateToLead(lead.id)
                    }));
            }
        });

        // Actions provider
        this.registerProvider('actions', {
            name: 'Actions',
            icon: 'fas fa-bolt',
            search: async (query) => {
                const actions = [
                    { 
                        id: 'new-lead',
                        title: 'Create New Lead',
                        subtitle: 'Add a new lead to the system',
                        icon: 'fas fa-plus-circle',
                        keywords: ['add', 'new', 'create', 'lead']
                    },
                    {
                        id: 'export-data',
                        title: 'Export Data',
                        subtitle: 'Export leads to CSV or Excel',
                        icon: 'fas fa-download',
                        keywords: ['export', 'download', 'csv', 'excel']
                    },
                    {
                        id: 'view-reports',
                        title: 'View Reports',
                        subtitle: 'Open analytics dashboard',
                        icon: 'fas fa-chart-line',
                        keywords: ['analytics', 'reports', 'dashboard', 'stats']
                    },
                    {
                        id: 'settings',
                        title: 'Settings',
                        subtitle: 'Configure system settings',
                        icon: 'fas fa-cog',
                        keywords: ['settings', 'config', 'preferences', 'options']
                    }
                ];

                return actions
                    .filter(action => 
                        action.title.toLowerCase().includes(query.toLowerCase()) ||
                        action.keywords.some(k => k.includes(query.toLowerCase()))
                    )
                    .map(action => ({
                        ...action,
                        category: 'Actions',
                        action: () => this.executeAction(action.id)
                    }));
            }
        });

        // Pages provider
        this.registerProvider('pages', {
            name: 'Pages',
            icon: 'fas fa-file',
            search: async (query) => {
                const pages = [
                    { title: 'Dashboard', path: '/dashboard', icon: 'fas fa-tachometer-alt' },
                    { title: 'Leads', path: '/leads', icon: 'fas fa-users' },
                    { title: 'Analytics', path: '/analytics', icon: 'fas fa-chart-bar' },
                    { title: 'Settings', path: '/settings', icon: 'fas fa-cog' },
                    { title: 'Profile', path: '/profile', icon: 'fas fa-user-circle' }
                ];

                return pages
                    .filter(page => page.title.toLowerCase().includes(query.toLowerCase()))
                    .map(page => ({
                        id: `page-${page.path}`,
                        title: page.title,
                        subtitle: page.path,
                        icon: page.icon,
                        category: 'Pages',
                        action: () => this.navigateToPage(page.path)
                    }));
            }
        });

        // Help provider
        this.registerProvider('help', {
            name: 'Help',
            icon: 'fas fa-question-circle',
            search: async (query) => {
                const helpItems = [
                    { 
                        title: 'Keyboard Shortcuts',
                        subtitle: 'View all keyboard shortcuts',
                        icon: 'fas fa-keyboard'
                    },
                    {
                        title: 'Documentation',
                        subtitle: 'Open user documentation',
                        icon: 'fas fa-book'
                    },
                    {
                        title: 'Contact Support',
                        subtitle: 'Get help from support team',
                        icon: 'fas fa-headset'
                    }
                ];

                return helpItems
                    .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
                    .map(item => ({
                        ...item,
                        id: `help-${item.title.toLowerCase().replace(/\s+/g, '-')}`,
                        category: 'Help',
                        action: () => this.showHelp(item.title)
                    }));
            }
        });
    }

    registerProvider(id, provider) {
        this.searchProviders.set(id, provider);
    }

    async handleSearch(query) {
        if (!query.trim()) {
            this.showDefaultResults();
            return;
        }

        // Clear previous results
        this.searchResults = [];
        this.selectedIndex = 0;

        // Search through all providers
        const searchPromises = Array.from(this.searchProviders.values()).map(provider =>
            provider.search(query).catch(err => {
                console.error('Search provider error:', err);
                return [];
            })
        );

        const results = await Promise.all(searchPromises);
        this.searchResults = results.flat();

        // Sort results by relevance (simple scoring based on match position)
        this.searchResults.sort((a, b) => {
            const aIndex = a.title.toLowerCase().indexOf(query.toLowerCase());
            const bIndex = b.title.toLowerCase().indexOf(query.toLowerCase());
            
            if (aIndex === 0 && bIndex !== 0) return -1;
            if (aIndex !== 0 && bIndex === 0) return 1;
            
            return aIndex - bIndex;
        });

        this.renderResults();
    }

    showDefaultResults() {
        // Show recent searches and quick actions
        const historyHtml = this.searchHistory.map((item, index) => `
            <div class="search-item ${index === 0 ? 'selected' : ''}" data-index="${index}">
                <i class="${item.icon} search-item-icon"></i>
                <div class="search-item-content">
                    <div class="search-item-title">${item.title}</div>
                    <div class="search-item-subtitle">${item.subtitle || ''}</div>
                </div>
                <i class="fas fa-history search-item-action"></i>
            </div>
        `).join('');

        const quickActionsHtml = `
            <div class="search-item" onclick="globalSearch.executeAction('new-lead')">
                <i class="fas fa-plus-circle search-item-icon"></i>
                <div class="search-item-content">
                    <div class="search-item-title">Create New Lead</div>
                </div>
            </div>
            <div class="search-item" onclick="globalSearch.executeAction('view-reports')">
                <i class="fas fa-chart-line search-item-icon"></i>
                <div class="search-item-content">
                    <div class="search-item-title">View Reports</div>
                </div>
            </div>
            <div class="search-item" onclick="globalSearch.executeAction('export-data')">
                <i class="fas fa-download search-item-icon"></i>
                <div class="search-item-content">
                    <div class="search-item-title">Export Data</div>
                </div>
            </div>
        `;

        document.getElementById('search-history').innerHTML = historyHtml || '<div class="search-empty">No recent searches</div>';
        document.getElementById('quick-actions').innerHTML = quickActionsHtml;
    }

    renderResults() {
        if (this.searchResults.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="search-empty">
                    <i class="fas fa-search"></i>
                    <p>No results found</p>
                </div>
            `;
            return;
        }

        // Group results by category
        const groupedResults = this.searchResults.reduce((acc, result) => {
            if (!acc[result.category]) {
                acc[result.category] = [];
            }
            acc[result.category].push(result);
            return acc;
        }, {});

        let html = '';
        let globalIndex = 0;

        for (const [category, results] of Object.entries(groupedResults)) {
            html += `
                <div class="search-category">
                    <div class="search-category-title">${category}</div>
                    <div class="search-items">
            `;

            results.forEach((result, index) => {
                const isSelected = globalIndex === this.selectedIndex;
                html += `
                    <div class="search-item ${isSelected ? 'selected' : ''}" 
                         data-index="${globalIndex}"
                         onclick="globalSearch.selectResult(${globalIndex})">
                        <i class="${result.icon} search-item-icon"></i>
                        <div class="search-item-content">
                            <div class="search-item-title">${this.highlightMatch(result.title, this.searchInput.value)}</div>
                            ${result.subtitle ? `<div class="search-item-subtitle">${result.subtitle}</div>` : ''}
                        </div>
                    </div>
                `;
                globalIndex++;
            });

            html += `
                    </div>
                </div>
            `;
        }

        this.resultsContainer.innerHTML = html;
    }

    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    navigateResults(direction) {
        const totalResults = this.searchResults.length;
        if (totalResults === 0) return;

        this.selectedIndex = (this.selectedIndex + direction + totalResults) % totalResults;
        this.updateSelectedResult();
    }

    navigateCategories(direction) {
        // TODO: Implement category navigation
    }

    updateSelectedResult() {
        const items = this.resultsContainer.querySelectorAll('.search-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });

        // Scroll selected item into view
        const selectedItem = items[this.selectedIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    selectResult(index = null) {
        const resultIndex = index !== null ? index : this.selectedIndex;
        const result = this.searchResults[resultIndex];
        
        if (result && result.action) {
            // Add to search history
            this.addToHistory(result);
            
            // Execute action
            result.action();
            
            // Close search
            this.close();
        }
    }

    addToHistory(item) {
        // Remove if already exists
        this.searchHistory = this.searchHistory.filter(h => h.id !== item.id);
        
        // Add to beginning
        this.searchHistory.unshift({
            ...item,
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }
        
        this.saveSearchHistory();
    }

    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('global-search-history');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load search history:', e);
        }
    }

    saveSearchHistory() {
        try {
            localStorage.setItem('global-search-history', JSON.stringify(this.searchHistory));
        } catch (e) {
            console.error('Failed to save search history:', e);
        }
    }

    // Action handlers
    navigateToLead(leadId) {
        console.log('Navigate to lead:', leadId);
        // Implement navigation logic
    }

    navigateToPage(path) {
        console.log('Navigate to page:', path);
        // window.location.href = path;
    }

    executeAction(actionId) {
        console.log('Execute action:', actionId);
        
        switch(actionId) {
            case 'new-lead':
                // Open new lead modal
                break;
            case 'export-data':
                // Open export dialog
                break;
            case 'view-reports':
                // Navigate to reports
                break;
            case 'settings':
                // Open settings
                break;
        }
    }

    showHelp(helpType) {
        console.log('Show help:', helpType);
        // Implement help display
    }

    // UI Control
    open() {
        this.isOpen = true;
        this.overlay.classList.add('active');
        this.searchInput.value = '';
        this.searchInput.focus();
        this.showDefaultResults();
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.remove('active');
        this.searchInput.value = '';
        this.searchResults = [];
        this.selectedIndex = 0;
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}

// Initialize global search
let globalSearch;
document.addEventListener('DOMContentLoaded', () => {
    globalSearch = new GlobalSearchModule();
    
    // Expose to global scope
    window.globalSearch = globalSearch;
}); 