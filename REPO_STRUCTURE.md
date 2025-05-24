# Repository Structure Guide

## Frontend Team Files
- `dashboard/` - All frontend application files
- `amplify.yml` - Frontend deployment configuration
- `version.js` - Frontend version tracking
- `*.md` files in root - Documentation

## Backend Team Files  
- `index.js` - Main Lambda function
- `auth-routes.js` - Authentication endpoints
- `docusign-*.js` - DocuSign integration
- `*-handler.js` - Lambda handlers
- `serverless.yml` - Backend deployment
- `package*.json` - Backend dependencies

## Shared Files
- `config.json` - API endpoints and keys
- `.gitignore` - Git configuration
- `README.md` - Project documentation

## Deployment
- Frontend deploys from `dashboard/` via Amplify
- Backend deploys Lambda functions separately 