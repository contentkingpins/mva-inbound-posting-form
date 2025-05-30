/**
 * Pagination Module
 * Handles all pagination functionality for the leads table
 */

class PaginationManager {
    constructor() {
        this.currentPage = 1;
        this.leadsPerPage = 25;
        this.totalPages = 1;
        this.filteredLeads = [];
        
        // DOM elements
        this.paginationContainer = document.getElementById('pagination-container');
        this.paginationInfoText = document.getElementById('pagination-info-text');
        this.firstPageBtn = document.getElementById('first-page-btn');
        this.prevPageBtn = document.getElementById('prev-page-btn');
        this.nextPageBtn = document.getElementById('next-page-btn');
        this.lastPageBtn = document.getElementById('last-page-btn');
        this.pageNumbers = document.getElementById('page-numbers');
        this.pageSizeSelect = document.getElementById('page-size-select');
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        if (this.firstPageBtn) {
            this.firstPageBtn.addEventListener('click', () => this.goToFirstPage());
        }
        if (this.prevPageBtn) {
            this.prevPageBtn.addEventListener('click', () => this.goToPrevPage());
        }
        if (this.nextPageBtn) {
            this.nextPageBtn.addEventListener('click', () => this.goToNextPage());
        }
        if (this.lastPageBtn) {
            this.lastPageBtn.addEventListener('click', () => this.goToLastPage());
        }
        if (this.pageSizeSelect) {
            this.pageSizeSelect.addEventListener('change', () => this.changePageSize());
        }
    }
    
    setFilteredLeads(leads) {
        this.filteredLeads = leads;
        this.calculatePagination();
    }
    
    calculatePagination() {
        this.totalPages = Math.ceil(this.filteredLeads.length / this.leadsPerPage);
        
        // Ensure current page is valid
        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }
    }
    
    getCurrentPageLeads() {
        const startIndex = (this.currentPage - 1) * this.leadsPerPage;
        const endIndex = Math.min(startIndex + this.leadsPerPage, this.filteredLeads.length);
        
        return this.filteredLeads
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(startIndex, endIndex);
    }
    
    shouldShowPagination() {
        return this.filteredLeads.length > 0 && this.totalPages > 1;
    }
    
    updateControls() {
        if (!this.paginationContainer) return;
        
        if (this.shouldShowPagination()) {
            this.paginationContainer.style.display = 'flex';
            this.updatePaginationControls();
        } else {
            this.paginationContainer.style.display = 'none';
        }
    }
    
    updatePaginationControls() {
        // Update info text
        const startItem = (this.currentPage - 1) * this.leadsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.leadsPerPage, this.filteredLeads.length);
        this.paginationInfoText.textContent = `Showing ${startItem}-${endItem} of ${this.filteredLeads.length} leads`;
        
        // Update button states
        this.firstPageBtn.disabled = this.currentPage === 1;
        this.prevPageBtn.disabled = this.currentPage === 1;
        this.nextPageBtn.disabled = this.currentPage === this.totalPages;
        this.lastPageBtn.disabled = this.currentPage === this.totalPages;
        
        // Update page numbers
        this.updatePageNumbers();
    }
    
    updatePageNumbers() {
        this.pageNumbers.innerHTML = '';
        
        // Calculate which page numbers to show
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Add page numbers
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => this.goToPage(i));
            this.pageNumbers.appendChild(pageBtn);
        }
    }
    
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            // Trigger re-render event
            this.triggerPageChange();
        }
    }
    
    goToFirstPage() {
        this.goToPage(1);
    }
    
    goToPrevPage() {
        this.goToPage(this.currentPage - 1);
    }
    
    goToNextPage() {
        this.goToPage(this.currentPage + 1);
    }
    
    goToLastPage() {
        this.goToPage(this.totalPages);
    }
    
    changePageSize() {
        this.leadsPerPage = parseInt(this.pageSizeSelect.value);
        this.currentPage = 1; // Reset to first page when changing page size
        this.triggerPageChange();
    }
    
    resetToFirstPage() {
        this.currentPage = 1;
    }
    
    triggerPageChange() {
        // Dispatch custom event for the main app to listen to
        document.dispatchEvent(new CustomEvent('paginationChanged', {
            detail: {
                currentPage: this.currentPage,
                leadsPerPage: this.leadsPerPage
            }
        }));
    }
}

// Export for use in main app
window.PaginationManager = PaginationManager; 