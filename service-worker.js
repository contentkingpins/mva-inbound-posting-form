/**
 * Advanced Service Worker for Claim Connectors CRM
 * Features: Smart caching, offline support, background sync, performance optimization
 */

const CACHE_NAME = 'claim-connectors-v2.0.0';
const CACHE_STATIC = 'claim-connectors-static-v2.0.0';
const CACHE_DYNAMIC = 'claim-connectors-dynamic-v2.0.0';
const CACHE_API = 'claim-connectors-api-v2.0.0';
const CACHE_IMAGES = 'claim-connectors-images-v2.0.0';

// Cache configuration
const CACHE_CONFIG = {
    staticMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    dynamicMaxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    apiMaxAge: 5 * 60 * 1000,                 // 5 minutes
    imageMaxAge: 30 * 24 * 60 * 60 * 1000,   // 30 days
    maxEntries: {
        static: 100,
        dynamic: 50,
        api: 20,
        images: 30
    }
};

// Static assets to precache
const STATIC_ASSETS = [
    './',
    './index.html',
    './login.html',
    './styles.css',
    './admin.css',
    './critical-path.js',
    './js/app-config.js',
    './js/modules/utils.js',
    './js/modules/pagination.js',
    './js/modules/charts.js',
    './js/modules/search.js',
    './app.js',
    './images/claim_connectors_blue_transparent_150.png',
    './images/claim_connectors_blue_transparent_300.png',
    // External CDN resources
    'https://cdn.jsdelivr.net/npm/amazon-cognito-identity-js@6.3.1/dist/amazon-cognito-identity.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css',
    'https://cdn.jsdelivr.net/npm/countup.js@2.6.2/dist/countUp.umd.js'
];

// Offline fallback page
const OFFLINE_PAGE = '/offline.html';

/**
 * Install Event - Precache static assets
 */
self.addEventListener('install', event => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(CACHE_STATIC).then(cache => {
                console.log('📦 Caching static assets...');
                return Promise.all(
                    STATIC_ASSETS.map(url => {
                        return cache.add(url).catch(err => {
                            console.warn(`⚠️ Failed to cache ${url}:`, err);
                        });
                    })
                );
            }),
            // Create offline page
            createOfflinePage()
        ]).then(() => {
            console.log('✅ Service Worker installed successfully');
            self.skipWaiting(); // Activate immediately
        })
    );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            cleanupOldCaches(),
            // Take control of all clients
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker activated');
        })
    );
});

/**
 * Fetch Event - Smart caching strategies
 */
self.addEventListener('fetch', event => {
    const { request } = event;
    const { url, method } = request;
    
    // Skip non-GET requests
    if (method !== 'GET') return;
    
    // Determine caching strategy based on URL
    if (isAPIRequest(url)) {
        event.respondWith(apiCacheFirst(request));
    } else if (isImageRequest(url)) {
        event.respondWith(imageCacheFirst(request));
    } else if (isStaticAsset(url)) {
        event.respondWith(staticCacheFirst(request));
    } else {
        event.respondWith(dynamicCacheFirst(request));
    }
});

/**
 * Background Sync for offline actions
 */
self.addEventListener('sync', event => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'lead-updates') {
        event.waitUntil(syncLeadUpdates());
    }
});

/**
 * Push notifications
 */
self.addEventListener('push', event => {
    console.log('📬 Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New lead received!',
        icon: './images/claim_connectors_blue_transparent_150.png',
        badge: './images/claim_connectors_blue_transparent_150.png',
        tag: 'lead-notification',
        requireInteraction: true
    };
    
    event.waitUntil(
        self.registration.showNotification('Claim Connectors CRM', options)
    );
});

/**
 * Message handling from clients
 */
self.addEventListener('message', event => {
    const { data } = event;
    
    switch (data.type) {
        case 'skipWaiting':
            self.skipWaiting();
            break;
        case 'clearCache':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
        case 'getCacheStats':
            getCacheStats().then(stats => {
                event.ports[0].postMessage(stats);
            });
            break;
        default:
            console.log('Unknown message:', data);
    }
});

// ==================== CACHING STRATEGIES ====================

/**
 * API Cache First Strategy
 * Try cache first, fallback to network, cache successful responses
 */
