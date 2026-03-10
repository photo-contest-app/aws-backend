import AWSMock from 'aws-sdk-mock';

const mockContext = {} as any;
const makeEvent = (body: object) => ({ body: JSON.stringify(body) } as any);

const CURRENT_YEAR_MONTH = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
})();

const activePhoto = {
  photo_id: 'p1',
  user_id: 'other-user',
  status: 'active',
  upload_timestamp: `${CURRENT_YEAR_MONTH}-05T10:00:00.000Z`
};

beforeEach(() => {
  jest.resetModules();
  AWSMock.setSDKInstance(require('aws-sdk'));
  process.env.PHOTOS_TABLE = 'PhotosTable';
  process.env.USERS_TABLE = 'UsersTable';
  process.env.VOTES_TABLE = 'VotesTable';
});

afterEach(() => {
  AWSMock.restore('DynamoDB.DocumentClient');
});

describe('vote', () => {
  it('returns 400 when required fields are missing', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, {}));
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/vote');
    const result = await handler(makeEvent({ user_id: 'u1' }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/required/);
  });

  it('returns 404 when user does not exist', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(null, { Item: undefined }));
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/vote');
    const result = await handler(makeEvent({ user_id: 'u1', photo_id: 'p1' }), mockContext, () => {});
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toMatch(/User not found/);
  });

  it('returns 404 when photo does not exist', async () => {
    let callCount = 0;
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => {
      cb(null, callCount++ === 0 ? { Item: { user_id: 'u1' } } : { Item: undefined });
    });
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/vote');
    const result = await handler(makeEvent({ user_id: 'u1', photo_id: 'p1' }), mockContext, () => {});
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toMatch(/Photo not found/);
  });

  it('returns 404 when photo is not active', async () => {
    let callCount = 0;
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => {
      cb(null, callCount++ === 0 ? { Item: { user_id: 'u1' } } : { Item: { ...activePhoto, status: 'inactive' } });
    });
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/vote');
    const result = await handler(makeEvent({ user_id: 'u1', photo_id: 'p1' }), mockContext, () => {});
    expect(result.statusCode).toBe(404);
  });

  it('returns 403 when voting on own photo', async () => {
    let callCount = 0;
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => {
      cb(null, callCount++ === 0 ? { Item: { user_id: 'u1' } } : { Item: { ...activePhoto, user_id: 'u1' } });
    });
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/vote');
    const result = await handler(makeEvent({ user_id: 'u1', photo_id: 'p1' }), mockContext, () => {});
    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body).error).toMatch(/own photo/);
  });

  it('returns 400 when photo is from a different month', async () => {
    let callCount = 0;
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => {
      cb(null, callCount++ === 0 ? { Item: { user_id: 'u1' } } : { Item: { ...activePhoto, upload_timestamp: '2020-01-01T00:00:00.000Z' } });
    });
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/vote');
    const result = await handler(makeEvent({ user_id: 'u1', photo_id: 'p1' }), mockContext, () => {});
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/current month/);
  });

  it('returns 409 when user already voted for the photo', async () => {
    let callCount = 0;
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => {
      cb(null, callCount++ === 0 ? { Item: { user_id: 'u1' } } : { Item: activePhoto });
    });
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) =>
      cb(null, { Items: [{ vote_id: 'v1', user_id: 'u1', photo_id: 'p1' }] })
    );
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) => cb(null, {}));
    AWSMock.mock('DynamoDB.DocumentClient', 'update', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/vote');
    const result = await handler(makeEvent({ user_id: 'u1', photo_id: 'p1' }), mockContext, () => {});
    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body).error).toMatch(/already voted/);
  });

  it('returns 200 and registers vote successfully', async () => {
    let callCount = 0;
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => {
      cb(null, callCount++ === 0 ? { Item: { user_id: 'u1' } } : { Item: activePhoto });
    });
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) => cb(null, { Items: [] }));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (_p: any, cb: Function) => cb(null, {}));
    AWSMock.mock('DynamoDB.DocumentClient', 'update', (_p: any, cb: Function) => cb(null, {}));
    const { handler } = require('../lambda/vote');
    const result = await handler(makeEvent({ user_id: 'u1', photo_id: 'p1' }), mockContext, () => {});
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Vote registered');
  });

  it('returns 500 on DynamoDB error', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p: any, cb: Function) => cb(new Error('DynamoDB error'), null));
    AWSMock.mock('DynamoDB.DocumentClient', 'query', (_p: any, cb: Function) => cb(null, { Items: [] }));
    const { handler } = require('../lambda/vote');
    const result = await handler(makeEvent({ user_id: 'u1', photo_id: 'p1' }), mockContext, () => {});
    expect(result.statusCode).toBe(500);
  });
});

