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
exports.handler = void 0;
const AWS = __importStar(require("aws-sdk"));
const dynamo = new AWS.DynamoDB.DocumentClient();
const PHOTOS_TABLE = process.env.PHOTOS_TABLE;
const CDN_URL = process.env.CDN_URL;
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json'
};
const handler = async (event) => {
    try {
        const photo_id = event.pathParameters?.id;
        if (!photo_id) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "photo_id is required" }) };
        }
        const result = await dynamo.get({
            TableName: PHOTOS_TABLE,
            Key: { photo_id }
        }).promise();
        if (!result.Item) {
            return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "Photo not found" }) };
        }
        if (result.Item.status !== 'active') {
            return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "Photo not found" }) };
        }
        // Add CloudFront URL to photo
        const photoWithUrl = {
            ...result.Item,
            image_url: `${CDN_URL}/${result.Item.s3_key}`
        };
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(photoWithUrl) };
    }
    catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: "Internal server error", message: error.message })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXBob3RvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXBob3RvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDZDQUErQjtBQUUvQixNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7QUFFakQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFhLENBQUM7QUFDL0MsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQUM7QUFFckMsTUFBTSxZQUFZLEdBQUc7SUFDbkIsNkJBQTZCLEVBQUUsR0FBRztJQUNsQyw4QkFBOEIsRUFBRSw2QkFBNkI7SUFDN0QsY0FBYyxFQUFFLGtCQUFrQjtDQUNuQyxDQUFDO0FBRUssTUFBTSxPQUFPLEdBQTJCLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtJQUM3RCxJQUFJLENBQUM7UUFDSCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQztRQUUxQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZCxPQUFPLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHNCQUFzQixFQUFFLENBQUMsRUFBRSxDQUFDO1FBQzdHLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxHQUFHLENBQUM7WUFDOUIsU0FBUyxFQUFFLFlBQVk7WUFDdkIsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFO1NBQ2xCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUViLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakIsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUN4RyxDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxPQUFPLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxDQUFDO1FBQ3hHLENBQUM7UUFFRCw4QkFBOEI7UUFDOUIsTUFBTSxZQUFZLEdBQUc7WUFDbkIsR0FBRyxNQUFNLENBQUMsSUFBSTtZQUNkLFNBQVMsRUFBRSxHQUFHLE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtTQUM5QyxDQUFDO1FBRUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO0lBQ3hGLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0IsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLFlBQVk7WUFDckIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxFQUFHLEtBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUM1RixDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQXBDVyxRQUFBLE9BQU8sV0FvQ2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5SGFuZGxlciB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgQVdTIGZyb20gJ2F3cy1zZGsnO1xuXG5jb25zdCBkeW5hbW8gPSBuZXcgQVdTLkR5bmFtb0RCLkRvY3VtZW50Q2xpZW50KCk7XG5cbmNvbnN0IFBIT1RPU19UQUJMRSA9IHByb2Nlc3MuZW52LlBIT1RPU19UQUJMRSE7XG5jb25zdCBDRE5fVVJMID0gcHJvY2Vzcy5lbnYuQ0ROX1VSTCE7XG5cbmNvbnN0IENPUlNfSEVBREVSUyA9IHtcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQXV0aG9yaXphdGlvbiwgQ29udGVudC1UeXBlJyxcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xufTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IEFQSUdhdGV3YXlQcm94eUhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwaG90b19pZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5pZDtcblxuICAgIGlmICghcGhvdG9faWQpIHtcbiAgICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcInBob3RvX2lkIGlzIHJlcXVpcmVkXCIgfSkgfTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW8uZ2V0KHtcbiAgICAgIFRhYmxlTmFtZTogUEhPVE9TX1RBQkxFLFxuICAgICAgS2V5OiB7IHBob3RvX2lkIH1cbiAgICB9KS5wcm9taXNlKCk7XG5cbiAgICBpZiAoIXJlc3VsdC5JdGVtKSB7XG4gICAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA0MDQsIGhlYWRlcnM6IENPUlNfSEVBREVSUywgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJQaG90byBub3QgZm91bmRcIiB9KSB9O1xuICAgIH1cblxuICAgIGlmIChyZXN1bHQuSXRlbS5zdGF0dXMgIT09ICdhY3RpdmUnKSB7XG4gICAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA0MDQsIGhlYWRlcnM6IENPUlNfSEVBREVSUywgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJQaG90byBub3QgZm91bmRcIiB9KSB9O1xuICAgIH1cblxuICAgIC8vIEFkZCBDbG91ZEZyb250IFVSTCB0byBwaG90b1xuICAgIGNvbnN0IHBob3RvV2l0aFVybCA9IHtcbiAgICAgIC4uLnJlc3VsdC5JdGVtLFxuICAgICAgaW1hZ2VfdXJsOiBgJHtDRE5fVVJMfS8ke3Jlc3VsdC5JdGVtLnMzX2tleX1gXG4gICAgfTtcblxuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDIwMCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeShwaG90b1dpdGhVcmwpIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiBDT1JTX0hFQURFUlMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkludGVybmFsIHNlcnZlciBlcnJvclwiLCBtZXNzYWdlOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSlcbiAgICB9O1xuICB9XG59O1xuIl19