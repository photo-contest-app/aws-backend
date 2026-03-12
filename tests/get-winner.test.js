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
const LAST_MONTH_YEAR = (() => {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
})();
beforeEach(() => {
    jest.resetModules();
    AWSMock.setSDKInstance(require('aws-sdk'));
    process.env.WINNERS_TABLE = 'WinnersTable';
});
afterEach(() => {
    AWSMock.restore('DynamoDB.DocumentClient');
});
describe('get-winner', () => {
    it('returns 404 when no winner found for last month', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p, cb) => cb(null, { Item: undefined }));
        const { handler } = require('../lambda/get-winner');
        const result = await handler({}, mockContext, () => { });
        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body).error).toMatch(/No winner/);
    });
    it('returns 200 with winner data for last month key', async () => {
        const winner = { month_year: LAST_MONTH_YEAR, photo_id: 'p1', user_id: 'u1', vote_count: 10 };
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, cb) => {
            expect(params.Key.month_year).toBe(LAST_MONTH_YEAR);
            cb(null, { Item: winner });
        });
        const { handler } = require('../lambda/get-winner');
        const result = await handler({}, mockContext, () => { });
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(winner);
    });
    it('returns 500 on DynamoDB error', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p, cb) => cb(new Error('DynamoDB error'), null));
        const { handler } = require('../lambda/get-winner');
        const result = await handler({}, mockContext, () => { });
        expect(result.statusCode).toBe(500);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXdpbm5lci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXdpbm5lci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0RBQXdDO0FBRXhDLE1BQU0sV0FBVyxHQUFHLEVBQVMsQ0FBQztBQUU5QixNQUFNLGVBQWUsR0FBRyxDQUFDLEdBQUcsRUFBRTtJQUM1QixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3ZCLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDakYsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUVMLFVBQVUsQ0FBQyxHQUFHLEVBQUU7SUFDZCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDcEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsR0FBRyxjQUFjLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLENBQUMsR0FBRyxFQUFFO0lBQ2IsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7SUFDMUIsRUFBRSxDQUFDLGlEQUFpRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9ELE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBTyxFQUFFLEVBQVksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekcsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLEVBQVMsRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM3RCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxpREFBaUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvRCxNQUFNLE1BQU0sR0FBRyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUM5RixPQUFPLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEtBQUssRUFBRSxDQUFDLE1BQVcsRUFBRSxFQUFZLEVBQUUsRUFBRTtZQUMzRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDcEQsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzdCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLEVBQVMsRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLCtCQUErQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdDLE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBTyxFQUFFLEVBQVksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqSCxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDcEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsRUFBUyxFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgQVdTTW9jayBmcm9tICdhd3Mtc2RrLW1vY2snO1xuXG5jb25zdCBtb2NrQ29udGV4dCA9IHt9IGFzIGFueTtcblxuY29uc3QgTEFTVF9NT05USF9ZRUFSID0gKCgpID0+IHtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgY29uc3QgbGFzdCA9IG5ldyBEYXRlKG5vdy5nZXRGdWxsWWVhcigpLCBub3cuZ2V0TW9udGgoKSAtIDEsIDEpO1xuICByZXR1cm4gYCR7bGFzdC5nZXRGdWxsWWVhcigpfS0ke1N0cmluZyhsYXN0LmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpfWA7XG59KSgpO1xuXG5iZWZvcmVFYWNoKCgpID0+IHtcbiAgamVzdC5yZXNldE1vZHVsZXMoKTtcbiAgQVdTTW9jay5zZXRTREtJbnN0YW5jZShyZXF1aXJlKCdhd3Mtc2RrJykpO1xuICBwcm9jZXNzLmVudi5XSU5ORVJTX1RBQkxFID0gJ1dpbm5lcnNUYWJsZSc7XG59KTtcblxuYWZ0ZXJFYWNoKCgpID0+IHtcbiAgQVdTTW9jay5yZXN0b3JlKCdEeW5hbW9EQi5Eb2N1bWVudENsaWVudCcpO1xufSk7XG5cbmRlc2NyaWJlKCdnZXQtd2lubmVyJywgKCkgPT4ge1xuICBpdCgncmV0dXJucyA0MDQgd2hlbiBubyB3aW5uZXIgZm91bmQgZm9yIGxhc3QgbW9udGgnLCBhc3luYyAoKSA9PiB7XG4gICAgQVdTTW9jay5tb2NrKCdEeW5hbW9EQi5Eb2N1bWVudENsaWVudCcsICdnZXQnLCAoX3A6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PiBjYihudWxsLCB7IEl0ZW06IHVuZGVmaW5lZCB9KSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvZ2V0LXdpbm5lcicpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoe30gYXMgYW55LCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDQpO1xuICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KS5lcnJvcikudG9NYXRjaCgvTm8gd2lubmVyLyk7XG4gIH0pO1xuXG4gIGl0KCdyZXR1cm5zIDIwMCB3aXRoIHdpbm5lciBkYXRhIGZvciBsYXN0IG1vbnRoIGtleScsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB3aW5uZXIgPSB7IG1vbnRoX3llYXI6IExBU1RfTU9OVEhfWUVBUiwgcGhvdG9faWQ6ICdwMScsIHVzZXJfaWQ6ICd1MScsIHZvdGVfY291bnQ6IDEwIH07XG4gICAgQVdTTW9jay5tb2NrKCdEeW5hbW9EQi5Eb2N1bWVudENsaWVudCcsICdnZXQnLCAocGFyYW1zOiBhbnksIGNiOiBGdW5jdGlvbikgPT4ge1xuICAgICAgZXhwZWN0KHBhcmFtcy5LZXkubW9udGhfeWVhcikudG9CZShMQVNUX01PTlRIX1lFQVIpO1xuICAgICAgY2IobnVsbCwgeyBJdGVtOiB3aW5uZXIgfSk7XG4gICAgfSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvZ2V0LXdpbm5lcicpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoe30gYXMgYW55LCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KSkudG9FcXVhbCh3aW5uZXIpO1xuICB9KTtcblxuICBpdCgncmV0dXJucyA1MDAgb24gRHluYW1vREIgZXJyb3InLCBhc3luYyAoKSA9PiB7XG4gICAgQVdTTW9jay5tb2NrKCdEeW5hbW9EQi5Eb2N1bWVudENsaWVudCcsICdnZXQnLCAoX3A6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PiBjYihuZXcgRXJyb3IoJ0R5bmFtb0RCIGVycm9yJyksIG51bGwpKTtcbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS9nZXQtd2lubmVyJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcih7fSBhcyBhbnksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDUwMCk7XG4gIH0pO1xufSk7XG4iXX0=