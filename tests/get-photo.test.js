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
        const photo = { photo_id: 'photo-123', status: 'active', title: 'Test' };
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p, cb) => cb(null, { Item: photo }));
        const { handler } = require('../lambda/get-photo');
        const result = await handler(mockEvent('photo-123'), mockContext, () => { });
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(photo);
    });
    it('returns 500 on DynamoDB error', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'get', (_p, cb) => cb(new Error('DynamoDB error'), null));
        const { handler } = require('../lambda/get-photo');
        const result = await handler(mockEvent('photo-123'), mockContext, () => { });
        expect(result.statusCode).toBe(500);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXBob3RvLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtcGhvdG8udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUF3QztBQUV4QyxNQUFNLFNBQVMsR0FBRyxDQUFDLEVBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBVSxDQUFBLENBQUM7QUFDbkYsTUFBTSxXQUFXLEdBQUcsRUFBUyxDQUFDO0FBRTlCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7SUFDZCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDcEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxhQUFhLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLENBQUMsR0FBRyxFQUFFO0lBQ2IsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDO0FBRUgsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDekIsRUFBRSxDQUFDLHNDQUFzQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BELE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBTyxFQUFFLEVBQVksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hGLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNuRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFB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QUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFPLEVBQUUsRUFBWSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pILE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNuRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBBV1NNb2NrIGZyb20gJ2F3cy1zZGstbW9jayc7XG5cbmNvbnN0IG1vY2tFdmVudCA9IChpZD86IHN0cmluZykgPT4gKHsgcGF0aFBhcmFtZXRlcnM6IGlkID8geyBpZCB9IDogbnVsbCB9IGFzIGFueSk7XG5jb25zdCBtb2NrQ29udGV4dCA9IHt9IGFzIGFueTtcblxuYmVmb3JlRWFjaCgoKSA9PiB7XG4gIGplc3QucmVzZXRNb2R1bGVzKCk7XG4gIEFXU01vY2suc2V0U0RLSW5zdGFuY2UocmVxdWlyZSgnYXdzLXNkaycpKTtcbiAgcHJvY2Vzcy5lbnYuUEhPVE9TX1RBQkxFID0gJ1Bob3Rvc1RhYmxlJztcbn0pO1xuXG5hZnRlckVhY2goKCkgPT4ge1xuICBBV1NNb2NrLnJlc3RvcmUoJ0R5bmFtb0RCLkRvY3VtZW50Q2xpZW50Jyk7XG59KTtcblxuZGVzY3JpYmUoJ2dldC1waG90bycsICgpID0+IHtcbiAgaXQoJ3JldHVybnMgNDAwIHdoZW4gcGhvdG9faWQgaXMgbWlzc2luZycsIGFzeW5jICgpID0+IHtcbiAgICBBV1NNb2NrLm1vY2soJ0R5bmFtb0RCLkRvY3VtZW50Q2xpZW50JywgJ2dldCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+IGNiKG51bGwsIHt9KSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvZ2V0LXBob3RvJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQoKSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcbiAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuZXJyb3IpLnRvTWF0Y2goL3JlcXVpcmVkLyk7XG4gIH0pO1xuXG4gIGl0KCdyZXR1cm5zIDQwNCB3aGVuIHBob3RvIGRvZXMgbm90IGV4aXN0JywgYXN5bmMgKCkgPT4ge1xuICAgIEFXU01vY2subW9jaygnRHluYW1vREIuRG9jdW1lbnRDbGllbnQnLCAnZ2V0JywgKF9wOiBhbnksIGNiOiBGdW5jdGlvbikgPT4gY2IobnVsbCwgeyBJdGVtOiB1bmRlZmluZWQgfSkpO1xuICAgIGNvbnN0IHsgaGFuZGxlciB9ID0gcmVxdWlyZSgnLi4vbGFtYmRhL2dldC1waG90bycpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50KCdwaG90by0xMjMnKSwgbW9ja0NvbnRleHQsICgpID0+IHt9KTtcbiAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDA0KTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgNDA0IHdoZW4gcGhvdG8gaXMgbm90IGFjdGl2ZScsIGFzeW5jICgpID0+IHtcbiAgICBBV1NNb2NrLm1vY2soJ0R5bmFtb0RCLkRvY3VtZW50Q2xpZW50JywgJ2dldCcsIChfcDogYW55LCBjYjogRnVuY3Rpb24pID0+XG4gICAgICBjYihudWxsLCB7IEl0ZW06IHsgcGhvdG9faWQ6ICdwaG90by0xMjMnLCBzdGF0dXM6ICdpbmFjdGl2ZScgfSB9KVxuICAgICk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvZ2V0LXBob3RvJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQoJ3Bob3RvLTEyMycpLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDQpO1xuICB9KTtcblxuICBpdCgncmV0dXJucyAyMDAgd2l0aCBwaG90byB3aGVuIGFjdGl2ZScsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBwaG90byA9IHsgcGhvdG9faWQ6ICdwaG90by0xMjMnLCBzdGF0dXM6ICdhY3RpdmUnLCB0aXRsZTogJ1Rlc3QnIH07XG4gICAgQVdTTW9jay5tb2NrKCdEeW5hbW9EQi5Eb2N1bWVudENsaWVudCcsICdnZXQnLCAoX3A6IGFueSwgY2I6IEZ1bmN0aW9uKSA9PiBjYihudWxsLCB7IEl0ZW06IHBob3RvIH0pKTtcbiAgICBjb25zdCB7IGhhbmRsZXIgfSA9IHJlcXVpcmUoJy4uL2xhbWJkYS9nZXQtcGhvdG8nKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCgncGhvdG8tMTIzJyksIG1vY2tDb250ZXh0LCAoKSA9PiB7fSk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpKS50b0VxdWFsKHBob3RvKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgNTAwIG9uIER5bmFtb0RCIGVycm9yJywgYXN5bmMgKCkgPT4ge1xuICAgIEFXU01vY2subW9jaygnRHluYW1vREIuRG9jdW1lbnRDbGllbnQnLCAnZ2V0JywgKF9wOiBhbnksIGNiOiBGdW5jdGlvbikgPT4gY2IobmV3IEVycm9yKCdEeW5hbW9EQiBlcnJvcicpLCBudWxsKSk7XG4gICAgY29uc3QgeyBoYW5kbGVyIH0gPSByZXF1aXJlKCcuLi9sYW1iZGEvZ2V0LXBob3RvJyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQoJ3Bob3RvLTEyMycpLCBtb2NrQ29udGV4dCwgKCkgPT4ge30pO1xuICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg1MDApO1xuICB9KTtcbn0pO1xuIl19