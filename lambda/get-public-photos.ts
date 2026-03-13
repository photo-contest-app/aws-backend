import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!;
const CDN_URL = process.env.CDN_URL!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 10;

    // Get current month in YYYY-MM format
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get all active photos from the current month
    const result = await dynamo.scan({
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

    // Sort by upload timestamp (newest first) and limit results
    const sortedPhotos = (result.Items || [])
      .sort((a, b) => b.upload_timestamp.localeCompare(a.upload_timestamp))
      .slice(0, limit);

    // Add CloudFront URL to each photo
    const photosWithUrls = sortedPhotos.map(photo => ({
      photo_id: photo.photo_id,
      title: photo.title,
      upload_timestamp: photo.upload_timestamp,
      vote_count: photo.vote_count || 0,
      s3_key: photo.s3_key,
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

