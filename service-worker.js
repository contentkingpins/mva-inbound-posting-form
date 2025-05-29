// Service Worker for Claim Connectors CRM
const CACHE_NAME = 'claim-connectors-v1.0.3';
const urlsToCache = [
  './',                    // Dashboard index
  './styles.css',          // Dashboard styles
  './app.js',             // Dashboard app
  './critical-path.js',   // Critical path script
  './js/app-config.js',   // AppConfig module (relative to dashboard)
  './admin.css'           // Admin styles
];

// Install event - cache initial resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add with error handling
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('claim-connectors-')) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests - always fetch fresh
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('execute-api.amazonaws.com')) {
    return;
  }
  
  // Skip config.json requests since we no longer use them
  if (event.request.url.includes('config.json')) {
    console.log('Skipping config.json request - using build-time injection instead');
    return;
  }
  
  event.respondWith(
    // Try network first
    fetch(event.request)
      .then(response => {
        // Clone the response
        const responseToCache = response.clone();
        
        // Update cache with fresh response
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // Return offline page if available
            return caches.match('/offline.html');
          });
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
}); 