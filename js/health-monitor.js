/**
 * Application Health Monitor
 * Monitors system health, API status, and performance metrics
 */

class HealthMonitor {
    constructor() {
        this.healthData = {
            api: { status: 'unknown', lastCheck: null, responseTime: null },
            auth: { status: 'unknown', lastCheck: null },
            database: { status: 'unknown', lastCheck: null },
            performance: { cpu: null, memory: null, fps: null },
            errors: { count: 0, rate: 0 },
            uptime: Date.now()
        };
        
        this.checkInterval = 60000; // Check every minute
        this.performanceInterval = 5000; // Check performance every 5 seconds
        this.listeners = new Map();
        this.apiEndpoint = window.APP_CONFIG?.apiEndpoint || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod';
        
        // Status levels
        this.STATUS = {
            HEALTHY: 'healthy',
            DEGRADED: 'degraded',
            DOWN: 'down',
            UNKNOWN: 'unknown'
        };
        
        // Initialize monitoring
        this.init();
    }
    
    /**
     * Initialize health monitoring
     */
    init() {
        console.log('🏥 Health Monitor initializing...');
        
        // Start monitoring
        this.startHealthChecks();
        this.startPerformanceMonitoring();
        
        // Monitor error rate
        if (window.errorTracker) {
            window.errorTracker.addEventListener('error', () => {
                this.updateErrorRate();
            });
        }
        
        // Create status indicator
        this.createStatusIndicator();
        
        console.log('✅ Health Monitor initialized');
    }
    
    /**
     * Start health checks
     */
    startHealthChecks() {
        // Initial check
        this.performHealthChecks();
        
        // Periodic checks
        setInterval(() => {
            this.performHealthChecks();
        }, this.checkInterval);
    }
    
    /**
     * Perform all health checks
     */
    async performHealthChecks() {
        await Promise.all([
            this.checkAPIHealth(),
            this.checkAuthHealth(),
            this.checkDatabaseHealth()
        ]);
        
        // Update overall status
        this.updateOverallStatus();
        
        // Notify listeners
        this.notifyListeners('healthUpdate', this.healthData);
    }
    
