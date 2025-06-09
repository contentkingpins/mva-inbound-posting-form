# MVA CRM Backend Deployment Fix Script
# This script addresses all 4 critical issues identified by the frontend team

param(
    [Parameter(Mandatory=$false)]
    [string]$StackName = "mva-crm-phase3-infrastructure",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [string]$LambdaFunctionName = "mva-inbound-posting-form",
    
    [Parameter(Mandatory=$false)]
    [string]$AWSRegion = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$AWSAccountId = ""
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "MVA CRM Backend Deployment Fix Script" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Get AWS Account ID if not provided
if ([string]::IsNullOrEmpty($AWSAccountId)) {
    Write-Host "Getting AWS Account ID..." -ForegroundColor Yellow
    $AWSAccountId = aws sts get-caller-identity --query Account --output text
    Write-Host "Account ID: $AWSAccountId" -ForegroundColor Green
}

# Step 1: Deploy CloudFormation Stack with Vendors Table
Write-Host ""
Write-Host "Step 1: Deploying CloudFormation stack with Vendors table..." -ForegroundColor Yellow

$cfnParams = @(
    "ParameterKey=Environment,ParameterValue=$Environment",
    "ParameterKey=ProjectName,ParameterValue=mva-crm"
)

$cfnCommand = "aws cloudformation deploy --template-file phase3-infrastructure.yml --stack-name $StackName --parameter-overrides $($cfnParams -join ' ') --capabilities CAPABILITY_NAMED_IAM --region $AWSRegion"
Write-Host "Running: $cfnCommand" -ForegroundColor Gray

$cfnResult = Invoke-Expression $cfnCommand
if ($LASTEXITCODE -eq 0) {
    Write-Host "CloudFormation stack deployed successfully" -ForegroundColor Green
}
else {
    Write-Host "CloudFormation deployment failed" -ForegroundColor Red
    exit 1
}

# Step 2: Update Lambda Environment Variables
Write-Host ""
Write-Host "Step 2: Updating Lambda environment variables..." -ForegroundColor Yellow

# Read environment configuration
$envConfigPath = Join-Path $PSScriptRoot "lambda-environment-config.json"
if (-not (Test-Path $envConfigPath)) {
    Write-Host "ERROR: lambda-environment-config.json not found at $envConfigPath" -ForegroundColor Red
    exit 1
}

$envConfig = Get-Content -Path $envConfigPath -Raw | ConvertFrom-Json

# Replace ACCOUNT_ID placeholder
$envConfig.Variables.DOCUMENTS_BUCKET = $envConfig.Variables.DOCUMENTS_BUCKET -replace "ACCOUNT_ID", $AWSAccountId
$envConfig.Variables.DOCUMENT_QUEUE_URL = $envConfig.Variables.DOCUMENT_QUEUE_URL -replace "ACCOUNT_ID", $AWSAccountId

# Convert to AWS CLI format
$envVarsJson = $envConfig | ConvertTo-Json -Compress -Depth 10

# Save to temp file to avoid escaping issues
$tempEnvFile = Join-Path $env:TEMP "lambda-env-config-temp.json"
$envConfig | ConvertTo-Json -Depth 10 | Out-File $tempEnvFile -Encoding UTF8

# Update Lambda configuration
$lambdaUpdateCommand = "aws lambda update-function-configuration --function-name $LambdaFunctionName --environment file://$tempEnvFile --region $AWSRegion --timeout 900 --memory-size 1024"
Write-Host "Running: $lambdaUpdateCommand" -ForegroundColor Gray

$lambdaResult = Invoke-Expression $lambdaUpdateCommand
if ($LASTEXITCODE -eq 0) {
    Write-Host "Lambda environment variables updated successfully" -ForegroundColor Green
}
else {
    Write-Host "Failed to update Lambda environment variables" -ForegroundColor Red
    Remove-Item $tempEnvFile -Force -ErrorAction SilentlyContinue
    exit 1
}

# Clean up temp file
Remove-Item $tempEnvFile -Force -ErrorAction SilentlyContinue

# Step 3: Create Lambda deployment package
Write-Host ""
Write-Host "Step 3: Creating Lambda deployment package..." -ForegroundColor Yellow

# Create temporary directory for packaging
$tempDir = Join-Path $PSScriptRoot "lambda-package-temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy required files
$filesToPackage = @(
    "../index.js",
    "../documentController.js",
    "../documentSearch.js",
    "../docusign-service.js",
    "../auth-routes.js",
    "../package.json",
    "../package-lock.json"
)

foreach ($file in $filesToPackage) {
    $sourcePath = Join-Path $PSScriptRoot $file
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath -Destination $tempDir/
        Write-Host "  Copied: $(Split-Path $file -Leaf)" -ForegroundColor Gray
    }
    else {
        Write-Host "  Warning: File not found: $file" -ForegroundColor Yellow
    }
}

