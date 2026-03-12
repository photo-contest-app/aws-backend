import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();

const WINNERS_TABLE = process.env.WINNERS_TABLE!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonthDate.getFullYear();
    const month = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
    const monthYear = `${year}-${month}`;

    const result = await dynamo.get({
      TableName: WINNERS_TABLE,
      Key: { month_year: monthYear }
    }).promise();

    if (!result.Item) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "No winner found for last month" }) };
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
