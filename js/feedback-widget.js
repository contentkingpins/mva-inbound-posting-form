/**
 * User Feedback Widget
 * Allows users to report bugs and provide feedback directly from the app
 */

class FeedbackWidget {
    constructor() {
        this.isOpen = false;
        this.widget = null;
        this.form = null;
        this.screenshotCanvas = null;
        this.apiEndpoint = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
        
        // Feedback types
        this.TYPES = {
            BUG: 'bug',
            FEATURE: 'feature',
            IMPROVEMENT: 'improvement',
            OTHER: 'other'
        };
        
        // Initialize widget
        this.init();
    }
    
    /**
     * Initialize the feedback widget
     */
    init() {
        // Create widget HTML
        this.createWidget();
        
        // Add to DOM
        document.body.appendChild(this.widget);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup keyboard shortcut (Ctrl/Cmd + Shift + F)
        this.setupKeyboardShortcut();
        
        console.log('💬 Feedback widget initialized');
    }
    
    /**
     * Create widget HTML structure
     */
    createWidget() {
        this.widget = document.createElement('div');
        this.widget.id = 'feedback-widget';
        this.widget.className = 'feedback-widget';
        this.widget.innerHTML = `
            <!-- Feedback Button -->
            <button class="feedback-button" id="feedback-button" title="Send Feedback (Ctrl+Shift+F)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="feedback-label">Feedback</span>
            </button>
            
            <!-- Feedback Form -->
            <div class="feedback-form-container" id="feedback-form-container">
                <div class="feedback-header">
                    <h3>Send Feedback</h3>
                    <button class="feedback-close" id="feedback-close">&times;</button>
                </div>
                
                <form id="feedback-form" class="feedback-form">
                    <!-- Feedback Type -->
                    <div class="feedback-types">
                        <label class="feedback-type-option">
                            <input type="radio" name="feedbackType" value="bug" checked>
                            <span class="feedback-type-label">
                                <span class="feedback-type-icon">🐛</span>
                                <span>Report Bug</span>
                            </span>
                        </label>
                        <label class="feedback-type-option">
                            <input type="radio" name="feedbackType" value="feature">
                            <span class="feedback-type-label">
                                <span class="feedback-type-icon">💡</span>
                                <span>Feature Request</span>
                            </span>
                        </label>
                        <label class="feedback-type-option">
                            <input type="radio" name="feedbackType" value="improvement">
                            <span class="feedback-type-label">
                                <span class="feedback-type-icon">🎨</span>
                                <span>Improvement</span>
                            </span>
                        </label>
                        <label class="feedback-type-option">
                            <input type="radio" name="feedbackType" value="other">
                            <span class="feedback-type-label">
                                <span class="feedback-type-icon">💬</span>
                                <span>Other</span>
                            </span>
                        </label>
                    </div>
                    
                    <!-- Title -->
                    <div class="feedback-field">
                        <label for="feedback-title">Title</label>
                        <input type="text" id="feedback-title" name="title" required placeholder="Brief description of the issue">
                    </div>
                    
                    <!-- Description -->
                    <div class="feedback-field">
                        <label for="feedback-description">Description</label>
                        <textarea id="feedback-description" name="description" rows="4" required 
                                  placeholder="Please describe the issue in detail. What were you trying to do? What happened instead?"></textarea>
                    </div>
                    
                    <!-- Screenshot -->
                    <div class="feedback-field">
                        <label>
                            <input type="checkbox" id="include-screenshot" checked>
                            Include screenshot of current page
                        </label>
                        <div id="screenshot-preview" class="screenshot-preview"></div>
                    </div>
                    
                    <!-- System Info -->
                    <div class="feedback-field">
                        <label>
                            <input type="checkbox" id="include-system-info" checked>
                            Include system information
                        </label>
                        <div id="system-info" class="system-info"></div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="feedback-actions">
                        <button type="button" class="feedback-btn feedback-btn-secondary" id="feedback-cancel">Cancel</button>
                        <button type="submit" class="feedback-btn feedback-btn-primary" id="feedback-submit">
                            <span class="feedback-btn-text">Send Feedback</span>
                            <span class="feedback-btn-loader" style="display: none;">⏳</span>
                        </button>
                    </div>
                </form>
                
                <!-- Success Message -->
                <div class="feedback-success" id="feedback-success" style="display: none;">
                    <div class="feedback-success-icon">✅</div>
                    <h4>Thank you for your feedback!</h4>
                    <p>We'll review it and get back to you if needed.</p>
                    <button class="feedback-btn feedback-btn-primary" id="feedback-done">Done</button>
                </div>
            </div>
        `;
        
        // Add styles
        this.addStyles();
    }
    
