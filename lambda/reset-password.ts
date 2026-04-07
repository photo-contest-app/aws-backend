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
    const { email, code, password } = body;

    if (!email || !code || !password) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Email, verification code, and new password are required" })
      };
    }

    // Confirm password reset with Cognito
    await cognito.confirmForgotPassword({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      Password: password
    }).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Password has been reset successfully. You can now log in with your new password."
      })
    };
  } catch (error: any) {
    console.error('Error:', error);

    // Handle Cognito errors
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

    if (error.code === 'InvalidPasswordException') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Password does not meet requirements. Please use a stronger password." })
      };
    }

    if (error.code === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "User not found" })
      };
    }

    if (error.code === 'LimitExceededException') {
      return {
        statusCode: 429,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Too many attempts. Please try again later." })
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error", message: error.message })
    };
  }
};
