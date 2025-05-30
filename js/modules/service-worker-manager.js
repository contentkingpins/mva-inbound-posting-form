/**
 * Service Worker Manager Module
 * Handles service worker registration, updates, and cache management
 */

class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.isOnline = navigator.onLine;
        this.updateAvailable = false;
        
        this.init();
    }
    
    async init() {
        // Check if service workers are supported
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Workers not supported');
            return;
        }
        
        try {
            // Register service worker
            await this.registerServiceWorker();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup update checking
            this.setupUpdateChecking();
            
            console.log('✅ Service Worker Manager initialized');
        } catch (error) {
            console.error('❌ Service Worker Manager initialization failed:', error);
        }
    }
    
    async registerServiceWorker() {
        try {
            this.registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            
            console.log('✅ Service Worker registered:', this.registration.scope);
            
            // Check for updates
            this.registration.addEventListener('updatefound', () => {
                this.handleUpdateFound();
            });
            
            return this.registration;
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showConnectionStatus('online');
            console.log('🌐 Back online');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showConnectionStatus('offline');
            console.log('📡 Gone offline');
        });
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
            this.handleServiceWorkerMessage(event);
        });
        
        // Listen for service worker controller changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔄 Service Worker controller changed');
            // Reload page to get latest content
            window.location.reload();
        });
    }
    
    setupUpdateChecking() {
        // Check for updates every 30 minutes
        setInterval(() => {
            this.checkForUpdates();
        }, 30 * 60 * 1000);
        
        // Also check when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkForUpdates();
            }
        });
    }
    
    async checkForUpdates() {
        if (!this.registration) return;
        
        try {
            await this.registration.update();
        } catch (error) {
            console.error('Update check failed:', error);
        }
    }
    
    handleUpdateFound() {
        const newWorker = this.registration.installing;
        console.log('🔄 New Service Worker version found');
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    // New update available
                    this.updateAvailable = true;
                    this.showUpdateNotification();
                } else {
                    // First install
                    console.log('✅ Service Worker installed for the first time');
                }
            }
        });
    }
    
    showUpdateNotification() {
        // Create update notification
        const notification = document.createElement('div');
        notification.id = 'sw-update-notification';
        notification.className = 'sw-update-notification';
        notification.innerHTML = `
            <div class="sw-update-content">
                <span class="sw-update-icon">🚀</span>
                <div class="sw-update-text">
                    <strong>Update Available!</strong>
                    <p>A new version of the app is ready.</p>
                </div>
                <div class="sw-update-actions">
                    <button class="sw-update-btn" onclick="serviceWorkerManager.applyUpdate()">
                        Update Now
                    </button>
                    <button class="sw-update-dismiss" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Later
                    </button>
                </div>
            </div>
        `;
        
        // Add styles if not already present
        this.addUpdateNotificationStyles();
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
    }
    
    addUpdateNotificationStyles() {
        if (document.getElementById('sw-update-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'sw-update-styles';
        style.textContent = `
            .sw-update-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                border: 1px solid #e1e5e9;
                z-index: 10000;
                max-width: 400px;
                transform: translateX(450px);
                transition: transform 0.3s ease-out;
            }
            
            .sw-update-notification.show {
                transform: translateX(0);
            }
            
            .sw-update-content {
                padding: 20px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            
            .sw-update-icon {
                font-size: 24px;
                margin-top: 2px;
            }
            
            .sw-update-text {
                flex: 1;
            }
            
            .sw-update-text strong {
                color: #1a202c;
                font-size: 16px;
                margin-bottom: 4px;
                display: block;
            }
            
            .sw-update-text p {
                color: #4a5568;
                font-size: 14px;
                margin: 0;
            }
            
            .sw-update-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-left: 12px;
            }
            
            .sw-update-btn {
                background: #4299e1;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .sw-update-btn:hover {
                background: #3182ce;
            }
            
            .sw-update-dismiss {
                background: transparent;
                color: #718096;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: color 0.2s;
            }
            
            .sw-update-dismiss:hover {
                color: #4a5568;
            }
            
            .connection-status {
                position: fixed;
                bottom: 20px;
                left: 20px;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
                z-index: 1000;
                transition: all 0.3s ease;
                transform: translateY(100px);
            }
            
            .connection-status.show {
                transform: translateY(0);
            }
            
            .connection-status.online {
                background: #38a169;
                color: white;
            }
            
            .connection-status.offline {
                background: #e53e3e;
                color: white;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    showConnectionStatus(status) {
        // Remove existing status
        const existing = document.querySelector('.connection-status');
        if (existing) {
            existing.remove();
        }
        
        // Create new status indicator
        const statusEl = document.createElement('div');
        statusEl.className = `connection-status ${status}`;
        statusEl.textContent = status === 'online' ? '🌐 Back Online' : '📡 You\'re Offline';
        
        document.body.appendChild(statusEl);
        
        // Show and auto-hide
        setTimeout(() => statusEl.classList.add('show'), 100);
        setTimeout(() => {
            statusEl.classList.remove('show');
            setTimeout(() => statusEl.remove(), 300);
        }, status === 'online' ? 3000 : 5000);
    }
    
    async applyUpdate() {
        if (!this.registration || !this.updateAvailable) return;
        
        try {
            // Tell the waiting service worker to skip waiting
            if (this.registration.waiting) {
                this.registration.waiting.postMessage({ type: 'skipWaiting' });
            }
            
            // Remove update notification
            const notification = document.getElementById('sw-update-notification');
            if (notification) {
                notification.remove();
            }
            
            // Show updating message
            this.showUpdatingMessage();
        } catch (error) {
            console.error('Failed to apply update:', error);
        }
    }
    
    showUpdatingMessage() {
        const message = document.createElement('div');
        message.className = 'updating-message';
        message.innerHTML = `
            <div class="updating-content">
                <div class="updating-spinner"></div>
                <span>Updating app...</span>
            </div>
        `;
        
        // Add spinner styles
        if (!document.getElementById('updating-styles')) {
            const style = document.createElement('style');
            style.id = 'updating-styles';
            style.textContent = `
                .updating-message {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 24px 32px;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                    z-index: 10001;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .updating-spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid #e1e5e9;
                    border-top: 2px solid #4299e1;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(message);
    }
    
    handleServiceWorkerMessage(event) {
        const { data } = event;
        
        switch (data.type) {
            case 'cacheUpdated':
                console.log('Cache updated:', data.url);
                break;
            case 'offlineReady':
                console.log('App is ready for offline use');
                break;
            default:
                console.log('Service Worker message:', data);
        }
    }
    
    // Cache management methods
    async getCacheStats() {
        if (!this.registration || !this.registration.active) return null;
        
        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
                resolve(event.data);
            };
            
            this.registration.active.postMessage(
                { type: 'getCacheStats' },
                [messageChannel.port2]
            );
        });
    }
    
    async clearAllCaches() {
        if (!this.registration || !this.registration.active) return false;
        
        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
                resolve(event.data.success);
            };
            
            this.registration.active.postMessage(
                { type: 'clearCache' },
                [messageChannel.port2]
            );
        });
    }
    
    // Utility methods
    isOffline() {
        return !this.isOnline;
    }
    
    isUpdateAvailable() {
        return this.updateAvailable;
    }
    
    getRegistration() {
        return this.registration;
    }
}

// Create global instance
window.serviceWorkerManager = new ServiceWorkerManager();

// Export for module use
window.ServiceWorkerManager = ServiceWorkerManager; 