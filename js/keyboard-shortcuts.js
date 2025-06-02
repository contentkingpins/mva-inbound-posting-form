/**
 * Keyboard Shortcuts System
 * Comprehensive keyboard shortcut management with customization
 */

class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.activeModals = new Set();
        this.enabled = true;
        this.customShortcuts = {};
        this.defaultShortcuts = {
            // Global shortcuts
            'global.search': {
                keys: ['Ctrl+K', 'Cmd+K'],
                description: 'Open global search',
                category: 'Global',
                action: () => {
                    if (window.globalSearch) {
                        window.globalSearch.open();
                    }
                }
            },
            'global.notifications': {
                keys: ['Ctrl+N', 'Cmd+N'],
                description: 'Toggle notifications',
                category: 'Global',
                action: () => {
                    if (window.notificationCenter) {
                        window.notificationCenter.toggleDrawer();
                    }
                }
            },
            'global.help': {
                keys: ['?', 'Shift+/'],
                description: 'Show keyboard shortcuts',
                category: 'Global',
                action: () => this.showHelp()
            },
            'global.escape': {
                keys: ['Escape'],
                description: 'Close modal/overlay',
                category: 'Global',
                action: () => this.handleEscape()
            },
            
            // Navigation
            'nav.dashboard': {
                keys: ['G then D'],
                description: 'Go to Dashboard',
                category: 'Navigation',
                sequence: true,
                action: () => this.navigate('/dashboard')
            },
            'nav.leads': {
                keys: ['G then L'],
                description: 'Go to Leads',
                category: 'Navigation',
                sequence: true,
                action: () => this.navigate('/leads')
            },
            'nav.analytics': {
                keys: ['G then A'],
                description: 'Go to Analytics',
                category: 'Navigation',
                sequence: true,
                action: () => this.navigate('/analytics')
            },
            'nav.settings': {
                keys: ['G then S'],
                description: 'Go to Settings',
                category: 'Navigation',
                sequence: true,
                action: () => this.navigate('/settings')
            },
            
            // Actions
            'action.new': {
                keys: ['Ctrl+Alt+N', 'Cmd+Alt+N'],
                description: 'Create new item',
                category: 'Actions',
                action: () => this.triggerAction('new')
            },
            'action.save': {
                keys: ['Ctrl+S', 'Cmd+S'],
                description: 'Save current form',
                category: 'Actions',
                action: (e) => {
                    e.preventDefault();
                    this.triggerAction('save');
                }
            },
            'action.delete': {
                keys: ['Ctrl+Delete', 'Cmd+Delete'],
                description: 'Delete selected item',
                category: 'Actions',
                action: () => this.triggerAction('delete')
            },
            'action.refresh': {
                keys: ['Ctrl+R', 'Cmd+R', 'F5'],
                description: 'Refresh data',
                category: 'Actions',
                action: (e) => {
                    e.preventDefault();
                    this.triggerAction('refresh');
                }
            },
            
            // UI Controls
            'ui.theme': {
                keys: ['Ctrl+Shift+T', 'Cmd+Shift+T'],
                description: 'Toggle theme',
                category: 'UI Controls',
                action: () => this.toggleTheme()
            },
            'ui.sidebar': {
                keys: ['Ctrl+B', 'Cmd+B'],
                description: 'Toggle sidebar',
                category: 'UI Controls',
                action: () => this.toggleSidebar()
            },
            'ui.fullscreen': {
                keys: ['F11'],
                description: 'Toggle fullscreen',
                category: 'UI Controls',
                action: () => this.toggleFullscreen()
            },
            
            // Data Management
            'data.export': {
                keys: ['Ctrl+E', 'Cmd+E'],
                description: 'Export data',
                category: 'Data',
                action: () => {
                    if (window.dataExport) {
                        window.dataExport.openExportModal();
                    }
                }
            },
            'data.filter': {
                keys: ['Ctrl+F', 'Cmd+F'],
                description: 'Focus filter input',
                category: 'Data',
                action: (e) => {
                    e.preventDefault();
                    this.focusFilter();
                }
            },
            
            // Table/Grid Navigation
            'table.next': {
                keys: ['J', 'ArrowDown'],
                description: 'Next row',
                category: 'Table Navigation',
                context: 'table',
                action: () => this.navigateTable('down')
            },
            'table.prev': {
                keys: ['K', 'ArrowUp'],
                description: 'Previous row',
                category: 'Table Navigation',
                context: 'table',
                action: () => this.navigateTable('up')
            },
            'table.select': {
                keys: ['Space'],
                description: 'Select/deselect row',
                category: 'Table Navigation',
                context: 'table',
                action: () => this.toggleRowSelection()
            },
            'table.selectAll': {
                keys: ['Ctrl+A', 'Cmd+A'],
                description: 'Select all rows',
                category: 'Table Navigation',
                context: 'table',
                action: (e) => {
                    e.preventDefault();
                    this.selectAllRows();
                }
            }
        };
        
        this.sequenceBuffer = [];
        this.sequenceTimeout = null;
        this.init();
    }

    init() {
        this.loadCustomShortcuts();
        this.registerShortcuts();
        this.setupEventListeners();
        this.createShortcutIndicators();
    }

    registerShortcuts() {
        // Merge default and custom shortcuts
        const allShortcuts = { ...this.defaultShortcuts, ...this.customShortcuts };
        
        Object.entries(allShortcuts).forEach(([id, shortcut]) => {
            this.register(id, shortcut);
        });
    }

    register(id, config) {
        const shortcut = {
            id,
            keys: Array.isArray(config.keys) ? config.keys : [config.keys],
            description: config.description,
            category: config.category || 'General',
            action: config.action,
            context: config.context,
            sequence: config.sequence || false,
            enabled: config.enabled !== false
        };
        
        this.shortcuts.set(id, shortcut);
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Clear sequence on click or focus change
        document.addEventListener('click', () => this.clearSequence());
        window.addEventListener('blur', () => this.clearSequence());
    }

    handleKeyDown(event) {
        if (!this.enabled) return;
        
        // Don't trigger shortcuts in input fields unless explicitly allowed
        if (this.isInputField(event.target) && !event.ctrlKey && !event.metaKey) {
            return;
        }
        
        const key = this.getKeyString(event);
        
        // Handle sequence shortcuts
        if (this.sequenceBuffer.length > 0) {
            this.sequenceBuffer.push(key);
            const sequenceKey = this.sequenceBuffer.join(' then ');
            
            // Check if this completes a sequence
            const matchingShortcut = Array.from(this.shortcuts.values()).find(
                shortcut => shortcut.sequence && 
                shortcut.keys.some(k => k.toLowerCase() === sequenceKey.toLowerCase())
            );
            
            if (matchingShortcut && matchingShortcut.enabled) {
                event.preventDefault();
                this.executeShortcut(matchingShortcut, event);
                this.clearSequence();
                return;
            }
            
            // Clear sequence after timeout
            this.resetSequenceTimeout();
            return;
        }
        
        // Check for regular shortcuts
        const matchingShortcut = Array.from(this.shortcuts.values()).find(
            shortcut => !shortcut.sequence && 
            shortcut.keys.some(k => k.toLowerCase() === key.toLowerCase()) &&
            shortcut.enabled &&
            this.checkContext(shortcut.context)
        );
        
        if (matchingShortcut) {
            event.preventDefault();
            this.executeShortcut(matchingShortcut, event);
        } else if (key.toLowerCase() === 'g') {
            // Start sequence
            this.sequenceBuffer.push(key);
            this.resetSequenceTimeout();
        }
    }

    handleKeyUp(event) {
        // Handle key up events if needed
    }

    getKeyString(event) {
        const keys = [];
        
        if (event.ctrlKey) keys.push('Ctrl');
        if (event.altKey) keys.push('Alt');
        if (event.shiftKey) keys.push('Shift');
        if (event.metaKey) keys.push('Cmd');
        
        let key = event.key;
        
        // Normalize key names
        const keyMap = {
            ' ': 'Space',
            'ArrowUp': 'ArrowUp',
            'ArrowDown': 'ArrowDown',
            'ArrowLeft': 'ArrowLeft',
            'ArrowRight': 'ArrowRight',
            'Enter': 'Enter',
            'Escape': 'Escape',
            'Delete': 'Delete',
            'Backspace': 'Backspace',
            '/': '/'
        };
        
        key = keyMap[key] || key.toUpperCase();
        
        if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key.toUpperCase())) {
            keys.push(key);
        }
        
        return keys.join('+');
    }

    executeShortcut(shortcut, event) {
        try {
            shortcut.action(event);
            
            // Show visual feedback
            this.showShortcutFeedback(shortcut);
            
            // Log usage for analytics
            this.logShortcutUsage(shortcut.id);
        } catch (error) {
            console.error('Error executing shortcut:', error);
        }
    }

    showShortcutFeedback(shortcut) {
        const feedback = document.createElement('div');
        feedback.className = 'shortcut-feedback';
        feedback.innerHTML = `
            <div class="shortcut-feedback-content">
                <span class="shortcut-feedback-keys">${shortcut.keys[0]}</span>
                <span class="shortcut-feedback-description">${shortcut.description}</span>
            </div>
        `;
        
        document.body.appendChild(feedback);
        
        // Animate in
        requestAnimationFrame(() => {
            feedback.classList.add('show');
        });
        
        // Remove after animation
        setTimeout(() => {
            feedback.classList.add('hide');
            setTimeout(() => feedback.remove(), 300);
        }, 1500);
    }

    isInputField(element) {
        const tagName = element.tagName.toLowerCase();
        return ['input', 'textarea', 'select'].includes(tagName) ||
               element.contentEditable === 'true';
    }

    checkContext(context) {
        if (!context) return true;
        
        switch (context) {
            case 'table':
                return document.activeElement.closest('table') !== null;
            case 'form':
                return document.activeElement.closest('form') !== null;
            case 'modal':
                return document.querySelector('.modal.active') !== null;
            default:
                return true;
        }
    }

    clearSequence() {
        this.sequenceBuffer = [];
        if (this.sequenceTimeout) {
            clearTimeout(this.sequenceTimeout);
            this.sequenceTimeout = null;
        }
    }

    resetSequenceTimeout() {
        if (this.sequenceTimeout) {
            clearTimeout(this.sequenceTimeout);
        }
        
        this.sequenceTimeout = setTimeout(() => {
            this.clearSequence();
        }, 2000); // 2 second timeout for sequences
    }

    // Actions
    navigate(path) {
        console.log('Navigate to:', path);
        // In a real app, this would use your routing system
        window.location.href = path;
    }

    triggerAction(action) {
        console.log('Trigger action:', action);
        // Dispatch custom events that components can listen to
        document.dispatchEvent(new CustomEvent('shortcut-action', {
            detail: { action }
        }));
    }

    toggleTheme() {
        document.body.classList.toggle('light-theme');
        localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    focusFilter() {
        const filterInput = document.querySelector('input[type="search"], input[placeholder*="Search"], input[placeholder*="Filter"]');
        if (filterInput) {
            filterInput.focus();
            filterInput.select();
        }
    }

    navigateTable(direction) {
        const activeRow = document.querySelector('tr.selected, tr.active');
        if (!activeRow) {
            // Select first row
            const firstRow = document.querySelector('tbody tr');
            if (firstRow) {
                firstRow.classList.add('selected');
            }
            return;
        }
        
        const nextRow = direction === 'down' ? 
            activeRow.nextElementSibling : 
            activeRow.previousElementSibling;
            
        if (nextRow && nextRow.tagName === 'TR') {
            activeRow.classList.remove('selected');
            nextRow.classList.add('selected');
            nextRow.scrollIntoView({ block: 'nearest' });
        }
    }

    toggleRowSelection() {
        const activeRow = document.querySelector('tr.selected');
        if (activeRow) {
            const checkbox = activeRow.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    selectAllRows() {
        const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    handleEscape() {
        // Close modals
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
            activeModal.remove();
            return;
        }
        
        // Close dropdowns
        const activeDropdown = document.querySelector('.dropdown.open');
        if (activeDropdown) {
            activeDropdown.classList.remove('open');
            return;
        }
        
        // Clear selection
        const selectedElements = document.querySelectorAll('.selected');
        selectedElements.forEach(el => el.classList.remove('selected'));
    }

    // Help overlay
    showHelp() {
        const modal = document.createElement('div');
        modal.className = 'keyboard-shortcuts-modal modal-overlay active';
        modal.innerHTML = `
            <div class="modal keyboard-shortcuts-content">
                <div class="modal-header">
                    <h3>Keyboard Shortcuts</h3>
                    <div class="modal-header-actions">
                        <button class="btn btn-secondary" onclick="keyboardShortcuts.showCustomizeModal()">
                            <i class="fas fa-cog"></i> Customize
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="shortcuts-search">
                        <input type="text" 
                               class="form-input" 
                               placeholder="Search shortcuts..." 
                               onkeyup="keyboardShortcuts.filterShortcuts(this.value)">
                    </div>
                    <div class="shortcuts-list">
                        ${this.renderShortcutsList()}
                    </div>
                </div>
                <div class="modal-footer">
                    <div class="shortcuts-footer-info">
                        <span>Press <kbd>?</kbd> anytime to show this help</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus search input
        modal.querySelector('input').focus();
        
        // Close on escape
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.remove();
            }
        });
    }

    renderShortcutsList() {
        const categories = {};
        
        // Group shortcuts by category
        this.shortcuts.forEach(shortcut => {
            if (!shortcut.enabled) return;
            
            if (!categories[shortcut.category]) {
                categories[shortcut.category] = [];
            }
            categories[shortcut.category].push(shortcut);
        });
        
        // Render categories
        return Object.entries(categories)
            .map(([category, shortcuts]) => `
                <div class="shortcuts-category">
                    <h4 class="shortcuts-category-title">${category}</h4>
                    <div class="shortcuts-items">
                        ${shortcuts.map(shortcut => `
                            <div class="shortcut-item" data-id="${shortcut.id}">
                                <div class="shortcut-keys">
                                    ${shortcut.keys.map(key => `<kbd>${key}</kbd>`).join(' or ')}
                                </div>
                                <div class="shortcut-description">${shortcut.description}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
    }

    filterShortcuts(query) {
        const items = document.querySelectorAll('.shortcut-item');
        const lowerQuery = query.toLowerCase();
        
        items.forEach(item => {
            const description = item.querySelector('.shortcut-description').textContent.toLowerCase();
            const keys = item.querySelector('.shortcut-keys').textContent.toLowerCase();
            
            if (description.includes(lowerQuery) || keys.includes(lowerQuery)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Hide empty categories
        document.querySelectorAll('.shortcuts-category').forEach(category => {
            const visibleItems = category.querySelectorAll('.shortcut-item:not([style*="display: none"])');
            category.style.display = visibleItems.length > 0 ? '' : 'none';
        });
    }

    // Customization
    showCustomizeModal() {
        const modal = document.createElement('div');
        modal.className = 'shortcuts-customize-modal modal-overlay active';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Customize Keyboard Shortcuts</h3>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="customize-shortcuts-list">
                        ${this.renderCustomizeList()}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="keyboardShortcuts.saveCustomShortcuts()">
                        Save Changes
                    </button>
                    <button class="btn btn-secondary" onclick="keyboardShortcuts.resetToDefaults()">
                        Reset to Defaults
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    renderCustomizeList() {
        const categories = {};
        
        // Group shortcuts by category
        this.shortcuts.forEach((shortcut, id) => {
            if (!categories[shortcut.category]) {
                categories[shortcut.category] = [];
            }
            categories[shortcut.category].push({ ...shortcut, id });
        });
        
        return Object.entries(categories)
            .map(([category, shortcuts]) => `
                <div class="customize-category">
                    <h4>${category}</h4>
                    ${shortcuts.map(shortcut => `
                        <div class="customize-shortcut-item">
                            <div class="customize-shortcut-info">
                                <label>
                                    <input type="checkbox" 
                                           data-shortcut-id="${shortcut.id}" 
                                           ${shortcut.enabled ? 'checked' : ''}>
                                    ${shortcut.description}
                                </label>
                            </div>
                            <div class="customize-shortcut-keys">
                                <input type="text" 
                                       class="form-input" 
                                       data-shortcut-id="${shortcut.id}"
                                       value="${shortcut.keys[0]}"
                                       placeholder="Enter shortcut">
                            </div>
                        </div>
                    `).join('')}
                </div>
            `).join('');
    }

    saveCustomShortcuts() {
        const customizations = {};
        
        // Get all customizations
        document.querySelectorAll('.customize-shortcut-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const keyInput = item.querySelector('input[type="text"]');
            const id = checkbox.dataset.shortcutId;
            
            const original = this.shortcuts.get(id);
            if (original) {
                customizations[id] = {
                    ...original,
                    enabled: checkbox.checked,
                    keys: [keyInput.value]
                };
            }
        });
        
        // Save to localStorage
        localStorage.setItem('custom-shortcuts', JSON.stringify(customizations));
        
        // Reload shortcuts
        this.loadCustomShortcuts();
        this.registerShortcuts();
        
        // Close modal
        document.querySelector('.shortcuts-customize-modal').remove();
        
        // Show confirmation
        if (window.notificationCenter) {
            window.notificationCenter.notify({
                type: 'success',
                title: 'Shortcuts Updated',
                message: 'Your keyboard shortcuts have been saved.'
            });
        }
    }

    resetToDefaults() {
        if (confirm('Are you sure you want to reset all shortcuts to their defaults?')) {
            localStorage.removeItem('custom-shortcuts');
            this.customShortcuts = {};
            this.shortcuts.clear();
            this.registerShortcuts();
            
            // Refresh the customize modal
            document.querySelector('.shortcuts-customize-modal').remove();
            this.showCustomizeModal();
        }
    }

    loadCustomShortcuts() {
        const saved = localStorage.getItem('custom-shortcuts');
        if (saved) {
            this.customShortcuts = JSON.parse(saved);
        }
    }

    // Create visual indicators for important shortcuts
    createShortcutIndicators() {
        // Add indicators to buttons and links
        const indicators = [
            { selector: 'button[data-action="save"]', shortcut: 'Ctrl+S' },
            { selector: 'button[data-action="new"]', shortcut: 'Ctrl+Alt+N' },
            { selector: 'button[data-action="delete"]', shortcut: 'Ctrl+Delete' },
            { selector: 'button[data-action="export"]', shortcut: 'Ctrl+E' }
        ];
        
        indicators.forEach(({ selector, shortcut }) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (!el.querySelector('.shortcut-indicator')) {
                    const indicator = document.createElement('span');
                    indicator.className = 'shortcut-indicator';
                    indicator.textContent = shortcut;
                    el.appendChild(indicator);
                }
            });
        });
    }

    // Analytics
    logShortcutUsage(shortcutId) {
        const usage = JSON.parse(localStorage.getItem('shortcut-usage') || '{}');
        usage[shortcutId] = (usage[shortcutId] || 0) + 1;
        localStorage.setItem('shortcut-usage', JSON.stringify(usage));
    }

    getMostUsedShortcuts() {
        const usage = JSON.parse(localStorage.getItem('shortcut-usage') || '{}');
        return Object.entries(usage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([id, count]) => ({
                shortcut: this.shortcuts.get(id),
                count
            }));
    }

    // Enable/disable shortcuts
    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    toggle() {
        this.enabled = !this.enabled;
    }
}

// Initialize keyboard shortcuts
let keyboardShortcuts;
document.addEventListener('DOMContentLoaded', () => {
    keyboardShortcuts = new KeyboardShortcuts();
    
    // Expose to global scope
    window.keyboardShortcuts = keyboardShortcuts;
}); 