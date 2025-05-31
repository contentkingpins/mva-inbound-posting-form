/**
 * Data Export Module
 * Comprehensive data export functionality for various formats
 */

class DataExportModule {
    constructor() {
        this.exportFormats = {
            csv: {
                name: 'CSV',
                icon: 'fas fa-file-csv',
                mimeType: 'text/csv',
                extension: '.csv'
            },
            excel: {
                name: 'Excel',
                icon: 'fas fa-file-excel',
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                extension: '.xlsx'
            },
            pdf: {
                name: 'PDF',
                icon: 'fas fa-file-pdf',
                mimeType: 'application/pdf',
                extension: '.pdf'
            },
            json: {
                name: 'JSON',
                icon: 'fas fa-file-code',
                mimeType: 'application/json',
                extension: '.json'
            }
        };

        this.exportHistory = [];
        this.maxHistoryItems = 50;
        this.currentExport = null;
        
        this.init();
    }

    init() {
        this.loadExportHistory();
        this.createExportUI();
    }

    createExportUI() {
        // Create export button that can be added to any page
        const exportButton = document.createElement('button');
        exportButton.id = 'global-export-button';
        exportButton.className = 'export-button';
        exportButton.innerHTML = `
            <i class="fas fa-download"></i>
            <span>Export</span>
        `;
        exportButton.style.display = 'none'; // Hidden by default
        document.body.appendChild(exportButton);

        exportButton.addEventListener('click', () => this.openExportModal());
    }

