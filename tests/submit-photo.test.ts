import AWSMock from 'aws-sdk-mock';

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
  process.env.BUCKET = 'PhotoBucket';
});

afterEach(() => {
  AWSMock.restore('DynamoDB.DocumentClient');
  AWSMock.restore('S3');
});

describe('submit-photo', () => {
  it('returns 400 when required fields are missing', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, {}));
    AWSMock.mock('S3', 'putObject', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/submit-photo');
    const result = await handler(makeEvent({ user_id: 'u1' }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/required/);
  });

  it('returns 404 when user does not exist', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: undefined }));
    AWSMock.mock('S3', 'putObject', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/submit-photo');
    const result = await handler(makeEvent({ user_id: 'u1', title: 'T', image_data: 'data:image/jpeg;base64,abc' }), mockContext, () => {});
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toMatch(/User not found/);
  });

  it('returns 409 when user already submitted a photo this month', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: { user_id: 'u1' } }));
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) =>
      cb(null, { Items: [{ photo_id: 'existing', user_id: 'u1', upload_timestamp: `${CURRENT_YEAR_MONTH}-01T00:00:00.000Z` }] })
    );
    AWSMock.mock('S3', 'putObject', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/submit-photo');
    const result = await handler(makeEvent({ user_id: 'u1', title: 'T', image_data: 'data:image/jpeg;base64,abc' }), mockContext, () => {});
    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body).error).toMatch(/already submitted/);
  });

  it('returns 200 and uploads photo successfully', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: { user_id: 'u1' } }));
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: [] }));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) => cb(null, {}));
    AWSMock.mock('S3', 'putObject', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/submit-photo');
    const result = await handler(makeEvent({ user_id: 'u1', title: 'My Photo', description: 'desc', image_data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgAB' }), mockContext, () => {});
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Photo uploaded successfully');
    expect(body.photo_id).toBeDefined();
  });

  it('derives correct content type from PNG data URI', async () => {
    let capturedS3Params: any;
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: { user_id: 'u1' } }));
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: [] }));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) => cb(null, {}));
    AWSMock.mock('S3', 'putObject', (params: any, cb: Function) => { capturedS3Params = params; cb(null, {}); });
    const { handler } = require('../lambda/submit-photo');
    await handler(makeEvent({ user_id: 'u1', title: 'PNG Photo', image_data: 'data:image/png;base64,iVBORw0KGgo=' }), mockContext, () => {});
    expect(capturedS3Params.ContentType).toBe('image/png');
    expect(capturedS3Params.Key).toMatch(/\.png$/);
  });

  it('returns 500 on DynamoDB error', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(new Error('DynamoDB error'), null));
    AWSMock.mock('S3', 'putObject', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/submit-photo');
    const result = await handler(makeEvent({ user_id: 'u1', title: 'T', image_data: 'data:image/jpeg;base64,abc' }), mockContext, () => {});
    expect(result.statusCode).toBe(500);
  });
});
