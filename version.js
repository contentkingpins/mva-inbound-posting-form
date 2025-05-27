// Version management for cache busting
// Update this version number when deploying changes
window.APP_VERSION = '1.0.1';

// Function to append version to URLs
window.addVersionToUrl = function(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${window.APP_VERSION}`;
};

// Auto-update checker
window.checkForUpdates = function() {
    fetch('/version.js?t=' + Date.now())
        .then(response => response.text())
        .then(text => {
            const match = text.match(/APP_VERSION = '([^']+)'/);
            if (match && match[1] !== window.APP_VERSION) {
                console.log(`Update available: ${window.APP_VERSION} → ${match[1]}`);
                
                // Show update notification
                if (window.showUpdateNotification) {
                    window.showUpdateNotification();
                }
            }
        })
        .catch(err => console.error('Version check failed:', err));
};

// Check for updates every 5 minutes
setInterval(window.checkForUpdates, 5 * 60 * 1000); 