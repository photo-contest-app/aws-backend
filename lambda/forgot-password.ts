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
    const { email } = body;

    if (!email) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Email is required" })
      };
    }

    // Initiate forgot password flow with Cognito
    await cognito.forgotPassword({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email
    }).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Password reset code sent to your email. Please check your inbox."
      })
    };
  } catch (error: any) {
    console.error('Error:', error);

    // Handle Cognito errors
    if (error.code === 'UserNotFoundException') {
      // For security, don't reveal if user exists or not
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: "If an account with that email exists, a password reset code has been sent."
        })
      };
    }

    if (error.code === 'InvalidParameterException') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Invalid email format" })
      };
    }

    if (error.code === 'LimitExceededException') {
      return {
        statusCode: 429,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Too many requests. Please try again later." })
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error", message: error.message })
    };
  }
};
