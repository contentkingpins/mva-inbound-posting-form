/**
 * Error Tracking & Monitoring System
 * Provides comprehensive error tracking, monitoring, and reporting
 */

class ErrorTracker {
    constructor() {
        this.errors = [];
        this.sessionId = this.generateSessionId();
        this.userId = null;
        this.maxErrors = 100; // Keep last 100 errors in memory
        this.apiEndpoint = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
        this.initialized = false;
        this.listeners = new Map();
        
        // Error severity levels
        this.SEVERITY = {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        };
        
        // Initialize on construction
        this.initialize();
    }
    
    /**
     * Initialize error tracking
     */
    initialize() {
        if (this.initialized) return;
        
        // Set up global error handlers
        this.setupErrorHandlers();
        
        // Set up performance monitoring
        this.setupPerformanceMonitoring();
        
        // Load user info
        this.loadUserInfo();
        
        // Set up periodic error reporting
        this.setupPeriodicReporting();
        
        this.initialized = true;
        console.log('🛡️ Error Tracker initialized');
    }
    
    /**
     * Setup global error handlers
     */
    setupErrorHandlers() {
        // Window error handler
        window.addEventListener('error', (event) => {
            this.captureError({
                message: event.message,
                source: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                type: 'javascript'
            });
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.captureError({
                message: `Unhandled Promise Rejection: ${event.reason}`,
                error: event.reason,
                type: 'promise',
                promise: event.promise
            });
        });
        
        // Resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.captureError({
                    message: `Resource loading error: ${event.target.src || event.target.href}`,
                    type: 'resource',
                    tagName: event.target.tagName,
                    source: event.target.src || event.target.href
                });
            }
        }, true);
    }
    
    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) { // Tasks longer than 50ms
                            this.capturePerformanceIssue({
                                type: 'long-task',
                                duration: entry.duration,
                                startTime: entry.startTime,
                                name: entry.name
                            });
                        }
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                console.warn('Long task monitoring not supported');
            }
        }
        
        // Monitor page performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.capturePagePerformance();
            }, 0);
        });
    }
    
    /**
     * Capture page performance metrics
     */
    capturePagePerformance() {
        if (!window.performance || !window.performance.timing) return;
        
        const timing = window.performance.timing;
        const metrics = {
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            tcp: timing.connectEnd - timing.connectStart,
            request: timing.responseStart - timing.requestStart,
            response: timing.responseEnd - timing.responseStart,
            dom: timing.domComplete - timing.domLoading,
            load: timing.loadEventEnd - timing.loadEventStart,
            total: timing.loadEventEnd - timing.navigationStart
        };
        
        // Log slow page loads
        if (metrics.total > 3000) { // Page took more than 3 seconds
            this.capturePerformanceIssue({
                type: 'slow-page-load',
                metrics: metrics,
                url: window.location.href
            });
        }
    }
    
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Load user information
     */
    loadUserInfo() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        this.userId = user.email || 'anonymous';
    }
    
    /**
     * Capture an error
     */
    captureError(errorInfo) {
        const error = {
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            userId: this.userId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...errorInfo,
            stackTrace: this.extractStackTrace(errorInfo.error),
            severity: this.determineSeverity(errorInfo),
            context: this.gatherContext()
        };
        
        // Add to errors array
        this.errors.push(error);
        
        // Keep only last N errors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        // Log to console in development
        if (window.APP_CONFIG?.debug) {
            console.error('🚨 Error captured:', error);
        }
        
        // Notify listeners
        this.notifyListeners('error', error);
        
        // Send critical errors immediately
        if (error.severity === this.SEVERITY.CRITICAL) {
            this.reportError(error);
        }
        
        // Store in localStorage for persistence
        this.storeError(error);
        
        return error;
    }
    
    /**
     * Capture performance issue
     */
    capturePerformanceIssue(issue) {
        const performanceIssue = {
            id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            userId: this.userId,
            url: window.location.href,
            ...issue,
            severity: this.SEVERITY.MEDIUM,
            context: this.gatherContext()
        };
        
        // Log in development
        if (window.APP_CONFIG?.debug) {
            console.warn('⚡ Performance issue:', performanceIssue);
        }
        
        // Notify listeners
        this.notifyListeners('performance', performanceIssue);
        
        return performanceIssue;
    }
    
    /**
     * Extract stack trace from error
     */
    extractStackTrace(error) {
        if (!error) return null;
        
        if (error.stack) {
            return error.stack.split('\n').map(line => line.trim());
        }
        
        return null;
    }
    
    /**
     * Determine error severity
     */
    determineSeverity(errorInfo) {
        // Critical: Authentication, payment, data loss errors
        if (errorInfo.message && (
            errorInfo.message.includes('auth') ||
            errorInfo.message.includes('payment') ||
            errorInfo.message.includes('data loss') ||
            errorInfo.message.includes('500') ||
            errorInfo.message.includes('Internal Server Error')
        )) {
            return this.SEVERITY.CRITICAL;
        }
        
        // High: API errors, undefined errors
        if (errorInfo.type === 'api' || 
            errorInfo.message?.includes('undefined') ||
            errorInfo.message?.includes('null')) {
            return this.SEVERITY.HIGH;
        }
        
        // Medium: Promise rejections, long tasks
        if (errorInfo.type === 'promise' || errorInfo.type === 'long-task') {
            return this.SEVERITY.MEDIUM;
        }
        
        // Low: Resource loading, warnings
        return this.SEVERITY.LOW;
    }
    
    /**
     * Gather context information
     */
    gatherContext() {
        return {
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screen: {
                width: window.screen.width,
                height: window.screen.height
            },
            memory: window.performance?.memory ? {
                used: window.performance.memory.usedJSHeapSize,
                total: window.performance.memory.totalJSHeapSize,
                limit: window.performance.memory.jsHeapSizeLimit
            } : null,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null,
            localStorage: {
                hasAuthToken: !!localStorage.getItem('auth_token'),
                hasUser: !!localStorage.getItem('user')
            }
        };
    }
    
    /**
     * Store error in localStorage
     */
    storeError(error) {
        try {
            const storedErrors = JSON.parse(localStorage.getItem('error_log') || '[]');
            storedErrors.push(error);
            
            // Keep only last 50 in storage
            if (storedErrors.length > 50) {
                storedErrors.splice(0, storedErrors.length - 50);
            }
            
            localStorage.setItem('error_log', JSON.stringify(storedErrors));
        } catch (e) {
            console.warn('Failed to store error in localStorage');
        }
    }
    
    /**
     * Report error to backend
     */
    async reportError(error) {
        try {
            const response = await fetch(`${this.apiEndpoint}/errors/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
                },
                body: JSON.stringify({
                    error: error,
                    environment: window.APP_CONFIG?.environment || 'production'
                })
            });
            
            if (!response.ok) {
                console.warn('Failed to report error to backend');
            }
        } catch (e) {
            console.warn('Error reporting failed:', e);
        }
    }
    
    /**
     * Setup periodic error reporting
     */
    setupPeriodicReporting() {
        // Report errors every 5 minutes
        setInterval(() => {
            this.reportBatchErrors();
        }, 5 * 60 * 1000);
        
        // Report on page unload
        window.addEventListener('beforeunload', () => {
            this.reportBatchErrors();
        });
    }
    
    /**
     * Report batch of errors
     */
    async reportBatchErrors() {
        const storedErrors = JSON.parse(localStorage.getItem('error_log') || '[]');
        
        if (storedErrors.length === 0) return;
        
        try {
            await this.reportError({
                type: 'batch',
                errors: storedErrors,
                count: storedErrors.length
            });
            
            // Clear reported errors
            localStorage.removeItem('error_log');
        } catch (e) {
            console.warn('Batch error reporting failed');
        }
    }
    
    /**
     * Add event listener
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Remove event listener
     */
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * Notify listeners
     */
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error('Error in event listener:', e);
                }
            });
        }
    }
    
    /**
     * Get error statistics
     */
    getStatistics() {
        const stats = {
            total: this.errors.length,
            bySeverity: {},
            byType: {},
            last24Hours: 0,
            lastHour: 0
        };
        
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        const dayAgo = now - (24 * 60 * 60 * 1000);
        
        this.errors.forEach(error => {
            // Count by severity
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
            
            // Count by type
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            
            // Time-based counts
            const errorTime = new Date(error.timestamp).getTime();
            if (errorTime > dayAgo) stats.last24Hours++;
            if (errorTime > hourAgo) stats.lastHour++;
        });
        
        return stats;
    }
    
    /**
     * Clear all errors
     */
    clearErrors() {
        this.errors = [];
        localStorage.removeItem('error_log');
    }
    
    /**
     * Export errors
     */
    exportErrors() {
        const data = {
            sessionId: this.sessionId,
            userId: this.userId,
            exportTime: new Date().toISOString(),
            errors: this.errors,
            statistics: this.getStatistics()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-log-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Create singleton instance
window.errorTracker = new ErrorTracker();

// Export for CommonJS/Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.errorTracker;
} 