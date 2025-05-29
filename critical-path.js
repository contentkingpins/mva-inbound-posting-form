// Critical Path Optimization - Load this first!
(function() {
    'use strict';
    
    // Start performance timing
    window.appStartTime = Date.now();
    
    // NOTE: Configuration is now injected at build time via scripts/inject-config.js
    // No more external config loading needed - window.APP_CONFIG is available immediately!
    
    console.log('🚀 Critical path loading - using build-time injected configuration');
    
    // MIGRATION: Fix old user data format (username → email)
    (function migrateAuthData() {
        const currentUser = localStorage.getItem('user');
        if (currentUser) {
            try {
                const user = JSON.parse(currentUser);
                // Check if user has old format (username but no email)
                if (user.username && !user.email) {
                    console.log('📦 Migrating old auth format...');
                    const migratedUser = {
                        ...user,
                        email: user.username  // username was actually the email
                    };
                    delete migratedUser.username;
                    localStorage.setItem('user', JSON.stringify(migratedUser));
                    console.log('✅ Auth data migrated to new format');
                }
            } catch (error) {
                console.error('Migration error:', error);
                // Clear corrupted data
                localStorage.removeItem('user');
                localStorage.removeItem('auth_token');
            }
        }
    })();
    
    // Enhanced auth check with proper JWT validation
    const checkAuth = () => {
        const token = localStorage.getItem('auth_token');
            const path = window.location.pathname;
        
        // Define auth pages that don't need protection
            const isAuthPage = path.includes('login') || 
                             path.includes('verify') || 
                             path.includes('forgot') || 
                             path.includes('reset') ||
                             path.includes('signup');
            
        // If we're on an auth page, don't redirect
        if (isAuthPage) {
            console.log('On auth page, skipping auth check');
            return;
        }
        
        // If no token, redirect to login
        if (!token) {
                console.log('No auth token found, redirecting to login');
                window.location.href = 'login.html';
            return;
        }
        
        // Validate JWT token structure and expiration
        try {
            // Parse JWT token
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                throw new Error('Invalid token format');
            }
            
            // Decode payload
            const payload = JSON.parse(atob(tokenParts[1]));
            
            // Check expiration with 5-minute buffer for clock skew
            const now = Math.floor(Date.now() / 1000);
            const clockSkewBuffer = 300; // 5 minutes
            
            if (payload.exp && (payload.exp + clockSkewBuffer) < now) {
                throw new Error('Token expired');
            }
            
            // Check if token was issued in the future (clock issue)
            if (payload.iat && payload.iat > (now + clockSkewBuffer)) {
                console.warn('Token issued in future - possible clock/timezone issue');
                console.warn('Please ensure your system clock is synchronized');
            }
            
            console.log('Token validation passed');
            
        } catch (error) {
            console.error('Token validation failed:', error.message);
            
            // Clear invalid token
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('idToken');
            localStorage.removeItem('refreshToken');
            
            // Redirect to login
            window.location.href = 'login.html';
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