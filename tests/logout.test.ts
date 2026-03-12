import * as AWSMock from 'aws-sdk-mock';

const mockContext = {} as any;
const makeEvent = (authHeader?: string) => ({
  headers: authHeader ? { Authorization: authHeader } : {}
} as any);

beforeEach(() => {
  jest.resetModules();
  AWSMock.setSDKInstance(require('aws-sdk'));
});

afterEach(() => {
  AWSMock.restore('CognitoIdentityServiceProvider');
});

describe('logout', () => {
  it('returns 401 when Authorization header is missing', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/logout');
    const result = await handler(makeEvent(), mockContext, () => {});
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toMatch(/Missing or invalid/);
  });

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/logout');
    const result = await handler(makeEvent('Basic abc123'), mockContext, () => {});
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toMatch(/Missing or invalid/);
  });

  it('returns 200 and logs out user successfully', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/logout');
    const result = await handler(makeEvent('Bearer valid-access-token-123'), mockContext, () => {});
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Logout successful');
  });

  it('returns 401 when token is invalid or expired', async () => {
    const error: any = new Error('Token is not valid');
    error.code = 'NotAuthorizedException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (_p: any, cb: Function) => cb(error, null));
    const { handler } = require('../lambda/logout');
    const result = await handler(makeEvent('Bearer invalid-token'), mockContext, () => {});
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toMatch(/Invalid or expired token/);
  });

  it('returns 500 on unexpected error', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (_p: any, cb: Function) =>
      cb(new Error('Service unavailable'), null)
    );
    const { handler } = require('../lambda/logout');
    const result = await handler(makeEvent('Bearer valid-token'), mockContext, () => {});
    expect(result.statusCode).toBe(500);
  });

  it('extracts token correctly from Authorization header', async () => {
    let capturedAccessToken: string | undefined;
    AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (params: any, cb: Function) => {
      capturedAccessToken = params.AccessToken;
      cb(null, {});
    });
    const { handler } = require('../lambda/logout');
    await handler(makeEvent('Bearer my-access-token-xyz'), mockContext, () => {});
    expect(capturedAccessToken).toBe('my-access-token-xyz');
  });
});

