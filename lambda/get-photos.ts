import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!;
const VOTES_TABLE = process.env.VOTES_TABLE!;
const CDN_URL = process.env.CDN_URL!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const user_id = event.queryStringParameters?.user_id;

    if (!user_id) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "user_id is required" }) };
    }

    // Get current month in YYYY-MM format
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get all active photos from the current month
    const allActivePhotos = await dynamo.scan({
      TableName: PHOTOS_TABLE,
      FilterExpression: '#status = :status AND begins_with(upload_timestamp, :year_month)',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'active',
        ':year_month': yearMonth
      }
    }).promise();

    // Get all votes by this user using the GSI
    const votesResult = await dynamo.query({
      TableName: VOTES_TABLE,
      IndexName: 'user-photo-index',
      KeyConditionExpression: 'user_id = :user_id',
      ExpressionAttributeValues: {
        ':user_id': user_id
      }
    }).promise();

    // Create a set of photo IDs the user has voted on
    const votedPhotoIds = new Set((votesResult.Items || []).map(vote => vote.photo_id));

    // Filter out photos the user has already voted on, and their own photo
    const unvotedPhotos = (allActivePhotos.Items || []).filter(photo =>
      !votedPhotoIds.has(photo.photo_id) && photo.user_id !== user_id
    );

    // Add CloudFront URL to each photo
    const photosWithUrls = unvotedPhotos.map(photo => ({
      ...photo,
      image_url: `${CDN_URL}/${photo.s3_key}`
    }));

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(photosWithUrls) };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error", message: (error as Error).message })
    };
  }
};
