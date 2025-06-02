/**
 * Centralized Application Configuration Module
 * 
 * This is the SINGLE SOURCE OF TRUTH for all configuration in the application.
 * All other files should use this module instead of loading config directly.
 * 
 * Benefits:
 * - Eliminates race conditions (no async loading)
 * - Provides consistent fallbacks
 * - Type safety and validation
 * - Easy testing and mocking
 * - Single point of configuration management
 */

// Detect current environment
const getEnvironment = () => {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168')) {
        return 'development';
    } else if (hostname.includes('staging') || hostname.includes('test')) {
        return 'staging';
    } else {
        return 'production';
    }
};

// Environment-specific configurations
const environments = {
    development: {
        apiEndpoint: 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod',
        cognitoUserPoolId: 'us-east-1_lhc964tLD',
        cognitoClientId: '5t6mane4fnvineksoqb4ta0iu1',
        debug: true,
        logLevel: 'debug',
        cacheTimeout: 1000 * 60 * 5, // 5 minutes
        features: {
            darkMode: true,
            tooltips: true,
            animations: true,
            debugPanel: true
        }
    },
    staging: {
        apiEndpoint: 'https://staging-api.claimconnectors.com/prod',
        cognitoUserPoolId: 'us-east-1_lhc964tLD',
        cognitoClientId: '5t6mane4fnvineksoqb4ta0iu1',
        debug: true,
        logLevel: 'info',
        cacheTimeout: 1000 * 60 * 15, // 15 minutes
        features: {
            darkMode: true,
            tooltips: true,
            animations: true,
            debugPanel: false
        }
    },
    production: {
        apiEndpoint: 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod',
        cognitoUserPoolId: 'us-east-1_lhc964tLD',
        cognitoClientId: '5t6mane4fnvineksoqb4ta0iu1',
        debug: false,
        logLevel: 'error',
        cacheTimeout: 1000 * 60 * 30, // 30 minutes
        features: {
            darkMode: true,
            tooltips: true,
            animations: true,
            debugPanel: false
        }
    }
};

// Get current environment
const currentEnvironment = getEnvironment();

// Export configuration
window.APP_CONFIG = {
    ...environments[currentEnvironment],
    environment: currentEnvironment,
    version: '2.0.0',
    buildDate: new Date().toISOString(),
    
    // Override with any URL parameters (for testing)
    ...((() => {
        const params = new URLSearchParams(window.location.search);
        const overrides = {};
        
        if (params.get('debug') === 'true') {
            overrides.debug = true;
            overrides.logLevel = 'debug';
        }
        
        if (params.get('api')) {
            overrides.apiEndpoint = params.get('api');
        }
        
        return overrides;
    })()),
    
    // Helper methods
    log: function(level, ...args) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const configLevel = levels.indexOf(this.logLevel);
        const messageLevel = levels.indexOf(level);
        
        if (messageLevel >= configLevel) {
            console[level](...args);
        }
    },
    
    isFeatureEnabled: function(feature) {
        return this.features[feature] || false;
    },
    
    getApiUrl: function(endpoint) {
        return `${this.apiEndpoint}${endpoint}`;
    }
};

// Log configuration on load
if (window.APP_CONFIG.debug) {
    console.log('🔧 App Configuration:', {
        environment: window.APP_CONFIG.environment,
        apiEndpoint: window.APP_CONFIG.apiEndpoint,
        version: window.APP_CONFIG.version,
        features: window.APP_CONFIG.features
    });
}

// Make config immutable in production
if (window.APP_CONFIG.environment === 'production') {
    Object.freeze(window.APP_CONFIG);
}

export default window.APP_CONFIG;

class AppConfig {
    constructor() {
        this._config = null;
        this._initialized = false;
    }

    /**
     * Get the complete configuration object
     * @returns {Object} Configuration object
     */
    get() {
        if (!this._initialized) {
            this._initializeConfig();
        }
        return this._config;
    }

