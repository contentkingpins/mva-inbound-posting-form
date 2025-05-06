# Lead Management Dashboard

A simple HTML, CSS, and JavaScript dashboard for viewing and managing leads from the Lead Management API.

## Features

- Display leads in a clean, responsive table
- Click on a row to expand and view full lead details
- Filter leads by vendor code
- Manual refresh button to fetch the latest data
- Optional auto-refresh every 10 seconds

## Setup Instructions

1. Edit `app.js` and update the `API_ENDPOINT` variable with your actual API Gateway URL:

```javascript
const API_ENDPOINT = 'https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/dev/leads';
```

2. Set up your API key using one of these methods:
   - For local development: Edit `config.json` and set your API key (never commit this file)
   - For deployment: Set the API_KEY environment variable in your deployment environment

3. Deploy the dashboard files to any static web hosting service:
   - AWS Amplify (recommended, see below)
   - Amazon S3
   - GitHub Pages
   - Netlify
   - Vercel
   - Or simply open `index.html` locally in your browser

## Deployment to AWS Amplify

1. Ensure you have the Amplify CLI installed:
```bash
npm install -g @aws-amplify/cli
```

2. Connect your repository (GitHub, GitLab, BitBucket) to AWS Amplify through the AWS Management Console:
   - Go to the AWS Amplify Console
   - Choose "Host web app"
   - Connect your repository
   - Follow the setup wizard

3. Add the API_KEY environment variable in the Amplify Console:
   - Go to your app in the Amplify Console
   - Navigate to "Environment variables"
   - Add a variable named "API_KEY" with your actual API key value
   - Save the changes and redeploy your application

4. Amplify will automatically detect the `amplify.yml` configuration file and use it for deployment.

5. After deployment, update the CORS settings in your API Gateway to allow requests from your Amplify app domain.

## Deployment to S3 (Alternative)

```bash
# Create an S3 bucket
aws s3 mb s3://lead-management-dashboard

# Enable website hosting on the bucket
aws s3 website s3://lead-management-dashboard --index-document index.html

# Upload dashboard files
aws s3 cp dashboard/ s3://lead-management-dashboard --recursive

# Make the bucket public (for a public dashboard)
aws s3api put-bucket-policy --bucket lead-management-dashboard --policy file://bucket-policy.json
```

Example bucket policy (bucket-policy.json):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::lead-management-dashboard/*"
    }
  ]
}
```

## CORS Configuration

Ensure your API Gateway has CORS enabled to allow requests from the dashboard domain. If using AWS Amplify, you'll need to add your Amplify app domain to the API Gateway CORS settings.

To update CORS settings in API Gateway:
1. Go to the API Gateway Console
2. Select your API
3. Go to the "CORS" section
4. Add your Amplify app domain to "Access-Control-Allow-Origin"
5. Deploy your API again

## Security Considerations

- This dashboard is for demonstration purposes and doesn't include authentication
- For a production environment, consider:
  - Implementing user authentication
  - Using HTTPS for the dashboard
  - Restricting API access with proper IAM roles 