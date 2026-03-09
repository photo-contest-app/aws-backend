import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!;
const VOTES_TABLE = process.env.VOTES_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { user_id, photo_id } = body;

    if (!user_id || !photo_id) {
      return { statusCode: 400, body: JSON.stringify({ error: "user_id and photo_id are required" }) };
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
      return { statusCode: 400, body: JSON.stringify({ error: "User has already voted for this photo" }) };
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

    return { statusCode: 200, body: JSON.stringify({ message: "vote registered" }) };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", message: (error as Error).message })
    };
  }
};
