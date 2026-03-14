import * as AWSMock from 'aws-sdk-mock';

const mockEvent = (user_id?: string) => ({ queryStringParameters: user_id ? { user_id } : null } as any);
const mockContext = {} as any;

const CURRENT_YEAR_MONTH = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
})();

beforeEach(() => {
  jest.resetModules();
  AWSMock.setSDKInstance(require('aws-sdk'));
  process.env.PHOTOS_TABLE = 'PhotosTable';
  process.env.VOTES_TABLE = 'VotesTable';
  process.env.CDN_URL = 'https://test-cdn.cloudfront.net';
});

afterEach(() => {
  AWSMock.restore('DynamoDB.DocumentClient');
});

describe('get-photos', () => {
  it('returns 400 when user_id is missing', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: [] }));
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/get-photos');
    const result = await handler(mockEvent(), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/required/);
  });

  it('returns photos filtered by own photos with voted status', async () => {
    const photos = [
      { photo_id: 'p1', user_id: 'user-1', status: 'active', upload_timestamp: `${CURRENT_YEAR_MONTH}-01T10:00:00.000Z`, s3_key: 'photos/p1.jpg' },
      { photo_id: 'p2', user_id: 'user-2', status: 'active', upload_timestamp: `${CURRENT_YEAR_MONTH}-02T10:00:00.000Z`, s3_key: 'photos/p2.jpg' },
      { photo_id: 'p3', user_id: 'user-3', status: 'active', upload_timestamp: `${CURRENT_YEAR_MONTH}-03T10:00:00.000Z`, s3_key: 'photos/p3.jpg' },
    ];
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: photos }));
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) =>
      cb(null, { Items: [{ photo_id: 'p2', user_id: 'user-1' }] })
    );
    const { handler } = require('../lambda/get-photos');
    const result = await handler(mockEvent('user-1'), mockContext, () => {});
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveLength(2); // p2 and p3 (p1 is filtered out as it's user's own photo)
    // Photos should be sorted by timestamp descending (latest first)
    expect(body[0].photo_id).toBe('p3'); // Latest (03) comes first
    expect(body[0].voted).toBe(false);
    expect(body[0].image_url).toBe('https://test-cdn.cloudfront.net/photos/p3.jpg');
    expect(body[1].photo_id).toBe('p2'); // Earlier (02) comes second
    expect(body[1].voted).toBe(true); // p2 is voted
    expect(body[1].image_url).toBe('https://test-cdn.cloudfront.net/photos/p2.jpg');
  });

  it('returns only voted photos when user has voted on all other photos', async () => {
    const photos = [
      { photo_id: 'p1', user_id: 'user-1', status: 'active', upload_timestamp: `${CURRENT_YEAR_MONTH}-01T10:00:00.000Z`, s3_key: 'photos/p1.jpg' },
      { photo_id: 'p2', user_id: 'user-2', status: 'active', upload_timestamp: `${CURRENT_YEAR_MONTH}-02T10:00:00.000Z`, s3_key: 'photos/p2.jpg' },
    ];
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: photos }));
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) =>
      cb(null, { Items: [{ photo_id: 'p2', user_id: 'user-1' }] })
    );
    const { handler } = require('../lambda/get-photos');
    const result = await handler(mockEvent('user-1'), mockContext, () => {});
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toHaveLength(1); // p2 with voted: true (p1 is user's own photo)
    expect(body[0].photo_id).toBe('p2');
    expect(body[0].voted).toBe(true);
  });

  it('returns 500 on DynamoDB error', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(new Error('DynamoDB error'), null));
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/get-photos');
    const result = await handler(mockEvent('user-1'), mockContext, () => {});
    expect(result.statusCode).toBe(500);
  });
});
