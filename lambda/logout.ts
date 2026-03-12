import { APIGatewayProxyHandler } from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

const cognito = new CognitoIdentityServiceProvider();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Extract access token from Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Missing or invalid Authorization header" })
      };
    }

    const accessToken = authHeader.substring(7);

    // Call Cognito GlobalSignOut to invalidate all tokens for this user
    await cognito.globalSignOut({
      AccessToken: accessToken
    }).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Logout successful" })
    };
  } catch (error: any) {
    console.error('Error:', error);

    // Handle Cognito-specific errors
    if (error.code === 'NotAuthorizedException') {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Invalid or expired token" })
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error", message: error.message })
    };
  }
};

