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
const makeEvent = (authHeader) => ({
    headers: authHeader ? { Authorization: authHeader } : {}
});
beforeEach(() => {
    jest.resetModules();
    AWSMock.setSDKInstance(require('aws-sdk'));
});
afterEach(() => {
    AWSMock.restore('CognitoIdentityServiceProvider');
});
describe('logout', () => {
    it('returns 401 when Authorization header is missing', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (_p, cb) => cb(null, {}));
        const { handler } = require('../lambda/logout');
        const result = await handler(makeEvent(), mockContext, () => { });
        expect(result.statusCode).toBe(401);
        expect(JSON.parse(result.body).error).toMatch(/Missing or invalid/);
    });
    it('returns 401 when Authorization header does not start with Bearer', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (_p, cb) => cb(null, {}));
        const { handler } = require('../lambda/logout');
        const result = await handler(makeEvent('Basic abc123'), mockContext, () => { });
        expect(result.statusCode).toBe(401);
        expect(JSON.parse(result.body).error).toMatch(/Missing or invalid/);
    });
    it('returns 200 and logs out user successfully', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (_p, cb) => cb(null, {}));
        const { handler } = require('../lambda/logout');
        const result = await handler(makeEvent('Bearer valid-access-token-123'), mockContext, () => { });
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).message).toBe('Logout successful');
    });
    it('returns 401 when token is invalid or expired', async () => {
        const error = new Error('Token is not valid');
        error.code = 'NotAuthorizedException';
        AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (_p, cb) => cb(error, null));
        const { handler } = require('../lambda/logout');
        const result = await handler(makeEvent('Bearer invalid-token'), mockContext, () => { });
        expect(result.statusCode).toBe(401);
        expect(JSON.parse(result.body).error).toMatch(/Invalid or expired token/);
    });
    it('returns 500 on unexpected error', async () => {
        AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (_p, cb) => cb(new Error('Service unavailable'), null));
        const { handler } = require('../lambda/logout');
        const result = await handler(makeEvent('Bearer valid-token'), mockContext, () => { });
        expect(result.statusCode).toBe(500);
    });
    it('extracts token correctly from Authorization header', async () => {
        let capturedAccessToken;
        AWSMock.mock('CognitoIdentityServiceProvider', 'globalSignOut', (params, cb) => {
            capturedAccessToken = params.AccessToken;
            cb(null, {});
        });
        const { handler } = require('../lambda/logout');
        await handler(makeEvent('Bearer my-access-token-xyz'), mockContext, () => { });
        expect(capturedAccessToken).toBe('my-access-token-xyz');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nb3V0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dvdXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUF3QztBQUV4QyxNQUFNLFdBQVcsR0FBRyxFQUFTLENBQUM7QUFDOUIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxVQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0NBQ2pELENBQUEsQ0FBQztBQUVWLFVBQVUsQ0FBQyxHQUFHLEVBQUU7SUFDZCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDcEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQztBQUVILFNBQVMsQ0FBQyxHQUFHLEVBQUU7SUFDYixPQUFPLENBQUMsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDcEQsQ0FBQyxDQUFDLENBQUM7QUFFSCxRQUFRLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtJQUN0QixFQUFFLENBQUMsa0RBQWtELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEUsT0FBTyxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFPLEVBQUUsRUFBWSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekcsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FB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QixDQUFDLENBQUM7SUFDMUQsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIEFXU01vY2sgZnJvbSAnYXdzLXNkay1tb2NrJztcblxuY29uc3QgbW9ja0NvbnRleHQgPSB7fSBhcyBhbnk7XG5jb25zdCBtYWtlRXZlbnQgPSAoYXV0aEhlYWRlcj86IHN0cmluZykgPT4gKHtcbiAgaGVhZGVyczogYXV0aEhlYWRlciA/IHsgQXV0aG9yaXphdGlvbjogYXV0aEhlYWRlciB9IDoge31cbn0gYXMgYW55KTtcblxuYmVmb3JlRWFjaCgoKSA9PiB7XG4gIGplc3QucmVzZXRNb2R1bGVzKCk7XG4gIEFXU01vY2suc2V0U0RLSW5zdGFuY2UocmVxdWlyZSgnYXdzLXNkaycpKTtcbn0pO1xuXG5hZnRlckVhY2goKCkgPT4ge1xuICBBV1NNb2NrLnJlc3RvcmUoJ0NvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcicpO1xufSk7XG5cbmRlc2NyaWJlKCdsb2dvdXQnLCAoKSA9PiB7XG4gIGl0KCdyZXR1cm5zIDQwMSB3aGVuIEF1dGhvcml6YXRpb24gaGVhZGVyIGlzIG1pc3NpbmcnLCBhc3luYyAoKSA9PiB7XG4gICAgQVdTTW9jay5tb2NrKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInLCAnZ2xvYmFsU2lnbk91dCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG51bGwsIHt9KSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvbG9nb3V0Jyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtYWtlRXZlbnQoKSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAxKTtcbiAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuZXJyb3IpLnRvTWF0Y2goL01pc3Npbmcgb3IgaW52YWxpZC8pO1xuICB9KTtcblxuICBpdCgncmV0dXJucyA0MDEgd2hlbiBBdXRob3JpemF0aW9uIGhlYWRlciBkb2VzIG5vdCBzdGFydCB3aXRoIEJlYXJlcicsIGFzeW5jICgpID0+IHtcbiAgICBBV1NNb2NrLm1vY2soJ0NvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcicsICdnbG9iYWxTaWduT3V0JywgKF9wOiBhbnksIGNiOiBGdW5jdGlvbikgPT4gY2IobnVsbCwge30pKTtcbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS9sb2dvdXQnKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1ha2VFdmVudCgnQmFzaWMgYWJjMTIzJyksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMSk7XG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLmVycm9yKS50b01hdGNoKC9NaXNzaW5nIG9yIGludmFsaWQvKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgMjAwIGFuZCBsb2dzIG91dCB1c2VyIHN1Y2Nlc3NmdWxseScsIGFzeW5jICgpID0+IHtcbiAgICBBV1NNb2NrLm1vY2soJ0NvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcicsICdnbG9iYWxTaWduT3V0JywgKF9wOiBhbnksIGNiOiBGdW5jdGlvbikgPT4gY2IobnVsbCwge30pKTtcbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS9sb2dvdXQnKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1ha2VFdmVudCgnQmVhcmVyIHZhbGlkLWFjY2Vzcy10b2tlbi0xMjMnKSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkubWVzc2FnZSkudG9CZSgnTG9nb3V0IHN1Y2Nlc3NmdWwnKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgNDAxIHdoZW4gdG9rZW4gaXMgaW52YWxpZCBvciBleHBpcmVkJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGVycm9yOiBhbnkgPSBuZXcgRXJyb3IoJ1Rva2VuIGlzIG5vdCB2YWxpZCcpO1xuICAgIGVycm9yLmNvZGUgPSAnTm90QXV0aG9yaXplZEV4Y2VwdGlvbic7XG4gICAgQVdTTW9jay5tb2NrKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInLCAnZ2xvYmFsU2lnbk91dCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKGVycm9yLCBudWxsKSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvbG9nb3V0Jyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtYWtlRXZlbnQoJ0JlYXJlciBpbnZhbGlkLXRva2VuJyksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMSk7XG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLmVycm9yKS50b01hdGNoKC9JbnZhbGlkIG9yIGV4cGlyZWQgdG9rZW4vKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgNTAwIG9uIHVuZXhwZWN0ZWQgZXJyb3InLCBhc3luYyAoKSA9PiB7XG4gICAgQVdTTW9jay5tb2NrKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInLCAnZ2xvYmFsU2lnbk91dCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+XG4gICAgICBjYihuZXcgRXJyb3IoJ1NlcnZpY2UgdW5hdmFpbGFibGUnKSwgbnVsbClcbiAgICApO1xuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL2xvZ291dCcpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobWFrZUV2ZW50KCdCZWFyZXIgdmFsaWQtdG9rZW4nKSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNTAwKTtcbiAgfSk7XG5cbiAgaXQoJ2V4dHJhY3RzIHRva2VuIGNvcnJlY3RseSBmcm9tIEF1dGhvcml6YXRpb24gaGVhZGVyJywgYXN5bmMgKCkgPT4ge1xuICAgIGxldCBjYXB0dXJlZEFjY2Vzc1Rva2VuOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgQVdTTW9jay5tb2NrKCdDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXInLCAnZ2xvYmFsU2lnbk91dCcsIChwYXJhbXM6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PiB7XG4gICAgICBjYXB0dXJlZEFjY2Vzc1Rva2VuID0gcGFyYW1zLkFjY2Vzc1Rva2VuO1xuICAgICAgY2IobnVsbCwge30pO1xuICAgIH0pO1xuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL2xvZ291dCcpO1xuICAgIGF3YWl0IGhhbmRsZXIobWFrZUV2ZW50KCdCZWFyZXIgbXktYWNjZXNzLXRva2VuLXh5eicpLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChjYXB0dXJlZEFjY2Vzc1Rva2VuKS50b0JlKCdteS1hY2Nlc3MtdG9rZW4teHl6Jyk7XG4gIH0pO1xufSk7XG5cbiJdfQ==