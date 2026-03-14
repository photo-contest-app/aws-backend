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

    // Get start and end of current month for filtering votes
    const startOfMonth = `${yearMonth}-01T00:00:00.000Z`;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endOfMonth = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999Z`;

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

    // Get all votes by this user THIS MONTH using the GSI
    const votesResult = await dynamo.query({
      TableName: VOTES_TABLE,
      IndexName: 'user-photo-index',
      KeyConditionExpression: 'user_id = :user_id',
      FilterExpression: '#timestamp BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':user_id': user_id,
        ':start': startOfMonth,
        ':end': endOfMonth
      }
    }).promise();

    // Create a set of photo IDs the user has voted on
    const votedPhotoIds = new Set((votesResult.Items || []).map(vote => vote.photo_id));
    // Filter out user's own photo, but keep all other photos (including voted ones)
    const eligiblePhotos = (allActivePhotos.Items || []).filter(photo =>
      photo.user_id !== user_id
    );

    // Add CloudFront URL and voted status to each photo
    // Sort by upload_timestamp descending (latest first)
    eligiblePhotos.sort((a, b) => {
      return b.upload_timestamp.localeCompare(a.upload_timestamp);
    });

    const photosWithUrls = eligiblePhotos.map(photo => ({
      ...photo,
      image_url: `${CDN_URL}/${photo.s3_key}`,
      voted: votedPhotoIds.has(photo.photo_id)
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
