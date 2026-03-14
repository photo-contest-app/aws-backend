import * as AWSMock from 'aws-sdk-mock';

const mockContext = {} as any;
const makeEvent = (body: object) => ({ body: JSON.stringify(body) } as any);

const CURRENT_YEAR_MONTH = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
})();

beforeEach(() => {
  jest.resetModules();
  AWSMock.setSDKInstance(require('aws-sdk'));
  process.env.PHOTOS_TABLE = 'PhotosTable';
  process.env.USERS_TABLE = 'UsersTable';
  process.env.BUCKET = 'test-bucket';
});

afterEach(() => {
  AWSMock.restore('DynamoDB.DocumentClient');
  // Don't restore S3 since we're using jest.fn() for getSignedUrl
  jest.clearAllMocks();
});

describe('get-upload-url', () => {
  it('returns 400 when required fields are missing', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: { user_id: 'u1' } }));
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/get-upload-url');
    const result = await handler(makeEvent({ user_id: 'u1' }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/required/);
  });

  it('returns 400 when invalid content type provided', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: { user_id: 'u1' } }));
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/get-upload-url');
    const result = await handler(makeEvent({ user_id: 'u1', title: 'Test', content_type: 'application/pdf' }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/Invalid content type/);
  });

  it('returns 404 when user does not exist', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: undefined }));
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/get-upload-url');
    const result = await handler(makeEvent({ user_id: 'u1', title: 'Test', content_type: 'image/jpeg' }), mockContext, () => {});
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toMatch(/User not found/);
  });

  it('returns 409 when user already submitted photo this month', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: { user_id: 'u1' } }));
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) =>
      cb(null, { Items: [{ photo_id: 'p1', user_id: 'u1', upload_timestamp: `${CURRENT_YEAR_MONTH}-01T00:00:00.000Z` }] })
    );
    const { handler } = require('../lambda/get-upload-url');
    const result = await handler(makeEvent({ user_id: 'u1', title: 'Test', content_type: 'image/jpeg' }), mockContext, () => {});
    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body).error).toMatch(/already submitted/);
  });

  it('returns 200 with upload URL and photo ID', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: { user_id: 'u1' } }));
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: [] }));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) => cb(null, {}));

    // Mock S3 getSignedUrl - it's synchronous, returns a string directly
    const AWS = require('aws-sdk');
    AWS.S3.prototype.getSignedUrl = jest.fn().mockReturnValue('https://test-bucket.s3.amazonaws.com/uploads/test.jpg?signature=xyz');

    const { handler } = require('../lambda/get-upload-url');
    const result = await handler(makeEvent({ user_id: 'u1', title: 'Test Photo', description: 'Test', content_type: 'image/jpeg' }), mockContext, () => {});
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.upload_url).toBeDefined();
    expect(body.photo_id).toBeDefined();
    expect(body.s3_key).toMatch(/^uploads\//);
  });

  it('returns 500 on DynamoDB error', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(new Error('DynamoDB error'), null));
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/get-upload-url');
    const result = await handler(makeEvent({ user_id: 'u1', title: 'Test', content_type: 'image/jpeg' }), mockContext, () => {});
    expect(result.statusCode).toBe(500);
  });
});

