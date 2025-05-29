// Critical Path Optimization - Load this first!
(function() {
    'use strict';
    
    // Start performance timing
    window.appStartTime = Date.now();
    
    // NOTE: Configuration is now injected at build time via scripts/inject-config.js
    // No more external config loading needed - window.APP_CONFIG is available immediately!
    
    console.log('🚀 Critical path loading - using build-time injected configuration');
    
    // Check if user is authenticated before the main app loads
    // This prevents loading unnecessary resources for unauthenticated users
    (function checkAuth() {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('user');
        
        // If no token or user data, redirect to login immediately
        if (!token || !user) {
            console.log('No authentication found, redirecting to login...');
            if (!window.location.pathname.includes('login')) {
                window.location.href = 'login.html';
            }
            return;
        }
        
        // Verify the user object is valid
        try {
            const userObj = JSON.parse(user);
            if (!userObj || !userObj.email) {
                console.log('Invalid user data, redirecting to login...');
                if (!window.location.pathname.includes('login')) {
                    window.location.href = 'login.html';
                }
                return;
            }
        } catch (e) {
            console.log('Failed to parse user data, redirecting to login...');
            if (!window.location.pathname.includes('login')) {
                window.location.href = 'login.html';
            }
            return;
        }
        
        console.log('User authenticated, proceeding with app load');
    })();
    
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
            navigator.serviceWorker.register('./service-worker.js')
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