# vga-full-stack-checker

A full-stack gaming playtime tracker that shows hours played across multiple gaming platforms.

## Project Overview

This repository contains a Next.js 14 application that serves as a gaming playtime tracker. Users can input their gaming identifiers (Steam ID, Riot PUUID, Xbox Gamertag) and instantly see their playtime across multiple platforms without leaving the site.

## Key Features

- **Multi-platform Integration**: Tracks playtime across Steam, Riot Games (League of Legends), and Xbox Live
- **AWS Amplify Deployment**: Configured for seamless deployment on AWS infrastructure
- **DynamoDB Caching**: Optimized for serverless architecture with DynamoDB-based caching
- **Rate Limiting**: Protects APIs from abuse with configurable rate limiting
- **Responsive UI**: Mobile-friendly interface with Tailwind CSS

## Setup Instructions

See the detailed documentation in the `gaming-playtime-tracker` directory for complete setup and deployment instructions.

## AWS Infrastructure

This project is optimized for AWS Amplify deployment with the following components:

- **API Gateway**: Exposes the Next.js API routes as Lambda functions
- **Lambda Functions**: Handles API requests with optimized cold start times
- **DynamoDB**: Used for persistent caching and rate limiting in production
- **CloudWatch**: Monitoring and logging for all AWS resources

## Backend Setup Required

The backend team needs to configure the following AWS resources:

1. DynamoDB tables for caching and rate limiting
2. IAM roles and policies for Lambda functions
3. API key management with AWS Parameter Store
4. CloudWatch monitoring and alarms

Detailed instructions are available in the project documentation.
