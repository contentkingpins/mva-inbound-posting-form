// Critical Path Optimization - Load this first!
(function() {
    'use strict';
    
    // Start performance timing
    window.appStartTime = Date.now();
    
    // NOTE: Configuration is now injected at build time via scripts/inject-config.js
    // No more external config loading needed - window.APP_CONFIG is available immediately!
    
    console.log('🚀 Critical path loading - using build-time injected configuration');

    // Check if user has valid session
    const checkAuth = () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            // Only redirect if we're on a protected page (not login/auth pages)
            const path = window.location.pathname;
            const isAuthPage = path.includes('login') || 
                             path.includes('verify') || 
                             path.includes('forgot') || 
                             path.includes('reset') ||
                             path.includes('signup');
            
            if (!isAuthPage) {
                console.log('No auth token found, redirecting to login');
                window.location.href = '/login.html';
            }
        }
    };

    // Run auth check
    checkAuth();

    // Optimize loading
    window.addEventListener('load', () => {
        // Report load time
        const loadTime = Date.now() - window.appStartTime;
        console.log(`Initial load completed in ${loadTime}ms`);
        
        // Report configuration source
        if (window.APP_CONFIG) {
            console.log('✅ Using build-time injected configuration - no external loading delays!');
        } else {
            console.warn('⚠️ Build-time config injection failed - AppConfig module will provide fallback');
        }
        
        // Send performance data if needed
        if (window.ga) {
            ga('send', 'timing', 'JS Dependencies', 'load', loadTime);
        }
    });

    // Register Service Worker for intelligent caching
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/dashboard/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registered');
                    
                    // Check for updates on page load
                    registration.update();
                    
                    // Listen for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New content available, show update prompt
                                console.log('New content available! Refresh to update.');
                                
                                // Optional: Show a toast/banner to user
                                if (window.showUpdateNotification) {
                                    window.showUpdateNotification();
                                }
                            }
                        });
                    });
                })
                .catch(err => console.log('ServiceWorker registration failed:', err));
        });
    }
})(); 