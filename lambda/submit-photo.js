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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const AWS = __importStar(require("aws-sdk"));
const sharp_1 = __importDefault(require("sharp"));
const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();
const PHOTOS_TABLE = process.env.PHOTOS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const BUCKET = process.env.BUCKET;
const MAX_IMAGE_DIMENSION = 1000; // Maximum width or height in pixels
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json'
};
const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { user_id, title, description, image_data } = body;
        if (!user_id || !title || !image_data) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "user_id, title, and image_data are required" }) };
        }
        // Verify the user exists
        const userResult = await dynamo.get({
            TableName: USERS_TABLE,
            Key: { user_id }
        }).promise();
        if (!userResult.Item) {
            return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "User not found" }) };
        }
        // Check for duplicate submission in the same month
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const existingPhotos = await dynamo.scan({
            TableName: PHOTOS_TABLE,
            FilterExpression: 'user_id = :user_id AND #status = :status AND begins_with(upload_timestamp, :year_month)',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':user_id': user_id,
                ':status': 'active',
                ':year_month': yearMonth
            }
        }).promise();
        if (existingPhotos.Items && existingPhotos.Items.length > 0) {
            return { statusCode: 409, headers: CORS_HEADERS, body: JSON.stringify({ error: "You have already submitted a photo this month" }) };
        }
        // Generate photo ID and S3 key
        const photo_id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const key = `photos/${photo_id}.jpg`; // Always save as JPEG after processing
        // Decode base64 image
        const imageBuffer = Buffer.from(image_data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        // Resize image if any dimension exceeds MAX_IMAGE_DIMENSION
        const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
        let processedImageBuffer;
        if (metadata.width && metadata.height && (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION)) {
            // Resize to fit within MAX_IMAGE_DIMENSION while maintaining aspect ratio
            processedImageBuffer = await (0, sharp_1.default)(imageBuffer)
                .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
                fit: 'inside',
                withoutEnlargement: true
            })
                .jpeg({ quality: 90 }) // Convert to JPEG with high quality
                .toBuffer();
        }
        else {
            // Image is already within limits, just convert to JPEG for consistency
            processedImageBuffer = await (0, sharp_1.default)(imageBuffer)
                .jpeg({ quality: 90 })
                .toBuffer();
        }
        // Upload processed image to S3
        await s3.putObject({
            Bucket: BUCKET,
            Key: key,
            Body: processedImageBuffer,
            ContentType: 'image/jpeg'
        }).promise();
        // Store photo's metadata in DynamoDB
        await dynamo.put({
            TableName: PHOTOS_TABLE,
            Item: {
                photo_id,
                user_id,
                title,
                description: description || '',
                s3_key: key,
                upload_timestamp: new Date().toISOString(),
                vote_count: 0,
                status: 'active'
            }
        }).promise();
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                photo_id,
                message: "Photo uploaded successfully"
            })
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VibWl0LXBob3RvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3VibWl0LXBob3RvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDZDQUErQjtBQUMvQixrREFBMEI7QUFFMUIsTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUM7QUFDeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBRWpELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBYSxDQUFDO0FBQy9DLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBWSxDQUFDO0FBQzdDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTyxDQUFDO0FBQ25DLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLENBQUMsb0NBQW9DO0FBRXRFLE1BQU0sWUFBWSxHQUFHO0lBQ25CLDZCQUE2QixFQUFFLEdBQUc7SUFDbEMsOEJBQThCLEVBQUUsNkJBQTZCO0lBQzdELGNBQWMsRUFBRSxrQkFBa0I7Q0FDbkMsQ0FBQztBQUVLLE1BQU0sT0FBTyxHQUEyQixLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7SUFDN0QsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFekQsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxZ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Q0FBQyxDQUFDO1FBQy9CLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRyxLQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDNUYsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUF4R1csUUFBQSxPQUFPLFdBd0dsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUhhbmRsZXIgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIEFXUyBmcm9tICdhd3Mtc2RrJztcbmltcG9ydCBzaGFycCBmcm9tICdzaGFycCc7XG5cbmNvbnN0IHMzID0gbmV3IEFXUy5TMygpO1xuY29uc3QgZHluYW1vID0gbmV3IEFXUy5EeW5hbW9EQi5Eb2N1bWVudENsaWVudCgpO1xuXG5jb25zdCBQSE9UT1NfVEFCTEUgPSBwcm9jZXNzLmVudi5QSE9UT1NfVEFCTEUhO1xuY29uc3QgVVNFUlNfVEFCTEUgPSBwcm9jZXNzLmVudi5VU0VSU19UQUJMRSE7XG5jb25zdCBCVUNLRVQgPSBwcm9jZXNzLmVudi5CVUNLRVQhO1xuY29uc3QgTUFYX0lNQUdFX0RJTUVOU0lPTiA9IDEwMDA7IC8vIE1heGltdW0gd2lkdGggb3IgaGVpZ2h0IGluIHBpeGVsc1xuXG5jb25zdCBDT1JTX0hFQURFUlMgPSB7XG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0F1dGhvcml6YXRpb24sIENvbnRlbnQtVHlwZScsXG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbn07XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBBUElHYXRld2F5UHJveHlIYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSB8fCAne30nKTtcbiAgICBjb25zdCB7IHVzZXJfaWQsIHRpdGxlLCBkZXNjcmlwdGlvbiwgaW1hZ2VfZGF0YSB9ID0gYm9keTtcblxuICAgIGlmICghdXNlcl9pZCB8fCAhdGl0bGUgfHwgIWltYWdlX2RhdGEpIHtcbiAgICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcInVzZXJfaWQsIHRpdGxlLCBhbmQgaW1hZ2VfZGF0YSBhcmUgcmVxdWlyZWRcIiB9KSB9O1xuICAgIH1cblxuICAgIC8vIFZlcmlmeSB0aGUgdXNlciBleGlzdHNcbiAgICBjb25zdCB1c2VyUmVzdWx0ID0gYXdhaXQgZHluYW1vLmdldCh7XG4gICAgICBUYWJsZU5hbWU6IFVTRVJTX1RBQkxFLFxuICAgICAgS2V5OiB7IHVzZXJfaWQgfVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIGlmICghdXNlclJlc3VsdC5JdGVtKSB7XG4gICAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA0MDQsIGhlYWRlcnM6IENPUlNfSEVBREVSUywgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJVc2VyIG5vdCBmb3VuZFwiIH0pIH07XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGR1cGxpY2F0ZSBzdWJtaXNzaW9uIGluIHRoZSBzYW1lIG1vbnRoXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCB5ZWFyTW9udGggPSBgJHtub3cuZ2V0RnVsbFllYXIoKX0tJHtTdHJpbmcobm93LmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpfWA7XG5cbiAgICBjb25zdCBleGlzdGluZ1Bob3RvcyA9IGF3YWl0IGR5bmFtby5zY2FuKHtcbiAgICAgIFRhYmxlTmFtZTogUEhPVE9TX1RBQkxFLFxuICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJ3VzZXJfaWQgPSA6dXNlcl9pZCBBTkQgI3N0YXR1cyA9IDpzdGF0dXMgQU5EIGJlZ2luc193aXRoKHVwbG9hZF90aW1lc3RhbXAsIDp5ZWFyX21vbnRoKScsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHsgJyNzdGF0dXMnOiAnc3RhdHVzJyB9LFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAnOnVzZXJfaWQnOiB1c2VyX2lkLFxuICAgICAgICAnOnN0YXR1cyc6ICdhY3RpdmUnLFxuICAgICAgICAnOnllYXJfbW9udGgnOiB5ZWFyTW9udGhcbiAgICAgIH1cbiAgICB9KS5wcm9taXNlKCk7XG5cbiAgICBpZiAoZXhpc3RpbmdQaG90b3MuSXRlbXMgJiYgZXhpc3RpbmdQaG90b3MuSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNDA5LCBoZWFkZXJzOiBDT1JTX0hFQURFUlMsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiWW91IGhhdmUgYWxyZWFkeSBzdWJtaXR0ZWQgYSBwaG90byB0aGlzIG1vbnRoXCIgfSkgfTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSBwaG90byBJRCBhbmQgUzMga2V5XG4gICAgY29uc3QgcGhvdG9faWQgPSBgJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xuICAgIGNvbnN0IGtleSA9IGBwaG90b3MvJHtwaG90b19pZH0uanBnYDsgLy8gQWx3YXlzIHNhdmUgYXMgSlBFRyBhZnRlciBwcm9jZXNzaW5nXG5cbiAgICAvLyBEZWNvZGUgYmFzZTY0IGltYWdlXG4gICAgY29uc3QgaW1hZ2VCdWZmZXIgPSBCdWZmZXIuZnJvbShpbWFnZV9kYXRhLnJlcGxhY2UoL15kYXRhOmltYWdlXFwvXFx3KztiYXNlNjQsLywgJycpLCAnYmFzZTY0Jyk7XG5cbiAgICAvLyBSZXNpemUgaW1hZ2UgaWYgYW55IGRpbWVuc2lvbiBleGNlZWRzIE1BWF9JTUFHRV9ESU1FTlNJT05cbiAgICBjb25zdCBtZXRhZGF0YSA9IGF3YWl0IHNoYXJwKGltYWdlQnVmZmVyKS5tZXRhZGF0YSgpO1xuICAgIGxldCBwcm9jZXNzZWRJbWFnZUJ1ZmZlcjogQnVmZmVyO1xuXG4gICAgaWYgKG1ldGFkYXRhLndpZHRoICYmIG1ldGFkYXRhLmhlaWdodCAmJiAobWV0YWRhdGEud2lkdGggPiBNQVhfSU1BR0VfRElNRU5TSU9OIHx8IG1ldGFkYXRhLmhlaWdodCA+IE1BWF9JTUFHRV9ESU1FTlNJT04pKSB7XG4gICAgICAvLyBSZXNpemUgdG8gZml0IHdpdGhpbiBNQVhfSU1BR0VfRElNRU5TSU9OIHdoaWxlIG1haW50YWluaW5nIGFzcGVjdCByYXRpb1xuICAgICAgcHJvY2Vzc2VkSW1hZ2VCdWZmZXIgPSBhd2FpdCBzaGFycChpbWFnZUJ1ZmZlcilcbiAgICAgICAgLnJlc2l6ZShNQVhfSU1BR0VfRElNRU5TSU9OLCBNQVhfSU1BR0VfRElNRU5TSU9OLCB7XG4gICAgICAgICAgZml0OiAnaW5zaWRlJyxcbiAgICAgICAgICB3aXRob3V0RW5sYXJnZW1lbnQ6IHRydWVcbiAgICAgICAgfSlcbiAgICAgICAgLmpwZWcoeyBxdWFsaXR5OiA5MCB9KSAvLyBDb252ZXJ0IHRvIEpQRUcgd2l0aCBoaWdoIHF1YWxpdHlcbiAgICAgICAgLnRvQnVmZmVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEltYWdlIGlzIGFscmVhZHkgd2l0aGluIGxpbWl0cywganVzdCBjb252ZXJ0IHRvIEpQRUcgZm9yIGNvbnNpc3RlbmN5XG4gICAgICBwcm9jZXNzZWRJbWFnZUJ1ZmZlciA9IGF3YWl0IHNoYXJwKGltYWdlQnVmZmVyKVxuICAgICAgICAuanBlZyh7IHF1YWxpdHk6IDkwIH0pXG4gICAgICAgIC50b0J1ZmZlcigpO1xuICAgIH1cblxuICAgIC8vIFVwbG9hZCBwcm9jZXNzZWQgaW1hZ2UgdG8gUzNcbiAgICBhd2FpdCBzMy5wdXRPYmplY3Qoe1xuICAgICAgQnVja2V0OiBCVUNLRVQsXG4gICAgICBLZXk6IGtleSxcbiAgICAgIEJvZHk6IHByb2Nlc3NlZEltYWdlQnVmZmVyLFxuICAgICAgQ29udGVudFR5cGU6ICdpbWFnZS9qcGVnJ1xuICAgIH0pLnByb21pc2UoKTtcblxuICAgIC8vIFN0b3JlIHBob3RvJ3MgbWV0YWRhdGEgaW4gRHluYW1vREJcbiAgICBhd2FpdCBkeW5hbW8ucHV0KHtcbiAgICAgIFRhYmxlTmFtZTogUEhPVE9TX1RBQkxFLFxuICAgICAgSXRlbToge1xuICAgICAgICBwaG90b19pZCxcbiAgICAgICAgdXNlcl9pZCxcbiAgICAgICAgdGl0bGUsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbiB8fCAnJyxcbiAgICAgICAgczNfa2V5OiBrZXksXG4gICAgICAgIHVwbG9hZF90aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgdm90ZV9jb3VudDogMCxcbiAgICAgICAgc3RhdHVzOiAnYWN0aXZlJ1xuICAgICAgfVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzOiBDT1JTX0hFQURFUlMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHBob3RvX2lkLFxuICAgICAgICBtZXNzYWdlOiBcIlBob3RvIHVwbG9hZGVkIHN1Y2Nlc3NmdWxseVwiXG4gICAgICB9KVxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiBDT1JTX0hFQURFUlMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkludGVybmFsIHNlcnZlciBlcnJvclwiLCBtZXNzYWdlOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSlcbiAgICB9O1xuICB9XG59O1xuIl19