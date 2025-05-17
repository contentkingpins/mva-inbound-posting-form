#!/bin/bash

# This script sets up the required AWS resources for the gaming-playtime-tracker
# Make sure you have the AWS CLI installed and configured with appropriate credentials

# Set variables
SERVICE_NAME="gaming-playtime-tracker"
STAGE="dev"
REGION="us-east-1"

echo "Setting up AWS resources for $SERVICE_NAME in $REGION ($STAGE environment)"

# Create Parameter Store entries for API keys
echo "Creating Parameter Store entries for API keys..."

# Steam API key
aws ssm put-parameter \
  --name "/gaming-playtime/steam-api-key" \
  --type "SecureString" \
  --value "YOUR_STEAM_API_KEY" \
  --description "Steam API Key for gaming-playtime-tracker" \
  --overwrite \
  --region $REGION

# Riot Games API key
aws ssm put-parameter \
  --name "/gaming-playtime/riot-api-key" \
  --type "SecureString" \
  --value "YOUR_RIOT_API_KEY" \
  --description "Riot Games API Key for gaming-playtime-tracker" \
  --overwrite \
  --region $REGION

# Xbox Live credentials
aws ssm put-parameter \
  --name "/gaming-playtime/xbox-client-id" \
  --type "SecureString" \
  --value "YOUR_XBOX_CLIENT_ID" \
  --description "Xbox Live Client ID for gaming-playtime-tracker" \
  --overwrite \
  --region $REGION

aws ssm put-parameter \
  --name "/gaming-playtime/xbox-client-secret" \
  --type "SecureString" \
  --value "YOUR_XBOX_CLIENT_SECRET" \
  --description "Xbox Live Client Secret for gaming-playtime-tracker" \
  --overwrite \
  --region $REGION

# PlayStation Network API key
aws ssm put-parameter \
  --name "/gaming-playtime/playstation-api-key" \
  --type "SecureString" \
  --value "YOUR_PLAYSTATION_API_KEY" \
  --description "PlayStation Network API Key for gaming-playtime-tracker" \
  --overwrite \
  --region $REGION

# Epic Games credentials
aws ssm put-parameter \
  --name "/gaming-playtime/epic-client-id" \
  --type "SecureString" \
  --value "YOUR_EPIC_CLIENT_ID" \
  --description "Epic Games Client ID for gaming-playtime-tracker" \
  --overwrite \
  --region $REGION

aws ssm put-parameter \
  --name "/gaming-playtime/epic-client-secret" \
  --type "SecureString" \
  --value "YOUR_EPIC_CLIENT_SECRET" \
  --description "Epic Games Client Secret for gaming-playtime-tracker" \
  --overwrite \
  --region $REGION

# Nintendo credentials
aws ssm put-parameter \
  --name "/gaming-playtime/nintendo-client-id" \
  --type "SecureString" \
  --value "YOUR_NINTENDO_CLIENT_ID" \
  --description "Nintendo Client ID for gaming-playtime-tracker" \
  --overwrite \
  --region $REGION

aws ssm put-parameter \
  --name "/gaming-playtime/nintendo-client-secret" \
  --type "SecureString" \
  --value "YOUR_NINTENDO_CLIENT_SECRET" \
  --description "Nintendo Client Secret for gaming-playtime-tracker" \
  --overwrite \
  --region $REGION

echo "Parameter Store entries created successfully."

echo "All AWS resources have been set up for $SERVICE_NAME."
echo "NOTE: Replace 'YOUR_*_API_KEY' and other placeholder values with actual API keys before using."
echo "Next step: Deploy the application with 'serverless deploy'" 