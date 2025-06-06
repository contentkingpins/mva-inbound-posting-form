# Create Lambda package with authentication fix
Write-Host "Creating authentication fix deployment package..."

# Clean up
Remove-Item -Recurse -Force lambda-fix -ErrorAction SilentlyContinue

# Create temp directory
mkdir lambda-fix

# Copy files
Copy-Item index.js lambda-fix/
Copy-Item deployment/leadController.js lambda-fix/
Copy-Item deployment/adminController.js lambda-fix/
Copy-Item deployment/authMiddleware.js lambda-fix/

# Create minimal package.json
$packageContent = @'
{
  "name": "mva-inbound-posting-form",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "aws-sdk": "^2.1000.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "uuid": "^9.0.0"
  }
}
'@
Set-Content -Path "lambda-fix/package.json" -Value $packageContent

# Install dependencies
cd lambda-fix
npm install --production --no-package-lock
cd ..

# Create deployment package
Compress-Archive -Path "lambda-fix/*" -DestinationPath "deployment/lambda-auth-fix.zip" -Force

# Deploy to AWS
Write-Host "Deploying authentication fix to Lambda..."
aws lambda update-function-code --function-name mva-inbound-posting-api --zip-file fileb://deployment/lambda-auth-fix.zip --region us-east-1

# Clean up
Remove-Item -Recurse -Force lambda-fix

Write-Host "Authentication fix deployed successfully!" 