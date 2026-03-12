import { APIGatewayProxyHandler } from 'aws-lambda';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async () => {
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ status: "ok" }) };
};
