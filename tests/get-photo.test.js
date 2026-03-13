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
const mockEvent = (id) => ({ pathParameters: id ? { id } : null });
const mockContext = {};
beforeEach(() => {
    jest.resetModules();
    AWSMock.setSDKInstance(require('aws-sdk'));
    process.env.PHOTOS_TABLE = 'PhotosTable';
    process.env.CDN_URL = 'https://test-cdn.cloudfront.net';
});
afterEach(() => {
    AWSMock.restore('DynamoDB.DocumentClient');
});
describe('get-photo', () => {
    it('returns 400 when photo_id is missing', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p, cb) => cb(null, {}));
        const { handler } = require('../lambda/get-photo');
        const result = await handler(mockEvent(), mockContext, () => { });
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toMatch(/required/);
    });
    it('returns 404 when photo does not exist', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p, cb) => cb(null, { Item: undefined }));
        const { handler } = require('../lambda/get-photo');
        const result = await handler(mockEvent('photo-123'), mockContext, () => { });
        expect(result.statusCode).toBe(404);
    });
    it('returns 404 when photo is not active', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p, cb) => cb(null, { Item: { photo_id: 'photo-123', status: 'inactive' } }));
        const { handler } = require('../lambda/get-photo');
        const result = await handler(mockEvent('photo-123'), mockContext, () => { });
        expect(result.statusCode).toBe(404);
    });
    it('returns 200 with photo when active', async () => {
        const photo = { photo_id: 'photo-123', status: 'active', title: 'Test', s3_key: 'photos/photo-123.jpg' };
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p, cb) => cb(null, { Item: photo }));
        const { handler } = require('../lambda/get-photo');
        const result = await handler(mockEvent('photo-123'), mockContext, () => { });
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body).toMatchObject(photo);
        expect(body.image_url).toBe('https://test-cdn.cloudfront.net/photos/photo-123.jpg');
    });
    it('returns 500 on DynamoDB error', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p, cb) => cb(new Error('DynamoDB error'), null));
        const { handler } = require('../lambda/get-photo');
        const result = await handler(mockEvent('photo-123'), mockContext, () => { });
        expect(result.statusCode).toBe(500);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXBob3RvLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtcGhvdG8udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUF3QztBQUV4QyxNQUFNLFNBQVMsR0FBRyxDQUFDLEVBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBVSxDQUFBLENBQUM7QUFDbkYsTUFBTSxXQUFXLEdBQUcsRUFBUyxDQUFDO0FBRTlCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7SUFDZCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDcEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxhQUFhLENBQUM7SUFDekMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsaUNBQWlDLENBQUM7QUFDMUQsQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLENBQUMsR0FBRyxFQUFFO0lBQ2IsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDekIsRUFBRSxDQUFDLHNDQUFzQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BELE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBTyxFQUFFLEVBQVksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hGLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQztR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LGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO0lBQ3RGLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLCtCQUErQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdDLE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBTyxFQUFFLEVBQVksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqSCxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDbkQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FBQztRQUM1RSxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgQVdTTW9jayBmcm9tICdhd3Mtc2RrLW1vY2snO1xuXG5jb25zdCBtb2NrRXZlbnQgPSAoaWQ/OiBzdHJpbmcpID0+ICh7IHBhdGhQYXJhbWV0ZXJzOiBpZCA/IHsgaWQgfSA6IG51bGwgfSBhcyBhbnkpO1xuY29uc3QgbW9ja0NvbnRleHQgPSB7fSBhcyBhbnk7XG5cbmJlZm9yZUVhY2goKCkgPT4ge1xuICBqZXN0LnJlc2V0TW9kdWxlcygpO1xuICBBV1NNb2NrLnNldFNES0luc3RhbmNlKHJlcXVpcmUoJ2F3cy1zZGsnKSk7XG4gIHByb2Nlc3MuZW52LlBIT1RPU19UQUJMRSA9ICdQaG90b3NUYWJsZSc7XG4gIHByb2Nlc3MuZW52LkNETl9VUkwgPSAnaHR0cHM6Ly90ZXN0LWNkbi5jbG91ZGZyb250Lm5ldCc7XG59KTtcblxuYWZ0ZXJFYWNoKCgpID0+IHtcbiAgQVdTTW9jay5yZXN0b3JlKCdEeW5hbW9EQi5Eb2N1bWVudENsaWVudCcpO1xufSk7XG5cbmRlc2NyaWJlKCdnZXQtcGhvdG8nLCAoKSA9PiB7XG4gIGl0KCdyZXR1cm5zIDQwMCB3aGVuIHBob3RvX2lkIGlzIG1pc3NpbmcnLCBhc3luYyAoKSA9PiB7XG4gICAgQVdTTW9jay5tb2NrKCdEeW5hbW9EQi5Eb2N1bWVudENsaWVudCcsICdnZXQnLCAoX3A6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PiBjYihudWxsLCB7fSkpO1xuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL2dldC1waG90bycpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50KCksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLmVycm9yKS50b01hdGNoKC9yZXF1aXJlZC8pO1xuICB9KTtcblxuICBpdCgncmV0dXJucyA0MDQgd2hlbiBwaG90byBkb2VzIG5vdCBleGlzdCcsIGFzeW5jICgpID0+IHtcbiAgICBBV1NNb2NrLm1vY2soJ0R5bmFtb0RCLkRvY3VtZW50Q2xpZW50JywgJ2dldCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG51bGwsIHsgSXRlbTogdW5kZWZpbmVkIH0pKTtcbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS9nZXQtcGhvdG8nKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCgncGhvdG8tMTIzJyksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwNCk7XG4gIH0pO1xuXG4gIGl0KCdyZXR1cm5zIDQwNCB3aGVuIHBob3RvIGlzIG5vdCBhY3RpdmUnLCBhc3luYyAoKSA9PiB7XG4gICAgQVdTTW9jay5tb2NrKCdEeW5hbW9EQi5Eb2N1bWVudENsaWVudCcsICdnZXQnLCAoX3A6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PlxuICAgICAgY2IobnVsbCwgeyBJdGVtOiB7IHBob3RvX2lkOiAncGhvdG8tMTIzJywgc3RhdHVzOiAnaW5hY3RpdmUnIH0gfSlcbiAgICApO1xuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL2dldC1waG90bycpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50KCdwaG90by0xMjMnKSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDA0KTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgMjAwIHdpdGggcGhvdG8gd2hlbiBhY3RpdmUnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcGhvdG8gPSB7IHBob3RvX2lkOiAncGhvdG8tMTIzJywgc3RhdHVzOiAnYWN0aXZlJywgdGl0bGU6ICdUZXN0JywgczNfa2V5OiAncGhvdG9zL3Bob3RvLTEyMy5qcGcnIH07XG4gICAgQVdTTW9jay5tb2NrKCdEeW5hbW9EQi5Eb2N1bWVudENsaWVudCcsICdnZXQnLCAoX3A6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PiBjYihudWxsLCB7IEl0ZW06IHBob3RvIH0pKTtcbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS9nZXQtcGhvdG8nKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCgncGhvdG8tMTIzJyksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgIGV4cGVjdChib2R5KS50b01hdGNoT2JqZWN0KHBob3RvKTtcbiAgICBleHBlY3QoYm9keS5pbWFnZV91cmwpLnRvQmUoJ2h0dHBzOi8vdGVzdC1jZG4uY2xvdWRmcm9udC5uZXQvcGhvdG9zL3Bob3RvLTEyMy5qcGcnKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgNTAwIG9uIER5bmFtb0RCIGVycm9yJywgYXN5bmMgKCkgPT4ge1xuICAgIEFXU01vY2subW9jaygnRHluYW1vREIuRG9jdW1lbnRDbGllbnQnLCAnZ2V0JywgKF9wOiBhbnksIGNiOiBGdW5jdGlvbikgPT4gY2IobmV3IEVycm9yKCdEeW5hbW9EQiBlcnJvcicpLCBudWxsKSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvZ2V0LXBob3RvJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQoJ3Bob3RvLTEyMycpLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg1MDApO1xuICB9KTtcbn0pO1xuIl19