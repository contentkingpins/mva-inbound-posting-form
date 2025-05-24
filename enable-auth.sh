#!/bin/bash

# Script to re-enable authentication after CORS is fixed in API Gateway

echo "Re-enabling authentication headers..."

# Re-enable auth in app.js fetchLeads
sed -i '' 's|// TEMPORARILY DISABLED DUE TO CORS - FIX IN API GATEWAY|'$'\\\n                '"'Authorization': \`Bearer \${token}\`"|' dashboard/app.js
sed -i '' 's|'"'Accept'"': '"'application/json'"'$|'"'Accept'"': '"'application/json'"','|' dashboard/app.js

# Re-enable auth in app.js updateLeadData (first occurrence)
sed -i '' '2354,2370s|// TEMPORARILY DISABLED DUE TO CORS - FIX IN API GATEWAY|'$'\\\n                '"'Authorization': \`Bearer \${token}\`"|' dashboard/app.js
sed -i '' '2354,2370s|'"'Accept'"': '"'application/json'"'$|'"'Accept'"': '"'application/json'"','|' dashboard/app.js

# Re-enable auth in app.js sendRetainerAgreement
sed -i '' '2607,2620s|// TEMPORARILY DISABLED DUE TO CORS - FIX IN API GATEWAY|'$'\\\n                '"'Authorization': \`Bearer \${token}\`"|' dashboard/app.js
sed -i '' '2607,2620s|'"'Content-Type'"': '"'application/json'"'$|'"'Content-Type'"': '"'application/json'"','|' dashboard/app.js

# Re-enable x-api-key in app.js updateLeadDisposition
sed -i '' '1647,1660s|// TEMPORARILY DISABLED DUE TO CORS - FIX IN API GATEWAY|'$'\\\n                '"'x-api-key': API_KEY"|' dashboard/app.js
sed -i '' '1647,1660s|'"'Accept'"': '"'application/json'"'$|'"'Accept'"': '"'application/json'"','|' dashboard/app.js

echo "Authentication headers re-enabled!"
echo ""
echo "Next steps:"
echo "1. Commit changes: git add -A && git commit -m 'Re-enable authentication after CORS fix' && git push"
echo "2. Clear browser cache"
echo "3. Test login and data fetching"
echo ""
echo "If you still see CORS errors, double-check API Gateway CORS settings." 