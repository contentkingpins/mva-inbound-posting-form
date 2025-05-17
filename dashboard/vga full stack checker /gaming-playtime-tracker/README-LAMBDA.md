# Gaming Playtime Tracker Lambda Backend

This README provides instructions for deploying the Lambda functions backend for the Gaming Playtime Tracker.

## Overview

The Gaming Playtime Tracker uses AWS Lambda functions to securely interact with gaming platform APIs. This architecture allows the static frontend website to access real gaming platform data through a secure backend.

## Prerequisites

1. AWS CLI installed and configured with appropriate permissions
2. Node.js (v16+) and npm installed
3. Serverless Framework installed globally (`npm install -g serverless`)
4. API keys for the gaming platforms you want to support

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Gaming Platform API Keys
STEAM_API_KEY=your_steam_api_key
RIOT_API_KEY=your_riot_api_key
XBOX_API_KEY=your_xbox_api_key
PLAYSTATION_API_KEY=your_playstation_api_key
EPIC_API_KEY=your_epic_api_key
NINTENDO_API_KEY=your_nintendo_api_key
```

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Start the local development server:
   ```
   npm run offline
   ```

   This will start the serverless-offline plugin and simulate API Gateway and Lambda locally.

3. The API will be available at `http://localhost:4000`

## Deployment

1. Deploy to AWS:
   ```
   npm run deploy
   ```

   This will deploy the Lambda functions and create the API Gateway endpoints.

2. After deployment, you'll see the API Gateway URL in the terminal output.

3. Update the `NEXT_PUBLIC_API_URL` environment variable in your frontend application to point to the new API Gateway URL.

## API Endpoints

Once deployed, the following endpoints will be available:

- Steam: `GET /steam/playtime/{steamId}`
- Riot: `GET /riot/playtime/{riotId}`
- Xbox: `GET /xbox/playtime/{xboxId}`
- PlayStation: `GET /playstation/playtime/{playstationId}`
- Epic: `GET /epic/playtime/{epicId}`
- Nintendo: `GET /nintendo/playtime/{nintendoId}`

## Frontend Integration

1. In your frontend application, update the environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-api-gateway-id.execute-api.your-region.amazonaws.com/dev
   ```

2. Use the provided `apiClient.ts` utility to make requests to these endpoints.

## Monitoring and Logs

You can monitor your Lambda functions and view logs through the AWS Console:

1. Lambda metrics and logs: https://console.aws.amazon.com/lambda
2. API Gateway metrics: https://console.aws.amazon.com/apigateway
3. CloudWatch logs: https://console.aws.amazon.com/cloudwatch

## Troubleshooting

If you encounter issues:

1. Check CloudWatch logs for error messages
2. Verify API keys and environment variables
3. Check Lambda IAM roles and permissions
4. Ensure your AWS CLI credentials have the necessary permissions 