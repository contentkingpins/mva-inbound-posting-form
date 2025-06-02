@echo off
echo Copying document files...
copy deployment\lambda-package\documentController.js . /Y
copy deployment\lambda-package\documentSearch.js . /Y

echo Creating deployment package...
powershell -Command "Compress-Archive -Path *.js,*.json,node_modules -DestinationPath lambda-phase3-complete.zip -Force"

echo Deploying to Lambda...
aws lambda update-function-code --function-name mva-inbound-posting-api --zip-file fileb://lambda-phase3-complete.zip

echo Deployment complete!
pause 