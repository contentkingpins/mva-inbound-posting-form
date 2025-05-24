// Critical Path Optimization - Load this first!
(function() {
    'use strict';
    
    // Start performance timing
    window.appStartTime = Date.now();
    
    // Prefetch critical resources
    const criticalResources = [
        '/config.json',
        '/app.js',
        'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/leads'
    ];
    
    // Prefetch config immediately
    fetch('/config.json')
        .then(r => r.json())
        .then(config => {
            window.preloadedConfig = config;
            console.log('Config preloaded');
        })
        .catch(e => console.warn('Config preload failed:', e));
    
    // Check if user has valid session
    const checkAuth = () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            // Redirect to login immediately if no token
            if (!window.location.pathname.includes('login')) {
                window.location.href = '/login.html';
            }
        }
    };
    
    // Run auth check
    checkAuth();
    
    // Optimize Cognito loading
    window.addEventListener('load', () => {
        // Report load time
        const loadTime = Date.now() - window.appStartTime;
        console.log(`Initial load completed in ${loadTime}ms`);
        
        // Send performance data if needed
        if (window.ga) {
            ga('send', 'timing', 'JS Dependencies', 'load', loadTime);
        }
    });
})(); 