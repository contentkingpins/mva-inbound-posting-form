# Gaming Playtime Tracker

A web application that displays gaming hours played across multiple platforms.

## Deployment

This application is configured for deployment on AWS Amplify.

### AWS Amplify Setup

1. Connect your GitHub repository to AWS Amplify
2. Use the included `amplify.yml` configuration file
3. The application is configured for static export deployment with Next.js

### Environment Variables

The following environment variables should be configured in the AWS Amplify console:

- `STEAM_API_KEY`: Your Steam Web API key
- `RIOT_API_KEY`: Your Riot Games API key
- `XBOX_CLIENT_ID`: Your Xbox Live API client ID
- `XBOX_CLIENT_SECRET`: Your Xbox Live API client secret

## Local Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Features

- Fetch game playtime data from multiple platforms
- Responsive design for mobile and desktop
- Caching system for API responses
- Rate limiting to prevent API abuse

## Supported Platforms

- Steam (fully supported)
- Riot Games (League of Legends)
- Xbox Live (partner access)
- PlayStation, Epic Games, Nintendo (informational only) 