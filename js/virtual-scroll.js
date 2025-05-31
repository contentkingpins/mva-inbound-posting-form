/**
 * Virtual Scroll Module
 * High-performance scrolling for large datasets
 */

class VirtualScroll {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? 
            document.querySelector(container) : container;
            
        if (!this.container) {
            throw new Error('Virtual scroll container not found');
        }
        
        this.options = {
            itemHeight: options.itemHeight || 50,
            buffer: options.buffer || 5,
            threshold: options.threshold || 100,
            renderBatch: options.renderBatch || 20,
            debounceDelay: options.debounceDelay || 10,
            dynamicHeight: options.dynamicHeight || false,
            horizontal: options.horizontal || false,
            ...options
        };
        
        this.items = [];
        this.visibleRange = { start: 0, end: 0 };
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;
        this.itemHeights = new Map();
        this.averageItemHeight = this.options.itemHeight;
        this.renderQueue = [];
        this.isRendering = false;
        this.scrollTimeout = null;
        this.resizeObserver = null;
        this.intersectionObserver = null;
        
        this.init();
    }

    init() {
        this.setupDOM();
        this.attachEventListeners();
        this.setupObservers();
        this.measure();
        this.render();
    }

    setupDOM() {
        // Create virtual scroll structure
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-scroll-viewport';
        this.viewport.style.cssText = `
            height: 100%;
            overflow-y: auto;
            position: relative;
        `;
        
        this.spacer = document.createElement('div');
        this.spacer.className = 'virtual-scroll-spacer';
        this.spacer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 1px;
            pointer-events: none;
            visibility: hidden;
        `;
        
        this.content = document.createElement('div');
        this.content.className = 'virtual-scroll-content';
        this.content.style.cssText = `
            position: relative;
            width: 100%;
        `;
        
        // Move existing content
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        
        this.viewport.appendChild(this.spacer);
        this.viewport.appendChild(this.content);
        this.container.appendChild(this.viewport);
    }

    attachEventListeners() {
        // Optimized scroll handling
        let ticking = false;
        this.viewport.addEventListener('scroll', () => {
            this.scrollTop = this.viewport.scrollTop;
            
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    setupObservers() {
        // Resize observer for container
        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { height } = entry.contentRect;
                if (Math.abs(height - this.containerHeight) > 1) {
                    this.containerHeight = height;
                    this.render();
                }
            }
        });
        this.resizeObserver.observe(this.viewport);
        
        // Intersection observer for lazy loading
        if (this.options.lazyLoad) {
            this.intersectionObserver = new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const index = parseInt(entry.target.dataset.index);
                            if (this.options.onLazyLoad) {
                                this.options.onLazyLoad(index, entry.target);
                            }
                        }
                    });
                },
                {
                    root: this.viewport,
                    rootMargin: '50px'
                }
            );
        }
    }

    setItems(items) {
        this.items = items;
        this.itemHeights.clear();
        this.calculateTotalHeight();
        this.render();
    }

    updateItem(index, item) {
        if (index >= 0 && index < this.items.length) {
            this.items[index] = item;
            const element = this.content.querySelector(`[data-index="${index}"]`);
            if (element) {
                this.renderItem(item, index, element);
            }
        }
    }

    measure() {
        const rect = this.viewport.getBoundingClientRect();
        this.containerHeight = rect.height;
    }

    calculateTotalHeight() {
        if (this.options.dynamicHeight) {
            // For dynamic heights, use measured or estimated heights
            let totalHeight = 0;
            for (let i = 0; i < this.items.length; i++) {
                const height = this.itemHeights.get(i) || this.averageItemHeight;
                totalHeight += height;
            }
            this.totalHeight = totalHeight;
        } else {
            // Fixed height calculation
            this.totalHeight = this.items.length * this.options.itemHeight;
        }
        
        this.spacer.style.height = `${this.totalHeight}px`;
    }

    handleScroll() {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.render();
        }, this.options.debounceDelay);
    }

    calculateVisibleRange() {
        const scrollTop = this.scrollTop;
        const containerHeight = this.containerHeight;
        
        if (this.options.dynamicHeight) {
            // Dynamic height calculation
            let accumulatedHeight = 0;
            let start = 0;
            let end = this.items.length;
            
            // Find start index
            for (let i = 0; i < this.items.length; i++) {
                const height = this.itemHeights.get(i) || this.averageItemHeight;
                if (accumulatedHeight + height > scrollTop) {
                    start = i;
                    break;
                }
                accumulatedHeight += height;
            }
            
            // Find end index
            accumulatedHeight = 0;
            for (let i = start; i < this.items.length; i++) {
                if (accumulatedHeight > containerHeight) {
                    end = i;
                    break;
                }
                const height = this.itemHeights.get(i) || this.averageItemHeight;
                accumulatedHeight += height;
            }
            
            return {
                start: Math.max(0, start - this.options.buffer),
                end: Math.min(this.items.length, end + this.options.buffer)
            };
        } else {
            // Fixed height calculation
            const itemHeight = this.options.itemHeight;
            const start = Math.floor(scrollTop / itemHeight);
            const visibleCount = Math.ceil(containerHeight / itemHeight);
            
            return {
                start: Math.max(0, start - this.options.buffer),
                end: Math.min(this.items.length, start + visibleCount + this.options.buffer)
            };
        }
    }

    render() {
        if (this.isRendering) {
            this.renderQueue.push(() => this.render());
            return;
        }
        
        this.isRendering = true;
        const newRange = this.calculateVisibleRange();
        
        // Check if range has changed significantly
        if (Math.abs(newRange.start - this.visibleRange.start) < this.options.threshold &&
            Math.abs(newRange.end - this.visibleRange.end) < this.options.threshold) {
            this.isRendering = false;
            return;
        }
        
        this.visibleRange = newRange;
        
        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        const itemsToRender = [];
        
        // Collect items to render
        for (let i = newRange.start; i < newRange.end; i++) {
            if (i < this.items.length) {
                itemsToRender.push({ item: this.items[i], index: i });
            }
        }
        
        // Batch render items
        this.batchRenderItems(itemsToRender, fragment, () => {
            // Clear content and append new items
            this.content.innerHTML = '';
            this.content.appendChild(fragment);
            
            // Position content
            this.positionContent();
            
            this.isRendering = false;
            
            // Process queued renders
            if (this.renderQueue.length > 0) {
                const nextRender = this.renderQueue.shift();
                requestAnimationFrame(nextRender);
            }
            
            // Trigger render complete callback
            if (this.options.onRenderComplete) {
                this.options.onRenderComplete(this.visibleRange);
            }
        });
    }

    batchRenderItems(items, fragment, callback) {
        const batchSize = this.options.renderBatch;
        let currentIndex = 0;
        
        const renderBatch = () => {
            const endIndex = Math.min(currentIndex + batchSize, items.length);
            
            for (let i = currentIndex; i < endIndex; i++) {
                const { item, index } = items[i];
                const element = this.createItemElement(item, index);
                fragment.appendChild(element);
            }
            
            currentIndex = endIndex;
            
            if (currentIndex < items.length) {
                requestAnimationFrame(renderBatch);
            } else {
                callback();
            }
        };
        
        renderBatch();
    }

    createItemElement(item, index) {
        const element = document.createElement('div');
        element.className = 'virtual-scroll-item';
        element.dataset.index = index;
        
        if (!this.options.dynamicHeight) {
            element.style.height = `${this.options.itemHeight}px`;
        }
        
        this.renderItem(item, index, element);
        
        // Observe for intersection if lazy loading
        if (this.intersectionObserver) {
            this.intersectionObserver.observe(element);
        }
        
        // Measure height after rendering for dynamic heights
        if (this.options.dynamicHeight) {
            requestAnimationFrame(() => {
                const height = element.offsetHeight;
                if (height > 0) {
                    this.itemHeights.set(index, height);
                    this.updateAverageHeight();
                }
            });
        }
        
        return element;
    }

    renderItem(item, index, element) {
        if (this.options.renderItem) {
            const content = this.options.renderItem(item, index);
            if (typeof content === 'string') {
                element.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                element.innerHTML = '';
                element.appendChild(content);
            }
        } else {
            element.textContent = JSON.stringify(item);
        }
    }

    positionContent() {
        if (this.options.dynamicHeight) {
            // Calculate offset for dynamic heights
            let offset = 0;
            for (let i = 0; i < this.visibleRange.start; i++) {
                offset += this.itemHeights.get(i) || this.averageItemHeight;
            }
            this.content.style.transform = `translateY(${offset}px)`;
        } else {
            // Simple offset for fixed heights
            const offset = this.visibleRange.start * this.options.itemHeight;
            this.content.style.transform = `translateY(${offset}px)`;
        }
    }

    updateAverageHeight() {
        if (this.itemHeights.size > 0) {
            let total = 0;
            this.itemHeights.forEach(height => total += height);
            this.averageItemHeight = total / this.itemHeights.size;
        }
    }

    // Public API methods
    scrollToIndex(index, behavior = 'smooth') {
        if (index < 0 || index >= this.items.length) return;
        
        let offset;
        if (this.options.dynamicHeight) {
            offset = 0;
            for (let i = 0; i < index; i++) {
                offset += this.itemHeights.get(i) || this.averageItemHeight;
            }
        } else {
            offset = index * this.options.itemHeight;
        }
        
        this.viewport.scrollTo({
            top: offset,
            behavior
        });
    }

    scrollToTop(behavior = 'smooth') {
        this.viewport.scrollTo({
            top: 0,
            behavior
        });
    }

    scrollToBottom(behavior = 'smooth') {
        this.viewport.scrollTo({
            top: this.totalHeight,
            behavior
        });
    }

    refresh() {
        this.measure();
        this.calculateTotalHeight();
        this.render();
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        this.viewport.removeEventListener('scroll', this.handleScroll);
        this.container.innerHTML = '';
    }

    // Get visible items
    getVisibleItems() {
        const items = [];
        for (let i = this.visibleRange.start; i < this.visibleRange.end; i++) {
            if (i < this.items.length) {
                items.push(this.items[i]);
            }
        }
        return items;
    }

    // Get scroll progress
    getScrollProgress() {
        return this.scrollTop / (this.totalHeight - this.containerHeight);
    }
}

// Table-specific virtual scroll implementation
class VirtualTable extends VirtualScroll {
    constructor(container, options = {}) {
        super(container, {
            ...options,
            itemHeight: options.rowHeight || 40
        });
        
        this.columns = options.columns || [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.selectedRows = new Set();
    }

    setupDOM() {
        super.setupDOM();
        
        // Add table-specific structure
        this.table = document.createElement('table');
        this.table.className = 'virtual-table';
        
        this.thead = document.createElement('thead');
        this.tbody = document.createElement('tbody');
        
        this.table.appendChild(this.thead);
        this.table.appendChild(this.tbody);
        
        this.content.appendChild(this.table);
        
        // Render headers
        this.renderHeaders();
    }

    renderHeaders() {
        const headerRow = document.createElement('tr');
        
        this.columns.forEach((column, index) => {
            const th = document.createElement('th');
            th.textContent = column.label;
            th.dataset.column = column.field;
            
            if (column.sortable) {
                th.classList.add('sortable');
                th.addEventListener('click', () => this.sort(column.field));
            }
            
            if (column.width) {
                th.style.width = column.width;
            }
            
            headerRow.appendChild(th);
        });
        
        this.thead.innerHTML = '';
        this.thead.appendChild(headerRow);
    }

    createItemElement(item, index) {
        const tr = document.createElement('tr');
        tr.className = 'virtual-table-row';
        tr.dataset.index = index;
        
        if (this.selectedRows.has(index)) {
            tr.classList.add('selected');
        }
        
        this.columns.forEach(column => {
            const td = document.createElement('td');
            const value = this.getNestedValue(item, column.field);
            
            if (column.render) {
                const content = column.render(value, item, index);
                if (typeof content === 'string') {
                    td.innerHTML = content;
                } else {
                    td.appendChild(content);
                }
            } else {
                td.textContent = value;
            }
            
            tr.appendChild(td);
        });
        
        // Add click handler for selection
        tr.addEventListener('click', (e) => {
            if (this.options.selectable) {
                this.toggleRowSelection(index, e);
            }
        });
        
        return tr;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    sort(field) {
        if (this.sortColumn === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = field;
            this.sortDirection = 'asc';
        }
        
        const multiplier = this.sortDirection === 'asc' ? 1 : -1;
        
        this.items.sort((a, b) => {
            const aVal = this.getNestedValue(a, field);
            const bVal = this.getNestedValue(b, field);
            
            if (aVal < bVal) return -1 * multiplier;
            if (aVal > bVal) return 1 * multiplier;
            return 0;
        });
        
        this.render();
        this.updateSortIndicators();
    }

    updateSortIndicators() {
        this.thead.querySelectorAll('th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.column === this.sortColumn) {
                th.classList.add(`sort-${this.sortDirection}`);
            }
        });
    }

    toggleRowSelection(index, event) {
        if (event.shiftKey && this.lastSelectedIndex !== undefined) {
            // Range selection
            const start = Math.min(this.lastSelectedIndex, index);
            const end = Math.max(this.lastSelectedIndex, index);
            
            for (let i = start; i <= end; i++) {
                this.selectedRows.add(i);
            }
        } else if (event.ctrlKey || event.metaKey) {
            // Multi-selection
            if (this.selectedRows.has(index)) {
                this.selectedRows.delete(index);
            } else {
                this.selectedRows.add(index);
            }
        } else {
            // Single selection
            this.selectedRows.clear();
            this.selectedRows.add(index);
        }
        
        this.lastSelectedIndex = index;
        this.render();
        
        if (this.options.onSelectionChange) {
            this.options.onSelectionChange(Array.from(this.selectedRows));
        }
    }

    getSelectedItems() {
        return Array.from(this.selectedRows).map(index => this.items[index]);
    }

    clearSelection() {
        this.selectedRows.clear();
        this.render();
    }
}

// Export for use
window.VirtualScroll = VirtualScroll;
window.VirtualTable = VirtualTable; 