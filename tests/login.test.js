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
describe('login', () => {
    it('returns 400 when required fields are missing', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p, cb) => cb(null, {}));
        const { handler } = require('../lambda/login');
        const result = await handler(makeEvent({ email: 'test@test.com' }), mockContext, () => { });
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).error).toMatch(/required/);
    });
    it('returns 200 and tokens on successful login', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p, cb) => cb(null, {
            AuthenticationResult: {
                IdToken: 'id-token-123',
                AccessToken: 'access-token-123',
                RefreshToken: 'refresh-token-123',
                ExpiresIn: 3600
            }
        }));
        const { handler } = require('../lambda/login');
        const result = await handler(makeEvent({
            email: 'test@example.com',
            password: 'Test123!'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Login successful');
        expect(body.token).toBe('id-token-123');
        expect(body.access_token).toBe('access-token-123');
        expect(body.refresh_token).toBe('refresh-token-123');
    });
    it('returns 401 when credentials are incorrect', async () => {
        const error = new Error('Incorrect username or password');
        error.code = 'NotAuthorizedException';
        AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p, cb) => cb(error, null));
        const { handler } = require('../lambda/login');
        const result = await handler(makeEvent({
            email: 'test@example.com',
            password: 'WrongPassword'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(401);
        expect(JSON.parse(result.body).error).toMatch(/Incorrect email or password/);
    });
    it('returns 404 when user does not exist', async () => {
        const error = new Error('User not found');
        error.code = 'UserNotFoundException';
        AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p, cb) => cb(error, null));
        const { handler } = require('../lambda/login');
        const result = await handler(makeEvent({
            email: 'nonexistent@example.com',
            password: 'Test123!'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body).error).toMatch(/User not found/);
    });
    it('returns 403 when user email is not verified', async () => {
        const error = new Error('User is not confirmed');
        error.code = 'UserNotConfirmedException';
        AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p, cb) => cb(error, null));
        const { handler } = require('../lambda/login');
        const result = await handler(makeEvent({
            email: 'unverified@example.com',
            password: 'Test123!'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(403);
        expect(JSON.parse(result.body).error).toMatch(/not verified/);
    });
    it('returns 500 on unexpected error', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'initiateAuth', (_p, cb) => cb(new Error('Service unavailable'), null));
        const { handler } = require('../lambda/login');
        const result = await handler(makeEvent({
            email: 'test@example.com',
            password: 'Test123!'
        }), mockContext, () => { });
        expect(result.statusCode).toBe(500);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4udGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxvZ2luLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBd0M7QUFFeEMsTUFBTSxXQUFXLEdBQUcsRUFBUyxDQUFDO0FBQzlCLE1BQU0sU0FBUyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQVUsQ0FBQSxDQUFDO0FBRTVFLFVBQVUsQ0FBQyxHQUFHLEVBQUU7SUFDZCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDcEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLGdCQUFnQixDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBUyxDQUFDLEdBQUcsRUFBRTtJQUNiLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO0lBQ3JCLEVBQUUsQ0FBQyw4Q0FBOEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxPQUFPLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQU8sRUFBRSxFQUFZLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4RyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDL0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxDQUFDLEVB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dCI6WyJpbXBvcnQgKiBhcyBBV1NNb2NrIGZyb20gJ2F3cy1zZGstbW9jayc7XG5cbmNvbnN0IG1vY2tDb250ZXh0ID0ge30gYXMgYW55O1xuY29uc3QgbWFrZUV2ZW50ID0gKGJvZHk6IG9iamVjdCkgPT4gKHsgYm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSkgfSBhcyBhbnkpO1xuXG5iZWZvcmVFYWNoKCgpID0+IHtcbiAgamVzdC5yZXNldE1vZHVsZXMoKTtcbiAgQVdTTW9jay5zZXRTREtJbnN0YW5jZShyZXF1aXJlKCdhd3Mtc2RrJykpO1xuICBwcm9jZXNzLmVudi5VU0VSX1BPT0xfQ0xJRU5UX0lEID0gJ3Rlc3QtY2xpZW50LWlkJztcbn0pO1xuXG5hZnRlckVhY2goKCkgPT4ge1xuICBBV1NNb2NrLnJlc3RvcmUoJ0NvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcicpO1xufSk7XG5cbmRlc2NyaWJlKCdsb2dpbicsICgpID0+IHtcbiAgaXQoJ3JldHVybnMgNDAwIHdoZW4gcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nJywgYXN5bmMgKCkgPT4ge1xuICAgIEFXU01vY2subW9jaygnQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyJywgJ2luaXRpYXRlQXV0aCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG51bGwsIHt9KSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvbG9naW4nKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1ha2VFdmVudCh7IGVtYWlsOiAndGVzdEB0ZXN0LmNvbScgfSksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLmVycm9yKS50b01hdGNoKC9yZXF1aXJlZC8pO1xuICB9KTtcblxuICBpdCgncmV0dXJucyAyMDAgYW5kIHRva2VucyBvbiBzdWNjZXNzZnVsIGxvZ2luJywgYXN5bmMgKCkgPT4ge1xuICAgIEFXU01vY2subW9jaygnQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyJywgJ2luaXRpYXRlQXV0aCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+XG4gICAgICBjYihudWxsLCB7XG4gICAgICAgIEF1dGhlbnRpY2F0aW9uUmVzdWx0OiB7XG4gICAgICAgICAgSWRUb2tlbjogJ2lkLXRva2VuLTEyMycsXG4gICAgICAgICAgQWNjZXNzVG9rZW46ICdhY2Nlc3MtdG9rZW4tMTIzJyxcbiAgICAgICAgICBSZWZyZXNoVG9rZW46ICdyZWZyZXNoLXRva2VuLTEyMycsXG4gICAgICAgICAgRXhwaXJlc0luOiAzNjAwXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKTtcbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS9sb2dpbicpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobWFrZUV2ZW50KHtcbiAgICAgIGVtYWlsOiAndGVzdEBleGFtcGxlLmNvbScsXG4gICAgICBwYXNzd29yZDogJ1Rlc3QxMjMhJ1xuICAgIH0pLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICBleHBlY3QoYm9keS5tZXNzYWdlKS50b0JlKCdMb2dpbiBzdWNjZXNzZnVsJyk7XG4gICAgZXhwZWN0KGJvZHkudG9rZW4pLnRvQmUoJ2lkLXRva2VuLTEyMycpO1xuICAgIGV4cGVjdChib2R5LmFjY2Vzc190b2tlbikudG9CZSgnYWNjZXNzLXRva2VuLTEyMycpO1xuICAgIGV4cGVjdChib2R5LnJlZnJlc2hfdG9rZW4pLnRvQmUoJ3JlZnJlc2gtdG9rZW4tMTIzJyk7XG4gIH0pO1xuXG4gIGl0KCdyZXR1cm5zIDQwMSB3aGVuIGNyZWRlbnRpYWxzIGFyZSBpbmNvcnJlY3QnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZXJyb3I6IGFueSA9IG5ldyBFcnJvcignSW5jb3JyZWN0IHVzZXJuYW1lIG9yIHBhc3N3b3JkJyk7XG4gICAgZXJyb3IuY29kZSA9ICdOb3RBdXRob3JpemVkRXhjZXB0aW9uJztcbiAgICBBV1NNb2NrLm1vY2soJ0NvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcicsICdpbml0aWF0ZUF1dGgnLCAoX3A6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PiBjYihlcnJvciwgbnVsbCkpO1xuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL2xvZ2luJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtYWtlRXZlbnQoe1xuICAgICAgZW1haWw6ICd0ZXN0QGV4YW1wbGUuY29tJyxcbiAgICAgIHBhc3N3b3JkOiAnV3JvbmdQYXNzd29yZCdcbiAgICB9KSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAxKTtcbiAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuZXJyb3IpLnRvTWF0Y2goL0luY29ycmVjdCBlbWFpbCBvciBwYXNzd29yZC8pO1xuICB9KTtcblxuICBpdCgncmV0dXJucyA0MDQgd2hlbiB1c2VyIGRvZXMgbm90IGV4aXN0JywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGVycm9yOiBhbnkgPSBuZXcgRXJyb3IoJ1VzZXIgbm90IGZvdW5kJyk7XG4gICAgZXJyb3IuY29kZSA9ICdVc2VyTm90Rm91bmRFeGNlcHRpb24nO1xuICAgIEFXU01vY2subW9jaygnQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyJywgJ2luaXRpYXRlQXV0aCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKGVycm9yLCBudWxsKSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvbG9naW4nKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1ha2VFdmVudCh7XG4gICAgICBlbWFpbDogJ25vbmV4aXN0ZW50QGV4YW1wbGUuY29tJyxcbiAgICAgIHBhc3N3b3JkOiAnVGVzdDEyMyEnXG4gICAgfSksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwNCk7XG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLmVycm9yKS50b01hdGNoKC9Vc2VyIG5vdCBmb3VuZC8pO1xuICB9KTtcblxuICBpdCgncmV0dXJucyA0MDMgd2hlbiB1c2VyIGVtYWlsIGlzIG5vdCB2ZXJpZmllZCcsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBlcnJvcjogYW55ID0gbmV3IEVycm9yKCdVc2VyIGlzIG5vdCBjb25maXJtZWQnKTtcbiAgICBlcnJvci5jb2RlID0gJ1VzZXJOb3RDb25maXJtZWRFeGNlcHRpb24nO1xuICAgIEFXU01vY2subW9jaygnQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyJywgJ2luaXRpYXRlQXV0aCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKGVycm9yLCBudWxsKSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvbG9naW4nKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1ha2VFdmVudCh7XG4gICAgICBlbWFpbDogJ3VudmVyaWZpZWRAZXhhbXBsZS5jb20nLFxuICAgICAgcGFzc3dvcmQ6ICdUZXN0MTIzISdcbiAgICB9KSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAzKTtcbiAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuZXJyb3IpLnRvTWF0Y2goL25vdCB2ZXJpZmllZC8pO1xuICB9KTtcblxuICBpdCgncmV0dXJucyA1MDAgb24gdW5leHBlY3RlZCBlcnJvcicsIGFzeW5jICgpID0+IHtcbiAgICBBV1NNb2NrLm1vY2soJ0NvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcicsICdpbml0aWF0ZUF1dGgnLCAoX3A6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PlxuICAgICAgY2IobmV3IEVycm9yKCdTZXJ2aWNlIHVuYXZhaWxhYmxlJyksIG51bGwpXG4gICAgKTtcbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS9sb2dpbicpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobWFrZUV2ZW50KHtcbiAgICAgIGVtYWlsOiAndGVzdEBleGFtcGxlLmNvbScsXG4gICAgICBwYXNzd29yZDogJ1Rlc3QxMjMhJ1xuICAgIH0pLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg1MDApO1xuICB9KTtcbn0pO1xuXG4iXX0=