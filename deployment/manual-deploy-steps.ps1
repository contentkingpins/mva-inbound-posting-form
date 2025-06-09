# Manual Deployment Steps for MVA CRM Backend Fixes
# Run these commands one by one if the automated script fails

# Variables
$StackName = "mva-crm-phase3-infrastructure"
$Environment = "production"
$LambdaFunctionName = "mva-inbound-posting-form"
$AWSRegion = "us-east-1"
$AWSAccountId = "337909762852"

Write-Host "Starting manual deployment..." -ForegroundColor Cyan

# Step 1: Deploy CloudFormation (using AWS Console as alternative)
Write-Host "`nStep 1: Deploy CloudFormation Stack" -ForegroundColor Yellow
Write-Host "Option A - Try CLI again:" -ForegroundColor Green
Write-Host "aws cloudformation deploy --template-file phase3-infrastructure.yml --stack-name $StackName --parameter-overrides ParameterKey=Environment,ParameterValue=$Environment ParameterKey=ProjectName,ParameterValue=mva-crm --capabilities CAPABILITY_NAMED_IAM --region $AWSRegion" -ForegroundColor White

Write-Host "`nOption B - Use AWS Console:" -ForegroundColor Green
Write-Host "1. Go to AWS CloudFormation Console" -ForegroundColor White
Write-Host "2. Click 'Create Stack' > 'With new resources'" -ForegroundColor White
Write-Host "3. Upload template: deployment/phase3-infrastructure.yml" -ForegroundColor White
Write-Host "4. Stack name: $StackName" -ForegroundColor White
Write-Host "5. Parameters: Environment=production, ProjectName=mva-crm" -ForegroundColor White
Write-Host "6. Check 'I acknowledge that AWS CloudFormation might create IAM resources with custom names'" -ForegroundColor White
Write-Host "7. Create stack" -ForegroundColor White

Write-Host "`nPress Enter to continue to Step 2..." -ForegroundColor Yellow
Read-Host

# Step 2: Update Lambda Environment Variables
Write-Host "`nStep 2: Update Lambda Environment Variables" -ForegroundColor Yellow

# Create a clean environment config file
$envConfig = @{
    Variables = @{
        VENDORS_TABLE = "mva-crm-Vendors-production"
        LEADS_TABLE = "mva-crm-Leads-production"
        USERS_TABLE = "mva-crm-Users-production"
        USER_POOL_ID = "us-east-1_lhc964tLD"
        COGNITO_CLIENT_ID = "5t6mane4fnvineksoqb4ta0iu1"
        AGENT_GOALS_TABLE = "mva-crm-AgentGoals-production"
        AGENT_PERFORMANCE_TABLE = "mva-crm-AgentPerformance-production"
        AGENT_ACTIVITY_TABLE = "mva-crm-AgentActivity-production"
        DOCUMENTS_TABLE = "mva-crm-Documents-production"
        DOCUMENT_ACTIVITY_TABLE = "mva-crm-DocumentActivity-production"
        DOCUMENTS_BUCKET = "mva-crm-documents-production-$AWSAccountId"
        DOCUMENT_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/$AWSAccountId/mva-crm-document-processing-production"
        JWT_SECRET = "mva-jwt-2025-xK9pL3nM8qR5tY7w"
        FROM_EMAIL = "noreply@mva-leads.com"
    }
}

# Save to temp file
$tempFile = "temp-env-config.json"
$envConfig | ConvertTo-Json -Depth 10 | Out-File $tempFile -Encoding ASCII

Write-Host "Run this command:" -ForegroundColor Green
Write-Host "aws lambda update-function-configuration --function-name $LambdaFunctionName --environment file://$tempFile --region $AWSRegion --timeout 900 --memory-size 1024" -ForegroundColor White

Write-Host "`nPress Enter to continue to Step 3..." -ForegroundColor Yellow
Read-Host

# Step 3: Create Lambda Deployment Package
Write-Host "`nStep 3: Create Lambda Deployment Package" -ForegroundColor Yellow
Write-Host "Run these commands:" -ForegroundColor Green
Write-Host @"
# Create temp directory
mkdir lambda-package-temp
cd lambda-package-temp

# Copy files
cp ../../index.js .
cp ../../documentController.js .
cp ../../documentSearch.js .
cp ../../docusign-service.js .
cp ../../auth-routes.js .
cp ../../package.json .
cp ../../package-lock.json .

# Install dependencies
npm ci --production

# Create zip (Windows)
Compress-Archive -Path * -DestinationPath ../lambda-deployment.zip -Force

# Go back
cd ..

# Deploy
aws lambda update-function-code --function-name $LambdaFunctionName --zip-file fileb://lambda-deployment.zip --region $AWSRegion
"@ -ForegroundColor White

Write-Host "`nPress Enter to see verification commands..." -ForegroundColor Yellow
Read-Host

# Step 4: Verification
Write-Host "`nStep 4: Verification Commands" -ForegroundColor Yellow
Write-Host "Check Vendors table:" -ForegroundColor Green
Write-Host "aws dynamodb describe-table --table-name mva-crm-Vendors-production --region $AWSRegion" -ForegroundColor White

Write-Host "`nCheck Lambda environment:" -ForegroundColor Green
Write-Host "aws lambda get-function-configuration --function-name $LambdaFunctionName --region $AWSRegion --query Environment.Variables" -ForegroundColor White

Write-Host "`nDeployment steps complete!" -ForegroundColor Cyan 