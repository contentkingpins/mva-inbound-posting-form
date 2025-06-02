/**
 * Performance Monitor Module
 * Real-time performance tracking and analysis
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: [],
            memory: [],
            loadTime: {},
            apiCalls: [],
            errors: [],
            customMetrics: {}
        };
        
        this.config = {
            enabled: true,
            sampleRate: 1000, // ms
            maxDataPoints: 100,
            thresholds: {
                fps: { warning: 30, critical: 20 },
                memory: { warning: 100, critical: 200 }, // MB
                apiResponseTime: { warning: 1000, critical: 3000 }, // ms
                errorRate: { warning: 5, critical: 10 } // per minute
            }
        };
        
        this.observers = new Set();
        this.rafId = null;
        this.isMonitoring = false;
        
        this.init();
    }

    init() {
        if (!this.checkSupport()) {
            console.warn('Performance monitoring features not fully supported');
            return;
        }
        
        this.setupPerformanceObserver();
        this.startMonitoring();
        this.setupErrorTracking();
        this.createMonitorUI();
        
        // Track initial page load
        this.trackPageLoad();
    }

    checkSupport() {
        return 'performance' in window && 
               'PerformanceObserver' in window &&
               'requestAnimationFrame' in window;
    }

    // Performance Observer for various metrics
    setupPerformanceObserver() {
        if (!window.PerformanceObserver) return;

        // Navigation timing
        const navigationObserver = new PerformanceObserver((entries) => {
            entries.getEntries().forEach(entry => {
                this.metrics.loadTime = {
                    ...this.metrics.loadTime,
                    navigationStart: entry.startTime,
                    fetchStart: entry.fetchStart,
                    domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                    loadComplete: entry.loadEventEnd - entry.loadEventStart,
                    totalTime: entry.loadEventEnd - entry.fetchStart
                };
            });
        });

        try {
            navigationObserver.observe({ entryTypes: ['navigation'] });
        } catch (e) {
            console.debug('Navigation observer not supported');
        }

        // Resource timing
        const resourceObserver = new PerformanceObserver((entries) => {
            entries.getEntries().forEach(entry => {
                if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
                    this.trackAPICall({
                        url: entry.name,
                        duration: entry.duration,
                        size: entry.transferSize,
                        timestamp: Date.now()
                    });
                }
            });
        });

        try {
            resourceObserver.observe({ entryTypes: ['resource'] });
        } catch (e) {
            console.debug('Resource observer not supported');
        }

        // Long tasks
        const taskObserver = new PerformanceObserver((entries) => {
            entries.getEntries().forEach(entry => {
                if (entry.duration > 50) { // Tasks longer than 50ms
                    this.logMetric('longTask', {
                        duration: entry.duration,
                        startTime: entry.startTime,
                        timestamp: Date.now()
                    });
                }
            });
        });

        try {
            taskObserver.observe({ entryTypes: ['longtask'] });
        } catch (e) {
            console.debug('Long task observer not supported');
        }
    }

    // Start continuous monitoring
    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        
        // FPS monitoring
        this.monitorFPS();
        
        // Memory monitoring
        this.monitorMemory();
        
        // Start periodic metric collection
        this.metricsInterval = setInterval(() => {
            this.collectMetrics();
        }, this.config.sampleRate);
    }

    stopMonitoring() {
        this.isMonitoring = false;
        
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
    }

    // FPS Monitoring
    monitorFPS() {
        let lastTime = performance.now();
        let frames = 0;
        let fps = 0;

        const measureFPS = () => {
            const currentTime = performance.now();
            frames++;

            if (currentTime >= lastTime + 1000) {
                fps = Math.round((frames * 1000) / (currentTime - lastTime));
                this.recordFPS(fps);
                frames = 0;
                lastTime = currentTime;
            }

            if (this.isMonitoring) {
                this.rafId = requestAnimationFrame(measureFPS);
            }
        };

        measureFPS();
    }

    recordFPS(fps) {
        this.metrics.fps.push({
            value: fps,
            timestamp: Date.now()
        });

        // Keep only recent data points
        if (this.metrics.fps.length > this.config.maxDataPoints) {
            this.metrics.fps.shift();
        }

        // Check threshold
        if (fps < this.config.thresholds.fps.critical) {
            this.notifyObservers('performance-critical', {
                type: 'fps',
                value: fps,
                threshold: this.config.thresholds.fps.critical
            });
        } else if (fps < this.config.thresholds.fps.warning) {
            this.notifyObservers('performance-warning', {
                type: 'fps',
                value: fps,
                threshold: this.config.thresholds.fps.warning
            });
        }
    }

    // Memory Monitoring
    monitorMemory() {
        if (!performance.memory) {
            console.debug('Memory monitoring not supported');
            return;
        }

        setInterval(() => {
            const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
            this.recordMemory(memoryMB);
        }, this.config.sampleRate);
    }

    recordMemory(memoryMB) {
        this.metrics.memory.push({
            value: memoryMB,
            timestamp: Date.now(),
            total: Math.round(performance.memory.totalJSHeapSize / 1048576),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
        });

        // Keep only recent data points
        if (this.metrics.memory.length > this.config.maxDataPoints) {
            this.metrics.memory.shift();
        }

        // Check threshold
        if (memoryMB > this.config.thresholds.memory.critical) {
            this.notifyObservers('performance-critical', {
                type: 'memory',
                value: memoryMB,
                threshold: this.config.thresholds.memory.critical
            });
        }
    }

    // API Call Tracking
    trackAPICall(data) {
        this.metrics.apiCalls.push(data);

        // Keep only recent calls
        const cutoffTime = Date.now() - 60000; // Last minute
        this.metrics.apiCalls = this.metrics.apiCalls.filter(
            call => call.timestamp > cutoffTime
        );

        // Check response time threshold
        if (data.duration > this.config.thresholds.apiResponseTime.critical) {
            this.notifyObservers('performance-critical', {
                type: 'api',
                url: data.url,
                duration: data.duration,
                threshold: this.config.thresholds.apiResponseTime.critical
            });
        }
    }

    // Error Tracking
    setupErrorTracking() {
        window.addEventListener('error', (event) => {
            this.trackError({
                type: 'javascript',
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.trackError({
                type: 'unhandled-promise',
                message: event.reason?.message || event.reason,
                stack: event.reason?.stack,
                timestamp: Date.now()
            });
        });
    }

    trackError(error) {
        this.metrics.errors.push(error);

        // Keep only recent errors
        const cutoffTime = Date.now() - 300000; // Last 5 minutes
        this.metrics.errors = this.metrics.errors.filter(
            err => err.timestamp > cutoffTime
        );

        // Check error rate
        const recentErrors = this.metrics.errors.filter(
            err => err.timestamp > Date.now() - 60000
        );

        if (recentErrors.length > this.config.thresholds.errorRate.critical) {
            this.notifyObservers('performance-critical', {
                type: 'error-rate',
                count: recentErrors.length,
                threshold: this.config.thresholds.errorRate.critical
            });
        }
    }

    // Page Load Metrics
    trackPageLoad() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.metrics.loadTime = {
                    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
                    tcp: navigation.connectEnd - navigation.connectStart,
                    request: navigation.responseStart - navigation.requestStart,
                    response: navigation.responseEnd - navigation.responseStart,
                    dom: navigation.domComplete - navigation.domInteractive,
                    load: navigation.loadEventEnd - navigation.loadEventStart,
                    total: navigation.loadEventEnd - navigation.fetchStart,
                    firstPaint: 0,
                    firstContentfulPaint: 0,
                    largestContentfulPaint: 0
                };

                // Get paint metrics
                const paintMetrics = performance.getEntriesByType('paint');
                paintMetrics.forEach(metric => {
                    if (metric.name === 'first-paint') {
                        this.metrics.loadTime.firstPaint = metric.startTime;
                    } else if (metric.name === 'first-contentful-paint') {
                        this.metrics.loadTime.firstContentfulPaint = metric.startTime;
                    }
                });
            }
        });
    }

    // Custom Metrics
    logMetric(name, value) {
        if (!this.metrics.customMetrics[name]) {
            this.metrics.customMetrics[name] = [];
        }

        this.metrics.customMetrics[name].push({
            value,
            timestamp: Date.now()
        });

        // Keep only recent data
        if (this.metrics.customMetrics[name].length > this.config.maxDataPoints) {
            this.metrics.customMetrics[name].shift();
        }
    }

    // Get current metrics
    getCurrentMetrics() {
        const latestFPS = this.metrics.fps[this.metrics.fps.length - 1]?.value || 0;
        const latestMemory = this.metrics.memory[this.metrics.memory.length - 1]?.value || 0;
        const errorRate = this.metrics.errors.filter(
            err => err.timestamp > Date.now() - 60000
        ).length;

        const avgResponseTime = this.metrics.apiCalls.length > 0
            ? this.metrics.apiCalls.reduce((acc, call) => acc + call.duration, 0) / this.metrics.apiCalls.length
            : 0;

        return {
            fps: latestFPS,
            memory: latestMemory,
            errorRate,
            avgResponseTime: Math.round(avgResponseTime),
            loadTime: this.metrics.loadTime.total || 0
        };
    }

    // Collect all metrics
    collectMetrics() {
        const metrics = this.getCurrentMetrics();
        this.notifyObservers('metrics-update', metrics);
    }

    // UI Creation
    createMonitorUI() {
        // Create floating monitor widget
        const monitor = document.createElement('div');
        monitor.id = 'performance-monitor';
        monitor.className = 'performance-monitor';
        monitor.innerHTML = `
            <div class="monitor-header">
                <span class="monitor-title">Performance</span>
                <button class="monitor-toggle" onclick="performanceMonitor.toggleMonitor()">
                    <i class="fas fa-chart-line"></i>
                </button>
            </div>
            <div class="monitor-content" style="display: none;">
                <div class="monitor-metrics">
                    <div class="monitor-metric">
                        <span class="metric-label">FPS</span>
                        <span class="metric-value" id="metric-fps">--</span>
                    </div>
                    <div class="monitor-metric">
                        <span class="metric-label">Memory</span>
                        <span class="metric-value" id="metric-memory">-- MB</span>
                    </div>
                    <div class="monitor-metric">
                        <span class="metric-label">API</span>
                        <span class="metric-value" id="metric-api">-- ms</span>
                    </div>
                    <div class="monitor-metric">
                        <span class="metric-label">Errors</span>
                        <span class="metric-value" id="metric-errors">0</span>
                    </div>
                </div>
                <div class="monitor-actions">
                    <button onclick="performanceMonitor.showDetailedReport()">
                        <i class="fas fa-file-alt"></i> Report
                    </button>
                    <button onclick="performanceMonitor.clearMetrics()">
                        <i class="fas fa-trash"></i> Clear
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(monitor);
        this.monitorElement = monitor;

        // Update UI periodically
        setInterval(() => this.updateMonitorUI(), 1000);
    }

    updateMonitorUI() {
        const metrics = this.getCurrentMetrics();
        
        const fpsEl = document.getElementById('metric-fps');
        const memoryEl = document.getElementById('metric-memory');
        const apiEl = document.getElementById('metric-api');
        const errorsEl = document.getElementById('metric-errors');

        if (fpsEl) {
            fpsEl.textContent = metrics.fps;
            fpsEl.className = this.getMetricClass('fps', metrics.fps);
        }

        if (memoryEl) {
            memoryEl.textContent = `${metrics.memory} MB`;
            memoryEl.className = this.getMetricClass('memory', metrics.memory);
        }

        if (apiEl) {
            apiEl.textContent = `${metrics.avgResponseTime} ms`;
            apiEl.className = this.getMetricClass('api', metrics.avgResponseTime);
        }

        if (errorsEl) {
            errorsEl.textContent = metrics.errorRate;
            errorsEl.className = this.getMetricClass('errors', metrics.errorRate);
        }
    }

    getMetricClass(type, value) {
        let className = 'metric-value ';
        
        switch (type) {
            case 'fps':
                if (value < this.config.thresholds.fps.critical) {
                    className += 'metric-critical';
                } else if (value < this.config.thresholds.fps.warning) {
                    className += 'metric-warning';
                } else {
                    className += 'metric-good';
                }
                break;
            case 'memory':
                if (value > this.config.thresholds.memory.critical) {
                    className += 'metric-critical';
                } else if (value > this.config.thresholds.memory.warning) {
                    className += 'metric-warning';
                } else {
                    className += 'metric-good';
                }
                break;
            case 'api':
                if (value > this.config.thresholds.apiResponseTime.critical) {
                    className += 'metric-critical';
                } else if (value > this.config.thresholds.apiResponseTime.warning) {
                    className += 'metric-warning';
                } else {
                    className += 'metric-good';
                }
                break;
            case 'errors':
                if (value > this.config.thresholds.errorRate.critical) {
                    className += 'metric-critical';
                } else if (value > this.config.thresholds.errorRate.warning) {
                    className += 'metric-warning';
                } else {
                    className += 'metric-good';
                }
                break;
        }
        
        return className;
    }

    toggleMonitor() {
        const content = this.monitorElement.querySelector('.monitor-content');
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }

    // Generate detailed performance report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.getCurrentMetrics(),
            loadTime: this.metrics.loadTime,
            fps: {
                average: this.calculateAverage(this.metrics.fps),
                min: this.calculateMin(this.metrics.fps),
                max: this.calculateMax(this.metrics.fps),
                samples: this.metrics.fps.length
            },
            memory: {
                average: this.calculateAverage(this.metrics.memory),
                min: this.calculateMin(this.metrics.memory),
                max: this.calculateMax(this.metrics.memory),
                current: this.metrics.memory[this.metrics.memory.length - 1]
            },
            api: {
                totalCalls: this.metrics.apiCalls.length,
                averageTime: this.calculateAverage(this.metrics.apiCalls.map(c => ({ value: c.duration }))),
                slowestCalls: this.metrics.apiCalls
                    .sort((a, b) => b.duration - a.duration)
                    .slice(0, 5)
            },
            errors: {
                total: this.metrics.errors.length,
                byType: this.groupErrors(),
                recent: this.metrics.errors.slice(-10)
            },
            customMetrics: this.summarizeCustomMetrics()
        };

        return report;
    }

    showDetailedReport() {
        const report = this.generateReport();
        
        const modal = document.createElement('div');
        modal.className = 'performance-report-modal modal-overlay active';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Performance Report</h3>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="report-section">
                        <h4>Summary</h4>
                        <div class="report-grid">
                            <div class="report-item">
                                <span>Current FPS:</span>
                                <strong>${report.summary.fps}</strong>
                            </div>
                            <div class="report-item">
                                <span>Memory Usage:</span>
                                <strong>${report.summary.memory} MB</strong>
                            </div>
                            <div class="report-item">
                                <span>Avg API Time:</span>
                                <strong>${report.summary.avgResponseTime} ms</strong>
                            </div>
                            <div class="report-item">
                                <span>Error Rate:</span>
                                <strong>${report.summary.errorRate}/min</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="report-section">
                        <h4>Load Performance</h4>
                        <div class="report-grid">
                            <div class="report-item">
                                <span>Total Load Time:</span>
                                <strong>${Math.round(report.loadTime.total || 0)} ms</strong>
                            </div>
                            <div class="report-item">
                                <span>First Paint:</span>
                                <strong>${Math.round(report.loadTime.firstPaint || 0)} ms</strong>
                            </div>
                            <div class="report-item">
                                <span>DOM Ready:</span>
                                <strong>${Math.round(report.loadTime.dom || 0)} ms</strong>
                            </div>
                            <div class="report-item">
                                <span>Network:</span>
                                <strong>${Math.round((report.loadTime.response || 0) + (report.loadTime.request || 0))} ms</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="report-section">
                        <h4>FPS Analysis</h4>
                        <div class="report-stats">
                            <span>Average: ${report.fps.average.toFixed(1)}</span>
                            <span>Min: ${report.fps.min}</span>
                            <span>Max: ${report.fps.max}</span>
                            <span>Samples: ${report.fps.samples}</span>
                        </div>
                    </div>
                    
                    <div class="report-section">
                        <h4>Memory Analysis</h4>
                        <div class="report-stats">
                            <span>Average: ${report.memory.average.toFixed(1)} MB</span>
                            <span>Min: ${report.memory.min} MB</span>
                            <span>Max: ${report.memory.max} MB</span>
                            <span>Heap Limit: ${report.memory.current?.limit || 'N/A'} MB</span>
                        </div>
                    </div>
                    
                    ${report.api.slowestCalls.length > 0 ? `
                        <div class="report-section">
                            <h4>Slowest API Calls</h4>
                            <div class="report-list">
                                ${report.api.slowestCalls.map(call => `
                                    <div class="report-list-item">
                                        <span>${new URL(call.url).pathname}</span>
                                        <strong>${Math.round(call.duration)} ms</strong>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${report.errors.total > 0 ? `
                        <div class="report-section">
                            <h4>Error Summary</h4>
                            <div class="report-stats">
                                <span>Total Errors: ${report.errors.total}</span>
                                ${Object.entries(report.errors.byType).map(([type, count]) => 
                                    `<span>${type}: ${count}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="performanceMonitor.exportReport()">
                        <i class="fas fa-download"></i> Export Report
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    exportReport() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    // Utility functions
    calculateAverage(dataPoints) {
        if (dataPoints.length === 0) return 0;
        const sum = dataPoints.reduce((acc, point) => acc + point.value, 0);
        return sum / dataPoints.length;
    }

    calculateMin(dataPoints) {
        if (dataPoints.length === 0) return 0;
        return Math.min(...dataPoints.map(point => point.value));
    }

    calculateMax(dataPoints) {
        if (dataPoints.length === 0) return 0;
        return Math.max(...dataPoints.map(point => point.value));
    }

    groupErrors() {
        const groups = {};
        this.metrics.errors.forEach(error => {
            groups[error.type] = (groups[error.type] || 0) + 1;
        });
        return groups;
    }

    summarizeCustomMetrics() {
        const summary = {};
        Object.entries(this.metrics.customMetrics).forEach(([name, values]) => {
            summary[name] = {
                average: this.calculateAverage(values),
                min: this.calculateMin(values),
                max: this.calculateMax(values),
                count: values.length
            };
        });
        return summary;
    }

    // Clear metrics
    clearMetrics() {
        this.metrics = {
            fps: [],
            memory: [],
            loadTime: this.metrics.loadTime, // Keep load time
            apiCalls: [],
            errors: [],
            customMetrics: {}
        };
        
        this.updateMonitorUI();
    }

    // Observer pattern
    subscribe(callback) {
        this.observers.add(callback);
    }

    unsubscribe(callback) {
        this.observers.delete(callback);
    }

    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            callback(event, data);
        });
    }

    // Enable/disable monitoring
    enable() {
        this.config.enabled = true;
        this.startMonitoring();
    }

    disable() {
        this.config.enabled = false;
        this.stopMonitoring();
    }
}

// Initialize performance monitor
let performanceMonitor;
document.addEventListener('DOMContentLoaded', () => {
    performanceMonitor = new PerformanceMonitor();
    
    // Expose to global scope
    window.performanceMonitor = performanceMonitor;
    
    // Subscribe to critical events
    performanceMonitor.subscribe((event, data) => {
        if (event === 'performance-critical' && window.notificationCenter) {
            window.notificationCenter.notify({
                type: 'error',
                title: 'Performance Alert',
                message: `Critical ${data.type} issue detected: ${data.value} (threshold: ${data.threshold})`,
                important: true
            });
        }
    });
}); 