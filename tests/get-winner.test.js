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
    process.env.CDN_URL = 'https://test-cdn.cloudfront.net';
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
        const winner = { month_year: LAST_MONTH_YEAR, photo_id: 'p1', user_id: 'u1', vote_count: 10, s3_key: 'photos/p1.jpg' };
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (params, cb) => {
            expect(params.Key.month_year).toBe(LAST_MONTH_YEAR);
            cb(null, { Item: winner });
        });
        const { handler } = require('../lambda/get-winner');
        const result = await handler({}, mockContext, () => { });
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body).toMatchObject(winner);
        expect(body.image_url).toBe('https://test-cdn.cloudfront.net/photos/p1.jpg');
    });
    it('returns 500 on DynamoDB error', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p, cb) => cb(new Error('DynamoDB error'), null));
        const { handler } = require('../lambda/get-winner');
        const result = await handler({}, mockContext, () => { });
        expect(result.statusCode).toBe(500);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXdpbm5lci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXdpbm5lci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0RBQXdDO0FBRXhDLE1BQU0sV0FBVyxHQUFHLEVBQVMsQ0FBQztBQUU5QixNQUFNLGVBQWUsR0FBRyxDQUFDLEdBQUcsRUFBRTtJQUM1QixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3ZCLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDakYsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUVMLFVBQVUsQ0FBQyxHQUFHLEVBQUU7SUFDZCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDcEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsR0FBRyxjQUFjLENBQUM7SUFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsaUNBQWlDLENBQUM7QUFDMUQsQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLENBQUMsR0FBRyxFQUFFO0lBQ2IsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7SUFDMUIsRUFBRSxDQUFD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cyBBV1NNb2NrIGZyb20gJ2F3cy1zZGstbW9jayc7XG5cbmNvbnN0IG1vY2tDb250ZXh0ID0ge30gYXMgYW55O1xuXG5jb25zdCBMQVNUX01PTlRIX1lFQVIgPSAoKCkgPT4ge1xuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBsYXN0ID0gbmV3IERhdGUobm93LmdldEZ1bGxZZWFyKCksIG5vdy5nZXRNb250aCgpIC0gMSwgMSk7XG4gIHJldHVybiBgJHtsYXN0LmdldEZ1bGxZZWFyKCl9LSR7U3RyaW5nKGxhc3QuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyl9YDtcbn0pKCk7XG5cbmJlZm9yZUVhY2goKCkgPT4ge1xuICBqZXN0LnJlc2V0TW9kdWxlcygpO1xuICBBV1NNb2NrLnNldFNES0luc3RhbmNlKHJlcXVpcmUoJ2F3cy1zZGsnKSk7XG4gIHByb2Nlc3MuZW52LldJTk5FUlNfVEFCTEUgPSAnV2lubmVyc1RhYmxlJztcbiAgcHJvY2Vzcy5lbnYuQ0ROX1VSTCA9ICdodHRwczovL3Rlc3QtY2RuLmNsb3VkZnJvbnQubmV0Jztcbn0pO1xuXG5hZnRlckVhY2goKCkgPT4ge1xuICBBV1NNb2NrLnJlc3RvcmUoJ0R5bmFtb0RCLkRvY3VtZW50Q2xpZW50Jyk7XG59KTtcblxuZGVzY3JpYmUoJ2dldC13aW5uZXInLCAoKSA9PiB7XG4gIGl0KCdyZXR1cm5zIDQwNCB3aGVuIG5vIHdpbm5lciBmb3VuZCBmb3IgbGFzdCBtb250aCcsIGFzeW5jICgpID0+IHtcbiAgICBBV1NNb2NrLm1vY2soJ0R5bmFtb0RCLkRvY3VtZW50Q2xpZW50JywgJ2dldCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG51bGwsIHsgSXRlbTogdW5kZWZpbmVkIH0pKTtcbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS9nZXQtd2lubmVyJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcih7fSBhcyBhbnksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwNCk7XG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLmVycm9yKS50b01hdGNoKC9ObyB3aW5uZXIvKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgMjAwIHdpdGggd2lubmVyIGRhdGEgZm9yIGxhc3QgbW9udGgga2V5JywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHdpbm5lciA9IHsgbW9udGhfeWVhcjogTEFTVF9NT05USF9ZRUFSLCBwaG90b19pZDogJ3AxJywgdXNlcl9pZDogJ3UxJywgdm90ZV9jb3VudDogMTAsIHMzX2tleTogJ3Bob3Rvcy9wMS5qcGcnIH07XG4gICAgQVdTTW9jay5tb2NrKCdEeW5hbW9EQi5Eb2N1bWVudENsaWVudCcsICdnZXQnLCAocGFyYW1zOiBhbnksIGNiOiBGdW5jdGlvbikgPT4ge1xuICAgICAgZXhwZWN0KHBhcmFtcy5LZXkubW9udGhfeWVhcikudG9CZShMQVNUX01PTlRIX1lFQVIpO1xuICAgICAgY2IobnVsbCwgeyBJdGVtOiB3aW5uZXIgfSk7XG4gICAgfSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvZ2V0LXdpbm5lcicpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoe30gYXMgYW55LCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICBleHBlY3QoYm9keSkudG9NYXRjaE9iamVjdCh3aW5uZXIpO1xuICAgIGV4cGVjdChib2R5LmltYWdlX3VybCkudG9CZSgnaHR0cHM6Ly90ZXN0LWNkbi5jbG91ZGZyb250Lm5ldC9waG90b3MvcDEuanBnJyk7XG4gIH0pO1xuXG4gIGl0KCdyZXR1cm5zIDUwMCBvbiBEeW5hbW9EQiBlcnJvcicsIGFzeW5jICgpID0+IHtcbiAgICBBV1NNb2NrLm1vY2soJ0R5bmFtb0RCLkRvY3VtZW50Q2xpZW50JywgJ2dldCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG5ldyBFcnJvcignRHluYW1vREIgZXJyb3InKSwgbnVsbCkpO1xuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL2dldC13aW5uZXInKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKHt9IGFzIGFueSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNTAwKTtcbiAgfSk7XG59KTtcbiJdfQ==