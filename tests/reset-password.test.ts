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

describe('reset-password', () => {
  it('returns 400 when required fields are missing', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmForgotPassword', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/reset-password');
    
    // Missing code and password
    let result = await handler(makeEvent({ email: 'test@test.com' }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/required/);

    // Missing password
    result = await handler(makeEvent({ email: 'test@test.com', code: '123456' }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/required/);

    // Missing code
    result = await handler(makeEvent({ email: 'test@test.com', password: 'NewPass123!' }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/required/);
  });

  it('returns 200 on successful password reset', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmForgotPassword', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/reset-password');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      code: '123456',
      password: 'NewPassword123!'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toMatch(/reset successfully/);
  });

  it('returns 400 when verification code is invalid', async () => {
    const error: any = new Error('Invalid verification code');
    error.code = 'CodeMismatchException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmForgotPassword', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/reset-password');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      code: 'wrongcode',
      password: 'NewPassword123!'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/Invalid verification code/);
  });

  it('returns 400 when verification code has expired', async () => {
    const error: any = new Error('Code expired');
    error.code = 'ExpiredCodeException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmForgotPassword', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/reset-password');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      code: '123456',
      password: 'NewPassword123!'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/expired/);
  });

  it('returns 400 when password does not meet requirements', async () => {
    const error: any = new Error('Invalid password');
    error.code = 'InvalidPasswordException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmForgotPassword', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/reset-password');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      code: '123456',
      password: 'weak'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/does not meet requirements/);
  });

  it('returns 404 when user does not exist', async () => {
    const error: any = new Error('User not found');
    error.code = 'UserNotFoundException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmForgotPassword', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/reset-password');
    const result = await handler(makeEvent({
      email: 'nonexistent@example.com',
      code: '123456',
      password: 'NewPassword123!'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toMatch(/User not found/);
  });

  it('returns 429 when too many attempts', async () => {
    const error: any = new Error('Too many attempts');
    error.code = 'LimitExceededException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmForgotPassword', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/reset-password');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      code: '123456',
      password: 'NewPassword123!'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(429);
    expect(JSON.parse(result.body).error).toMatch(/Too many attempts/);
  });

  it('returns 500 on unexpected error', async () => {
    const error: any = new Error('Unexpected error');
    error.code = 'UnknownError';
    AWSMock.mock('CognitoIdentityServiceProvider', 'confirmForgotPassword', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/reset-password');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      code: '123456',
      password: 'NewPassword123!'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toMatch(/Internal server error/);
  });
});
