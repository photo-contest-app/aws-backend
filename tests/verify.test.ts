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

describe('verify', () => {
  it('returns 400 when required fields are missing', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/verify');
    const result = await handler(makeEvent({ email: 'test@test.com' }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/required/);
  });

  it('returns 200 when verification is successful', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/verify');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      code: '123456'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Email verified successfully');
  });

  it('returns 400 when verification code is invalid', async () => {
    const error: any = new Error('Invalid verification code');
    error.code = 'CodeMismatchException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/verify');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      code: 'wrong'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/Invalid verification code/);
  });

  it('returns 400 when verification code has expired', async () => {
    const error: any = new Error('Code expired');
    error.code = 'ExpiredCodeException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/verify');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      code: '123456'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/expired/);
  });

  it('returns 400 when user is already verified', async () => {
    const error: any = new Error('Already verified');
    error.code = 'NotAuthorizedException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/verify');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      code: '123456'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/already verified/);
  });

  it('returns 500 on unexpected error', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p: any, cb: Function) =>
      cb(new Error('Service unavailable'), null)
    );
    const { handler } = require('../lambda/verify');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      code: '123456'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(500);
  });
});

