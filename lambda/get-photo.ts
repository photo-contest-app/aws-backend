import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const photo_id = event.pathParameters?.id;

    if (!photo_id) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "photo_id is required" }) };
    }

    const result = await dynamo.get({
      TableName: PHOTOS_TABLE,
      Key: { photo_id }
    }).promise();

    if (!result.Item) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "Photo not found" }) };
    }

    if (result.Item.status !== 'active') {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "Photo not found" }) };
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(result.Item) };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error", message: (error as Error).message })
    };
  }
};
