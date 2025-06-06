/**
 * Analytics Event Tracking System
 * Tracks user interactions, feature usage, and conversion metrics
 */

class AnalyticsTracker {
    constructor() {
        this.events = [];
        this.sessionId = this.generateSessionId();
        this.userId = null;
        this.maxEvents = 500; // Keep last 500 events in memory
        this.apiEndpoint = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
        this.batchSize = 50; // Send events in batches
        this.batchInterval = 30000; // Send batch every 30 seconds
        this.enabled = true;
        this.analyticsDisabled = false; // Flag to prevent spam when endpoint is unavailable
        
        // Event categories
        this.CATEGORIES = {
            PAGE_VIEW: 'page_view',
            USER_ACTION: 'user_action',
            FEATURE_USE: 'feature_use',
            ERROR: 'error',
            PERFORMANCE: 'performance',
            CONVERSION: 'conversion',
            NAVIGATION: 'navigation'
        };
        
        // Initialize tracking
        this.init();
    }
    
    /**
     * Initialize analytics tracking
     */
    init() {
        console.log('📊 Analytics Tracker initializing...');
        
        // Load user info
        this.loadUserInfo();
        
        // Setup automatic tracking
        this.setupAutomaticTracking();
        
        // Setup batch sending
        this.setupBatchSending();
        
        // Track initial page view
        this.trackPageView();
        
        console.log('✅ Analytics Tracker initialized');
    }
    
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Load user information
     */
    loadUserInfo() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        this.userId = user.email || 'anonymous';
        
