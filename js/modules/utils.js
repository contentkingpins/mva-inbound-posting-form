/**
 * Utility Functions Module
 * Contains all helper functions used throughout the application
 */

class Utils {
    // Date formatting functions
    static formatDate(dateString, includeTime = false) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            
            if (isNaN(date)) {
                return dateString;
            }
            
            const options = {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            };
            
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
                options.second = '2-digit';
            }
            
            return date.toLocaleDateString(undefined, options);
        } catch (e) {
            return dateString;
        }
    }
    
    static formatDateYMD(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            
            if (isNaN(date)) {
                return dateString;
            }
            
            return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
        } catch (e) {
            return dateString;
        }
    }
    
    // String manipulation
    static escapeHtml(text) {
        if (text === null || text === undefined) return '';
        
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    static escapeCsvValue(value) {
        if (value === null || value === undefined) return '';
        
        // Convert to string and escape quotes
        const stringValue = String(value);
        
        // If the value contains a comma, quote, or newline, wrap in quotes and escape inner quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        
        return stringValue;
    }
    
    // Location display
    static getLocationDisplay(lead) {
        if (lead.zip_code && lead.state) {
            return `${lead.state}, ${lead.zip_code}`;
        } else if (lead.state) {
            return lead.state;
        } else if (lead.zip_code) {
            return lead.zip_code;
        }
        return 'N/A';
    }
    
    // Validation functions
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static validatePhone(phone) {
        // Remove all non-digits
        const cleaned = phone.replace(/\D/g, '');
        // Check if it's 10 or 11 digits (with or without country code)
        return cleaned.length === 10 || cleaned.length === 11;
    }
    
    // Array utilities
    static arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        return a.every((val, index) => val === b[index]);
    }
    
    // Form utilities
    static getRadioValue(name) {
        const radio = document.querySelector(`input[name="${name}"]:checked`);
        return radio ? radio.value : '';
    }
    
    // Local storage utilities
    static updateLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error updating localStorage:', error);
        }
    }
    
    static getFromLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }
    
    // Debounce utility
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Toast notifications
    static showSuccessToast(message, duration = 3000) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.success-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">✅</span>
                <span class="toast-message">${Utils.escapeHtml(message)}</span>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Show with animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
    
    // Configuration utilities
    static getAppConfig() {
        // Use AppConfig module if available, otherwise fallback
        if (window.AppConfig) {
            return window.AppConfig.get();
        } else if (window.APP_CONFIG) {
            return window.APP_CONFIG;
        } else {
            // Emergency fallback
            return {
                userPoolId: 'us-east-1_lhc964tLD',
                clientId: '5t6mane4fnvineksoqb4ta0iu1',
                apiEndpoint: 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod',
                apiUrl: 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod'
            };
        }
    }
    
    // CSV Generation
    static generateCsvContent(leadsData) {
        if (!leadsData || leadsData.length === 0) {
            return 'No data available';
        }
        
        // Define CSV headers
        const headers = [
            'Lead ID',
            'First Name',
            'Last Name',
            'Email',
            'Phone',
            'State',
            'Zip Code',
            'City',
            'Vendor Code',
            'Incident Type',
            'Disposition',
            'Accident Date',
            'Accident Location',
            'Notes',
            'Received Date'
        ];
        
        // Create CSV rows
        const rows = leadsData.map(lead => [
            Utils.escapeCsvValue(lead.lead_id),
            Utils.escapeCsvValue(lead.first_name),
            Utils.escapeCsvValue(lead.last_name),
            Utils.escapeCsvValue(lead.email),
            Utils.escapeCsvValue(lead.phone_home),
            Utils.escapeCsvValue(lead.state),
            Utils.escapeCsvValue(lead.zip_code),
            Utils.escapeCsvValue(lead.city),
            Utils.escapeCsvValue(lead.vendor_code),
            Utils.escapeCsvValue(lead.incident_type),
            Utils.escapeCsvValue(lead.disposition || 'New'),
            Utils.escapeCsvValue(lead.accident_date),
            Utils.escapeCsvValue(lead.accident_location),
            Utils.escapeCsvValue(lead.notes || ''),
            Utils.escapeCsvValue(Utils.formatDate(lead.timestamp, true))
        ].join(','));
        
        // Combine headers and rows
        return [headers.join(','), ...rows].join('\n');
    }
    
    // Performance monitoring
    static logPerformance(label, startTime) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`⚡ ${label}: ${duration.toFixed(2)}ms`);
    }
    
    // Error handling
    static handleApiError(error, context = '') {
        console.error(`API Error ${context}:`, error);
        
        if (error.status === 401) {
            // Clear auth and redirect
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        // Return user-friendly error message
        const errorMessages = {
            400: 'Invalid request. Please check your input.',
            403: 'You do not have permission to perform this action.',
            404: 'The requested resource was not found.',
            409: 'A conflict occurred. This item may already exist.',
            429: 'Too many requests. Please try again later.',
            500: 'Server error. Please try again later.',
            502: 'Service temporarily unavailable.',
            503: 'Service temporarily unavailable.'
        };
        
        return errorMessages[error.status] || 'An unexpected error occurred. Please try again.';
    }
}

// Export for use in other modules
window.Utils = Utils; 