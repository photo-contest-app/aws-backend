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
describe('forgot-password', () => {
    it('returns 400 when email is missing', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p, cb) => cb(null, {}));
        const { handler } = require('../lambda/forgot-password');
        const result = await handler(makeEvent({}), mockContext, () => { });
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toMatch(/Email is required/);
    });
    it('returns 200 on successful forgot password request', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p, cb) => cb(null, { CodeDeliveryDetails: { Destination: 't***@e***.com', DeliveryMedium: 'EMAIL' } }));
        const { handler } = require('../lambda/forgot-password');
        const result = await handler(makeEvent({
            email: 'test@example.com'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.message).toMatch(/reset code sent/);
    });
    it('returns 200 even when user does not exist (security)', async () => {
        const error = new Error('User not found');
        error.code = 'UserNotFoundException';
        AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p, cb) => cb(error, null));
        const { handler } = require('../lambda/forgot-password');
        const result = await handler(makeEvent({
            email: 'nonexistent@example.com'
        }), mockContext, () => { });
        // Should return 200 to not reveal if user exists
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).message).toMatch(/If an account/);
    });
    it('returns 400 when email format is invalid', async () => {
        const error = new Error('Invalid parameter');
        error.code = 'InvalidParameterException';
        AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p, cb) => cb(error, null));
        const { handler } = require('../lambda/forgot-password');
        const result = await handler(makeEvent({
            email: 'invalid-email'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toMatch(/Invalid email format/);
    });
    it('returns 429 when too many requests', async () => {
        const error = new Error('Too many requests');
        error.code = 'LimitExceededException';
        AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p, cb) => cb(error, null));
        const { handler } = require('../lambda/forgot-password');
        const result = await handler(makeEvent({
            email: 'test@example.com'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(429);
        expect(JSON.parse(result.body).error).toMatch(/Too many requests/);
    });
    it('returns 500 on unexpected error', async () => {
        const error = new Error('Unexpected error');
        error.code = 'UnknownError';
        AWSMock.mock('CognitoIdentityServiceProvider', 'forgotPassword', (_p, cb) => cb(error, null));
        const { handler } = require('../lambda/forgot-password');
        const result = await handler(makeEvent({
            email: 'test@example.com'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body).error).toMatch(/Internal server error/);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yZ290LXBhc3N3b3JkLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmb3Jnb3QtcGFzc3dvcmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUF3QztBQUV4QyxNQUFNLFdBQVcsR0FBRyxFQUFTLENBQUM7QUFDOUIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBVSxDQUFBLENBQUM7QUFFNUUsVUFBVSxDQUFDLEdBQUcsRUFBRTtJQUNkLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNwQixPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLENBQUMsR0FBRyxFQUFFO0lBQ2IsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQ3BELENBQUMsQ0FBQyxDQUFDO0FBRUgsUUFBUSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUMvQixFQUFFLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakQsT0FBTyxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQU8sRUFBRSxFQUFZLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxRyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDekQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FB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Q0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3JFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLGlDQUFpQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9DLE1BQU0sS0FBSyxHQUFRLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDakQsS0FBSyxDQUFDLElBQUksR0FBRyxjQUFjLENBQUM7UUFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQU8sRUFBRSxFQUFZLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM3RyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDekQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDO1lBQ3JDLEtBQUssRUFBRSxrQkFBa0I7U0FDMUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FBQztRQUMzQixNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDekUsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIEFXU01vY2sgZnJvbSAnYXdzLXNkay1tb2NrJztcblxuY29uc3QgbW9ja0NvbnRleHQgPSB7fSBhcyBhbnk7XG5jb25zdCBtYWtlRXZlbnQgPSAoYm9keTogb2JqZWN0KSA9PiAoeyBib2R5OiBKU09OLnN0cmluZ2lmeShib2R5KSB9IGFzIGFueSk7XG5cbmJlZm9yZUVhY2goKCkgPT4ge1xuICBqZXN0LnJlc2V0TW9kdWxlcygpO1xuICBBV1NNb2NrLnNldFNES0luc3RhbmNlKHJlcXVpcmUoJ2F3cy1zZGsnKSk7XG4gIHByb2Nlc3MuZW52LlVTRVJfUE9PTF9DTElFTlRfSUQgPSAndGVzdC1jbGllbnQtaWQnO1xufSk7XG5cbmFmdGVyRWFjaCgoKSA9PiB7XG4gIEFXU01vY2sucmVzdG9yZSgnQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyJyk7XG59KTtcblxuZGVzY3JpYmUoJ2ZvcmdvdC1wYXNzd29yZCcsICgpID0+IHtcbiAgaXQoJ3JldHVybnMgNDAwIHdoZW4gZW1haWwgaXMgbWlzc2luZycsIGFzeW5jICgpID0+IHtcbiAgICBBV1NNb2NrLm1vY2soJ0NvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcicsICdmb3Jnb3RQYXNzd29yZCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG51bGwsIHt9KSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvZm9yZ290LXBhc3N3b3JkJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtYWtlRXZlbnQoe30pLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xuICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KS5lcnJvcikudG9NYXRjaCgvRW1haWwgaXMgcmVxdWlyZWQvKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgMjAwIG9uIHN1Y2Nlc3NmdWwgZm9yZ290IHBhc3N3b3JkIHJlcXVlc3QnLCBhc3luYyAoKSA9PiB7XG4gICAgQVdTTW9jay5tb2NrKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInLCAnZm9yZ290UGFzc3dvcmQnLCAoX3A6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PlxuICAgICAgY2IobnVsbCwgeyBDb2RlRGVsaXZlcnlEZXRhaWxzOiB7IERlc3RpbmF0aW9uOiAndCoqKkBlKioqLmNvbScsIERlbGl2ZXJ5TWVkaXVtOiAnRU1BSUwnIH0gfSlcbiAgICApO1xuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL2ZvcmdvdC1wYXNzd29yZCcpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobWFrZUV2ZW50KHtcbiAgICAgIGVtYWlsOiAndGVzdEBleGFtcGxlLmNvbSdcbiAgICB9KSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgZXhwZWN0KGJvZHkubWVzc2FnZSkudG9NYXRjaCgvcmVzZXQgY29kZSBzZW50Lyk7XG4gIH0pO1xuXG4gIGl0KCdyZXR1cm5zIDIwMCBldmVuIHdoZW4gdXNlciBkb2VzIG5vdCBleGlzdCAoc2VjdXJpdHkpJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGVycm9yOiBhbnkgPSBuZXcgRXJyb3IoJ1VzZXIgbm90IGZvdW5kJyk7XG4gICAgZXJyb3IuY29kZSA9ICdVc2VyTm90Rm91bmRFeGNlcHRpb24nO1xuICAgIEFXU01vY2subW9jaygnQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyJywgJ2ZvcmdvdFBhc3N3b3JkJywgKF9wOiBhbnksIGNiOiBGdW5jdGlvbikgPT4gY2IoZXJyb3IsIG51bGwpKTtcbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS9mb3Jnb3QtcGFzc3dvcmQnKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1ha2VFdmVudCh7XG4gICAgICBlbWFpbDogJ25vbmV4aXN0ZW50QGV4YW1wbGUuY29tJ1xuICAgIH0pLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIC8vIFNob3VsZCByZXR1cm4gMjAwIHRvIG5vdCByZXZlYWwgaWYgdXNlciBleGlzdHNcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkubWVzc2FnZSkudG9NYXRjaCgvSWYgYW4gYWNjb3VudC8pO1xuICB9KTtcblxuICBpdCgncmV0dXJucyA0MDAgd2hlbiBlbWFpbCBmb3JtYXQgaXMgaW52YWxpZCcsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBlcnJvcjogYW55ID0gbmV3IEVycm9yKCdJbnZhbGlkIHBhcmFtZXRlcicpO1xuICAgIGVycm9yLmNvZGUgPSAnSW52YWxpZFBhcmFtZXRlckV4Y2VwdGlvbic7XG4gICAgQVdTTW9jay5tb2NrKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInLCAnZm9yZ290UGFzc3dvcmQnLCAoX3A6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PiBjYihlcnJvciwgbnVsbCkpO1xuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL2ZvcmdvdC1wYXNzd29yZCcpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobWFrZUV2ZW50KHtcbiAgICAgIGVtYWlsOiAnaW52YWxpZC1lbWFpbCdcbiAgICB9KSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcbiAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuZXJyb3IpLnRvTWF0Y2goL0ludmFsaWQgZW1haWwgZm9ybWF0Lyk7XG4gIH0pO1xuXG4gIGl0KCdyZXR1cm5zIDQyOSB3aGVuIHRvbyBtYW55IHJlcXVlc3RzJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGVycm9yOiBhbnkgPSBuZXcgRXJyb3IoJ1RvbyBtYW55IHJlcXVlc3RzJyk7XG4gICAgZXJyb3IuY29kZSA9ICdMaW1pdEV4Y2VlZGVkRXhjZXB0aW9uJztcbiAgICBBV1NNb2NrLm1vY2soJ0NvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcicsICdmb3Jnb3RQYXNzd29yZCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKGVycm9yLCBudWxsKSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvZm9yZ290LXBhc3N3b3JkJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtYWtlRXZlbnQoe1xuICAgICAgZW1haWw6ICd0ZXN0QGV4YW1wbGUuY29tJ1xuICAgIH0pLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MjkpO1xuICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KS5lcnJvcikudG9NYXRjaCgvVG9vIG1hbnkgcmVxdWVzdHMvKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgNTAwIG9uIHVuZXhwZWN0ZWQgZXJyb3InLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZXJyb3I6IGFueSA9IG5ldyBFcnJvcignVW5leHBlY3RlZCBlcnJvcicpO1xuICAgIGVycm9yLmNvZGUgPSAnVW5rbm93bkVycm9yJztcbiAgICBBV1NNb2NrLm1vY2soJ0NvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcicsICdmb3Jnb3RQYXNzd29yZCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKGVycm9yLCBudWxsKSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvZm9yZ290LXBhc3N3b3JkJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtYWtlRXZlbnQoe1xuICAgICAgZW1haWw6ICd0ZXN0QGV4YW1wbGUuY29tJ1xuICAgIH0pLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg1MDApO1xuICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KS5lcnJvcikudG9NYXRjaCgvSW50ZXJuYWwgc2VydmVyIGVycm9yLyk7XG4gIH0pO1xufSk7XG4iXX0=