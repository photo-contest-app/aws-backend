import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;
const VOTES_TABLE = process.env.VOTES_TABLE!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { user_id, photo_id } = body;

    if (!user_id || !photo_id) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "user_id and photo_id are required" }) };
    }

    // Verify the user exists
    const userResult = await dynamo.get({
      TableName: USERS_TABLE,
      Key: { user_id }
    }).promise();

    if (!userResult.Item) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "User not found" }) };
    }

    // Verify the photo exists and is active
    const photoResult = await dynamo.get({
      TableName: PHOTOS_TABLE,
      Key: { photo_id }
    }).promise();

    if (!photoResult.Item || photoResult.Item.status !== 'active') {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "Photo not found" }) };
    }

    // Prevent voting on own photo
    if (photoResult.Item.user_id === user_id) {
      return { statusCode: 403, headers: CORS_HEADERS, body: JSON.stringify({ error: "You cannot vote for your own photo" }) };
    }

    // Verify photo is from the current contest month
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!photoResult.Item.upload_timestamp.startsWith(yearMonth)) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "You can only vote for photos from the current month" }) };
    }

    // Check if user already voted for this photo
    const existingVotes = await dynamo.query({
      TableName: VOTES_TABLE,
      IndexName: 'user-photo-index',
      KeyConditionExpression: 'user_id = :user_id AND photo_id = :photo_id',
      ExpressionAttributeValues: {
        ':user_id': user_id,
        ':photo_id': photo_id
      }
    }).promise();

    if (existingVotes.Items && existingVotes.Items.length > 0) {
      return { statusCode: 409, headers: CORS_HEADERS, body: JSON.stringify({ error: "You have already voted for this photo" }) };
    }

    const vote_id = `${user_id}-${photo_id}-${Date.now()}`;

    // Record the vote
    await dynamo.put({
      TableName: VOTES_TABLE,
      Item: {
        vote_id,
        user_id,
        photo_id,
        timestamp: new Date().toISOString()
      }
    }).promise();

    // Increment vote count on photo
    await dynamo.update({
      TableName: PHOTOS_TABLE,
      Key: { photo_id },
      UpdateExpression: 'SET vote_count = if_not_exists(vote_count, :zero) + :inc',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':zero': 0
      }
    }).promise();

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: "Vote registered" }) };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error", message: (error as Error).message })
    };
  }
};
