# AWS Amplify Deployment Guide

This guide outlines the steps to deploy the Gaming Playtime Tracker application to AWS Amplify.

## Prerequisites

- AWS Account
- GitHub repository with the application code
- AWS Amplify Console access

## Deployment Steps

1. **Connect Repository to Amplify**

   - Go to the [AWS Amplify Console](https://console.aws.amazon.com/amplify/home)
   - Choose "Connect app"
   - Select GitHub as the repository source
   - Authenticate and select your repository
   - Select the main branch for deployment

2. **Configure Build Settings**

   Amplify should automatically detect the `amplify.yml` file in the repository. If not, use the following build settings:

   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install --legacy-peer-deps
       build:
         commands:
           - cd gaming-playtime-tracker
           - npm run build
     artifacts:
       baseDirectory: gaming-playtime-tracker/.next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
         - gaming-playtime-tracker/node_modules/**/*
   ```

3. **Configure Environment Variables**

   In the Amplify Console, go to the "Environment variables" section and add the following variables:

   - `STEAM_API_KEY`: Your Steam Web API key
   - `RIOT_API_KEY`: Your Riot Games API key
   - `XBOX_CLIENT_ID`: Your Xbox Live API client ID
   - `XBOX_CLIENT_SECRET`: Your Xbox Live API client secret

4. **Deploy the Application**

   - Review the settings and click "Save and deploy"
   - Amplify will build and deploy your application
   - Once deployment is complete, you can access your app via the provided URL

## Troubleshooting

- If you encounter dependency issues during build, check that `--legacy-peer-deps` is included in the npm install command
- For Next.js image optimization errors, ensure `images: { unoptimized: true }` is set in next.config.js
- If API routes aren't working, make sure the output is set to 'export' in next.config.js

## Next Steps

After deployment, consider setting up:

- Custom domain mapping in the Amplify Console
- HTTPS certificates (automatically handled by Amplify)
- Monitoring and analytics for your application 