async function apiCacheFirst(request) {
    try {
        const cache = await caches.open(CACHE_API);
        const cached = await cache.match(request);
        
        // Return cached if fresh enough
        if (cached && isFresh(cached, CACHE_CONFIG.apiMaxAge)) {
            updateCacheInBackground(request, cache);
            return cached;
        }
        
        // Fetch from network
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Clone and cache the response
            const responseToCache = networkResponse.clone();
            await cache.put(request, responseToCache);
            await cleanupCache(cache, CACHE_CONFIG.maxEntries.api);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('API request failed:', error);
        
        // Try to return stale cache
        const cache = await caches.open(CACHE_API);
        const stale = await cache.match(request);
        
        if (stale) {
            return stale;
        }
        
        // Return offline response
        return new Response(JSON.stringify({
            error: 'Network unavailable',
            offline: true
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Image Cache First Strategy
 * Cache first with long expiry
 */
async function imageCacheFirst(request) {
    try {
        const cache = await caches.open(CACHE_IMAGES);
        const cached = await cache.match(request);
        
        if (cached) {
            return cached;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            await cache.put(request, responseToCache);
            await cleanupCache(cache, CACHE_CONFIG.maxEntries.images);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Image request failed:', error);
        return new Response('', { status: 404 });
    }
}

/**
 * Static Asset Cache First Strategy
 * Long-lived cache with network fallback
 */
async function staticCacheFirst(request) {
    try {
        const cache = await caches.open(CACHE_STATIC);
        const cached = await cache.match(request);
        
        if (cached) {
            // Update in background if old
            if (!isFresh(cached, CACHE_CONFIG.staticMaxAge)) {
                updateCacheInBackground(request, cache);
            }
            return cached;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            await cache.put(request, responseToCache);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Static asset request failed:', error);
        
        // Try fallback from any cache
        const allCaches = await caches.keys();
        for (const cacheName of allCaches) {
            const cache = await caches.open(cacheName);
            const fallback = await cache.match(request);
            if (fallback) return fallback;
        }
        
        return new Response('Asset not available offline', { status: 404 });
    }
}

/**
 * Dynamic Cache First Strategy
 * For HTML pages and dynamic content
 */
async function dynamicCacheFirst(request) {
    try {
        const cache = await caches.open(CACHE_DYNAMIC);
        
        // Always try network first for HTML
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            await cache.put(request, responseToCache);
            await cleanupCache(cache, CACHE_CONFIG.maxEntries.dynamic);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Dynamic request failed:', error);
        
        // Fallback to cache
        const cache = await caches.open(CACHE_DYNAMIC);
        const cached = await cache.match(request);
        
        if (cached) {
            return cached;
        }
        
        // Return offline page
        return caches.match(OFFLINE_PAGE);
    }
}

// ==================== UTILITY FUNCTIONS ====================

function isAPIRequest(url) {
    return url.includes('execute-api.amazonaws.com') || 
           url.includes('/api/') ||
           url.includes('/leads') ||
           url.includes('/export');
}

function isImageRequest(url) {
    return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url) ||
           url.includes('/images/');
}

function isStaticAsset(url) {
    return /\.(css|js|woff|woff2|ttf|eot)$/i.test(url) ||
           url.includes('/js/') ||
           url.includes('/css/') ||
           url.includes('cdn.jsdelivr.net') ||
           url.includes('cdnjs.cloudflare.com');
}

function isFresh(response, maxAge) {
    const dateHeader = response.headers.get('date');
    if (!dateHeader) return false;
    
    const date = new Date(dateHeader);
    return (Date.now() - date.getTime()) < maxAge;
}

async function updateCacheInBackground(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            await cache.put(request, response);
        }
    } catch (error) {
        console.log('Background update failed:', error);
    }
}

async function cleanupCache(cache, maxEntries) {
    const keys = await cache.keys();
    
    if (keys.length > maxEntries) {
        // Remove oldest entries
        const entriesToDelete = keys.slice(0, keys.length - maxEntries);
        await Promise.all(entriesToDelete.map(key => cache.delete(key)));
    }
}

async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const validCaches = [CACHE_NAME, CACHE_STATIC, CACHE_DYNAMIC, CACHE_API, CACHE_IMAGES];
    
    return Promise.all(
        cacheNames.map(cacheName => {
            if (!validCaches.includes(cacheName) && 
                cacheName.startsWith('claim-connectors-')) {
                console.log('🗑️ Deleting old cache:', cacheName);
                return caches.delete(cacheName);
            }
        })
    );
}

async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

async function getCacheStats() {
    const cacheNames = await caches.keys();
    const stats = {};
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        stats[cacheName] = keys.length;
    }
    
    return stats;
}

async function createOfflinePage() {
    const offlineHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Offline - Claim Connectors CRM</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                }
                .offline-container {
                    max-width: 400px;
                    padding: 2rem;
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                h1 { margin: 0 0 1rem 0; }
                p { margin: 0 0 2rem 0; opacity: 0.9; }
                .retry-btn {
                    background: rgba(255,255,255,0.2);
                    border: 2px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                }
                .retry-btn:hover {
                    background: rgba(255,255,255,0.3);
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📡</div>
                <h1>You're Offline</h1>
                <p>No internet connection available. Some features may not work as expected.</p>
                <button class="retry-btn" onclick="window.location.reload()">
                    Try Again
                </button>
            </div>
        </body>
        </html>
    `;
    
    const cache = await caches.open(CACHE_STATIC);
    await cache.put(OFFLINE_PAGE, new Response(offlineHTML, {
        headers: { 'Content-Type': 'text/html' }
    }));
}

async function syncLeadUpdates() {
    // Implement background sync for offline lead updates
    console.log('🔄 Syncing offline lead updates...');
    
    // This would sync any pending lead updates that were stored
    // in IndexedDB while offline
    
    return Promise.resolve();
}

console.log('🚀 Advanced Service Worker loaded'); 