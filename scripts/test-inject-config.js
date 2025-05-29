#!/usr/bin/env node

/**
 * Test script to run configuration injection locally
 * Run this to verify the injection works correctly before deployment
 */

console.log('🧪 Running configuration injection test...\n');

// Run the inject-config script
require('./inject-config.js');

console.log('\n✅ Test complete! Check the HTML files to verify configuration was injected.');
console.log('📋 Look for:');
console.log('   1. <script src="js/app-config.js?v=..."></script>');
console.log('   2. window.APP_CONFIG = { ... }');
console.log('\n💡 Tip: git diff to see all changes'); 