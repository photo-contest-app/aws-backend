import * as AWSMock from 'aws-sdk-mock';

const LAST_MONTH_YEAR = (() => {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
})();

beforeEach(() => {
  jest.resetModules();
  AWSMock.setSDKInstance(require('aws-sdk'));
  process.env.PHOTOS_TABLE = 'PhotosTable';
  process.env.VOTES_TABLE = 'VotesTable';
  process.env.WINNERS_TABLE = 'WinnersTable';
});

afterEach(() => {
  AWSMock.restore('DynamoDB.DocumentClient');
});

describe('calculate-monthly-winner', () => {
  it('saves the photo with the most votes as winner', async () => {
    const photos = [
      { photo_id: 'p1', user_id: 'u1', title: 'Photo 1', vote_count: 5,  upload_timestamp: `${LAST_MONTH_YEAR}-01T00:00:00.000Z` },
      { photo_id: 'p2', user_id: 'u2', title: 'Photo 2', vote_count: 10, upload_timestamp: `${LAST_MONTH_YEAR}-02T00:00:00.000Z` },
      { photo_id: 'p3', user_id: 'u3', title: 'Photo 3', vote_count: 3,  upload_timestamp: `${LAST_MONTH_YEAR}-03T00:00:00.000Z` },
    ];
    let savedItem: any;
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: photos }));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (p: any, cb: Function) => { savedItem = p.Item; cb(null, {}); });
    const { handler } = require('../lambda/calculate-monthly-winner');
    await handler();
    expect(savedItem.photo_id).toBe('p2');
    expect(savedItem.month_year).toBe(LAST_MONTH_YEAR);
    expect(savedItem.vote_count).toBe(10);
  });

  it('breaks ties by earliest upload_timestamp', async () => {
    const photos = [
      { photo_id: 'p1', user_id: 'u1', title: 'Early', vote_count: 7, upload_timestamp: `${LAST_MONTH_YEAR}-01T00:00:00.000Z` },
      { photo_id: 'p2', user_id: 'u2', title: 'Late',  vote_count: 7, upload_timestamp: `${LAST_MONTH_YEAR}-15T00:00:00.000Z` },
    ];
    let savedItem: any;
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: photos }));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (p: any, cb: Function) => { savedItem = p.Item; cb(null, {}); });
    const { handler } = require('../lambda/calculate-monthly-winner');
    await handler();
    expect(savedItem.photo_id).toBe('p1');
  });

  it('does not save a winner when there are no photos', async () => {
    let putCalled = false;
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (_p: any, cb: Function) => cb(null, { Items: [] }));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) => { putCalled = true; cb(null, {}); });
    const { handler } = require('../lambda/calculate-monthly-winner');
    await handler();
    expect(putCalled).toBe(false);
  });

  it('queries last month with correct date range', async () => {
    let capturedParams: any;
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (p: any, cb: Function) => { capturedParams = p; cb(null, { Items: [] }); });
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/calculate-monthly-winner');
    await handler();
    expect(capturedParams.ExpressionAttributeValues[':start']).toMatch(new RegExp(`^${LAST_MONTH_YEAR}-01`));
    expect(capturedParams.ExpressionAttributeValues[':end']).toMatch(new RegExp(`^${LAST_MONTH_YEAR}`));
  });
});
