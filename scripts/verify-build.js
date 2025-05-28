#!/usr/bin/env node

/**
 * Build Verification Script
 * Checks that all required files exist in the dist directory after build
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying build output...\n');

const requiredFiles = [
    // JS files in multiple locations
    'dist/js/app-config.js',
    'dist/dashboard/js/app-config.js',
    
    // Dashboard files
    'dist/dashboard/index.html',
    'dist/dashboard/app.js',
    'dist/dashboard/critical-path.js',
    'dist/dashboard/service-worker.js',
    'dist/dashboard/styles.css',
    'dist/dashboard/admin.css',
    
    // Root files for backward compatibility
    'dist/app.js',
    'dist/critical-path.js'
];

let missingFiles = [];
let foundFiles = [];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        foundFiles.push(file);
        console.log(`✅ ${file}`);
    } else {
        missingFiles.push(file);
        console.log(`❌ ${file} - MISSING`);
    }
});

console.log('\n📊 Summary:');
console.log(`   Found: ${foundFiles.length} files`);
console.log(`   Missing: ${missingFiles.length} files`);

if (missingFiles.length > 0) {
    console.log('\n⚠️  Build verification FAILED!');
    console.log('Missing files:', missingFiles);
    process.exit(1);
} else {
    console.log('\n✅ Build verification PASSED!');
    console.log('All required files are in place.');
}

// Check if configuration was injected
console.log('\n🔍 Checking configuration injection...');

const htmlFiles = [
    'dist/dashboard/index.html',
    'dist/dashboard/login.html'
];

htmlFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('window.APP_CONFIG')) {
            console.log(`✅ ${file} - Config injected`);
        } else {
            console.log(`❌ ${file} - Config NOT injected`);
        }
    }
}); 