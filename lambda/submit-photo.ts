import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import sharp from 'sharp';

const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;
const BUCKET = process.env.BUCKET!;
const MAX_IMAGE_DIMENSION = 1000; // Maximum width or height in pixels

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { user_id, title, description, image_data } = body;

    if (!user_id || !title || !image_data) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "user_id, title, and image_data are required" }) };
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
    const key = `photos/${photo_id}.jpg`; // Always save as JPEG after processing

    // Decode base64 image
    const imageBuffer = Buffer.from(image_data.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    // Resize image if any dimension exceeds MAX_IMAGE_DIMENSION
    const metadata = await sharp(imageBuffer).metadata();
    let processedImageBuffer: Buffer;

    if (metadata.width && metadata.height && (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION)) {
      // Resize to fit within MAX_IMAGE_DIMENSION while maintaining aspect ratio
      processedImageBuffer = await sharp(imageBuffer)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 90 }) // Convert to JPEG with high quality
        .toBuffer();
    } else {
      // Image is already within limits, just convert to JPEG for consistency
      processedImageBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();
    }

    // Upload processed image to S3
    await s3.putObject({
      Bucket: BUCKET,
      Key: key,
      Body: processedImageBuffer,
      ContentType: 'image/jpeg'
    }).promise();

    // Store photo's metadata in DynamoDB
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
        status: 'active'
      }
    }).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        photo_id,
        message: "Photo uploaded successfully"
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
