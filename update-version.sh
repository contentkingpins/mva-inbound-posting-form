#!/bin/bash

# Update Version Script
# Usage: ./update-version.sh 1.0.2

if [ -z "$1" ]; then
    echo "Usage: ./update-version.sh <version>"
    echo "Example: ./update-version.sh 1.0.2"
    exit 1
fi

NEW_VERSION=$1
OLD_VERSION=$(grep "APP_VERSION" version.js | cut -d"'" -f2)

echo "Updating version from $OLD_VERSION to $NEW_VERSION..."

# Update version.js
sed -i '' "s/APP_VERSION = '$OLD_VERSION'/APP_VERSION = '$NEW_VERSION'/g" version.js

# Update service worker cache name
sed -i '' "s/claim-connectors-v$OLD_VERSION/claim-connectors-v$NEW_VERSION/g" dashboard/service-worker.js

# Update HTML file version parameters
find . -name "*.html" -type f -exec sed -i '' "s/\?v=$OLD_VERSION/?v=$NEW_VERSION/g" {} \;

# Update amplify.yml if needed
# (Add any other version-specific updates here)

echo "Version updated to $NEW_VERSION"
echo "Don't forget to:"
echo "  1. Commit changes: git add -A && git commit -m 'Update version to $NEW_VERSION'"
echo "  2. Push to deploy: git push origin main" 