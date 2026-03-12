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
const mockContext = {};
const makeEvent = (body) => ({ body: JSON.stringify(body) });
beforeEach(() => {
    jest.resetModules();
    AWSMock.setSDKInstance(require('aws-sdk'));
    process.env.USER_POOL_CLIENT_ID = 'test-client-id';
});
afterEach(() => {
    AWSMock.restore('CognitoIdentityServiceProvider');
});
describe('verify', () => {
    it('returns 400 when required fields are missing', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p, cb) => cb(null, {}));
        const { handler } = require('../lambda/verify');
        const result = await handler(makeEvent({ email: 'test@test.com' }), mockContext, () => { });
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toMatch(/required/);
    });
    it('returns 200 when verification is successful', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p, cb) => cb(null, {}));
        const { handler } = require('../lambda/verify');
        const result = await handler(makeEvent({
            email: 'test@example.com',
            code: '123456'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).message).toBe('Email verified successfully');
    });
    it('returns 400 when verification code is invalid', async () => {
        const error = new Error('Invalid verification code');
        error.code = 'CodeMismatchException';
        AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p, cb) => cb(error, null));
        const { handler } = require('../lambda/verify');
        const result = await handler(makeEvent({
            email: 'test@example.com',
            code: 'wrong'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toMatch(/Invalid verification code/);
    });
    it('returns 400 when verification code has expired', async () => {
        const error = new Error('Code expired');
        error.code = 'ExpiredCodeException';
        AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p, cb) => cb(error, null));
        const { handler } = require('../lambda/verify');
        const result = await handler(makeEvent({
            email: 'test@example.com',
            code: '123456'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toMatch(/expired/);
    });
    it('returns 400 when user is already verified', async () => {
        const error = new Error('Already verified');
        error.code = 'NotAuthorizedException';
        AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p, cb) => cb(error, null));
        const { handler } = require('../lambda/verify');
        const result = await handler(makeEvent({
            email: 'test@example.com',
            code: '123456'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toMatch(/already verified/);
    });
    it('returns 500 on unexpected error', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'confirmSignUp', (_p, cb) => cb(new Error('Service unavailable'), null));
        const { handler } = require('../lambda/verify');
        const result = await handler(makeEvent({
            email: 'test@example.com',
            code: '123456'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(500);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZ5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ2ZXJpZnkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUF3QztBQUV4QyxNQUFNLFdBQVcsR0FBRyxFQUFTLENBQUM7QUFDOUIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBVSxDQUFBLENBQUM7QUFFNUUsVUFBVSxDQUFDLEdBQUcsRUFBRTtJQUNkLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNwQixPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLENBQUMsR0FBRyxFQUFFO0lBQ2IsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQ3BELENBQUMsQ0FBQyxDQUFDO0FBRUgsUUFBUSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDdEIsRUFBRSxDQUFDLDhDQUE4QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBTyxFQUFFLEVBQVksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pHLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNoRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLENBQUMs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a0IsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLGlDQUFpQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9DLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBTyxFQUFFLEVBQVksRUFBRSxFQUFFLENBQ3hGLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUMzQyxDQUFDO1FBQ0YsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUNyQyxLQUFLLEVBQUUsa0JBQWtCO1lBQ3pCLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQyxFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FBQztRQUMzQixNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgQVdTTW9jayBmcm9tICdhd3Mtc2RrLW1vY2snO1xuXG5jb25zdCBtb2NrQ29udGV4dCA9IHt9IGFzIGFueTtcbmNvbnN0IG1ha2VFdmVudCA9IChib2R5OiBvYmplY3QpID0+ICh7IGJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpIH0gYXMgYW55KTtcblxuYmVmb3JlRWFjaCgoKSA9PiB7XG4gIGplc3QucmVzZXRNb2R1bGVzKCk7XG4gIEFXU01vY2suc2V0U0RLSW5zdGFuY2UocmVxdWlyZSgnYXdzLXNkaycpKTtcbiAgcHJvY2Vzcy5lbnYuVVNFUl9QT09MX0NMSUVOVF9JRCA9ICd0ZXN0LWNsaWVudC1pZCc7XG59KTtcblxuYWZ0ZXJFYWNoKCgpID0+IHtcbiAgQVdTTW9jay5yZXN0b3JlKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInKTtcbn0pO1xuXG5kZXNjcmliZSgndmVyaWZ5JywgKCkgPT4ge1xuICBpdCgncmV0dXJucyA0MDAgd2hlbiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmcnLCBhc3luYyAoKSA9PiB7XG4gICAgQVdTTW9jay5tb2NrKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInLCAnY29uZmlybVNpZ25VcCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG51bGwsIHt9KSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvdmVyaWZ5Jyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtYWtlRXZlbnQoeyBlbWFpbDogJ3Rlc3RAdGVzdC5jb20nIH0pLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xuICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KS5lcnJvcikudG9NYXRjaCgvcmVxdWlyZWQvKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgMjAwIHdoZW4gdmVyaWZpY2F0aW9uIGlzIHN1Y2Nlc3NmdWwnLCBhc3luYyAoKSA9PiB7XG4gICAgQVdTTW9jay5tb2NrKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInLCAnY29uZmlybVNpZ25VcCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG51bGwsIHt9KSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvdmVyaWZ5Jyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtYWtlRXZlbnQoe1xuICAgICAgZW1haWw6ICd0ZXN0QGV4YW1wbGUuY29tJyxcbiAgICAgIGNvZGU6ICcxMjM0NTYnXG4gICAgfSksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLm1lc3NhZ2UpLnRvQmUoJ0VtYWlsIHZlcmlmaWVkIHN1Y2Nlc3NmdWxseScpO1xuICB9KTtcblxuICBpdCgncmV0dXJucyA0MDAgd2hlbiB2ZXJpZmljYXRpb24gY29kZSBpcyBpbnZhbGlkJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGVycm9yOiBhbnkgPSBuZXcgRXJyb3IoJ0ludmFsaWQgdmVyaWZpY2F0aW9uIGNvZGUnKTtcbiAgICBlcnJvci5jb2RlID0gJ0NvZGVNaXNtYXRjaEV4Y2VwdGlvbic7XG4gICAgQVdTTW9jay5tb2NrKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInLCAnY29uZmlybVNpZ25VcCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKGVycm9yLCBudWxsKSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvdmVyaWZ5Jyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtYWtlRXZlbnQoe1xuICAgICAgZW1haWw6ICd0ZXN0QGV4YW1wbGUuY29tJyxcbiAgICAgIGNvZGU6ICd3cm9uZydcbiAgICB9KSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcbiAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuZXJyb3IpLnRvTWF0Y2goL0ludmFsaWQgdmVyaWZpY2F0aW9uIGNvZGUvKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgNDAwIHdoZW4gdmVyaWZpY2F0aW9uIGNvZGUgaGFzIGV4cGlyZWQnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZXJyb3I6IGFueSA9IG5ldyBFcnJvcignQ29kZSBleHBpcmVkJyk7XG4gICAgZXJyb3IuY29kZSA9ICdFeHBpcmVkQ29kZUV4Y2VwdGlvbic7XG4gICAgQVdTTW9jay5tb2NrKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInLCAnY29uZmlybVNpZ25VcCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKGVycm9yLCBudWxsKSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvdmVyaWZ5Jyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtYWtlRXZlbnQoe1xuICAgICAgZW1haWw6ICd0ZXN0QGV4YW1wbGUuY29tJyxcbiAgICAgIGNvZGU6ICcxMjM0NTYnXG4gICAgfSksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLmVycm9yKS50b01hdGNoKC9leHBpcmVkLyk7XG4gIH0pO1xuXG4gIGl0KCdyZXR1cm5zIDQwMCB3aGVuIHVzZXIgaXMgYWxyZWFkeSB2ZXJpZmllZCcsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBlcnJvcjogYW55ID0gbmV3IEVycm9yKCdBbHJlYWR5IHZlcmlmaWVkJyk7XG4gICAgZXJyb3IuY29kZSA9ICdOb3RBdXRob3JpemVkRXhjZXB0aW9uJztcbiAgICBBV1NNb2NrLm1vY2soJ0NvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcicsICdjb25maXJtU2lnblVwJywgKF9wOiBhbnksIGNiOiBGdW5jdGlvbikgPT4gY2IoZXJyb3IsIG51bGwpKTtcbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS92ZXJpZnknKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1ha2VFdmVudCh7XG4gICAgICBlbWFpbDogJ3Rlc3RAZXhhbXBsZS5jb20nLFxuICAgICAgY29kZTogJzEyMzQ1NidcbiAgICB9KSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcbiAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuZXJyb3IpLnRvTWF0Y2goL2FscmVhZHkgdmVyaWZpZWQvKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgNTAwIG9uIHVuZXhwZWN0ZWQgZXJyb3InLCBhc3luYyAoKSA9PiB7XG4gICAgQVdTTW9jay5tb2NrKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInLCAnY29uZmlybVNpZ25VcCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+XG4gICAgICBjYihuZXcgRXJyb3IoJ1NlcnZpY2UgdW5hdmFpbGFibGUnKSwgbnVsbClcbiAgICApO1xuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL3ZlcmlmeScpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobWFrZUV2ZW50KHtcbiAgICAgIGVtYWlsOiAndGVzdEBleGFtcGxlLmNvbScsXG4gICAgICBjb2RlOiAnMTIzNDU2J1xuICAgIH0pLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg1MDApO1xuICB9KTtcbn0pO1xuXG4iXX0=