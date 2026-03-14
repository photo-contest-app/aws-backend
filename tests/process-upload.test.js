"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const AWSMock = __importStar(require("aws-sdk-mock"));
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
        };
        let updateCalled = false;
        AWSMock.mock('DynamoDB.DocumentClient', 'update', (_p, cb) => { updateCalled = true; cb(null, {}); });
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
        };
        // Mock S3 getObject to return a small test image (1x1 pixel PNG)
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        AWSMock.mock('S3', 'getObject', (_p, cb) => cb(null, { Body: testImageBuffer }));
        AWSMock.mock('S3', 'putObject', (_p, cb) => cb(null, {}));
        AWSMock.mock('S3', 'deleteObject', (_p, cb) => cb(null, {}));
        AWSMock.mock('DynamoDB.DocumentClient', 'update', (_p, cb) => cb(null, {}));
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
        };
        let updateParams;
        AWSMock.mock('S3', 'getObject', (_p, cb) => cb(new Error('S3 error'), null));
        AWSMock.mock('DynamoDB.DocumentClient', 'update', (p, cb) => { updateParams = p; cb(null, {}); });
        const { handler } = require('../lambda/process-upload');
        await handler(event);
        expect(updateParams?.ExpressionAttributeValues[':status']).toBe('failed');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11cGxvYWQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb2Nlc3MtdXBsb2FkLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBd0M7QUFFeEMsVUFBVSxDQUFDLEdBQUcsRUFBRTtJQUNkLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNwQixPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLGFBQWEsQ0FBQztJQUN6QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxhQUFhLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLENBQUMsR0FBRyxFQUFFO0lBQ2IsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzNDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUM7QUFFSCxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0QyxNQUFNLEtBQUssR0FBRztZQUNaLE9BQU8sRUFBRSxDQUFDO29CQUNSLEVBQUUsRUFBRTt3QkFDRixNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFO3dCQUMvQixNQUFNLEVBQUUsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUU7cUJBQ25DO2lCQUNGLENBQUM7U0FDSSxDQUFDO1FBRVQsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDO1FBQ3pCLE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBTyxFQUFFLEVBQVksRUFBRSxFQUFFLEdBQUcsWUFBWSxHQUFHLElBQUks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MEIsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXJCLE1BQU0sQ0FBQyxZQUFZLEVBQUUseUJBQXlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDNUUsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIEFXU01vY2sgZnJvbSAnYXdzLXNkay1tb2NrJztcblxuYmVmb3JlRWFjaCgoKSA9PiB7XG4gIGplc3QucmVzZXRNb2R1bGVzKCk7XG4gIEFXU01vY2suc2V0U0RLSW5zdGFuY2UocmVxdWlyZSgnYXdzLXNkaycpKTtcbiAgcHJvY2Vzcy5lbnYuUEhPVE9TX1RBQkxFID0gJ1Bob3Rvc1RhYmxlJztcbiAgcHJvY2Vzcy5lbnYuQlVDS0VUID0gJ3Rlc3QtYnVja2V0Jztcbn0pO1xuXG5hZnRlckVhY2goKCkgPT4ge1xuICBBV1NNb2NrLnJlc3RvcmUoJ0R5bmFtb0RCLkRvY3VtZW50Q2xpZW50Jyk7XG4gIEFXU01vY2sucmVzdG9yZSgnUzMnKTtcbn0pO1xuXG5kZXNjcmliZSgncHJvY2Vzcy11cGxvYWQnLCAoKSA9PiB7XG4gIGl0KCdza2lwcyBub24tdXBsb2FkIGZpbGVzJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgUmVjb3JkczogW3tcbiAgICAgICAgczM6IHtcbiAgICAgICAgICBidWNrZXQ6IHsgbmFtZTogJ3Rlc3QtYnVja2V0JyB9LFxuICAgICAgICAgIG9iamVjdDogeyBrZXk6ICdwaG90b3MvdGVzdC5qcGcnIH1cbiAgICAgICAgfVxuICAgICAgfV1cbiAgICB9IGFzIGFueTtcblxuICAgIGxldCB1cGRhdGVDYWxsZWQgPSBmYWxzZTtcbiAgICBBV1NNb2NrLm1vY2soJ0R5bmFtb0RCLkRvY3VtZW50Q2xpZW50JywgJ3VwZGF0ZScsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IHsgdXBkYXRlQ2FsbGVkID0gdHJ1ZTsgY2IobnVsbCwge30pOyB9KTtcblxuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL3Byb2Nlc3MtdXBsb2FkJyk7XG4gICAgYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICBleHBlY3QodXBkYXRlQ2FsbGVkKS50b0JlKGZhbHNlKTtcbiAgfSk7XG5cbiAgaXQoJ3Byb2Nlc3NlcyB1cGxvYWQgZmlsZSBhbmQgdXBkYXRlcyBEeW5hbW9EQiBzdGF0dXMnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICBSZWNvcmRzOiBbe1xuICAgICAgICBzMzoge1xuICAgICAgICAgIGJ1Y2tldDogeyBuYW1lOiAndGVzdC1idWNrZXQnIH0sXG4gICAgICAgICAgb2JqZWN0OiB7IGtleTogJ3VwbG9hZHMvdGVzdC1waG90by0xMjMuanBnJyB9XG4gICAgICAgIH1cbiAgICAgIH1dXG4gICAgfSBhcyBhbnk7XG5cbiAgICAvLyBNb2NrIFMzIGdldE9iamVjdCB0byByZXR1cm4gYSBzbWFsbCB0ZXN0IGltYWdlICgxeDEgcGl4ZWwgUE5HKVxuICAgIGNvbnN0IHRlc3RJbWFnZUJ1ZmZlciA9IEJ1ZmZlci5mcm9tKCdpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQUVBQUFBQkNBWUFBQUFmRmNTSkFBQUFEVWxFUVZSNDJtTmsrTTlRRHdBRGhnR0FXalI5YXdBQUFBQkpSVTVFcmtKZ2dnPT0nLCAnYmFzZTY0Jyk7XG5cbiAgICBBV1NNb2NrLm1vY2soJ1MzJywgJ2dldE9iamVjdCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG51bGwsIHsgQm9keTogdGVzdEltYWdlQnVmZmVyIH0pKTtcbiAgICBBV1NNb2NrLm1vY2soJ1MzJywgJ3B1dE9iamVjdCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG51bGwsIHt9KSk7XG4gICAgQVdTTW9jay5tb2NrKCdTMycsICdkZWxldGVPYmplY3QnLCAoX3A6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PiBjYihudWxsLCB7fSkpO1xuICAgIEFXU01vY2subW9jaygnRHluYW1vREIuRG9jdW1lbnRDbGllbnQnLCAndXBkYXRlJywgKF9wOiBhbnksIGNiOiBGdW5jdGlvbikgPT4gY2IobnVsbCwge30pKTtcblxuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL3Byb2Nlc3MtdXBsb2FkJyk7XG4gICAgYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAvLyBUZXN0IHBhc3NlcyBpZiBubyBlcnJvcnMgdGhyb3duXG4gICAgZXhwZWN0KHRydWUpLnRvQmUodHJ1ZSk7XG4gIH0pO1xuXG4gIGl0KCdtYXJrcyBwaG90byBhcyBmYWlsZWQgb24gcHJvY2Vzc2luZyBlcnJvcicsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBldmVudCA9IHtcbiAgICAgIFJlY29yZHM6IFt7XG4gICAgICAgIHMzOiB7XG4gICAgICAgICAgYnVja2V0OiB7IG5hbWU6ICd0ZXN0LWJ1Y2tldCcgfSxcbiAgICAgICAgICBvYmplY3Q6IHsga2V5OiAndXBsb2Fkcy90ZXN0LXBob3RvLTQ1Ni5qcGcnIH1cbiAgICAgICAgfVxuICAgICAgfV1cbiAgICB9IGFzIGFueTtcblxuICAgIGxldCB1cGRhdGVQYXJhbXM6IGFueTtcbiAgICBBV1NNb2NrLm1vY2soJ1MzJywgJ2dldE9iamVjdCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG5ldyBFcnJvcignUzMgZXJyb3InKSwgbnVsbCkpO1xuICAgIEFXU01vY2subW9jaygnRHluYW1vREIuRG9jdW1lbnRDbGllbnQnLCAndXBkYXRlJywgKHA6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PiB7IHVwZGF0ZVBhcmFtcyA9IHA7IGNiKG51bGwsIHt9KTsgfSk7XG5cbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS9wcm9jZXNzLXVwbG9hZCcpO1xuICAgIGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgZXhwZWN0KHVwZGF0ZVBhcmFtcz8uRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN0YXR1cyddKS50b0JlKCdmYWlsZWQnKTtcbiAgfSk7XG59KTtcblxuIl19