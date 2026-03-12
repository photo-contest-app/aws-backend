import { APIGatewayProxyHandler } from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

const cognito = new CognitoIdentityServiceProvider();

const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, code } = body;

    if (!email || !code) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "email and code are required" })
      };
    }

    // Confirm the sign up with the verification code
    await cognito.confirmSignUp({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      ConfirmationCode: code
    }).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Email verified successfully"
      })
    };
  } catch (error: any) {
    console.error('Error:', error);

    // Handle Cognito verification errors
    if (error.code === 'CodeMismatchException') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Invalid verification code. Please check and try again." })
      };
    }

    if (error.code === 'ExpiredCodeException') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Verification code has expired. Please request a new one." })
      };
    }

    if (error.code === 'NotAuthorizedException') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "User is already verified or does not exist." })
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error", message: error.message })
    };
  }
};

