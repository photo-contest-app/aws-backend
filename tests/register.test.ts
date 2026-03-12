import * as AWSMock from 'aws-sdk-mock';

const mockContext = {} as any;
const makeEvent = (body: object) => ({ body: JSON.stringify(body) } as any);

beforeEach(() => {
  jest.resetModules();
  AWSMock.setSDKInstance(require('aws-sdk'));
  process.env.USER_POOL_ID = 'test-pool-id';
  process.env.USER_POOL_CLIENT_ID = 'test-client-id';
  process.env.USERS_TABLE = 'UsersTable';
});

afterEach(() => {
  AWSMock.restore('CognitoIdentityServiceProvider');
  AWSMock.restore('DynamoDB.DocumentClient');
});

describe('register', () => {
  it('returns 400 when required fields are missing', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'signUp', (_p: any, cb: Function) => cb(null, {}));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/register');
    const result = await handler(makeEvent({ email: 'test@test.com' }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/required/);
  });

  it('returns 201 and creates user in Cognito and DynamoDB', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'signUp', (_p: any, cb: Function) =>
      cb(null, { UserSub: 'user-123' })
    );
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/register');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      password: 'Test123!',
      first_name: 'John',
      last_name: 'Doe'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.message).toMatch(/registered successfully/);
    expect(body.user_id).toBe('user-123');
  });

  it('returns 409 when user already exists', async () => {
    const error: any = new Error('User already exists');
    error.code = 'UsernameExistsException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'signUp', (_p: any, cb: Function) => cb(error, null));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/register');
    const result = await handler(makeEvent({
      email: 'existing@example.com',
      password: 'Test123!',
      first_name: 'John',
      last_name: 'Doe'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body).error).toMatch(/already exists/);
  });

  it('returns 400 when password is invalid', async () => {
    const error: any = new Error('Invalid password');
    error.code = 'InvalidPasswordException';
    AWSMock.mock('CognitoIdentityServiceProvider', 'signUp', (_p: any, cb: Function) => cb(error, null));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/register');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      password: 'weak',
      first_name: 'John',
      last_name: 'Doe'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/Password does not meet requirements/);
  });

  it('returns 500 on DynamoDB error', async () => {
    AWSMock.mock('CognitoIdentityServiceProvider', 'signUp', (_p: any, cb: Function) =>
      cb(null, { UserSub: 'user-123' })
    );
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) =>
      cb(new Error('DynamoDB error'), null)
    );
    const { handler } = require('../lambda/register');
    const result = await handler(makeEvent({
      email: 'test@example.com',
      password: 'Test123!',
      first_name: 'John',
      last_name: 'Doe'
    }), mockContext, () => {});
    expect(result.statusCode).toBe(500);
  });
});

