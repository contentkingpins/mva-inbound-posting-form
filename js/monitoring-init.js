/**
 * Centralized Monitoring System Initialization
 * Include this script on all pages to enable comprehensive monitoring
 */

(function() {
    'use strict';
    
    console.log('🔍 Initializing Claim Connectors Monitoring System...');
    
    // Configuration
    const MONITORING_CONFIG = {
        enableErrorTracking: true,
        enableAnalytics: true,
        enableHealthMonitor: true,
        enableFeedbackWidget: true,
        debugMode: window.APP_CONFIG?.debug || false
    };
    
    // Initialize monitoring systems
    const initializeMonitoring = () => {
        const results = {
            errorTracker: false,
            analytics: false,
            health: false,
            feedback: false
        };
        
        // 1. Error Tracking
        if (MONITORING_CONFIG.enableErrorTracking && window.errorTracker) {
            results.errorTracker = true;
            
            // Add page-specific context
            window.errorTracker.pageContext = {
                page: window.location.pathname,
                userRole: getUserRole()
            };
            
            // Log initialization errors
            window.addEventListener('error', (event) => {
                if (event.message?.includes('Failed to load resource')) {
                    console.warn('Resource loading error:', event);
                }
            });
        }
        
        // 2. Analytics
        if (MONITORING_CONFIG.enableAnalytics && window.analyticsTracker) {
            results.analytics = true;
            
            // Track page performance
            if (window.performance && window.performance.timing) {
                window.addEventListener('load', () => {
                    const timing = window.performance.timing;
                    const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
                    
                    window.analyticsTracker.trackTiming(
                        'page_performance',
                        'load_time',
                        pageLoadTime,
                        window.location.pathname
                    );
                });
            }
            
            // Track user engagement
            let engagementStartTime = Date.now();
            let isEngaged = true;
            
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    // User left the page
                    const engagementTime = Date.now() - engagementStartTime;
                    window.analyticsTracker.trackTiming(
                        'user_engagement',
                        'active_time',
                        engagementTime,
                        window.location.pathname
                    );
                    isEngaged = false;
                } else {
                    // User returned to the page
                    engagementStartTime = Date.now();
                    isEngaged = true;
                }
            });
        }
        
        // 3. Health Monitoring
        if (MONITORING_CONFIG.enableHealthMonitor && window.healthMonitor) {
            results.health = true;
            
            // Add custom health checks based on page
            if (isAdminPage()) {
                // Admin-specific health monitoring
                window.healthMonitor.addEventListener('healthUpdate', (data) => {
                    updateAdminHealthUI(data);
                });
            }
            
            // Monitor critical errors
            if (window.errorTracker) {
                window.errorTracker.addEventListener('error', (error) => {
                    if (error.severity === 'critical') {
                        // Alert admin users of critical errors
                        if (isAdminPage()) {
                            showCriticalErrorAlert(error);
                        }
                    }
                });
            }
        }
        
        // 4. Feedback Widget
        if (MONITORING_CONFIG.enableFeedbackWidget && window.feedbackWidget) {
            results.feedback = true;
            
            // Customize widget based on user role
            const userRole = getUserRole();
            if (userRole === 'admin') {
                // Admins see more detailed feedback options
                window.feedbackWidget.enableAdvancedMode = true;
            }
        }
        
        // Log initialization results
        if (MONITORING_CONFIG.debugMode) {
            console.log('📊 Monitoring System Status:', results);
        }
        
        return results;
    };
    
    // Helper Functions
    const getUserRole = () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user['custom:role'] || user.role || 'guest';
    };
    
    const isAdminPage = () => {
        return window.location.pathname.includes('admin');
    };
    
    const isAgentPage = () => {
        return window.location.pathname.includes('agent');
    };
    
    const updateAdminHealthUI = (healthData) => {
        // Update any health indicators in the admin UI
        const healthBadge = document.querySelector('.system-health-badge');
        if (healthBadge) {
            healthBadge.className = `system-health-badge ${healthData.overall}`;
            healthBadge.textContent = healthData.overall.toUpperCase();
        }
    };
    
    const showCriticalErrorAlert = (error) => {
        // Show a non-intrusive alert for critical errors
        const alertDiv = document.createElement('div');
        alertDiv.className = 'critical-error-alert';
        alertDiv.innerHTML = `
            <div class="alert-content">
                <span class="alert-icon">⚠️</span>
                <span class="alert-message">System error detected. The team has been notified.</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#monitoring-alert-styles')) {
            const style = document.createElement('style');
            style.id = 'monitoring-alert-styles';
            style.textContent = `
                .critical-error-alert {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #ef4444;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    z-index: 10000;
                    animation: slideDown 0.3s ease;
                }
                
                @keyframes slideDown {
                    from {
                        transform: translateX(-50%) translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
                
                .alert-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .alert-icon {
                    font-size: 20px;
                }
                
                .alert-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    margin-left: 20px;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 10000);
    };
    
    // Custom tracking functions for specific features
    window.trackLeadAction = (action, leadData) => {
        if (window.analyticsTracker) {
            window.analyticsTracker.track({
                category: 'lead_management',
                action: action,
                label: leadData.id,
                metadata: leadData
            });
        }
    };
    
    window.trackAdminAction = (action, data) => {
        if (window.analyticsTracker) {
            window.analyticsTracker.track({
                category: 'admin_action',
                action: action,
                metadata: data
            });
        }
    };
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMonitoring);
    } else {
        initializeMonitoring();
    }
    
    // Export for debugging
    window.MonitoringSystem = {
        config: MONITORING_CONFIG,
        getStatus: () => {
            return {
                errorTracker: !!window.errorTracker,
                analytics: !!window.analyticsTracker,
                health: !!window.healthMonitor,
                feedback: !!window.feedbackWidget,
                errors: window.errorTracker?.getStatistics() || null,
                analytics: window.analyticsTracker?.getAnalyticsSummary() || null,
                health: window.healthMonitor?.getHealthData() || null
            };
        },
        exportData: () => {
            const data = {
                timestamp: new Date().toISOString(),
                page: window.location.href,
                user: getUserRole(),
                errors: window.errorTracker?.errors || [],
                analytics: window.analyticsTracker?.events || [],
                health: window.healthMonitor?.getHealthData() || {}
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `monitoring-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };
    
    console.log('✅ Monitoring System Initialized - Use window.MonitoringSystem.getStatus() for details');
})(); 