    /**
     * Check API health
     */
    async checkAPIHealth() {
        const startTime = Date.now();
        
        try {
            const response = await fetch(`${this.apiEndpoint}/health`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
                },
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
                this.healthData.api = {
                    status: responseTime < 1000 ? this.STATUS.HEALTHY : this.STATUS.DEGRADED,
                    lastCheck: Date.now(),
                    responseTime: responseTime
                };
            } else {
                this.healthData.api = {
                    status: this.STATUS.DEGRADED,
                    lastCheck: Date.now(),
                    responseTime: responseTime,
                    error: `HTTP ${response.status}`
                };
            }
        } catch (error) {
            this.healthData.api = {
                status: this.STATUS.DOWN,
                lastCheck: Date.now(),
                responseTime: null,
                error: error.message
            };
        }
    }
    
    /**
     * Check authentication health
     */
    async checkAuthHealth() {
        try {
            const token = localStorage.getItem('auth_token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            if (!token || !user.email) {
                this.healthData.auth = {
                    status: this.STATUS.DOWN,
                    lastCheck: Date.now(),
                    error: 'Not authenticated'
                };
                return;
            }
            
            // Check if token is expired
            const tokenPayload = this.parseJWT(token);
            if (tokenPayload && tokenPayload.exp) {
                const expirationTime = tokenPayload.exp * 1000;
                const now = Date.now();
                
                if (now > expirationTime) {
                    this.healthData.auth = {
                        status: this.STATUS.DOWN,
                        lastCheck: Date.now(),
                        error: 'Token expired'
                    };
                } else if (now > expirationTime - 300000) { // 5 minutes before expiration
                    this.healthData.auth = {
                        status: this.STATUS.DEGRADED,
                        lastCheck: Date.now(),
                        warning: 'Token expiring soon'
                    };
                } else {
                    this.healthData.auth = {
                        status: this.STATUS.HEALTHY,
                        lastCheck: Date.now()
                    };
                }
            }
        } catch (error) {
            this.healthData.auth = {
                status: this.STATUS.UNKNOWN,
                lastCheck: Date.now(),
                error: error.message
            };
        }
    }
    
    /**
     * Check database health (simulated via API)
     */
    async checkDatabaseHealth() {
        // In a real app, this would check database connectivity
        // For now, we'll base it on API health
        if (this.healthData.api.status === this.STATUS.HEALTHY) {
            this.healthData.database = {
                status: this.STATUS.HEALTHY,
                lastCheck: Date.now()
            };
        } else {
            this.healthData.database = {
                status: this.healthData.api.status,
                lastCheck: Date.now()
            };
        }
    }
    
    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        // Monitor FPS
        this.monitorFPS();
        
        // Monitor memory usage
        setInterval(() => {
            this.monitorMemory();
        }, this.performanceInterval);
    }
    
    /**
     * Monitor frames per second
     */
    monitorFPS() {
        let lastTime = performance.now();
        let frames = 0;
        let fps = 60;
        
        const measureFPS = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                fps = Math.round(frames * 1000 / (currentTime - lastTime));
                frames = 0;
                lastTime = currentTime;
                
                this.healthData.performance.fps = fps;
                
                // Check performance issues
                if (fps < 30) {
                    this.notifyListeners('performanceIssue', {
                        type: 'lowFPS',
                        value: fps
                    });
                }
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    /**
     * Monitor memory usage
     */
    monitorMemory() {
        if (performance.memory) {
            const used = performance.memory.usedJSHeapSize;
            const total = performance.memory.totalJSHeapSize;
            const limit = performance.memory.jsHeapSizeLimit;
            
            this.healthData.performance.memory = {
                used: used,
                total: total,
                limit: limit,
                percentage: Math.round(used / limit * 100)
            };
            
            // Check for memory issues
            if (used / limit > 0.9) {
                this.notifyListeners('performanceIssue', {
                    type: 'highMemory',
                    value: this.healthData.performance.memory
                });
            }
        }
    }
    
    /**
     * Update error rate
     */
    updateErrorRate() {
        const stats = window.errorTracker?.getStatistics() || { total: 0, lastHour: 0 };
        this.healthData.errors = {
            count: stats.total,
            rate: stats.lastHour,
            severity: stats.bySeverity || {}
        };
    }
    
    /**
     * Update overall system status
     */
    updateOverallStatus() {
        const statuses = [
            this.healthData.api.status,
            this.healthData.auth.status,
            this.healthData.database.status
        ];
        
        if (statuses.includes(this.STATUS.DOWN)) {
            this.healthData.overall = this.STATUS.DOWN;
        } else if (statuses.includes(this.STATUS.DEGRADED)) {
            this.healthData.overall = this.STATUS.DEGRADED;
        } else if (statuses.includes(this.STATUS.UNKNOWN)) {
            this.healthData.overall = this.STATUS.UNKNOWN;
        } else {
            this.healthData.overall = this.STATUS.HEALTHY;
        }
        
        // Update status indicator
        this.updateStatusIndicator();
    }
    
    /**
     * Create status indicator
     */
    createStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'health-status-indicator';
        indicator.className = 'health-status-indicator';
        indicator.innerHTML = `
            <div class="status-dot" id="status-dot"></div>
            <div class="status-details" id="status-details">
                <div class="status-header">
                    <h4>System Health</h4>
                    <button class="status-close">&times;</button>
                </div>
                <div class="status-content">
                    <div class="status-item">
                        <span class="status-label">API</span>
                        <span class="status-value" id="status-api">Checking...</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Auth</span>
                        <span class="status-value" id="status-auth">Checking...</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Database</span>
                        <span class="status-value" id="status-database">Checking...</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Errors (1hr)</span>
                        <span class="status-value" id="status-errors">0</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Memory</span>
                        <span class="status-value" id="status-memory">N/A</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">FPS</span>
                        <span class="status-value" id="status-fps">60</span>
                    </div>
                </div>
                <div class="status-footer">
                    <button class="status-btn" id="export-health-report">Export Report</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(indicator);
        
        // Add styles
        this.addStatusStyles();
        
        // Setup event listeners
        this.setupStatusListeners();
    }
    
    /**
     * Add status indicator styles
     */
    addStatusStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Health Status Indicator */
            .health-status-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9998;
            }
            
            .status-dot {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #10b981;
                cursor: pointer;
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
                animation: pulse-healthy 2s infinite;
                transition: all 0.3s ease;
            }
            
            .status-dot.degraded {
                background: #f59e0b;
                animation: pulse-degraded 2s infinite;
            }
            
            .status-dot.down {
                background: #ef4444;
                animation: pulse-down 1s infinite;
            }
            
            @keyframes pulse-healthy {
                0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
                70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
            
            @keyframes pulse-degraded {
                0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
                70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
                100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
            }
            
            @keyframes pulse-down {
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
                70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
            
            .status-details {
                position: absolute;
                top: 30px;
                right: 0;
                width: 300px;
                background: var(--bg-secondary, #1e293b);
                border: 1px solid var(--border-color, #334155);
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
                display: none;
                opacity: 0;
                transform: translateY(-10px) scale(0.95);
                transition: all 0.3s ease;
            }
            
            .status-details.open {
                display: block;
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            
            .status-header {
                padding: 16px;
                border-bottom: 1px solid var(--border-color, #334155);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .status-header h4 {
                margin: 0;
                font-size: 16px;
                color: var(--text-primary, #f1f5f9);
            }
            
            .status-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: var(--text-secondary, #94a3b8);
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s ease;
            }
            
            .status-close:hover {
                background: var(--bg-primary, #0f172a);
                color: var(--text-primary, #f1f5f9);
            }
            
            .status-content {
                padding: 16px;
            }
            
            .status-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--border-color, #334155);
            }
            
            .status-item:last-child {
                border-bottom: none;
            }
            
            .status-label {
                font-size: 14px;
                color: var(--text-secondary, #94a3b8);
            }
            
            .status-value {
                font-size: 14px;
                font-weight: 500;
                color: var(--text-primary, #f1f5f9);
            }
            
            .status-value.healthy {
                color: #10b981;
            }
            
            .status-value.degraded {
                color: #f59e0b;
            }
            
            .status-value.down {
                color: #ef4444;
            }
            
            .status-footer {
                padding: 12px 16px;
                border-top: 1px solid var(--border-color, #334155);
            }
            
            .status-btn {
                width: 100%;
                padding: 8px 16px;
                background: var(--primary, #4299e1);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .status-btn:hover {
                background: var(--primary-dark, #3182ce);
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Setup status indicator listeners
     */
    setupStatusListeners() {
        const dot = document.getElementById('status-dot');
        const details = document.getElementById('status-details');
        const closeBtn = details.querySelector('.status-close');
        const exportBtn = document.getElementById('export-health-report');
        
        // Toggle details on dot click
        dot.addEventListener('click', () => {
            details.classList.toggle('open');
        });
        
        // Close details
        closeBtn.addEventListener('click', () => {
            details.classList.remove('open');
        });
        
        // Export report
        exportBtn.addEventListener('click', () => {
            this.exportHealthReport();
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.health-status-indicator')) {
                details.classList.remove('open');
            }
        });
    }
    
    /**
     * Update status indicator
     */
    updateStatusIndicator() {
        const dot = document.getElementById('status-dot');
        const overall = this.healthData.overall;
        
        // Update dot color
        dot.className = 'status-dot';
        if (overall === this.STATUS.DEGRADED) {
            dot.classList.add('degraded');
        } else if (overall === this.STATUS.DOWN) {
            dot.classList.add('down');
        }
        
        // Update details
        this.updateStatusValue('api', this.healthData.api.status);
        this.updateStatusValue('auth', this.healthData.auth.status);
        this.updateStatusValue('database', this.healthData.database.status);
        
        document.getElementById('status-errors').textContent = this.healthData.errors.rate || 0;
        
        if (this.healthData.performance.memory) {
            document.getElementById('status-memory').textContent = 
                `${this.healthData.performance.memory.percentage}%`;
        }
        
        if (this.healthData.performance.fps !== null) {
            document.getElementById('status-fps').textContent = this.healthData.performance.fps;
        }
    }
    
    /**
     * Update status value element
     */
    updateStatusValue(id, status) {
        const element = document.getElementById(`status-${id}`);
        if (element) {
            element.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            element.className = `status-value ${status}`;
        }
    }
    
    /**
     * Parse JWT token
     */
    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            return JSON.parse(jsonPayload);
        } catch (error) {
            return null;
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
     * Notify listeners
     */
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error('Error in health monitor listener:', e);
                }
            });
        }
    }
    
    /**
     * Get current health data
     */
    getHealthData() {
        return { ...this.healthData };
    }
    
    /**
     * Export health report
     */
    exportHealthReport() {
        const report = {
            timestamp: new Date().toISOString(),
            system: {
                uptime: Date.now() - this.healthData.uptime,
                environment: window.APP_CONFIG?.environment || 'production',
                version: window.APP_CONFIG?.version || 'unknown'
            },
            health: this.healthData,
            browser: navigator.userAgent,
            screen: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📊 Health report exported');
    }
}

// Create singleton instance
window.healthMonitor = new HealthMonitor();

// Export for modules
export default window.healthMonitor; 