    // Open export modal
    openExportModal(data = null, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'export-modal modal-overlay active';
        modal.innerHTML = `
            <div class="modal export-modal-content">
                <div class="modal-header">
                    <h3>Export Data</h3>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <h4>Select Export Format</h4>
                        <div class="export-format-grid">
                            ${Object.entries(this.exportFormats).map(([key, format]) => `
                                <div class="export-format-option" data-format="${key}">
                                    <i class="${format.icon}"></i>
                                    <span>${format.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="export-settings">
                        <h4>Export Settings</h4>
                        
                        <div class="export-setting-group">
                            <label>
                                <input type="checkbox" id="export-include-headers" checked>
                                Include headers
                            </label>
                        </div>
                        
                        <div class="export-setting-group">
                            <label>
                                <input type="checkbox" id="export-include-metadata">
                                Include metadata (timestamp, filters, etc.)
                            </label>
                        </div>
                        
                        <div class="export-setting-group">
                            <label>Date Format</label>
                            <select id="export-date-format" class="form-select">
                                <option value="ISO">ISO 8601 (YYYY-MM-DD)</option>
                                <option value="US">US Format (MM/DD/YYYY)</option>
                                <option value="EU">EU Format (DD/MM/YYYY)</option>
                                <option value="timestamp">Unix Timestamp</option>
                            </select>
                        </div>
                        
                        <div class="export-setting-group">
                            <label>Filename</label>
                            <input type="text" id="export-filename" class="form-input" 
                                   value="${options.filename || this.generateFilename()}">
                        </div>
                    </div>
                    
                    <div class="export-preview">
                        <h4>Data Preview</h4>
                        <div class="export-preview-content" id="export-preview">
                            <p class="text-secondary">Select a format to preview the export</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="export-confirm" disabled>
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Store the data to export
        this.currentExport = {
            data: data || this.getPageData(),
            options: options
        };

        // Add event listeners
        this.setupExportModalEvents(modal);
    }

    setupExportModalEvents(modal) {
        // Format selection
        modal.querySelectorAll('.export-format-option').forEach(option => {
            option.addEventListener('click', () => {
                // Remove previous selection
                modal.querySelectorAll('.export-format-option').forEach(opt => 
                    opt.classList.remove('selected'));
                
                // Add selection to clicked option
                option.classList.add('selected');
                
                // Enable export button
                modal.querySelector('#export-confirm').disabled = false;
                
                // Update preview
                const format = option.dataset.format;
                this.updateExportPreview(format);
            });
        });

        // Export button
        modal.querySelector('#export-confirm').addEventListener('click', () => {
            const selectedFormat = modal.querySelector('.export-format-option.selected');
            if (selectedFormat) {
                const format = selectedFormat.dataset.format;
                const settings = this.getExportSettings(modal);
                this.exportData(format, settings);
                modal.remove();
            }
        });

        // Settings change
        modal.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', () => {
                const selectedFormat = modal.querySelector('.export-format-option.selected');
                if (selectedFormat) {
                    this.updateExportPreview(selectedFormat.dataset.format);
                }
            });
        });
    }

    getExportSettings(modal) {
        return {
            includeHeaders: modal.querySelector('#export-include-headers').checked,
            includeMetadata: modal.querySelector('#export-include-metadata').checked,
            dateFormat: modal.querySelector('#export-date-format').value,
            filename: modal.querySelector('#export-filename').value
        };
    }

    updateExportPreview(format) {
        const previewEl = document.getElementById('export-preview');
        const settings = this.getExportSettings(document.querySelector('.export-modal'));
        
        let previewContent = '';
        const sampleData = this.currentExport.data.slice(0, 3); // Show first 3 rows

        switch (format) {
            case 'csv':
                previewContent = this.generateCSVPreview(sampleData, settings);
                break;
            case 'excel':
                previewContent = this.generateExcelPreview(sampleData, settings);
                break;
            case 'pdf':
                previewContent = this.generatePDFPreview(sampleData, settings);
                break;
            case 'json':
                previewContent = this.generateJSONPreview(sampleData, settings);
                break;
        }

        previewEl.innerHTML = `
            <div class="export-preview-format">${this.exportFormats[format].name} Format</div>
            <pre class="export-preview-data">${previewContent}</pre>
            <div class="export-preview-info">
                Showing first 3 rows of ${this.currentExport.data.length} total rows
            </div>
        `;
    }

    // Export data in selected format
    async exportData(format, settings) {
        try {
            // Show progress
            this.showExportProgress();

            let exportedData;
            const data = this.currentExport.data;

            switch (format) {
                case 'csv':
                    exportedData = await this.exportToCSV(data, settings);
                    break;
                case 'excel':
                    exportedData = await this.exportToExcel(data, settings);
                    break;
                case 'pdf':
                    exportedData = await this.exportToPDF(data, settings);
                    break;
                case 'json':
                    exportedData = await this.exportToJSON(data, settings);
                    break;
            }

            // Download the file
            this.downloadFile(exportedData, settings.filename, format);

            // Add to history
            this.addToExportHistory({
                format,
                filename: settings.filename + this.exportFormats[format].extension,
                timestamp: new Date(),
                rowCount: data.length,
                settings
            });

            // Show success notification
            if (window.notificationCenter) {
                window.notificationCenter.notify({
                    type: 'success',
                    title: 'Export Successful',
                    message: `Data exported to ${settings.filename}${this.exportFormats[format].extension}`
                });
            }

        } catch (error) {
            console.error('Export error:', error);
            if (window.notificationCenter) {
                window.notificationCenter.notify({
                    type: 'error',
                    title: 'Export Failed',
                    message: 'An error occurred while exporting the data.'
                });
            }
        } finally {
            this.hideExportProgress();
        }
    }

    // CSV Export
    async exportToCSV(data, settings) {
        let csv = '';

        // Add metadata if requested
        if (settings.includeMetadata) {
            csv += `# Exported on: ${new Date().toISOString()}\n`;
            csv += `# Total rows: ${data.length}\n`;
            csv += `# Format: CSV\n\n`;
        }

        // Get headers from first data item
        if (data.length > 0) {
            const headers = Object.keys(data[0]);
            
            // Add headers if requested
            if (settings.includeHeaders) {
                csv += headers.map(h => this.escapeCSV(h)).join(',') + '\n';
            }

            // Add data rows
            data.forEach(row => {
                csv += headers.map(header => {
                    let value = row[header];
                    
                    // Format dates
                    if (value instanceof Date || this.isDateString(value)) {
                        value = this.formatDate(value, settings.dateFormat);
                    }
                    
                    return this.escapeCSV(value);
                }).join(',') + '\n';
            });
        }

        return csv;
    }

    // Excel Export (using SheetJS library simulation)
    async exportToExcel(data, settings) {
        // In a real implementation, you would use a library like SheetJS
        // For now, we'll create a simple CSV that Excel can open
        const csv = await this.exportToCSV(data, settings);
        
        // Convert CSV to blob with BOM for Excel
        const BOM = '\uFEFF';
        return BOM + csv;
    }

    // PDF Export (using jsPDF library simulation)
    async exportToPDF(data, settings) {
        // In a real implementation, you would use jsPDF or similar
        // For now, we'll create a simple text representation
        let content = '';
        
        // Add title
        content += `DATA EXPORT REPORT\n`;
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `Total Records: ${data.length}\n\n`;
        
        // Add table headers
        if (data.length > 0 && settings.includeHeaders) {
            const headers = Object.keys(data[0]);
            content += headers.join(' | ') + '\n';
            content += '-'.repeat(headers.join(' | ').length) + '\n';
            
            // Add data rows
            data.forEach(row => {
                content += headers.map(h => {
                    let value = row[h];
                    if (value instanceof Date || this.isDateString(value)) {
                        value = this.formatDate(value, settings.dateFormat);
                    }
                    return String(value || '').substring(0, 20).padEnd(20);
                }).join(' | ') + '\n';
            });
        }
        
        return content;
    }

    // JSON Export
    async exportToJSON(data, settings) {
        const exportObject = {};
        
        // Add metadata if requested
        if (settings.includeMetadata) {
            exportObject.metadata = {
                exportDate: new Date().toISOString(),
                totalRecords: data.length,
                format: 'JSON',
                settings: settings
            };
        }
        
        // Process data with date formatting
        exportObject.data = data.map(row => {
            const processedRow = {};
            Object.keys(row).forEach(key => {
                let value = row[key];
                if (value instanceof Date || this.isDateString(value)) {
                    value = this.formatDate(value, settings.dateFormat);
                }
                processedRow[key] = value;
            });
            return processedRow;
        });
        
        return JSON.stringify(exportObject, null, 2);
    }

    // Utility functions
    escapeCSV(value) {
        if (value === null || value === undefined) return '';
        
        const stringValue = String(value);
        
        // Escape if contains comma, newline, or quote
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
    }

    isDateString(value) {
        if (typeof value !== 'string') return false;
        const date = new Date(value);
        return !isNaN(date.getTime()) && value.includes('-') || value.includes('/');
    }

    formatDate(date, format) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        
        switch (format) {
            case 'ISO':
                return d.toISOString().split('T')[0];
            case 'US':
                return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
            case 'EU':
                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
            case 'timestamp':
                return d.getTime();
            default:
                return d.toLocaleDateString();
        }
    }

    generateFilename() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        return `export_${timestamp}`;
    }

    downloadFile(content, filename, format) {
        const blob = new Blob([content], { type: this.exportFormats[format].mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename + this.exportFormats[format].extension;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    // Preview generators
    generateCSVPreview(data, settings) {
        if (data.length === 0) return 'No data to preview';
        
        const headers = Object.keys(data[0]);
        let preview = '';
        
        if (settings.includeHeaders) {
            preview += headers.join(',') + '\n';
        }
        
        data.forEach(row => {
            preview += headers.map(h => this.escapeCSV(row[h])).join(',') + '\n';
        });
        
        return preview;
    }

    generateExcelPreview(data, settings) {
        // Excel preview is same as CSV for now
        return this.generateCSVPreview(data, settings);
    }

    generatePDFPreview(data, settings) {
        if (data.length === 0) return 'No data to preview';
        
        const headers = Object.keys(data[0]);
        let preview = 'PDF Table Preview:\n\n';
        
        if (settings.includeHeaders) {
            preview += headers.map(h => h.substring(0, 15).padEnd(15)).join(' | ') + '\n';
            preview += '-'.repeat(headers.length * 18) + '\n';
        }
        
        data.forEach(row => {
            preview += headers.map(h => 
                String(row[h] || '').substring(0, 15).padEnd(15)
            ).join(' | ') + '\n';
        });
        
        return preview;
    }

    generateJSONPreview(data, settings) {
        const preview = {
            data: data
        };
        
        if (settings.includeMetadata) {
            preview.metadata = {
                exportDate: new Date().toISOString(),
                totalRecords: this.currentExport.data.length
            };
        }
        
        return JSON.stringify(preview, null, 2);
    }

    // Progress indication
    showExportProgress() {
        const progress = document.createElement('div');
        progress.id = 'export-progress';
        progress.className = 'export-progress';
        progress.innerHTML = `
            <div class="export-progress-content">
                <div class="spinner"></div>
                <span>Exporting data...</span>
            </div>
        `;
        document.body.appendChild(progress);
    }

    hideExportProgress() {
        const progress = document.getElementById('export-progress');
        if (progress) {
            progress.remove();
        }
    }

    // Export history management
    addToExportHistory(exportInfo) {
        this.exportHistory.unshift(exportInfo);
        
        // Limit history size
        if (this.exportHistory.length > this.maxHistoryItems) {
            this.exportHistory = this.exportHistory.slice(0, this.maxHistoryItems);
        }
        
        this.saveExportHistory();
    }

    saveExportHistory() {
        localStorage.setItem('export-history', JSON.stringify(this.exportHistory));
    }

    loadExportHistory() {
        const saved = localStorage.getItem('export-history');
        if (saved) {
            this.exportHistory = JSON.parse(saved);
            this.exportHistory.forEach(item => {
                item.timestamp = new Date(item.timestamp);
            });
        }
    }

    // Get data from current page (override this for specific pages)
    getPageData() {
        // Try to get data from common sources
        
        // Check for table data
        const tables = document.querySelectorAll('table');
        if (tables.length > 0) {
            return this.extractTableData(tables[0]);
        }
        
        // Check for grid data
        const grids = document.querySelectorAll('.data-grid, .grid-container');
        if (grids.length > 0) {
            return this.extractGridData(grids[0]);
        }
        
        // Default empty data
        return [];
    }

    extractTableData(table) {
        const data = [];
        const headers = [];
        
        // Extract headers
        const headerCells = table.querySelectorAll('thead th, thead td');
        headerCells.forEach(cell => {
            headers.push(cell.textContent.trim());
        });
        
        // Extract rows
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const rowData = {};
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (headers[index]) {
                    rowData[headers[index]] = cell.textContent.trim();
                }
            });
            if (Object.keys(rowData).length > 0) {
                data.push(rowData);
            }
        });
        
        return data;
    }

    extractGridData(grid) {
        // Implementation depends on grid structure
        // This is a placeholder
        return [];
    }

    // Quick export methods
    quickExportCSV(data, filename) {
        const settings = {
            includeHeaders: true,
            includeMetadata: false,
            dateFormat: 'ISO',
            filename: filename || this.generateFilename()
        };
        
        this.currentExport = { data, options: {} };
        this.exportData('csv', settings);
    }

    quickExportJSON(data, filename) {
        const settings = {
            includeHeaders: true,
            includeMetadata: true,
            dateFormat: 'ISO',
            filename: filename || this.generateFilename()
        };
        
        this.currentExport = { data, options: {} };
        this.exportData('json', settings);
    }

    // Show export history modal
    showExportHistory() {
        const modal = document.createElement('div');
        modal.className = 'export-history-modal modal-overlay active';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Export History</h3>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${this.exportHistory.length === 0 ? 
                        '<p class="text-secondary">No export history found</p>' :
                        `<div class="export-history-list">
                            ${this.exportHistory.map(item => `
                                <div class="export-history-item">
                                    <div class="export-history-icon">
                                        <i class="${this.exportFormats[item.format].icon}"></i>
                                    </div>
                                    <div class="export-history-details">
                                        <div class="export-history-filename">${item.filename}</div>
                                        <div class="export-history-meta">
                                            ${item.rowCount} rows • ${new Date(item.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="dataExport.clearExportHistory()">
                        Clear History
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    clearExportHistory() {
        if (confirm('Are you sure you want to clear the export history?')) {
            this.exportHistory = [];
            this.saveExportHistory();
            document.querySelector('.export-history-modal').remove();
        }
    }
}

// Initialize and expose globally
let dataExport;
document.addEventListener('DOMContentLoaded', () => {
    dataExport = new DataExportModule();
    window.dataExport = dataExport;
}); 