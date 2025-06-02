#!/bin/bash

echo "🧹 Starting SAFE file cleanup - only removing confirmed unused files..."

# ONLY TEST FILES (100% certain these are unused)
echo "Removing test files..."
rm -f test-aurora-dashboard.html

# ONLY DEPLOYMENT COPIES (redundant with source files)
echo "Removing deployment copies..."
rm -rf deployment/lambda-minimal-package/
rm -rf deployment/lambda-package/

# ONLY BUILD ARTIFACTS (auto-regenerated)
echo "Cleaning build artifacts..."
rm -rf dist/

echo "✅ SAFE cleanup completed!"
echo "📦 Only removed test files, redundant deployment copies, and build artifacts"
echo "🔒 All core functionality files preserved"

# Files PRESERVED (that I previously thought were unused):
echo ""
echo "📋 Files PRESERVED (previously marked for deletion):"
echo "  ✅ critical-path.js - Referenced by index.html"
echo "  ✅ version.js - Referenced by index.html" 
echo "  ✅ js/ folder - Contains app-config.js needed by all pages"
echo "  ✅ images/ folder - Contains logo used in HTML files"
echo "  ✅ All .js files in root - May be used by build process"
echo "  ✅ Documentation files - Better to keep for reference" 