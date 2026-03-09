# Photo Contest Backend

A serverless backend for a monthly photo contest application built with AWS CDK.

## Overview

This application allows users to submit photos for a monthly contest, vote on submissions, and automatically determines winners at the end of each month.

## Architecture

The backend is built using AWS serverless services:

- **API Gateway HTTP API** - RESTful API endpoints
- **AWS Lambda** - Serverless compute for business logic
- **DynamoDB** - NoSQL database for storing users, photos, votes, and winners
- **S3** - Object storage for photo files
- **CloudFront** - CDN for fast photo delivery
- **Cognito** - User authentication and authorization
- **EventBridge** - Scheduled monthly winner calculation

## API Endpoints

### Public Endpoints
- `GET /health` - Health check endpoint
- `GET /photos` - List all photos
- `GET /photos/{id}` - Get specific photo details
- `GET /winner/last-month` - Get last month's winner

### Authenticated Endpoints (require Cognito token)
- `POST /submit-photo` - Submit a photo to the contest
- `POST /vote` - Vote for a photo

## Features

- **User Authentication** - Cognito handles sign-up, sign-in with email
- **Photo Submission** - Users can submit photos stored in S3
- **Voting System** - Users can vote for photos with duplicate vote prevention
- **Automatic Winner Calculation** - Lambda runs on the 8th of each month at 00:00 UTC to calculate the winner based on vote counts
- **CDN Distribution** - Photos served via CloudFront for fast global access

## Database Schema

### Tables
- **UsersTable** - User profiles (partition key: `user_id`)
- **PhotosTable** - Photo submissions (partition key: `photo_id`)
- **VotesTable** - User votes (partition key: `vote_id`, GSI: `user_id` + `photo_id`)
- **WinnersTable** - Monthly winners (partition key: `month_year`)

## Deployment

### Prerequisites
- AWS CLI configured with credentials
- Node.js 20.x
- AWS CDK CLI

### Deploy
```bash
npm install
npm run build
cdk synth
cdk deploy
```

After deployment, the stack outputs will include:
- API Gateway endpoint URL
- CloudFront distribution URL
- Cognito User Pool ID
- Cognito User Pool Client ID

## Configuration

- **Region**: eu-north-1 (Stockholm)
- **Billing**: Pay-per-request for DynamoDB
- **Runtime**: Node.js 20.x for Lambda functions
