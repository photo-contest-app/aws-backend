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
        const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 10;
        // Get current month in YYYY-MM format
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        // Get all active photos from the current month
        const result = await dynamo.scan({
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
        // Sort by upload timestamp (newest first) and limit results
        const sortedPhotos = (result.Items || [])
            .sort((a, b) => b.upload_timestamp.localeCompare(a.upload_timestamp))
            .slice(0, limit);
        // Add CloudFront URL to each photo
        const photosWithUrls = sortedPhotos.map(photo => ({
            photo_id: photo.photo_id,
            title: photo.title,
            upload_timestamp: photo.upload_timestamp,
            vote_count: photo.vote_count || 0,
            s3_key: photo.s3_key,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXB1YmxpYy1waG90b3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtcHVibGljLXBob3Rvcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSw2Q0FBK0I7QUFFL0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBRWpELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBYSxDQUFDO0FBQy9DLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBUSxDQUFDO0FBRXJDLE1BQU0sWUFBWSxHQUFHO0lBQ25CLDZCQUE2QixFQUFFLEdBQUc7SUFDbEMsOEJBQThCLEVBQUUsNkJBQTZCO0lBQzdELGNBQWMsRUFBRSxrQkFBa0I7Q0FDbkMsQ0FBQztBQUVLLE1BQU0sT0FBTyxHQUEyQixLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7SUFDN0QsSUFBSSxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRXBHLHNDQUFzQztRQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sU0FBUyxHQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsRUFBRSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBRXhGLCtDQUErQztRQUMvQyxNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDL0IsU0FBUyxFQUFFLFlBQVk7WUFDdkIsZ0JBQWdCLEVBQUUsa0VBQWtFO1lBQ3BGLHdCQUF3QixFQUFFO2dCQUN4QixTQUFTLEVBQUUsUUFBUTthQUNwQjtZQUNELHlCQUF5QixFQUFFO2dCQUN6QixTQUFTLEVBQUUsUUFBUTtnQkFDbkIsYUFBYSxFQUFFLFNBQVM7YUFDekI7U0FDRixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFYiw0REFBNEQ7UUFDNUQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQzthQUN0QyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ3BFLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbkIsbUNBQW1DO1FBQ25DLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtZQUN4QixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7WUFDbEIsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLGdCQUFnQjtZQUN4QyxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsSUFBSSxDQUFDO1lBQ2pDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixTQUFTLEVBQUUsR0FBRyxPQUFPLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRTtTQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVKLE9BQU8sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztJQUMxRixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9CLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRyxLQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDNUYsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUE3Q1csUUFBQSxPQUFPLFdBNkNsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUhhbmRsZXIgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIEFXUyBmcm9tICdhd3Mtc2RrJztcblxuY29uc3QgZHluYW1vID0gbmV3IEFXUy5EeW5hbW9EQi5Eb2N1bWVudENsaWVudCgpO1xuXG5jb25zdCBQSE9UT1NfVEFCTEUgPSBwcm9jZXNzLmVudi5QSE9UT1NfVEFCTEUhO1xuY29uc3QgQ0ROX1VSTCA9IHByb2Nlc3MuZW52LkNETl9VUkwhO1xuXG5jb25zdCBDT1JTX0hFQURFUlMgPSB7XG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0F1dGhvcml6YXRpb24sIENvbnRlbnQtVHlwZScsXG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbn07XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBBUElHYXRld2F5UHJveHlIYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgbGltaXQgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LmxpbWl0ID8gcGFyc2VJbnQoZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzLmxpbWl0KSA6IDEwO1xuXG4gICAgLy8gR2V0IGN1cnJlbnQgbW9udGggaW4gWVlZWS1NTSBmb3JtYXRcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIGNvbnN0IHllYXJNb250aCA9IGAke25vdy5nZXRGdWxsWWVhcigpfS0ke1N0cmluZyhub3cuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyl9YDtcblxuICAgIC8vIEdldCBhbGwgYWN0aXZlIHBob3RvcyBmcm9tIHRoZSBjdXJyZW50IG1vbnRoXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vLnNjYW4oe1xuICAgICAgVGFibGVOYW1lOiBQSE9UT1NfVEFCTEUsXG4gICAgICBGaWx0ZXJFeHByZXNzaW9uOiAnI3N0YXR1cyA9IDpzdGF0dXMgQU5EIGJlZ2luc193aXRoKHVwbG9hZF90aW1lc3RhbXAsIDp5ZWFyX21vbnRoKScsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcbiAgICAgICAgJyNzdGF0dXMnOiAnc3RhdHVzJ1xuICAgICAgfSxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzpzdGF0dXMnOiAnYWN0aXZlJyxcbiAgICAgICAgJzp5ZWFyX21vbnRoJzogeWVhck1vbnRoXG4gICAgICB9XG4gICAgfSkucHJvbWlzZSgpO1xuXG4gICAgLy8gU29ydCBieSB1cGxvYWQgdGltZXN0YW1wIChuZXdlc3QgZmlyc3QpIGFuZCBsaW1pdCByZXN1bHRzXG4gICAgY29uc3Qgc29ydGVkUGhvdG9zID0gKHJlc3VsdC5JdGVtcyB8fCBbXSlcbiAgICAgIC5zb3J0KChhLCBiKSA9PiBiLnVwbG9hZF90aW1lc3RhbXAubG9jYWxlQ29tcGFyZShhLnVwbG9hZF90aW1lc3RhbXApKVxuICAgICAgLnNsaWNlKDAsIGxpbWl0KTtcblxuICAgIC8vIEFkZCBDbG91ZEZyb250IFVSTCB0byBlYWNoIHBob3RvXG4gICAgY29uc3QgcGhvdG9zV2l0aFVybHMgPSBzb3J0ZWRQaG90b3MubWFwKHBob3RvID0+ICh7XG4gICAgICBwaG90b19pZDogcGhvdG8ucGhvdG9faWQsXG4gICAgICB0aXRsZTogcGhvdG8udGl0bGUsXG4gICAgICB1cGxvYWRfdGltZXN0YW1wOiBwaG90by51cGxvYWRfdGltZXN0YW1wLFxuICAgICAgdm90ZV9jb3VudDogcGhvdG8udm90ZV9jb3VudCB8fCAwLFxuICAgICAgczNfa2V5OiBwaG90by5zM19rZXksXG4gICAgICBpbWFnZV91cmw6IGAke0NETl9VUkx9LyR7cGhvdG8uczNfa2V5fWBcbiAgICB9KSk7XG5cbiAgICByZXR1cm4geyBzdGF0dXNDb2RlOiAyMDAsIGhlYWRlcnM6IENPUlNfSEVBREVSUywgYm9keTogSlNPTi5zdHJpbmdpZnkocGhvdG9zV2l0aFVybHMpIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiBDT1JTX0hFQURFUlMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkludGVybmFsIHNlcnZlciBlcnJvclwiLCBtZXNzYWdlOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSlcbiAgICB9O1xuICB9XG59O1xuXG4iXX0=