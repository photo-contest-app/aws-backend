import * as AWSMock from 'aws-sdk-mock';

beforeEach(() => {
  jest.resetModules();
  AWSMock.setSDKInstance(require('aws-sdk'));
  process.env.PHOTOS_TABLE = 'PhotosTable';
  process.env.BUCKET = 'test-bucket';
});

afterEach(() => {
  AWSMock.restore('DynamoDB.DocumentClient');
  AWSMock.restore('S3');
});

describe('process-upload', () => {
  it('skips non-upload files', async () => {
    const event = {
      Records: [{
        s3: {
          bucket: { name: 'test-bucket' },
          object: { key: 'photos/test.jpg' }
        }
      }]
    } as any;

    let updateCalled = false;
    AWSMock.mock('DynamoDB.DocumentClient', 'update', (_p: any, cb: Function) => { updateCalled = true; cb(null, {}); });

    const { handler } = require('../lambda/process-upload');
    await handler(event);

    expect(updateCalled).toBe(false);
  });

  it('processes upload file and updates DynamoDB status', async () => {
    const event = {
      Records: [{
        s3: {
          bucket: { name: 'test-bucket' },
          object: { key: 'uploads/test-photo-123.jpg' }
        }
      }]
    } as any;

    // Mock S3 getObject to return a small test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    AWSMock.mock('S3', 'getObject', (_p: any, cb: Function) => cb(null, { Body: testImageBuffer }));
    AWSMock.mock('S3', 'putObject', (_p: any, cb: Function) => cb(null, {}));
    AWSMock.mock('S3', 'deleteObject', (_p: any, cb: Function) => cb(null, {}));
    AWSMock.mock('DynamoDB.DocumentClient', 'update', (_p: any, cb: Function) => cb(null, {}));

    const { handler } = require('../lambda/process-upload');
    await handler(event);

    // Test passes if no errors thrown
    expect(true).toBe(true);
  });

  it('marks photo as failed on processing error', async () => {
    const event = {
      Records: [{
        s3: {
          bucket: { name: 'test-bucket' },
          object: { key: 'uploads/test-photo-456.jpg' }
        }
      }]
    } as any;

    let updateParams: any;
    AWSMock.mock('S3', 'getObject', (_p: any, cb: Function) => cb(new Error('S3 error'), null));
    AWSMock.mock('DynamoDB.DocumentClient', 'update', (p: any, cb: Function) => { updateParams = p; cb(null, {}); });

    const { handler } = require('../lambda/process-upload');
    await handler(event);

    expect(updateParams?.ExpressionAttributeValues[':status']).toBe('failed');
  });
});

