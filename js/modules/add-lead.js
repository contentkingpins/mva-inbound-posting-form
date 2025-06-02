/**
 * Add Lead Module
 * Handles adding new leads with validation, user feedback, and integration with the optimized system
 */

class AddLeadManager {
    constructor() {
        this.modal = null;
        this.form = null;
        this.isSubmitting = false;
        this.validationRules = this.getValidationRules();
        
        this.init();
    }
    
    init() {
        this.createModal();
        this.attachEventListeners();
        console.log('✅ AddLeadManager initialized');
    }
    
    getValidationRules() {
        return {
            first_name: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-Z\s'-]+$/,
                message: 'First name is required and must contain only letters'
            },
            last_name: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-Z\s'-]+$/,
                message: 'Last name is required and must contain only letters'
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
            },
            phone_home: {
                required: true,
                pattern: /^[\+]?[1-9][\d]{0,15}$/,
                message: 'Please enter a valid phone number'
            },
            incident_type: {
                required: true,
                message: 'Please select an incident type'
            },
            vendor_code: {
                required: true,
                message: 'Please select a vendor'
            },
            address: {
                required: false,
                minLength: 5,
                message: 'Address must be at least 5 characters'
            },
            city: {
                required: false,
                minLength: 2,
                pattern: /^[a-zA-Z\s'-]+$/,
                message: 'City must contain only letters'
            },
            state: {
                required: false,
                pattern: /^[A-Z]{2}$/,
                message: 'State must be a 2-letter code (e.g., CA, NY)'
            },
            zip: {
                required: false,
                pattern: /^\d{5}(-\d{4})?$/,
                message: 'ZIP code must be in format 12345 or 12345-6789'
            }
        };
    }
    
    createModal() {
        const modalHTML = `
            <div id="add-lead-modal" class="modal-overlay" style="display: none;">
                <div class="modal add-lead-modal">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <span class="modal-icon">👤</span>
                            Add New Lead
                        </h3>
                        <button class="modal-close" id="add-lead-close" type="button">&times;</button>
                    </div>
                    <form id="add-lead-form" class="modal-form" novalidate>
                        <div class="modal-body">
                            <!-- Personal Information Section -->
                            <div class="form-section">
                                <h4 class="section-title">
                                    <span class="section-icon">📋</span>
                                    Personal Information
                                </h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="add-first-name">First Name <span class="required">*</span></label>
                                        <input type="text" id="add-first-name" name="first_name" required 
                                               placeholder="Enter first name" autocomplete="given-name">
                                        <div class="field-error"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="add-last-name">Last Name <span class="required">*</span></label>
                                        <input type="text" id="add-last-name" name="last_name" required 
                                               placeholder="Enter last name" autocomplete="family-name">
                                        <div class="field-error"></div>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="add-email">Email Address <span class="required">*</span></label>
                                        <input type="email" id="add-email" name="email" required 
                                               placeholder="Enter email address" autocomplete="email">
                                        <div class="field-error"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="add-phone">Phone Number <span class="required">*</span></label>
                                        <input type="tel" id="add-phone" name="phone_home" required 
                                               placeholder="Enter phone number" autocomplete="tel">
                                        <div class="field-error"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Address Information Section -->
                            <div class="form-section">
                                <h4 class="section-title">
                                    <span class="section-icon">📍</span>
                                    Address Information
                                </h4>
                                <div class="form-group">
                                    <label for="add-address">Street Address</label>
                                    <input type="text" id="add-address" name="address" 
                                           placeholder="Enter street address" autocomplete="street-address">
                                    <div class="field-error"></div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="add-city">City</label>
                                        <input type="text" id="add-city" name="city" 
                                               placeholder="Enter city" autocomplete="address-level2">
                                        <div class="field-error"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="add-state">State</label>
                                        <input type="text" id="add-state" name="state" maxlength="2" 
                                               placeholder="CA" autocomplete="address-level1">
                                        <div class="field-error"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="add-zip">ZIP Code</label>
                                        <input type="text" id="add-zip" name="zip" 
                                               placeholder="12345" autocomplete="postal-code">
                                        <div class="field-error"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Case Information Section -->
                            <div class="form-section">
                                <h4 class="section-title">
                                    <span class="section-icon">⚖️</span>
                                    Case Information
                                </h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="add-incident-type">Incident Type <span class="required">*</span></label>
                                        <select id="add-incident-type" name="incident_type" required>
                                            <option value="">Select incident type</option>
                                            <option value="Motor Vehicle Accident">Motor Vehicle Accident</option>
                                            <option value="Slip and Fall">Slip and Fall</option>
                                            <option value="Medical Malpractice">Medical Malpractice</option>
                                            <option value="Product Liability">Product Liability</option>
                                            <option value="Workers Compensation">Workers Compensation</option>
                                            <option value="Dog Bite">Dog Bite</option>
                                            <option value="Wrongful Death">Wrongful Death</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <div class="field-error"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="add-vendor">Vendor <span class="required">*</span></label>
                                        <select id="add-vendor" name="vendor_code" required>
                                            <option value="">Select vendor</option>
                                            <!-- Vendor options will be populated dynamically -->
                                        </select>
                                        <div class="field-error"></div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="add-notes">Additional Notes</label>
                                    <textarea id="add-notes" name="notes" rows="3" 
                                              placeholder="Enter any additional notes or details about the case"></textarea>
                                    <div class="field-error"></div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" id="add-lead-cancel">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary" id="add-lead-submit">
                                    <span class="btn-text">Add Lead</span>
                                    <span class="btn-loading" style="display: none;">
                                        <span class="spinner"></span>
                                        Adding...
                                    </span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('add-lead-modal');
        this.form = document.getElementById('add-lead-form');
        
        // Add styles
        this.addModalStyles();
        
        // Populate vendor options
        this.populateVendorOptions();
    }
    
    addModalStyles() {
        if (document.getElementById('add-lead-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'add-lead-styles';
        styles.textContent = `
            .add-lead-modal {
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .modal-form {
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            
            .modal-body {
                flex: 1;
                overflow-y: auto;
                padding: 0 1.5rem;
            }
            
            .form-section {
                margin-bottom: 2rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .form-section:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            
            .section-title {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1.125rem;
                font-weight: 600;
                color: #374151;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 2px solid #e5e7eb;
            }
            
            .section-icon {
                font-size: 1.25rem;
            }
            
            .form-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 1rem;
            }
            
            .form-group {
                display: flex;
                flex-direction: column;
            }
            
            .form-group label {
                font-weight: 600;
                color: #374151;
                margin-bottom: 0.25rem;
                font-size: 0.875rem;
            }
            
            .required {
                color: #ef4444;
                margin-left: 0.25rem;
            }
            
            .form-group input,
            .form-group select,
            .form-group textarea {
                padding: 0.75rem;
                border: 2px solid #d1d5db;
                border-radius: 6px;
                font-size: 0.875rem;
                transition: all 0.2s ease;
                background: white;
            }
            
            .form-group input:focus,
            .form-group select:focus,
            .form-group textarea:focus {
                outline: none;
                border-color: #4299e1;
                box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
            }
            
            .form-group input.error,
            .form-group select.error,
            .form-group textarea.error {
                border-color: #ef4444;
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
            }
            
            .field-error {
                color: #ef4444;
                font-size: 0.75rem;
                margin-top: 0.25rem;
                min-height: 1rem;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }
            
            .field-error::before {
                content: "⚠️";
                font-size: 0.875rem;
            }
            
            .form-actions {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
                padding: 1.5rem;
                border-top: 1px solid #e5e7eb;
                background: #f9fafb;
                margin: 0 -1.5rem -1.5rem -1.5rem;
                border-radius: 0 0 12px 12px;
            }
            
            .btn-loading {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .spinner {
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            
            /* Mobile responsive */
            @media (max-width: 768px) {
                .add-lead-modal {
                    margin: 1rem;
                    max-width: calc(100vw - 2rem);
                    max-height: calc(100vh - 2rem);
                }
                
                .form-row {
                    grid-template-columns: 1fr;
                }
                
                .form-actions {
                    flex-direction: column-reverse;
                    align-items: stretch;
                }
            }
            
            /* Success animation */
            @keyframes success-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .success-feedback {
                background: #d1fae5;
                color: #065f46;
                padding: 1rem;
                border-radius: 8px;
                border-left: 4px solid #10b981;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                animation: success-pulse 0.5s ease-out;
                margin-bottom: 1rem;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    populateVendorOptions() {
        const vendorSelect = document.getElementById('add-vendor');
        if (!vendorSelect) return;
        
        // Get unique vendors from existing leads
        const vendors = new Set();
        
        if (window.AppState && window.AppState.allLeads) {
            window.AppState.allLeads.forEach(lead => {
                if (lead.vendor_code) {
                    vendors.add(lead.vendor_code);
                }
            });
        }
        
        // Add default vendors if none exist
        if (vendors.size === 0) {
            ['VENDOR_A', 'VENDOR_B', 'VENDOR_C', 'LEGAL_LEADS_PRO', 'CASE_CONNECT'].forEach(v => vendors.add(v));
        }
        
        // Populate select options
        Array.from(vendors).sort().forEach(vendor => {
            const option = document.createElement('option');
            option.value = vendor;
            option.textContent = vendor;
            vendorSelect.appendChild(option);
        });
    }
    
    attachEventListeners() {
        // Modal open/close
        const openBtn = document.getElementById('add-lead-btn');
        const closeBtn = document.getElementById('add-lead-close');
        const cancelBtn = document.getElementById('add-lead-cancel');
        
        if (openBtn) {
            openBtn.addEventListener('click', () => this.openModal());
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Modal backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }
        
        // Form submission
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            
            // Real-time validation
            this.form.addEventListener('input', (e) => this.validateField(e.target));
            this.form.addEventListener('blur', (e) => this.validateField(e.target), true);
        }
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.style.display !== 'none') {
                this.closeModal();
            }
        });
    }
    
    openModal() {
        if (!this.modal) return;
        
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus first input
        const firstInput = this.form.querySelector('input[type="text"]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Reset form
        this.resetForm();
        
        // Repopulate vendors in case new ones were added
        this.populateVendorOptions();
    }
    
    closeModal() {
        if (!this.modal) return;
        
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // Reset form
        this.resetForm();
    }
    
    resetForm() {
        if (!this.form) return;
        
        this.form.reset();
        this.clearValidationErrors();
        this.setSubmitButtonState(false);
    }
    
    clearValidationErrors() {
        const errorElements = this.form.querySelectorAll('.field-error');
        const inputElements = this.form.querySelectorAll('input, select, textarea');
        
        errorElements.forEach(el => el.textContent = '');
        inputElements.forEach(el => el.classList.remove('error'));
    }
    
    validateField(field) {
        if (!field || !field.name) return true;
        
        const rule = this.validationRules[field.name];
        if (!rule) return true;
        
        const value = field.value.trim();
        const errorElement = field.closest('.form-group').querySelector('.field-error');
        
        // Clear previous error
        field.classList.remove('error');
        errorElement.textContent = '';
        
        // Required field check
        if (rule.required && !value) {
            this.showFieldError(field, errorElement, rule.message || `${field.name} is required`);
            return false;
        }
        
        // Skip other validations if field is empty and not required
        if (!value && !rule.required) return true;
        
        // Pattern validation
        if (rule.pattern && !rule.pattern.test(value)) {
            this.showFieldError(field, errorElement, rule.message);
            return false;
        }
        
        // Minimum length validation
        if (rule.minLength && value.length < rule.minLength) {
            this.showFieldError(field, errorElement, `Minimum ${rule.minLength} characters required`);
            return false;
        }
        
        return true;
    }
    
    showFieldError(field, errorElement, message) {
        field.classList.add('error');
        errorElement.textContent = message;
    }
    
    validateForm() {
        let isValid = true;
        const formData = new FormData(this.form);
        
        // Validate all fields with rules
        Object.keys(this.validationRules).forEach(fieldName => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (field && !this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        
        // Validate form
        if (!this.validateForm()) {
            this.showFormError('Please fix the errors above before submitting');
            return;
        }
        
        this.isSubmitting = true;
        this.setSubmitButtonState(true);
        
        try {
            // Prepare form data
            const formData = new FormData(this.form);
            const leadData = this.prepareLeadData(formData);
            
            // Submit to API
            const response = await this.submitLead(leadData);
            
            // Show success and update UI
            await this.handleSubmitSuccess(response);
            
        } catch (error) {
            console.error('Error submitting lead:', error);
            this.handleSubmitError(error);
        } finally {
            this.isSubmitting = false;
            this.setSubmitButtonState(false);
        }
    }
    
    prepareLeadData(formData) {
        const leadData = {};
        
        // Convert FormData to object
        for (let [key, value] of formData.entries()) {
            leadData[key] = value.trim();
        }
        
        // Add timestamp
        leadData.timestamp = new Date().toISOString();
        leadData.created_date = new Date().toISOString();
        
        // Add default values
        leadData.disposition = 'New';
        leadData.lead_id = `LEAD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Clean up empty fields
        Object.keys(leadData).forEach(key => {
            if (leadData[key] === '') {
                delete leadData[key];
            }
        });
        
        return leadData;
    }
    
    async submitLead(leadData) {
        // Use the API from our optimized system
        if (window.LeadsAPI) {
            return await window.LeadsAPI.createLead(leadData);
        }
        
        // Fallback API call
        const API_ENDPOINT = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
        
        const response = await fetch(`${API_ENDPOINT}/leads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(leadData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to create lead');
        }
        
        return await response.json();
    }
    
    async handleSubmitSuccess(response) {
        // Show success message
        this.showSuccessMessage('Lead added successfully! 🎉');
        
        // Close modal after delay
        setTimeout(() => {
            this.closeModal();
        }, 1500);
        
        // Refresh leads list if the main app is available
        if (window.leadManagerApp && typeof window.leadManagerApp.fetchLeads === 'function') {
            setTimeout(() => {
                window.leadManagerApp.fetchLeads();
            }, 500);
        }
        
        // Trigger custom event
        document.dispatchEvent(new CustomEvent('leadAdded', { 
            detail: { lead: response } 
        }));
    }
    
    handleSubmitError(error) {
        let message = 'Failed to add lead. Please try again.';
        
        if (error.message) {
            message = error.message;
        } else if (error.status === 401) {
            message = 'Authentication failed. Please log in again.';
        } else if (error.status === 400) {
            message = 'Invalid lead data. Please check your entries.';
        }
        
        this.showFormError(message);
    }
    
    showSuccessMessage(message) {
        const modalBody = this.modal.querySelector('.modal-body');
        const successDiv = document.createElement('div');
        successDiv.className = 'success-feedback';
        successDiv.innerHTML = `
            <span style="font-size: 1.25rem;">✅</span>
            <span>${message}</span>
        `;
        
        modalBody.insertBefore(successDiv, modalBody.firstChild);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }
    
    showFormError(message) {
        // Remove existing error
        const existingError = this.form.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.style.cssText = `
            background: #fef2f2;
            color: #b91c1c;
            padding: 1rem;
            border-radius: 8px;
            border-left: 4px solid #ef4444;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        errorDiv.innerHTML = `
            <span style="font-size: 1.25rem;">⚠️</span>
            <span>${message}</span>
        `;
        
        const modalBody = this.modal.querySelector('.modal-body');
        modalBody.insertBefore(errorDiv, modalBody.firstChild);
        
        // Scroll to error
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    setSubmitButtonState(loading) {
        const submitBtn = document.getElementById('add-lead-submit');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        if (loading) {
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
        } else {
            submitBtn.disabled = false;
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
        }
    }
    
    // Public API methods
    open() {
        this.openModal();
    }
    
    close() {
        this.closeModal();
    }
    
    isOpen() {
        return this.modal && this.modal.style.display !== 'none';
    }
}

// Export for module use
window.AddLeadManager = AddLeadManager;

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.addLeadManager = new AddLeadManager();
    });
} else {
    window.addLeadManager = new AddLeadManager();
}

console.log('📝 Add Lead module loaded'); 