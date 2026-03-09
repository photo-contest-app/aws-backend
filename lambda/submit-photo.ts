import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!;
const BUCKET = process.env.BUCKET!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { user_id, title, description, image_data } = body;

    if (!user_id || !title || !image_data) {
      return { statusCode: 400, body: JSON.stringify({ error: "user_id, title, and image_data are required" }) };
    }

    const photo_id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const key = `photos/${photo_id}.jpg`;

    // Decode base64 image and upload to S3
    const imageBuffer = Buffer.from(image_data.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    await s3.putObject({
      Bucket: BUCKET,
      Key: key,
      Body: imageBuffer,
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
