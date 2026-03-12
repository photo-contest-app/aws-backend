import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

const cognito = new CognitoIdentityServiceProvider();
const dynamo = new AWS.DynamoDB.DocumentClient();

const USER_POOL_ID = process.env.USER_POOL_ID!;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;
const USERS_TABLE = process.env.USERS_TABLE!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password, first_name, last_name } = body;

    if (!email || !password || !first_name || !last_name) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "email, password, first_name, and last_name are required" })
      };
    }

    // Create user in Cognito
    const signUpResult = await cognito.signUp({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'given_name', Value: first_name },
        { Name: 'family_name', Value: last_name }
      ]
    }).promise();

    const user_id = signUpResult.UserSub;

    // Store user in DynamoDB
    await dynamo.put({
      TableName: USERS_TABLE,
      Item: {
        user_id,
        email,
        first_name,
        last_name,
        created_at: new Date().toISOString()
      }
    }).promise();

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "User registered successfully. Please check your email to verify your account.",
        user_id
      })
    };
  } catch (error: any) {
    console.error('Error:', error);

    // Handle Cognito-specific errors
    if (error.code === 'UsernameExistsException') {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "User with this email already exists" })
      };
    }

    if (error.code === 'InvalidPasswordException') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Password does not meet requirements" })
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error", message: error.message })
    };
  }
};