# Install dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
Push-Location $tempDir
npm ci --production
Pop-Location

# Create zip file
$zipFileName = "mva-crm-backend-fixed-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
$zipPath = Join-Path $PSScriptRoot $zipFileName

Write-Host "Creating deployment package: $zipFileName" -ForegroundColor Yellow
Compress-Archive -Path "$tempDir/*" -DestinationPath $zipPath -Force

# Clean up temp directory
Remove-Item -Recurse -Force $tempDir

Write-Host "Lambda package created: $zipFileName" -ForegroundColor Green

# Step 4: Deploy Lambda function code
Write-Host ""
Write-Host "Step 4: Deploying Lambda function code..." -ForegroundColor Yellow

$deployCommand = "aws lambda update-function-code --function-name $LambdaFunctionName --zip-file fileb://$zipPath --region $AWSRegion"
Write-Host "Running: $deployCommand" -ForegroundColor Gray

$deployResult = Invoke-Expression $deployCommand
if ($LASTEXITCODE -eq 0) {
    Write-Host "Lambda code deployed successfully" -ForegroundColor Green
}
else {
    Write-Host "Failed to deploy Lambda code" -ForegroundColor Red
    exit 1
}

# Step 5: Verify deployment
Write-Host ""
Write-Host "Step 5: Verifying deployment..." -ForegroundColor Yellow

# Check if Vendors table exists
$vendorsTableName = "mva-crm-Vendors-$Environment"
$tableCheckCommand = "aws dynamodb describe-table --table-name $vendorsTableName --region $AWSRegion --query Table.TableStatus --output text"

try {
    $vendorsTable = Invoke-Expression $tableCheckCommand 2>$null
    if ($vendorsTable -eq "ACTIVE") {
        Write-Host "Vendors table is active: $vendorsTableName" -ForegroundColor Green
    }
    else {
        Write-Host "Vendors table not active. Status: $vendorsTable" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Vendors table not found: $vendorsTableName" -ForegroundColor Red
}

# Check Lambda environment variables
$envCheckCommand = "aws lambda get-function-configuration --function-name $LambdaFunctionName --region $AWSRegion --query Environment.Variables.VENDORS_TABLE --output text"
$lambdaEnv = Invoke-Expression $envCheckCommand

if ($lambdaEnv -and $lambdaEnv -ne "None") {
    Write-Host "VENDORS_TABLE environment variable is set: $lambdaEnv" -ForegroundColor Green
}
else {
    Write-Host "VENDORS_TABLE environment variable not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. CloudFormation stack: $StackName" -ForegroundColor White
Write-Host "2. Lambda function: $LambdaFunctionName" -ForegroundColor White
Write-Host "3. Deployment package: $zipFileName" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "- Test the API endpoints to ensure they're working" -ForegroundColor White
Write-Host "- Update the agent dashboard to use vendor API instead of localStorage" -ForegroundColor White
Write-Host ""
Write-Host "Deployment completed!" -ForegroundColor Green 