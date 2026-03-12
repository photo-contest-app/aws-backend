import * as AWSMock from 'aws-sdk-mock';

const mockContext = {} as any;

const LAST_MONTH_YEAR = (() => {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
})();

beforeEach(() => {
  jest.resetModules();
  AWSMock.setSDKInstance(require('aws-sdk'));
  process.env.WINNERS_TABLE = 'WinnersTable';
  process.env.CDN_URL = 'https://test-cdn.cloudfront.net';
});

afterEach(() => {
  AWSMock.restore('DynamoDB.DocumentClient');
});

describe('get-winner', () => {
  it('returns 404 when no winner found for last month', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: undefined }));
    const { handler } = require('../lambda/get-winner');
    const result = await handler({} as any, mockContext, () => {});
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toMatch(/No winner/);
  });

  it('returns 200 with winner data for last month key', async () => {
    const winner = { month_year: LAST_MONTH_YEAR, photo_id: 'p1', user_id: 'u1', vote_count: 10, s3_key: 'photos/p1.jpg' };
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (params: any, cb: Function) => {
      expect(params.Key.month_year).toBe(LAST_MONTH_YEAR);
      cb(null, { Item: winner });
    });
    const { handler } = require('../lambda/get-winner');
    const result = await handler({} as any, mockContext, () => {});
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toMatchObject(winner);
    expect(body.image_url).toBe('https://test-cdn.cloudfront.net/photos/p1.jpg');
  });

  it('returns 500 on DynamoDB error', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(new Error('DynamoDB error'), null));
    const { handler } = require('../lambda/get-winner');
    const result = await handler({} as any, mockContext, () => {});
    expect(result.statusCode).toBe(500);
  });
});
