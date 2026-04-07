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

describe('forgot-password', () => {
  it('returns 400 when email is missing', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/forgot-password');
    const result = await handler(makeEvent({}), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/Email is required/);
  });

  it('returns 200 on successful forgot password request', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p: any, cb: Function) =>
      cb(null, { CodeDeliveryDetails: { Destination: 't***@e***.com', DeliveryMedium: 'EMAIL' } })
    );
    const { handler } = require('../lambda/forgot-password');
    const result = await handler(makeEvent({
      email: 'test@example.com'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toMatch(/reset code sent/);
  });

  it('returns 200 even when user does not exist (security)', async () => {
    const error: any = new Error('User not found');
    error.code = 'UserNotFoundException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/forgot-password');
    const result = await handler(makeEvent({
      email: 'nonexistent@example.com'
    }), mockContext, () => {});
    // Should return 200 to not reveal if user exists
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toMatch(/If an account/);
  });

  it('returns 400 when email format is invalid', async () => {
    const error: any = new Error('Invalid parameter');
    error.code = 'InvalidParameterException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/forgot-password');
    const result = await handler(makeEvent({
      email: 'invalid-email'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/Invalid email format/);
  });

  it('returns 429 when too many requests', async () => {
    const error: any = new Error('Too many requests');
    error.code = 'LimitExceededException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/forgot-password');
    const result = await handler(makeEvent({
      email: 'test@example.com'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(429);
    expect(JSON.parse(result.body).error).toMatch(/Too many requests/);
  });

  it('returns 500 on unexpected error', async () => {
    const error: any = new Error('Unexpected error');
    error.code = 'UnknownError';
    AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/forgot-password');
    const result = await handler(makeEvent({
      email: 'test@example.com'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toMatch(/Internal server error/);
  });
});
