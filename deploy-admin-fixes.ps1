# Deploy Lambda Function with Admin Endpoint Fixes
Write-Host "🚀 Deploying Lambda function with admin endpoint fixes..." -ForegroundColor Yellow

# Check if deployment directory exists, create if not
if (!(Test-Path "lambda-deployment")) {
    New-Item -ItemType Directory -Path "lambda-deployment" | Out-Null
}

# Copy necessary files to deployment directory
Write-Host "Copying files to deployment directory..." -ForegroundColor Blue
Copy-Item "index.js" "lambda-deployment/"
Copy-Item "auth-routes.js" "lambda-deployment/"
Copy-Item "config.json" "lambda-deployment/"
Copy-Item "documentController.js" "lambda-deployment/"
Copy-Item "documentSearch.js" "lambda-deployment/"
Copy-Item "docusign-service.js" "lambda-deployment/"

# Copy package.json if it exists
if (Test-Path "package.json") {
    Copy-Item "package.json" "lambda-deployment/"
}

# Change to deployment directory
Push-Location "lambda-deployment"

try {
    # Install dependencies if package.json exists
    if (Test-Path "package.json") {
        Write-Host "Installing dependencies..." -ForegroundColor Blue
        npm install --production
    }

    # Create deployment ZIP
    Write-Host "Creating deployment package..." -ForegroundColor Blue
    if (Test-Path "lambda-deployment.zip") {
        Remove-Item "lambda-deployment.zip" -Force
    }
    
    # Create ZIP file with all contents
    Compress-Archive -Path "*" -DestinationPath "lambda-deployment.zip" -Force
    
    Write-Host "Deployment package created: $(Get-Item 'lambda-deployment.zip' | Select-Object -ExpandProperty Length) bytes" -ForegroundColor Green

    # Deploy to AWS Lambda
    Write-Host "Deploying to AWS Lambda..." -ForegroundColor Blue
    aws lambda update-function-code --function-name "mva-inbound-posting-api" --zip-file "fileb://lambda-deployment.zip" --region us-east-1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Lambda function deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Lambda deployment failed!" -ForegroundColor Red
    }

} finally {
    # Return to original directory
    Pop-Location
}

Write-Host "`n🎯 Admin endpoint fixes deployment complete!" -ForegroundColor Green
Write-Host "Fixed endpoints:" -ForegroundColor Yellow
Write-Host "  ✅ /admin/stats -> /admin/analytics/dashboard" -ForegroundColor White
Write-Host "  ✅ /admin/analytics -> /admin/analytics/performance" -ForegroundColor White
Write-Host "  ✅ /leads now uses JWT authentication" -ForegroundColor White
Write-Host "  ✅ All admin endpoints require admin role" -ForegroundColor White 