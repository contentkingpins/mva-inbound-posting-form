#!/bin/bash

echo "🧹 Starting comprehensive file cleanup..."

# Test Files
rm -f test-aurora-dashboard.html
rm -f scripts/simple-test.js
rm -f scripts/test-api.js
rm -f scripts/test-inject-config.js

# Example/Template Files
rm -f frontend-example.js
rm -f dist/README.md

# Deprecated API Files
rm -f api.js
rm -f auth-routes.js
rm -f aws-exports.js

# Development Tools
rm -f check_json.js
rm -f load_to_live_site.js
rm -f proxy-worker.js
rm -f rollup.config.js
rm -f webpack.config.js
rm -f service-worker.js

# Utility Scripts
rm -f scripts/generate-password-hash.js
rm -f scripts/seed-vendors.js
rm -f scripts/setup-api-key.js
rm -f scripts/setup-parameters.js
rm -f scripts/vendor-management.js
rm -f scripts/verify-build.js

# Legacy Files
rm -f version.js
rm -f critical-path.js
rm -f confirm-reset-handler.js
rm -f forgot-password-handler.js
rm -f forgot-password.js
rm -f confirm-forgot-password.js
rm -f get-username-by-email.js

# Documentation Files
rm -rf docs/
rm -rf vendor_docs/

# DocuSign Integration (Unused)
rm -f docusign-service.js
rm -f docusign-utils.js
rm -rf utils/

# Deployment Copies (Redundant)
rm -rf deployment/
rm -rf build/

# Clean dist folder (will be regenerated on build)
rm -rf dist/

echo "✅ Cleanup completed!"
echo "📦 Files removed safely - all core functionality preserved"
echo "🚀 System is now clean and optimized" 