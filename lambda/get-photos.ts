import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!;

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const result = await dynamo.scan({
      TableName: PHOTOS_TABLE,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'active'
      }
    }).promise();

    return { statusCode: 200, body: JSON.stringify(result.Items || []) };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", message: (error as Error).message })
    };
  }
};
