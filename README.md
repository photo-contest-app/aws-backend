# Photo Contest Backend

![Tests](https://github.com/aga/aws-backend/actions/workflows/test.yml/badge.svg)

A serverless backend for a monthly photo contest application built with AWS CDK.

## Overview

Users submit one photo per month, vote on other users' submissions, and a winner is automatically calculated on the 8th of each month based on vote counts.

## Architecture

| Service | Purpose |
|---|---|
| **API Gateway HTTP API** | RESTful endpoints with CORS |
| **AWS Lambda** | Business logic (Node.js 24.x) |
| **DynamoDB** | Users, photos, votes, winners |
| **S3** | Photo file storage (private) |
| **CloudFront** | CDN for fast photo delivery |
| **Cognito** | Email-based sign-up / sign-in |
| **EventBridge** | Scheduled monthly winner calculation |

## API Endpoints

### Public
| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/photos?user_id=<id>` | List active photos for the current month, excluding the user's own and already-voted photos |
| `GET` | `/photos/{id}` | Get a single active photo |
| `GET` | `/winner/last-month` | Get last month's winner |

### Authenticated (Cognito JWT required)
| Method | Path | Description |
|---|---|---|
| `POST` | `/submit-photo` | Submit a photo (one per user per month) |
| `POST` | `/vote` | Vote for a photo (once per photo, own photos excluded) |

### Request / Response Examples

**POST /submit-photo**
```json
// Request
{ "user_id": "u1", "title": "Sunset", "description": "...", "image_data": "data:image/jpeg;base64,..." }

// Response 200
{ "photo_id": "1710000000000-abc123", "message": "Photo uploaded successfully" }
```

**POST /vote**
```json
// Request
{ "user_id": "u1", "photo_id": "p1" }

// Response 200
{ "message": "Vote registered" }
```

## Business Rules

- A user can submit **one active photo per month**.
- A user **cannot vote for their own photo**.
- A user **cannot vote twice** for the same photo.
- Voting is only allowed on photos from the **current month**.
- The monthly winner is the photo with the **highest vote count**; ties are broken by **earliest upload timestamp**.
- The winner is calculated automatically on the **8th of each month at 00:00 UTC**.

## Database Schema

| Table | Partition Key | Sort / GSI |
|---|---|---|
| `UsersTable` | `user_id` | GSI: `last_name` + `first_name` |
| `PhotosTable` | `photo_id` | GSI: `status` + `upload_timestamp` |
| `VotesTable` | `vote_id` | GSI: `user_id` + `photo_id` |
| `WinnersTable` | `month_year` | — |

## Development

### Prerequisites
- Node.js 22.x+
- AWS CLI configured with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

### Install & build
```bash
npm install
npm run build
```

### Run tests
```bash
npm test
```

Tests use [Jest](https://jestjs.io/) with [ts-jest](https://kulshekhar.github.io/ts-jest/) and [aws-sdk-mock](https://github.com/dwyl/aws-sdk-mock). All AWS calls are mocked — no AWS account needed to run tests.

### Deploy
```bash
cdk synth
cdk deploy
```

After deployment, the CDK outputs will print:
- `ApiUrl` — API Gateway endpoint
- `CDNUrl` — CloudFront distribution URL (`https://...`)
- `UserPoolId` — Cognito User Pool ID
- `UserPoolClientId` — Cognito User Pool Client ID

## Configuration

| Setting | Value |
|---|---|
| Region | `eu-north-1` (Stockholm), overridable via `CDK_DEFAULT_REGION` |
| Account | Resolved from `CDK_DEFAULT_ACCOUNT` at deploy time |
| Lambda runtime | Node.js 24.x |
| DynamoDB billing | Pay-per-request |
| S3 access | Private (CloudFront OAC only) |

## CI

GitHub Actions runs the full test suite on every push and pull request. See [`.github/workflows/test.yml`](.github/workflows/test.yml).

To enforce passing tests before merging, enable **branch protection** on `main`:
> Settings → Branches → Add rule → Require status checks → select `test`
