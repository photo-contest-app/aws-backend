import * as AWSMock from 'aws-sdk-mock';

const mockContext = {} as any;
const makeEvent = (body: object) => ({ body: JSON.stringify(body) } as any);

beforeEach(() => {
  jest.resetModules();
  AWSMock.setSDKInstance(require('aws-sdk'));
  process.env.USER_POOL_CLIENT_ID = 'test-client-id';
});

afterEach(() => {
  AWSMock.restore('CognitoIdentityServiceProvider');
});

describe('login', () => {
  it('returns 400 when required fields are missing', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/login');
    const result = await handler(makeEvent({ email: 'test@test.com' }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/required/);
  });

  it('returns 200 and tokens on successful login', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p: any, cb: Function) =>
      cb(null, {
        AuthenticationResult: {
          IdToken: 'id-token-123',
          AccessToken: 'access-token-123',
          RefreshToken: 'refresh-token-123',
          ExpiresIn: 3600
        }
      })
    );
    const { handler } = require('../lambda/login');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      password: 'Test123!'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Login successful');
    expect(body.token).toBe('id-token-123');
    expect(body.access_token).toBe('access-token-123');
    expect(body.refresh_token).toBe('refresh-token-123');
  });

  it('returns 401 when credentials are incorrect', async () => {
    const error: any = new Error('Incorrect username or password');
    error.code = 'NotAuthorizedException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/login');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      password: 'WrongPassword'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toMatch(/Incorrect email or password/);
  });

  it('returns 404 when user does not exist', async () => {
    const error: any = new Error('User not found');
    error.code = 'UserNotFoundException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/login');
    const result = await handler(makeEvent({
      email: 'nonexistent@example.com',
      password: 'Test123!'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toMatch(/User not found/);
  });

  it('returns 403 when user email is not verified', async () => {
    const error: any = new Error('User is not confirmed');
    error.code = 'UserNotConfirmedException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/login');
    const result = await handler(makeEvent({
      email: 'unverified@example.com',
      password: 'Test123!'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body).error).toMatch(/not verified/);
  });

  it('returns 500 on unexpected error', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p: any, cb: Function) =>
      cb(new Error('Service unavailable'), null)
    );
    const { handler } = require('../lambda/login');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      password: 'Test123!'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(500);
  });
});

