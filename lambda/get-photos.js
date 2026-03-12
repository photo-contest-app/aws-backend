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
const VOTES_TABLE = process.env.VOTES_TABLE;
const CDN_URL = process.env.CDN_URL;
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json'
};
const handler = async (event) => {
    try {
        const user_id = event.queryStringParameters?.user_id;
        if (!user_id) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "user_id is required" }) };
        }
        // Get current month in YYYY-MM format
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        // Get all active photos from the current month
        const allActivePhotos = await dynamo.scan({
            TableName: PHOTOS_TABLE,
            FilterExpression: '#status = :status AND begins_with(upload_timestamp, :year_month)',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': 'active',
                ':year_month': yearMonth
            }
        }).promise();
        // Get all votes by this user using the GSI
        const votesResult = await dynamo.query({
            TableName: VOTES_TABLE,
            IndexName: 'user-photo-index',
            KeyConditionExpression: 'user_id = :user_id',
            ExpressionAttributeValues: {
                ':user_id': user_id
            }
        }).promise();
        // Create a set of photo IDs the user has voted on
        const votedPhotoIds = new Set((votesResult.Items || []).map(vote => vote.photo_id));
        // Filter out photos the user has already voted on, and their own photo
        const unvotedPhotos = (allActivePhotos.Items || []).filter(photo => !votedPhotoIds.has(photo.photo_id) && photo.user_id !== user_id);
        // Add CloudFront URL to each photo
        const photosWithUrls = unvotedPhotos.map(photo => ({
            ...photo,
            image_url: `${CDN_URL}/${photo.s3_key}`
        }));
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(photosWithUrls) };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXBob3Rvcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1waG90b3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNkNBQStCO0FBRS9CLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUVqRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQWEsQ0FBQztBQUMvQyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVksQ0FBQztBQUM3QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBQztBQUVyQyxNQUFNLFlBQVksR0FBRztJQUNuQiw2QkFBNkIsRUFBRSxHQUFHO0lBQ2xDLDhCQUE4QixFQUFFLDZCQUE2QjtJQUM3RCxjQUFjLEVBQUUsa0JBQWtCO0NBQ25DLENBQUM7QUFFSyxNQUFNLE9BQU8sR0FBMkIsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO0lBQzdELElBQUksQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUM7UUFFckQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUM1RyxDQUFDO1FBRUQsc0NBQXNDO1FBQ3RDLE1BQU0sR0FBRyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFDdkIsTUFBTSxTQUFTLEdBQUcsR0FBRyxHQUFHLENBQUMsV0FBVyxFQUFFLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFFeEYsK0NBQStDO1FBQy9DLE1BQU0sZUFBZSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQztZQUN4QyxTQUFTLEVBQUUsWUFBWTtZQUN2QixnQkFBZ0IsRUFBRSxrRUFBa0U7WUFDcEYsd0JBQXdCLEVBQUU7Z0JBQ3hCLFNBQVMsRUFBRSxRQUFRO2FBQ3BCO1lBQ0QseUJBQXlCLEVBQUU7Z0JBQ3pCLFNBQVMsRUFBRSxRQUFRO2dCQUNuQixhQUFhLEVBQUUsU0FBUzthQUN6QjtTQUNGLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUViLDJDQUEyQztRQUMzQyxNQUFNLFdBQVcsR0FBRyxNQUFNLE1BQU0sQ0FBQyxLQUFLLENBQUM7WUFDckMsU0FBUyxFQUFFLFdBQVc7WUFDdEIsU0FBUyxFQUFFLGtCQUFrQjtZQUM3QixzQkFBc0IsRUFBRSxvQkFBb0I7WUFDNUMseUJBQXlCLEVBQUU7Z0JBQ3pCLFVBQVUsRUFBRSxPQUFPO2FBQ3BCO1NBQ0YsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWIsa0RBQWtEO1FBQ2xELE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUVwRix1RUFBdUU7UUFDdkUsTUFBTSxhQUFhLEdBQUcsQ0FBQyxlQUFlLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUNqRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUNoRSxDQUFDO1FBRUYsbUNBQW1DO1FBQ25DLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELEdBQUcsS0FBSztZQUNSLFNBQVMsRUFBRSxHQUFHLE9BQU8sSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFO1NBQ3hDLENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO0lBQzFGLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0IsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLFlBQVk7WUFDckIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxFQUFHLEtBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUM1RixDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTFEVyxRQUFBLE9BQU8sV0EwRGxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5SGFuZGxlciB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgQVdTIGZyb20gJ2F3cy1zZGsnO1xuXG5jb25zdCBkeW5hbW8gPSBuZXcgQVdTLkR5bmFtb0RCLkRvY3VtZW50Q2xpZW50KCk7XG5cbmNvbnN0IFBIT1RPU19UQUJMRSA9IHByb2Nlc3MuZW52LlBIT1RPU19UQUJMRSE7XG5jb25zdCBWT1RFU19UQUJMRSA9IHByb2Nlc3MuZW52LlZPVEVTX1RBQkxFITtcbmNvbnN0IENETl9VUkwgPSBwcm9jZXNzLmVudi5DRE5fVVJMITtcblxuY29uc3QgQ09SU19IRUFERVJTID0ge1xuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdBdXRob3JpemF0aW9uLCBDb250ZW50LVR5cGUnLFxuICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG59O1xuXG5leHBvcnQgY29uc3QgaGFuZGxlcjogQVBJR2F0ZXdheVByb3h5SGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHVzZXJfaWQgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LnVzZXJfaWQ7XG5cbiAgICBpZiAoIXVzZXJfaWQpIHtcbiAgICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcInVzZXJfaWQgaXMgcmVxdWlyZWRcIiB9KSB9O1xuICAgIH1cblxuICAgIC8vIEdldCBjdXJyZW50IG1vbnRoIGluIFlZWVktTU0gZm9ybWF0XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCB5ZWFyTW9udGggPSBgJHtub3cuZ2V0RnVsbFllYXIoKX0tJHtTdHJpbmcobm93LmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpfWA7XG5cbiAgICAvLyBHZXQgYWxsIGFjdGl2ZSBwaG90b3MgZnJvbSB0aGUgY3VycmVudCBtb250aFxuICAgIGNvbnN0IGFsbEFjdGl2ZVBob3RvcyA9IGF3YWl0IGR5bmFtby5zY2FuKHtcbiAgICAgIFRhYmxlTmFtZTogUEhPVE9TX1RBQkxFLFxuICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJyNzdGF0dXMgPSA6c3RhdHVzIEFORCBiZWdpbnNfd2l0aCh1cGxvYWRfdGltZXN0YW1wLCA6eWVhcl9tb250aCknLFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XG4gICAgICAgICcjc3RhdHVzJzogJ3N0YXR1cydcbiAgICAgIH0sXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6c3RhdHVzJzogJ2FjdGl2ZScsXG4gICAgICAgICc6eWVhcl9tb250aCc6IHllYXJNb250aFxuICAgICAgfVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIC8vIEdldCBhbGwgdm90ZXMgYnkgdGhpcyB1c2VyIHVzaW5nIHRoZSBHU0lcbiAgICBjb25zdCB2b3Rlc1Jlc3VsdCA9IGF3YWl0IGR5bmFtby5xdWVyeSh7XG4gICAgICBUYWJsZU5hbWU6IFZPVEVTX1RBQkxFLFxuICAgICAgSW5kZXhOYW1lOiAndXNlci1waG90by1pbmRleCcsXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndXNlcl9pZCA9IDp1c2VyX2lkJyxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzp1c2VyX2lkJzogdXNlcl9pZFxuICAgICAgfVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIC8vIENyZWF0ZSBhIHNldCBvZiBwaG90byBJRHMgdGhlIHVzZXIgaGFzIHZvdGVkIG9uXG4gICAgY29uc3Qgdm90ZWRQaG90b0lkcyA9IG5ldyBTZXQoKHZvdGVzUmVzdWx0Lkl0ZW1zIHx8IFtdKS5tYXAodm90ZSA9PiB2b3RlLnBob3RvX2lkKSk7XG5cbiAgICAvLyBGaWx0ZXIgb3V0IHBob3RvcyB0aGUgdXNlciBoYXMgYWxyZWFkeSB2b3RlZCBvbiwgYW5kIHRoZWlyIG93biBwaG90b1xuICAgIGNvbnN0IHVudm90ZWRQaG90b3MgPSAoYWxsQWN0aXZlUGhvdG9zLkl0ZW1zIHx8IFtdKS5maWx0ZXIocGhvdG8gPT5cbiAgICAgICF2b3RlZFBob3RvSWRzLmhhcyhwaG90by5waG90b19pZCkgJiYgcGhvdG8udXNlcl9pZCAhPT0gdXNlcl9pZFxuICAgICk7XG5cbiAgICAvLyBBZGQgQ2xvdWRGcm9udCBVUkwgdG8gZWFjaCBwaG90b1xuICAgIGNvbnN0IHBob3Rvc1dpdGhVcmxzID0gdW52b3RlZFBob3Rvcy5tYXAocGhvdG8gPT4gKHtcbiAgICAgIC4uLnBob3RvLFxuICAgICAgaW1hZ2VfdXJsOiBgJHtDRE5fVVJMfS8ke3Bob3RvLnMzX2tleX1gXG4gICAgfSkpO1xuXG4gICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogMjAwLCBoZWFkZXJzOiBDT1JTX0hFQURFUlMsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBob3Rvc1dpdGhVcmxzKSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczogQ09SU19IRUFERVJTLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJJbnRlcm5hbCBzZXJ2ZXIgZXJyb3JcIiwgbWVzc2FnZTogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0pXG4gICAgfTtcbiAgfVxufTtcbiJdfQ==