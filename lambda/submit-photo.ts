import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;
const BUCKET = process.env.BUCKET!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { user_id, title, description, image_data } = body;

    if (!user_id || !title || !image_data) {
      return { statusCode: 400, body: JSON.stringify({ error: "user_id, title, and image_data are required" }) };
    }

    // Verify the user exists
    const userResult = await dynamo.get({
      TableName: USERS_TABLE,
      Key: { user_id }
    }).promise();

    if (!userResult.Item) {
      return { statusCode: 404, body: JSON.stringify({ error: "User not found" }) };
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
      return { statusCode: 409, body: JSON.stringify({ error: "You have already submitted a photo this month" }) };
    }

    // Derive content type from base64 data URI
    const mimeMatch = image_data.match(/^data:(image\/\w+);base64,/);
    const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = contentType.split('/')[1];

    const photo_id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const key = `photos/${photo_id}.${ext}`;

    // Decode base64 image and upload to S3
    const imageBuffer = Buffer.from(image_data.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    await s3.putObject({
      Bucket: BUCKET,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType
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
      body: JSON.stringify({
        photo_id,
        message: "Photo uploaded successfully"
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", message: (error as Error).message })
    };
  }
};