    /**
     * Add widget styles
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Feedback Widget Styles */
            .feedback-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            /* Feedback Button */
            .feedback-button {
                background: #4299e1;
                color: white;
                border: none;
                border-radius: 50px;
                padding: 12px 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
                transition: all 0.3s ease;
            }
            
            .feedback-button:hover {
                background: #3182ce;
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(66, 153, 225, 0.4);
            }
            
            .feedback-label {
                font-weight: 500;
            }
            
            /* Feedback Form Container */
            .feedback-form-container {
                position: absolute;
                bottom: 70px;
                right: 0;
                width: 400px;
                max-width: 90vw;
                background: var(--bg-secondary, #1e293b);
                border: 1px solid var(--border-color, #334155);
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
                display: none;
                opacity: 0;
                transform: translateY(10px) scale(0.95);
                transition: all 0.3s ease;
            }
            
            .feedback-form-container.open {
                display: block;
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            
            /* Dark mode support */
            [data-theme="dark"] .feedback-form-container {
                background: #1e293b;
                border-color: #334155;
                color: #f1f5f9;
            }
            
            .feedback-header {
                padding: 20px;
                border-bottom: 1px solid var(--border-color, #334155);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .feedback-header h3 {
                margin: 0;
                font-size: 18px;
                color: var(--text-primary, #f1f5f9);
            }
            
            .feedback-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--text-secondary, #94a3b8);
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s ease;
            }
            
            .feedback-close:hover {
                background: var(--bg-primary, #0f172a);
                color: var(--text-primary, #f1f5f9);
            }
            
            /* Feedback Form */
            .feedback-form {
                padding: 20px;
            }
            
            .feedback-types {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .feedback-type-option {
                cursor: pointer;
            }
            
            .feedback-type-option input {
                display: none;
            }
            
            .feedback-type-label {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px;
                border: 2px solid var(--border-color, #334155);
                border-radius: 8px;
                transition: all 0.2s ease;
                font-size: 14px;
                color: var(--text-secondary, #94a3b8);
            }
            
            .feedback-type-option input:checked + .feedback-type-label {
                border-color: #4299e1;
                background: rgba(66, 153, 225, 0.1);
                color: var(--text-primary, #f1f5f9);
            }
            
            .feedback-type-icon {
                font-size: 18px;
            }
            
            .feedback-field {
                margin-bottom: 16px;
            }
            
            .feedback-field label {
                display: block;
                margin-bottom: 6px;
                font-size: 14px;
                font-weight: 500;
                color: var(--text-primary, #f1f5f9);
            }
            
            .feedback-field input[type="text"],
            .feedback-field textarea {
                width: 100%;
                padding: 10px;
                background: var(--bg-primary, #0f172a);
                border: 1px solid var(--border-color, #334155);
                border-radius: 6px;
                color: var(--text-primary, #f1f5f9);
                font-size: 14px;
                transition: all 0.2s ease;
            }
            
            .feedback-field input[type="text"]:focus,
            .feedback-field textarea:focus {
                outline: none;
                border-color: #4299e1;
                box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
            }
            
            .feedback-field textarea {
                resize: vertical;
                min-height: 80px;
            }
            
            .screenshot-preview {
                margin-top: 10px;
                border-radius: 6px;
                overflow: hidden;
                max-height: 200px;
            }
            
            .screenshot-preview img {
                width: 100%;
                height: auto;
                display: block;
            }
            
            .system-info {
                margin-top: 10px;
                padding: 10px;
                background: var(--bg-primary, #0f172a);
                border-radius: 6px;
                font-size: 12px;
                font-family: monospace;
                color: var(--text-secondary, #94a3b8);
            }
            
            /* Actions */
            .feedback-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 20px;
            }
            
            .feedback-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .feedback-btn-primary {
                background: #4299e1;
                color: white;
            }
            
            .feedback-btn-primary:hover {
                background: #3182ce;
            }
            
            .feedback-btn-secondary {
                background: var(--bg-primary, #0f172a);
                color: var(--text-primary, #f1f5f9);
                border: 1px solid var(--border-color, #334155);
            }
            
            .feedback-btn-secondary:hover {
                background: var(--border-color, #334155);
            }
            
            /* Success State */
            .feedback-success {
                padding: 40px 20px;
                text-align: center;
            }
            
            .feedback-success-icon {
                font-size: 48px;
                margin-bottom: 20px;
            }
            
            .feedback-success h4 {
                margin: 0 0 10px 0;
                color: var(--text-primary, #f1f5f9);
            }
            
            .feedback-success p {
                color: var(--text-secondary, #94a3b8);
                margin-bottom: 20px;
            }
            
            /* Mobile Styles */
            @media (max-width: 768px) {
                .feedback-form-container {
                    width: calc(100vw - 40px);
                    right: 20px;
                    bottom: 80px;
                }
                
                .feedback-types {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle button
        document.getElementById('feedback-button').addEventListener('click', () => {
            this.toggle();
        });
        
        // Close button
        document.getElementById('feedback-close').addEventListener('click', () => {
            this.close();
        });
        
        // Cancel button
        document.getElementById('feedback-cancel').addEventListener('click', () => {
            this.close();
        });
        
        // Done button
        document.getElementById('feedback-done').addEventListener('click', () => {
            this.close();
            this.resetForm();
        });
        
        // Form submission
        document.getElementById('feedback-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitFeedback();
        });
        
        // Screenshot checkbox
        document.getElementById('include-screenshot').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.captureScreenshot();
            } else {
                document.getElementById('screenshot-preview').innerHTML = '';
            }
        });
        
        // System info checkbox
        document.getElementById('include-system-info').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.displaySystemInfo();
            } else {
                document.getElementById('system-info').innerHTML = '';
            }
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isOpen && 
                !this.widget.contains(e.target) && 
                !e.target.closest('.feedback-form-container')) {
                this.close();
            }
        });
    }
    
    /**
     * Setup keyboard shortcut
     */
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + F
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.toggle();
            }
        });
    }
    
    /**
     * Toggle widget visibility
     */
    toggle() {
        this.isOpen ? this.close() : this.open();
    }
    
    /**
     * Open widget
     */
    open() {
        this.isOpen = true;
        const container = document.getElementById('feedback-form-container');
        container.style.display = 'block';
        
        // Force reflow
        container.offsetHeight;
        
        container.classList.add('open');
        
        // Auto-capture screenshot and system info
        if (document.getElementById('include-screenshot').checked) {
            this.captureScreenshot();
        }
        if (document.getElementById('include-system-info').checked) {
            this.displaySystemInfo();
        }
        
        // Focus on title input
        document.getElementById('feedback-title').focus();
    }
    
    /**
     * Close widget
     */
    close() {
        this.isOpen = false;
        const container = document.getElementById('feedback-form-container');
        container.classList.remove('open');
        
        setTimeout(() => {
            container.style.display = 'none';
        }, 300);
    }
    
    /**
     * Capture screenshot
     */
    async captureScreenshot() {
        const preview = document.getElementById('screenshot-preview');
        preview.innerHTML = '<div style="padding: 20px; text-align: center;">📸 Capturing screenshot...</div>';
        
        // In a real implementation, you'd use html2canvas or similar
        // For now, we'll capture page metadata
        const screenshotData = {
            url: window.location.href,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: new Date().toISOString(),
            title: document.title
        };
        
        // Store screenshot data
        this.screenshotData = screenshotData;
        
        // Show preview
        preview.innerHTML = `
            <div style="padding: 10px; background: var(--bg-primary); border-radius: 6px;">
                <div style="font-size: 12px; color: var(--text-secondary);">
                    📸 Screenshot will be captured of:<br>
                    <strong>${screenshotData.title}</strong><br>
                    ${screenshotData.url}<br>
                    Viewport: ${screenshotData.viewport}
                </div>
            </div>
        `;
    }
    
    /**
     * Display system information
     */
    displaySystemInfo() {
        const systemInfo = this.gatherSystemInfo();
        const infoDiv = document.getElementById('system-info');
        
        infoDiv.innerHTML = `
            <div>Browser: ${systemInfo.browser}</div>
            <div>OS: ${systemInfo.os}</div>
            <div>Screen: ${systemInfo.screen}</div>
            <div>Memory: ${systemInfo.memory}</div>
            <div>User: ${systemInfo.user}</div>
        `;
    }
    
    /**
     * Gather system information
     */
    gatherSystemInfo() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        return {
            browser: navigator.userAgent,
            os: this.detectOS(),
            screen: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            memory: window.performance?.memory ? 
                `${Math.round(window.performance.memory.usedJSHeapSize / 1048576)}MB` : 'N/A',
            user: user.email || 'anonymous',
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Detect operating system
     */
    detectOS() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Win')) return 'Windows';
        if (userAgent.includes('Mac')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS')) return 'iOS';
        return 'Unknown';
    }
    
    /**
     * Submit feedback
     */
    async submitFeedback() {
        const form = document.getElementById('feedback-form');
        const submitBtn = document.getElementById('feedback-submit');
        const btnText = submitBtn.querySelector('.feedback-btn-text');
        const btnLoader = submitBtn.querySelector('.feedback-btn-loader');
        
        // Get form data
        const formData = new FormData(form);
        const feedbackData = {
            type: formData.get('feedbackType'),
            title: formData.get('title'),
            description: formData.get('description'),
            screenshot: document.getElementById('include-screenshot').checked ? this.screenshotData : null,
            systemInfo: document.getElementById('include-system-info').checked ? this.gatherSystemInfo() : null,
            errors: window.errorTracker ? window.errorTracker.getStatistics() : null,
            timestamp: new Date().toISOString()
        };
        
        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        
        try {
            // Send feedback to backend
            const response = await fetch(`${this.apiEndpoint}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
                },
                body: JSON.stringify(feedbackData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }
            
            // Show success state
            document.getElementById('feedback-form').style.display = 'none';
            document.getElementById('feedback-success').style.display = 'block';
            
            // Log to console in development
            if (window.APP_CONFIG?.debug) {
                console.log('📨 Feedback submitted:', feedbackData);
            }
            
            // Track event
            if (window.errorTracker) {
                window.errorTracker.captureEvent('feedback_submitted', {
                    type: feedbackData.type
                });
            }
            
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            
            // Show error message
            alert('Failed to submit feedback. Please try again.');
            
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }
    
    /**
     * Reset form
     */
    resetForm() {
        document.getElementById('feedback-form').reset();
        document.getElementById('feedback-form').style.display = 'block';
        document.getElementById('feedback-success').style.display = 'none';
        document.getElementById('screenshot-preview').innerHTML = '';
        document.getElementById('system-info').innerHTML = '';
        
        // Reset radio to bug
        document.querySelector('input[name="feedbackType"][value="bug"]').checked = true;
    }
}

// Initialize feedback widget
window.feedbackWidget = new FeedbackWidget();

// Export for modules
export default window.feedbackWidget; 