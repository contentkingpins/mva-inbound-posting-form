#!/bin/bash

# Deploy Lambda Functions Script
# This script helps deploy the Lambda functions for the Gaming Playtime Tracker

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=========================================${NC}"
echo -e "${YELLOW}     Gaming Playtime Tracker Deployment   ${NC}"
echo -e "${YELLOW}=========================================${NC}"

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check for environment file
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating template...${NC}"
    cat > .env << EOL
# Gaming Platform API Keys
STEAM_API_KEY=your_steam_api_key
RIOT_API_KEY=your_riot_api_key
XBOX_API_KEY=your_xbox_api_key
PLAYSTATION_API_KEY=your_playstation_api_key
EPIC_API_KEY=your_epic_api_key
NINTENDO_API_KEY=your_nintendo_api_key
EOL
    echo -e "${YELLOW}Please edit the .env file with your API keys before deploying.${NC}"
    exit 1
fi

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# Deploy using Serverless Framework
echo -e "${GREEN}Deploying Lambda functions...${NC}"
npx serverless deploy

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}==================================================${NC}"
    echo -e "${GREEN}Deployment successful!${NC}"
    echo -e "${GREEN}==================================================${NC}"
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "1. Copy the API Gateway URL from above"
    echo -e "2. Update your frontend's NEXT_PUBLIC_API_URL environment variable"
    echo -e "3. Rebuild and deploy your frontend application"
else
    echo -e "${RED}Deployment failed.${NC}"
    echo -e "${YELLOW}Check the error messages above for more information.${NC}"
fi 