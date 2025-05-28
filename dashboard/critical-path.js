// Critical Path Optimization - Load this first!
(function() {
    'use strict';
    
    // Start performance timing
    window.appStartTime = Date.now();
    
    // Approved fallback configuration (no secrets)
    const FALLBACK_CONFIG = {
        userPoolId: 'us-east-1_lhc964tLD',
        clientId: '5t6mane4fnvineksoqb4ta0iu1',
        apiUrl: 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod'
    };
    
    // Graceful config loading with fallback (approved by backend team)
    async function loadConfigGracefully() {
        try {
            const response = await fetch('/config.json');
            if (response.ok) {
                const config = await response.json();
                window.preloadedConfig = { ...FALLBACK_CONFIG, ...config };
                console.log('External config loaded successfully');
            } else {
                window.preloadedConfig = FALLBACK_CONFIG;
                console.log('Using fallback config - external config not available');
            }
        } catch (error) {
            // Fail silently with fallback - no blocking errors!
            window.preloadedConfig = FALLBACK_CONFIG;
            console.log('Using fallback config - external config failed to load');
        }
    }
    
    // Load config without blocking app initialization
    loadConfigGracefully();
    
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