        // Update user ID if auth changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'user') {
                const newUser = JSON.parse(e.newValue || '{}');
                this.userId = newUser.email || 'anonymous';
            }
        });
    }
    
    /**
     * Setup automatic tracking
     */
    setupAutomaticTracking() {
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.track({
                category: this.CATEGORIES.PAGE_VIEW,
                action: document.hidden ? 'page_hidden' : 'page_visible',
                metadata: {
                    hiddenAt: document.hidden ? Date.now() : null
                }
            });
        });
        
        // Track navigation
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            this.trackPageView();
        };
        
        history.replaceState = (...args) => {
            originalReplaceState.apply(history, args);
            this.trackPageView();
        };
        
        window.addEventListener('popstate', () => {
            this.trackPageView();
        });
        
        // Track form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.tagName === 'FORM') {
                this.track({
                    category: this.CATEGORIES.USER_ACTION,
                    action: 'form_submit',
                    label: e.target.id || e.target.className || 'unknown_form',
                    metadata: {
                        formAction: e.target.action,
                        formMethod: e.target.method
                    }
                });
            }
        });
        
        // Track button clicks
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, a[href], [role="button"]');
            if (target) {
                const label = target.textContent?.trim() || 
                             target.getAttribute('aria-label') || 
                             target.id || 
                             target.className || 
                             'unknown';
                
                this.track({
                    category: this.CATEGORIES.USER_ACTION,
                    action: 'click',
                    label: label,
                    metadata: {
                        tagName: target.tagName,
                        href: target.href || null,
                        id: target.id || null,
                        classes: target.className || null
                    }
                });
            }
        });
        
        // Track search inputs
        let searchTimeout;
        document.addEventListener('input', (e) => {
            if (e.target.type === 'search' || e.target.classList.contains('search-input')) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.track({
                        category: this.CATEGORIES.USER_ACTION,
                        action: 'search',
                        label: e.target.id || 'unknown_search',
                        value: e.target.value.length // Don't track actual search terms for privacy
                    });
                }, 1000); // Track after 1 second of no typing
            }
        });
        
        // Track file downloads
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[download], a[href$=".pdf"], a[href$=".csv"], a[href$=".xlsx"]');
            if (link) {
                this.track({
                    category: this.CATEGORIES.USER_ACTION,
                    action: 'download',
                    label: link.download || link.href.split('/').pop(),
                    metadata: {
                        href: link.href
                    }
                });
            }
        });
    }
    
    /**
     * Track page view
     */
    trackPageView() {
        const pageData = {
            url: window.location.href,
            path: window.location.pathname,
            title: document.title,
            referrer: document.referrer,
            timestamp: Date.now()
        };
        
        this.track({
            category: this.CATEGORIES.PAGE_VIEW,
            action: 'view',
            label: pageData.path,
            metadata: pageData
        });
    }
    
    /**
     * Track custom event
     */
    track(eventData) {
        if (!this.enabled) return;
        
        const event = {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId: this.sessionId,
            userId: this.userId,
            timestamp: new Date().toISOString(),
            category: eventData.category || this.CATEGORIES.USER_ACTION,
            action: eventData.action,
            label: eventData.label || null,
            value: eventData.value || null,
            metadata: {
                ...this.getDefaultMetadata(),
                ...(eventData.metadata || {})
            }
        };
        
        // Add to events array
        this.events.push(event);
        
        // Keep only last N events
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }
        
        // Log in development
        if (window.APP_CONFIG?.debug) {
            console.log('📊 Event tracked:', event);
        }
        
        return event;
    }
    
    /**
     * Get default metadata
     */
    getDefaultMetadata() {
        return {
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screen: {
                width: window.screen.width,
                height: window.screen.height
            },
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            url: window.location.href,
            timestamp: Date.now()
        };
    }
    
    /**
     * Track feature usage
     */
    trackFeature(featureName, metadata = {}) {
        this.track({
            category: this.CATEGORIES.FEATURE_USE,
            action: 'use',
            label: featureName,
            metadata: metadata
        });
    }
    
    /**
     * Track conversion event
     */
    trackConversion(conversionType, value = null, metadata = {}) {
        this.track({
            category: this.CATEGORIES.CONVERSION,
            action: conversionType,
            value: value,
            metadata: metadata
        });
    }
    
    /**
     * Track timing/performance
     */
    trackTiming(category, variable, time, label = null) {
        this.track({
            category: this.CATEGORIES.PERFORMANCE,
            action: 'timing',
            label: `${category}_${variable}${label ? '_' + label : ''}`,
            value: time,
            metadata: {
                timingCategory: category,
                timingVariable: variable,
                timingLabel: label,
                timingValue: time
            }
        });
    }
    
    /**
     * Setup batch sending
     */
    setupBatchSending() {
        // Send events periodically
        setInterval(() => {
            this.sendBatch();
        }, this.batchInterval);
        
        // Send events before page unload
        window.addEventListener('beforeunload', () => {
            this.sendBatch(true); // Force send all events
        });
    }
    
    /**
     * Send batch of events
     */
    async sendBatch(force = false) {
        const eventsToSend = force ? this.events : this.events.slice(0, this.batchSize);
        
        if (eventsToSend.length === 0) return;
        
        // If analytics endpoint is not available, don't spam with requests
        if (this.analyticsDisabled) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiEndpoint}/analytics/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
                },
                body: JSON.stringify({
                    events: eventsToSend,
                    sessionId: this.sessionId,
                    environment: window.APP_CONFIG?.environment || 'production'
                })
            });
            
            if (response.ok) {
                // Remove sent events
                this.events = this.events.filter(e => !eventsToSend.includes(e));
                
                if (window.APP_CONFIG?.debug) {
                    console.log(`📊 Sent ${eventsToSend.length} analytics events`);
                }
            } else if (response.status === 0 || response.status >= 400) {
                // Likely CORS or server error - disable further attempts for this session
                console.warn('⚠️ Analytics endpoint unavailable, disabling for this session');
                this.analyticsDisabled = true;
            }
        } catch (error) {
            // Handle CORS and network errors gracefully
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                console.warn('⚠️ Analytics endpoint blocked by CORS, disabling for this session');
                this.analyticsDisabled = true;
            } else {
                console.warn('Failed to send analytics batch:', error.message);
            }
        }
    }
    
    /**
     * Get analytics summary
     */
    getAnalyticsSummary() {
        const summary = {
            totalEvents: this.events.length,
            sessionId: this.sessionId,
            userId: this.userId,
            byCategory: {},
            byAction: {},
            pageViews: 0,
            interactions: 0
        };
        
        this.events.forEach(event => {
            // Count by category
            summary.byCategory[event.category] = (summary.byCategory[event.category] || 0) + 1;
            
            // Count by action
            summary.byAction[event.action] = (summary.byAction[event.action] || 0) + 1;
            
            // Count specific types
            if (event.category === this.CATEGORIES.PAGE_VIEW) {
                summary.pageViews++;
            }
            if (event.category === this.CATEGORIES.USER_ACTION) {
                summary.interactions++;
            }
        });
        
        return summary;
    }
    
    /**
     * Get conversion funnel data
     */
    getConversionFunnel(steps) {
        const funnel = {};
        
        steps.forEach((step, index) => {
            const count = this.events.filter(e => 
                e.category === this.CATEGORIES.CONVERSION && 
                e.action === step
            ).length;
            
            funnel[step] = {
                count: count,
                rate: index === 0 ? 100 : (count / funnel[steps[0]].count * 100)
            };
        });
        
        return funnel;
    }
    
    /**
     * Get feature usage stats
     */
    getFeatureUsage() {
        const usage = {};
        
        this.events
            .filter(e => e.category === this.CATEGORIES.FEATURE_USE)
            .forEach(event => {
                const feature = event.label;
                if (!usage[feature]) {
                    usage[feature] = {
                        count: 0,
                        firstUsed: event.timestamp,
                        lastUsed: event.timestamp
                    };
                }
                usage[feature].count++;
                usage[feature].lastUsed = event.timestamp;
            });
        
        return usage;
    }
    
    /**
     * Enable/disable tracking
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`📊 Analytics tracking ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Clear all events
     */
    clearEvents() {
        this.events = [];
    }
    
    /**
     * Export analytics data
     */
    exportAnalytics() {
        const data = {
            sessionId: this.sessionId,
            userId: this.userId,
            exportTime: new Date().toISOString(),
            events: this.events,
            summary: this.getAnalyticsSummary(),
            featureUsage: this.getFeatureUsage()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Create singleton instance
window.analyticsTracker = new AnalyticsTracker();

// Export for CommonJS/Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.analyticsTracker;
} 