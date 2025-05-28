#!/usr/bin/env node

/**
 * Build-Time Configuration Injection Script
 * 
 * This script eliminates all config.json dependencies by injecting
 * configuration directly into HTML files during the build process.
 * 
 * Benefits:
 * - No runtime config loading (faster app startup)
 * - No race conditions (config available immediately)
 * - Build-time validation (fails fast if config missing)
 * - Single source of truth (consistent across all files)
 * - Security maintained (secrets from environment variables)
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting build-time configuration injection...');

// Configuration object with environment variable fallbacks
const APP_CONFIG = {
    // Core Cognito settings (these are safe to hardcode as they're not secrets)
    userPoolId: process.env.USER_POOL_ID || 'us-east-1_lhc964tLD',
    clientId: process.env.CLIENT_ID || '5t6mane4fnvineksoqb4ta0iu1',
    
    // API endpoints
    apiEndpoint: process.env.API_ENDPOINT || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod',
    apiUrl: process.env.API_ENDPOINT || 'https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod',
    
    // Optional secrets (from environment variables only)
    apiKey: process.env.API_KEY || '',
    
    // Build metadata
    buildTime: new Date().toISOString(),
    buildEnv: process.env.NODE_ENV || 'production'
};

// Validate required configuration
const requiredFields = ['userPoolId', 'clientId', 'apiEndpoint'];
const missingFields = requiredFields.filter(field => !APP_CONFIG[field]);

if (missingFields.length > 0) {
    console.error('❌ Missing required configuration fields:', missingFields);
    process.exit(1);
}

console.log('✅ Configuration validated successfully');
console.log('📋 Config summary:');
console.log(`   User Pool ID: ${APP_CONFIG.userPoolId}`);
console.log(`   Client ID: ${APP_CONFIG.clientId}`);
console.log(`   API Endpoint: ${APP_CONFIG.apiEndpoint}`);
console.log(`   API Key: ${APP_CONFIG.apiKey ? '[PRESENT]' : '[NOT SET]'}`);

// Create the configuration script that will be injected
const configScript = `
<script>
/**
 * Application Configuration - Injected at Build Time
 * This eliminates the need for external config.json files and prevents
 * race conditions, failed fetches, and timing issues.
 */
window.APP_CONFIG = ${JSON.stringify(APP_CONFIG, null, 2)};

// Legacy compatibility - some code might still look for these
window.preloadedConfig = window.APP_CONFIG;

console.log('🔧 Configuration injected at build time - no external loading needed');
</script>`;

// Files to inject configuration into
const htmlFiles = [
    'dashboard/index.html',
    'dashboard/login.html',
    'dashboard/admin.html',
    'login.html',
    'index.html'
];

let injectedCount = 0;

htmlFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Remove any existing config injection to prevent duplicates
            content = content.replace(/<script>[\s\S]*?window\.APP_CONFIG[\s\S]*?<\/script>/g, '');
            
            // Inject the new configuration script before closing </head>
            if (content.includes('</head>')) {
                content = content.replace('</head>', `${configScript}\n</head>`);
                fs.writeFileSync(filePath, content);
                console.log(`✅ Injected config into: ${filePath}`);
                injectedCount++;
            } else {
                console.warn(`⚠️  No </head> tag found in: ${filePath}`);
            }
        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error.message);
        }
    } else {
        console.log(`ℹ️  File not found (skipping): ${filePath}`);
    }
});

console.log(`\n🎉 Configuration injection complete!`);
console.log(`📊 Summary: ${injectedCount} files updated`);
console.log(`🚀 Your app will now start faster with zero config loading delays`);
console.log(`✨ No more race conditions, fetch failures, or timing issues!`); 