    /**
     * Get Cognito-specific configuration
     * @returns {Object} Cognito configuration for aws-cognito-identity-js
     */
    getCognitoConfig() {
        const config = this.get();
        return {
            UserPoolId: config.userPoolId,
            ClientId: config.clientId
        };
    }

    /**
     * Get API endpoint with optional path
     * @param {string} path - Optional path to append
     * @returns {string} Full API URL
     */
    getApiEndpoint(path = '') {
        const config = this.get();
        const baseUrl = config.apiEndpoint || config.apiUrl;
        return path ? `${baseUrl}${path}` : baseUrl;
    }

    /**
     * Get API key (if available)
     * @returns {string} API key or empty string
     */
    getApiKey() {
        const config = this.get();
        return config.apiKey || '';
    }

    /**
     * Check if we're in development mode
     * @returns {boolean} True if in development
     */
    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('localhost');
    }

    /**
     * Get environment-specific settings
     * @returns {Object} Environment configuration
     */
    getEnvironmentConfig() {
        if (this.isDevelopment()) {
            return {
                debug: true,
                logLevel: 'debug',
                enableMockData: false // We have real API now
            };
        } else {
            return {
                debug: false,
                logLevel: 'error',
                enableMockData: false
            };
        }
    }

    /**
     * Initialize configuration from available sources
     * @private
     */
    _initializeConfig() {
        // Priority order:
        // 1. Build-time injected config (window.APP_CONFIG)
        // 2. Legacy preloaded config (window.preloadedConfig)
        // 3. Hardcoded fallback config

        if (window.APP_CONFIG) {
            this._config = window.APP_CONFIG;
            console.log('✅ Using build-time injected configuration');
        } else if (window.preloadedConfig) {
            this._config = window.preloadedConfig;
            console.log('✅ Using legacy preloaded configuration');
        } else {
            // Fallback configuration
            this._config = {
                userPoolId: 'us-east-1_lhc964tLD',
                clientId: '5t6mane4fnvineksoqb4ta0iu1',
                apiEndpoint: 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod',
                apiUrl: 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod',
                apiKey: ''
            };
            console.warn('⚠️ Using fallback configuration - build injection may have failed');
        }

        // Validate configuration
        this._validateConfig();
        this._initialized = true;
    }

    /**
     * Validate that required configuration fields are present
     * @private
     */
    _validateConfig() {
        const required = ['userPoolId', 'clientId', 'apiEndpoint'];
        const missing = required.filter(field => !this._config[field]);
        
        if (missing.length > 0) {
            console.error('❌ Missing required configuration fields:', missing);
            throw new Error(`Configuration validation failed: missing ${missing.join(', ')}`);
        }

        // Additional validation
        if (!this._config.userPoolId.includes('us-east-1_')) {
            console.warn('⚠️ User Pool ID format looks incorrect');
        }

        if (this._config.clientId.length < 20) {
            console.warn('⚠️ Client ID format looks incorrect');
        }

        console.log('✅ Configuration validation passed');
    }

    /**
     * Get configuration for debugging (safe for logging)
     * @returns {Object} Safe configuration object (no secrets)
     */
    getDebugConfig() {
        const config = this.get();
        return {
            userPoolId: config.userPoolId,
            clientId: config.clientId.substring(0, 8) + '...',
            apiEndpoint: config.apiEndpoint,
            hasApiKey: !!config.apiKey,
            buildTime: config.buildTime || 'unknown',
            buildEnv: config.buildEnv || 'unknown'
        };
    }
}

// Create singleton instance
const appConfig = new AppConfig();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = appConfig;
}

// Make available globally for legacy code
window.AppConfig = appConfig;

// Also provide convenient global functions
window.getAppConfig = () => appConfig.get();
window.getCognitoConfig = () => appConfig.getCognitoConfig();

console.log('🔧 AppConfig module loaded - centralized configuration ready'); 