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
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "email and password are required" })
      };
    }

    // Authenticate with Cognito
    const authResult = await cognito.initiateAuth({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    }).promise();

    if (!authResult.AuthenticationResult) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Authentication failed" })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Login successful",
        token: authResult.AuthenticationResult.IdToken,
        access_token: authResult.AuthenticationResult.AccessToken,
        refresh_token: authResult.AuthenticationResult.RefreshToken,
        expires_in: authResult.AuthenticationResult.ExpiresIn
      })
    };
  } catch (error: any) {
    console.error('Error:', error);

    // Handle Cognito authentication errors
    if (error.code === 'NotAuthorizedException') {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Incorrect email or password" })
      };
    }

    if (error.code === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "User not found" })
      };
    }

    if (error.code === 'UserNotConfirmedException') {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "User email is not verified. Please check your email for verification link." })
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error", message: error.message })
    };
  }
};

