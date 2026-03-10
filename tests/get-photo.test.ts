import * as AWSMock from 'aws-sdk-mock';

const mockEvent = (id?: string) => ({ pathParameters: id ? { id } : null } as any);
const mockContext = {} as any;

beforeEach(() => {
  jest.resetModules();
  AWSMock.setSDKInstance(require('aws-sdk'));
  process.env.PHOTOS_TABLE = 'PhotosTable';
});

afterEach(() => {
  AWSMock.restore('DynamoDB.DocumentClient');
});

describe('get-photo', () => {
  it('returns 400 when photo_id is missing', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/get-photo');
    const result = await handler(mockEvent(), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/required/);
  });

  it('returns 404 when photo does not exist', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: undefined }));
    const { handler } = require('../lambda/get-photo');
    const result = await handler(mockEvent('photo-123'), mockContext, () => {});
    expect(result.statusCode).toBe(404);
  });

  it('returns 404 when photo is not active', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) =>
      cb(null, { Item: { photo_id: 'photo-123', status: 'inactive' } })
    );
    const { handler } = require('../lambda/get-photo');
    const result = await handler(mockEvent('photo-123'), mockContext, () => {});
    expect(result.statusCode).toBe(404);
  });

  it('returns 200 with photo when active', async () => {
    const photo = { photo_id: 'photo-123', status: 'active', title: 'Test' };
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: photo }));
    const { handler } = require('../lambda/get-photo');
    const result = await handler(mockEvent('photo-123'), mockContext, () => {});
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(photo);
  });

  it('returns 500 on DynamoDB error', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(new Error('DynamoDB error'), null));
    const { handler } = require('../lambda/get-photo');
    const result = await handler(mockEvent('photo-123'), mockContext, () => {});
    expect(result.statusCode).toBe(500);
  });
});
