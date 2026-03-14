import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;
const BUCKET = process.env.BUCKET!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { user_id, title, description, content_type } = body;

    if (!user_id || !title) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "user_id and title are required" }) };
    }

    // Validate content type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!content_type || !validTypes.includes(content_type)) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid content type. Use JPEG, PNG, or WebP" }) };
    }

    // Verify the user exists
    const userResult = await dynamo.get({
      TableName: USERS_TABLE,
      Key: { user_id }
    }).promise();

    if (!userResult.Item) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "User not found" }) };
    }

    // Check for duplicate submission in the same month
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const existingPhotos = await dynamo.scan({
      TableName: PHOTOS_TABLE,
      FilterExpression: 'user_id = :user_id AND #status = :status AND begins_with(upload_timestamp, :year_month)',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':user_id': user_id,
        ':status': 'active',
        ':year_month': yearMonth
      }
    }).promise();

    if (existingPhotos.Items && existingPhotos.Items.length > 0) {
      return { statusCode: 409, headers: CORS_HEADERS, body: JSON.stringify({ error: "You have already submitted a photo this month" }) };
    }

    // Generate photo ID and S3 key
    const photo_id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const extension = content_type.split('/')[1];
    const key = `uploads/${photo_id}.${extension}`;

    // Generate presigned URL for direct S3 upload (30 MB limit, 5 minutes expiry)
    const uploadUrl = s3.getSignedUrl('putObject', {
      Bucket: BUCKET,
      Key: key,
      ContentType: content_type,
      Expires: 300 // 5 minutes
    });

    // Pre-create the photo record in DynamoDB with 'pending' status
    await dynamo.put({
      TableName: PHOTOS_TABLE,
      Item: {
        photo_id,
        user_id,
        title,
        description: description || '',
        s3_key: key,
        upload_timestamp: new Date().toISOString(),
        vote_count: 0,
        status: 'pending' // Will be changed to 'active' after processing
      }
    }).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        upload_url: uploadUrl,
        photo_id,
        s3_key: key
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error", message: (error as Error).message })
    };
  }
};

