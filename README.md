# Photo Contest Backend

![Tests](../../actions/workflows/test.yml/badge.svg)

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
| `POST` | `/register` | Register a new user with Cognito |
| `POST` | `/login` | Login and get JWT tokens |
| `POST` | `/logout` | Logout and invalidate all user tokens |
| `GET` | `/photos?user_id=<id>` | List active photos for the current month, excluding the user's own and already-voted photos |
| `GET` | `/photos/{id}` | Get a single active photo |
| `GET` | `/winner/last-month` | Get last month's winner |

### Authenticated (Cognito JWT required)
| Method | Path | Description |
|---|---|---|
| `POST` | `/submit-photo` | Submit a photo (one per user per month) |
| `POST` | `/vote` | Vote for a photo (once per photo, own photos excluded) |

### Request / Response Examples

**POST /register**
```json
// Request
{ "email": "user@example.com", "password": "SecurePass123!", "first_name": "John", "last_name": "Doe" }

// Response 201
{ "message": "User registered successfully. Please check your email to verify your account.", "user_id": "abc123..." }
```

**POST /login**
```json
// Request
{ "email": "user@example.com", "password": "SecurePass123!" }

// Response 200
{
  "message": "Login successful",
  "token": "eyJraWQiOiJ...",
  "access_token": "eyJraWQiOiJ...",
  "refresh_token": "eyJjdHkiOiJ...",
  "expires_in": 3600
}
```

**POST /logout**
```json
// Request (requires Authorization header with access_token from /login)
// No body needed

// Response 200
{ "message": "Logout successful" }
```

**POST /submit-photo**
```json
// Request (requires Authorization header with token from /login)
{ "user_id": "u1", "title": "Sunset", "description": "...", "image_data": "data:image/jpeg;base64,..." }

// Response 200
{ "photo_id": "1710000000000-abc123", "message": "Photo uploaded successfully" }
```

**POST /vote**
```json
// Request (requires Authorization header with token from /login)
{ "user_id": "u1", "photo_id": "p1" }

// Response 200
{ "message": "Vote registered" }
```

## Business Rules

- A user can submit **one active photo per month**.
- Images are **automatically resized** if any dimension exceeds **1000px** (aspect ratio maintained).
- All uploaded images are **converted to JPEG** format for consistency.
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

## Usage Examples (curl)

Replace `<API_URL>` with your actual API Gateway endpoint from the `ApiUrl` CDK output.

### Register a new user
```bash
curl -X POST <API_URL>/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully. Please check your email to verify your account.",
  "user_id": "abc123-def456-..."
}
```

> **Note:** Cognito will send a verification email. The user must click the link before they can login.

### Login
```bash
curl -X POST <API_URL>/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJraWQiOiJ...",
  "access_token": "eyJraWQiOiJ...",
  "refresh_token": "eyJjdHkiOiJ...",
  "expires_in": 3600
}
```

Save the `token` value — you'll need it for authenticated endpoints.

### Logout
```bash
TOKEN="<token_from_login>"

curl -X POST <API_URL>/logout \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

> **Note:** This invalidates all tokens for the user (IdToken, AccessToken, RefreshToken). They will need to login again.

### Submit a photo (authenticated)
```bash
TOKEN="<token_from_login>"

curl -X POST <API_URL>/submit-photo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "user_id": "abc123-def456-...",
    "title": "Sunset over Stockholm",
    "description": "Beautiful evening at the waterfront",
    "image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
  }'
```

**Response:**
```json
{
  "photo_id": "1710259200000-a1b2c3d4e",
  "message": "Photo uploaded successfully"
}
```

> **Note:** Images are automatically resized to a maximum of 1000px on any side (maintaining aspect ratio) and converted to JPEG format.

### Get photos to vote on
```bash
curl "<API_URL>/photos?user_id=abc123-def456-..."
```

**Response:** Array of photos from the current month, excluding your own and already-voted photos:
```json
[
  {
    "photo_id": "p1",
    "user_id": "other-user-id",
    "title": "Northern Lights",
    "description": "...",
    "s3_key": "photos/p1.jpg",
    "upload_timestamp": "2026-03-05T10:00:00.000Z",
    "vote_count": 5,
    "status": "active"
  }
]
```

### Vote for a photo (authenticated)
```bash
TOKEN="<token_from_login>"

curl -X POST <API_URL>/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "user_id": "abc123-def456-...",
    "photo_id": "p1"
  }'
```

**Response:**
```json
{
  "message": "Vote registered"
}
```

### Get a specific photo
```bash
curl "<API_URL>/photos/p1"
```

**Response:**
```json
{
  "photo_id": "p1",
  "user_id": "other-user-id",
  "title": "Northern Lights",
  "description": "...",
  "s3_key": "photos/p1.jpg",
  "upload_timestamp": "2026-03-05T10:00:00.000Z",
  "vote_count": 5,
  "status": "active"
}
```

### Get last month's winner
```bash
curl "<API_URL>/winner/last-month"
```

**Response:**
```json
{
  "month_year": "2026-02",
  "photo_id": "winner-photo-id",
  "user_id": "winner-user-id",
  "title": "Winning Photo Title",
  "vote_count": 42,
  "calculated_at": "2026-03-08T00:00:00.000Z"
}
```

### Health check
```bash
curl "<API_URL>/health"
```

**Response:**
```json
{
  "status": "ok"
}
```

