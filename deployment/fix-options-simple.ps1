# Fix OPTIONS CORS and Login Authentication Issues
# This script deploys the fixes for the 2 remaining backend issues

Write-Host "FIXING OPTIONS CORS AND LOGIN AUTHENTICATION" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# Configuration
$LAMBDA_FUNCTION = "mva-inbound-posting-api"
$REGION = "us-east-1"
$TEMP_DIR = "lambda-fix-package"

try {
    Write-Host "Creating deployment package..." -ForegroundColor Yellow
    
    # Clean up any existing temp directory
    if (Test-Path $TEMP_DIR) {
        Remove-Item $TEMP_DIR -Recurse -Force
    }
    New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null
    
    # Copy main files with fixes
    Write-Host "Copying fixed files..." -ForegroundColor Yellow
    Copy-Item "index.js" "$TEMP_DIR/" -Force
    Copy-Item "auth-routes.js" "$TEMP_DIR/" -Force
    Copy-Item "config.json" "$TEMP_DIR/" -Force
    
    # Copy other required files
    $filesToCopy = @(
        "package.json",
        "docusign-service.js",
        "documentController.js", 
        "documentSearch.js",
        "get-username-by-email.js",
        "forgot-password-handler.js",
        "confirm-forgot-password.js"
    )
    
    foreach ($file in $filesToCopy) {
        if (Test-Path $file) {
            Copy-Item $file "$TEMP_DIR/" -Force
            Write-Host "  Copied $file" -ForegroundColor Green
        } else {
            Write-Host "  $file not found, skipping" -ForegroundColor Yellow
        }
    }
    
    # Install minimal dependencies
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    Push-Location $TEMP_DIR
    
    # Create minimal package.json if it doesn't exist
    if (-not (Test-Path "package.json")) {
        @{
            name = "mva-lambda-fix"
            version = "1.0.0"
            dependencies = @{
                "@aws-sdk/client-dynamodb" = "^3.0.0"
                "@aws-sdk/lib-dynamodb" = "^3.0.0"
                "uuid" = "^9.0.0"
                "aws-sdk" = "^2.1000.0"
                "jsonwebtoken" = "^9.0.0"
                "jwk-to-pem" = "^2.0.0"
                "axios" = "^1.0.0"
            }
        } | ConvertTo-Json -Depth 10 | Out-File "package.json" -Encoding UTF8
    }
    
    npm install --production --no-optional
    Pop-Location
    
    # Create deployment ZIP
    Write-Host "Creating deployment package..." -ForegroundColor Yellow
    Push-Location $TEMP_DIR
    
    # For Windows, use PowerShell compression
    $zipPath = "../lambda-fix-deployment.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    Compress-Archive -Path "*" -DestinationPath $zipPath -Force
    Pop-Location
    
    $zipSize = [math]::Round((Get-Item "lambda-fix-deployment.zip").Length / 1MB, 1)
    Write-Host "Package created: lambda-fix-deployment.zip ($zipSize MB)" -ForegroundColor Green
    
    # Deploy to Lambda
    Write-Host "Deploying to Lambda function: $LAMBDA_FUNCTION..." -ForegroundColor Yellow
    
    aws lambda update-function-code `
        --function-name $LAMBDA_FUNCTION `
        --zip-file fileb://lambda-fix-deployment.zip `
        --region $REGION
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
        Write-Host ""
        Write-Host "FIXES APPLIED:" -ForegroundColor Cyan
        Write-Host "  1. OPTIONS handler moved before authentication (fixes CORS 500 errors)" -ForegroundColor Green
        Write-Host "  2. Added handleLogin function (fixes login authentication)" -ForegroundColor Green
        Write-Host "  3. Added config.json for Cognito settings" -ForegroundColor Green
        Write-Host ""
        Write-Host "Test these endpoints now:" -ForegroundColor Yellow
        Write-Host "  OPTIONS: curl -X OPTIONS https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/vendors" -ForegroundColor White
        Write-Host "  LOGIN:   curl -X POST https://9qtb4my1ij.execute-api.us-east-1.amazonaws.com/prod/auth/login -d '{\"username\":\"admin\",\"password\":\"admin123\"}'" -ForegroundColor White
        
    } else {
        throw "Lambda deployment failed"
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Cleanup
    if (Test-Path $TEMP_DIR) {
        Remove-Item $TEMP_DIR -Recurse -Force
    }
}

Write-Host ""
Write-Host "OPTIONS AND LOGIN FIXES DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "Frontend team can now test vendor creation immediately!" -ForegroundColor Green 