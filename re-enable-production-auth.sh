#!/bin/bash

# Script to re-enable JWT authentication after CORS is fixed
# Run this ONLY after backend team confirms CORS is fixed in API Gateway

echo "🔐 Re-enabling JWT authentication for production..."
echo ""

# Re-enable Authorization headers in fetchLeads
echo "✅ Enabling auth in fetchLeads..."
sed -i '' 's|method: '"'"'GET'"'"'$|method: '"'"'GET'"'"',\
            headers: {\
                '"'"'Content-Type'"'"': '"'"'application/json'"'"',\
                '"'"'Accept'"'"': '"'"'application/json'"'"',\
                '"'"'Authorization'"'"': \`Bearer \${token}\`\
            }|' dashboard/app.js

# Re-enable Authorization headers in updateLeadData
echo "✅ Enabling auth in updateLeadData..."
sed -i '' 's|// Only add x-api-key if we have one|'"'"'Authorization'"'"': \`Bearer \${token}\`,|' dashboard/app.js

# Re-enable Authorization headers in sendRetainerAgreement
echo "✅ Enabling auth in sendRetainerAgreement..."
sed -i '' '/sendRetainerAgreement/,/headers: {/s|// Only add x-api-key if we have one|'"'"'Authorization'"'"': \`Bearer \${token}\`,|' dashboard/app.js

# Re-enable Authorization headers in updateLeadDisposition
echo "✅ Enabling auth in updateLeadDisposition..."
sed -i '' '/updateLeadDisposition/,/headers: {/s|// Only add x-api-key if we have one|'"'"'Authorization'"'"': \`Bearer \${token}\`,|' dashboard/app.js

echo ""
echo "🎉 JWT authentication re-enabled!"
echo ""
echo "⚠️  IMPORTANT: Test the following after deployment:"
echo "   1. Login works without CORS errors"
echo "   2. Dashboard loads lead data"
echo "   3. Can update lead dispositions"
echo "   4. No console errors"
echo ""
echo "📝 Next steps:"
echo "   git add dashboard/app.js"
echo "   git commit -m 'Re-enable JWT authentication - CORS fixed in API Gateway'"
echo "   git push origin main"
echo ""
echo "🆘 If you see CORS errors, the backend team hasn't fixed API Gateway yet!" 