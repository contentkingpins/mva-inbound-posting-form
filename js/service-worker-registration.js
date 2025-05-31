/**
 * Service Worker Registration
 * Handles registration, updates, and offline status
 */

class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.updateFound = false;
        this.isOnline = navigator.onLine;
        
        this.init();
    }

    async init() {
        if (!this.checkSupport()) {
            console.log('Service Workers not supported');
            return;
        }

        await this.register();
        this.setupEventListeners();
        this.checkForUpdates();
    }

    checkSupport() {
        return 'serviceWorker' in navigator;
    }

    async register() {
        try {
            this.registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });

            console.log('Service Worker registered:', this.registration);

            // Check the current state
            if (this.registration.installing) {
                this.trackInstallation(this.registration.installing);
            } else if (this.registration.waiting) {
                this.notifyUpdateAvailable(this.registration.waiting);
            } else if (this.registration.active) {
                console.log('Service Worker active');
            }

            // Listen for updates
            this.registration.addEventListener('updatefound', () => {
                this.trackInstallation(this.registration.installing);
            });

        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    trackInstallation(worker) {
        console.log('Service Worker installing...');
        
        worker.addEventListener('statechange', () => {
            console.log('Service Worker state:', worker.state);
            
            if (worker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    // New update available
                    this.notifyUpdateAvailable(worker);
                } else {
                    // First install
                    this.notifyInstallComplete();
                }
            }
        });
    }

    notifyUpdateAvailable(worker) {
        this.updateFound = true;
        
        // Show update notification
        const updateBanner = document.createElement('div');
        updateBanner.className = 'sw-update-banner';
        updateBanner.innerHTML = `
            <div class="sw-update-content">
                <i class="fas fa-sync-alt"></i>
                <span>A new version is available!</span>
                <button class="sw-update-btn" onclick="serviceWorkerManager.applyUpdate()">
                    Update Now
                </button>
                <button class="sw-dismiss-btn" onclick="this.closest('.sw-update-banner').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(updateBanner);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (updateBanner.parentNode) {
                updateBanner.classList.add('fade-out');
                setTimeout(() => updateBanner.remove(), 300);
            }
        }, 10000);
    }

    notifyInstallComplete() {
        if (window.notificationCenter) {
            window.notificationCenter.notify({
                type: 'success',
                title: 'App Ready for Offline Use',
                message: 'The app has been cached and will work offline.',
                icon: 'fas fa-wifi'
            });
        }
    }

    async applyUpdate() {
        if (!this.registration.waiting) return;
        
        // Tell the waiting service worker to activate
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload once the new service worker is active
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }

    setupEventListeners() {
        // Online/offline status
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            this.handleServiceWorkerMessage(event.data);
        });

        // Handle visibility change for update checks
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkForUpdates();
            }
        });
    }

    handleOnline() {
        this.isOnline = true;
        this.removeOfflineBanner();
        
        if (window.notificationCenter) {
            window.notificationCenter.notify({
                type: 'success',
                title: 'Back Online',
                message: 'Your connection has been restored.',
                autoHide: true,
                autoHideDelay: 3000
            });
        }
        
        // Trigger background sync
        if (this.registration && 'sync' in this.registration) {
            this.registration.sync.register('sync-offline-data');
        }
    }

    handleOffline() {
        this.isOnline = false;
        this.showOfflineBanner();
        
        if (window.notificationCenter) {
            window.notificationCenter.notify({
                type: 'warning',
                title: 'You\'re Offline',
                message: 'Some features may be limited.',
                persistent: true
            });
        }
    }

    showOfflineBanner() {
        if (document.getElementById('offline-banner')) return;
        
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.className = 'offline-banner';
        banner.innerHTML = `
            <i class="fas fa-wifi-slash"></i>
            <span>You're currently offline. Changes will sync when connection is restored.</span>
        `;
        
        document.body.appendChild(banner);
    }

    removeOfflineBanner() {
        const banner = document.getElementById('offline-banner');
        if (banner) {
            banner.classList.add('fade-out');
            setTimeout(() => banner.remove(), 300);
        }
    }

    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'sync-success':
                this.handleSyncSuccess(data.data);
                break;
            case 'cache-updated':
                console.log('Cache updated:', data.data);
                break;
            case 'performance-data':
                this.handlePerformanceData(data.data);
                break;
        }
    }

    handleSyncSuccess(data) {
        if (window.notificationCenter) {
            window.notificationCenter.notify({
                type: 'success',
                title: 'Data Synced',
                message: 'Your offline changes have been saved.',
                actions: [{
                    id: 'view',
                    label: 'View',
                    handler: () => console.log('View synced data:', data)
                }]
            });
        }
    }

    handlePerformanceData(data) {
        if (window.performanceMonitor) {
            window.performanceMonitor.logMetric('sw-cache-hit-rate', data.cacheHitRate);
            window.performanceMonitor.logMetric('sw-cache-size', data.cacheSize);
        }
    }

    async checkForUpdates() {
        if (this.registration) {
            try {
                await this.registration.update();
            } catch (error) {
                console.error('Update check failed:', error);
            }
        }
    }

    // Cache management methods
    async precacheUrls(urls) {
        if (!navigator.serviceWorker.controller) return;
        
        navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_URLS',
            urls: urls
        });
    }

    async clearCache() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('All caches cleared');
        }
    }

    async getCacheSize() {
        if (!navigator.storage || !navigator.storage.estimate) {
            return null;
        }
        
        const estimate = await navigator.storage.estimate();
        return {
            usage: estimate.usage,
            quota: estimate.quota,
            percentage: (estimate.usage / estimate.quota) * 100
        };
    }

    // Offline queue management
    async queueOfflineRequest(request) {
        const db = await this.openOfflineDB();
        const tx = db.transaction('offline-queue', 'readwrite');
        const store = tx.objectStore('offline-queue');
        
        await store.add({
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: request.body,
            timestamp: Date.now()
        });
    }

    async openOfflineDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('mva-crm-offline', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('offline-queue')) {
                    db.createObjectStore('offline-queue', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                }
            };
        });
    }

    // Get service worker status
    getStatus() {
        return {
            supported: this.checkSupport(),
            registered: !!this.registration,
            active: !!(this.registration && this.registration.active),
            updateAvailable: this.updateFound,
            online: this.isOnline,
            scope: this.registration ? this.registration.scope : null
        };
    }
}

// Initialize service worker manager
let serviceWorkerManager;
if ('serviceWorker' in navigator) {
    document.addEventListener('DOMContentLoaded', () => {
        serviceWorkerManager = new ServiceWorkerManager();
        window.serviceWorkerManager = serviceWorkerManager;
    });
}

// Add styles for notifications
const style = document.createElement('style');
style.textContent = `
    .sw-update-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: var(--primary);
        color: white;
        padding: 12px;
        z-index: 10000;
        animation: slideDown 0.3s ease-out;
    }
    
    .sw-update-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 12px;
        justify-content: center;
    }
    
    .sw-update-btn {
        background: white;
        color: var(--primary);
        border: none;
        padding: 6px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .sw-update-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .sw-dismiss-btn {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        margin-left: auto;
    }
    
    .offline-banner {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--warning);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideUp 0.3s ease-out;
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(-100%);
        }
        to {
            transform: translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(100%);
        }
        to {
            transform: translateX(-50%) translateY(0);
        }
    }
    
    .fade-out {
        animation: fadeOut 0.3s ease-out forwards;
    }
    
    @keyframes fadeOut {
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
    }
`;
document.head.appendChild(style); 