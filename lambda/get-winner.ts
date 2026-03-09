import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();

const WINNERS_TABLE = process.env.WINNERS_TABLE!;

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthYear = lastMonth.toISOString().substring(0, 7);

    const result = await dynamo.get({
      TableName: WINNERS_TABLE,
      Key: { month_year: monthYear }
    }).promise();

    if (!result.Item) {
      return { statusCode: 404, body: JSON.stringify({ error: "No winner found for last month" }) };
    }

    return { statusCode: 200, body: JSON.stringify(result.Item) };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", message: (error as Error).message })
    };
  }
};
