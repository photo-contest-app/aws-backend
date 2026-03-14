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
const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();
const PHOTOS_TABLE = process.env.PHOTOS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const BUCKET = process.env.BUCKET;
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json'
};
const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { user_id, title, description, content_type } = body;
        if (!user_id || !title) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "user_id and title are required" }) };
        }
        // Validate content type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!content_type || !validTypes.includes(content_type)) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid content type. Use JPEG, PNG, or WebP" }) };
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
        const extension = content_type.split('/')[1];
        const key = `uploads/${photo_id}.${extension}`;
        // Generate presigned URL for direct S3 upload (30 MB limit, 5 minutes expiry)
        const uploadUrl = s3.getSignedUrl('putObject', {
            Bucket: BUCKET,
            Key: key,
            ContentType: content_type,
            Expires: 300 // 5 minutes
        });
        // Pre-create the photo record in DynamoDB with 'pending' status
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
                status: 'pending' // Will be changed to 'active' after processing
            }
        }).promise();
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                upload_url: uploadUrl,
                photo_id,
                s3_key: key
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXVwbG9hZC11cmwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtdXBsb2FkLXVybC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSw2Q0FBK0I7QUFFL0IsTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUM7QUFDeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBRWpELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBYSxDQUFDO0FBQy9DLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBWSxDQUFDO0FBQzdDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTyxDQUFDO0FBRW5DLE1BQU0sWUFBWSxHQUFHO0lBQ25CLDZCQUE2QixFQUFFLEdBQUc7SUFDbEMsOEJBQThCLEVBQUUsNkJBQTZCO0lBQzdELGNBQWMsRUFBRSxrQkFBa0I7Q0FDbkMsQ0FBQztBQUVLLE1BQU0sT0FBTyxHQUEyQixLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7SUFDN0QsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFM0QsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsZ0NBQWdDLEVBQUUsQ0FBQyxF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LFlBQVk7WUFDdkIsSUFBSSxFQUFFO2dCQUNKLFFBQVE7Z0JBQ1IsT0FBTztnQkFDUCxLQUFLO2dCQUNMLFdBQVcsRUFBRSxXQUFXLElBQUksRUFBRTtnQkFDOUIsTUFBTSxFQUFFLEdBQUc7Z0JBQ1gsZ0JBQWdCLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQzFDLFVBQVUsRUFBRSxDQUFDO2dCQUNiLE1BQU0sRUFBRSxTQUFTLENBQUMsK0NBQStDO2FBQ2xFO1NBQ0YsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWIsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLFlBQVk7WUFDckIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLFVBQVUsRUFBRSxTQUFTO2dCQUNyQixRQUFRO2dCQUNSLE1BQU0sRUFBRSxHQUFHO2FBQ1osQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9CLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRyxLQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDNUYsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUF6RlcsUUFBQSxPQUFPLFdBeUZsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUhhbmRsZXIgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIEFXUyBmcm9tICdhd3Mtc2RrJztcblxuY29uc3QgczMgPSBuZXcgQVdTLlMzKCk7XG5jb25zdCBkeW5hbW8gPSBuZXcgQVdTLkR5bmFtb0RCLkRvY3VtZW50Q2xpZW50KCk7XG5cbmNvbnN0IFBIT1RPU19UQUJMRSA9IHByb2Nlc3MuZW52LlBIT1RPU19UQUJMRSE7XG5jb25zdCBVU0VSU19UQUJMRSA9IHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFITtcbmNvbnN0IEJVQ0tFVCA9IHByb2Nlc3MuZW52LkJVQ0tFVCE7XG5cbmNvbnN0IENPUlNfSEVBREVSUyA9IHtcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQXV0aG9yaXphdGlvbiwgQ29udGVudC1UeXBlJyxcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xufTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IEFQSUdhdGV3YXlQcm94eUhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5IHx8ICd7fScpO1xuICAgIGNvbnN0IHsgdXNlcl9pZCwgdGl0bGUsIGRlc2NyaXB0aW9uLCBjb250ZW50X3R5cGUgfSA9IGJvZHk7XG5cbiAgICBpZiAoIXVzZXJfaWQgfHwgIXRpdGxlKSB7XG4gICAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA0MDAsIGhlYWRlcnM6IENPUlNfSEVBREVSUywgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJ1c2VyX2lkIGFuZCB0aXRsZSBhcmUgcmVxdWlyZWRcIiB9KSB9O1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIGNvbnRlbnQgdHlwZVxuICAgIGNvbnN0IHZhbGlkVHlwZXMgPSBbJ2ltYWdlL2pwZWcnLCAnaW1hZ2UvcG5nJywgJ2ltYWdlL3dlYnAnLCAnaW1hZ2UvanBnJ107XG4gICAgaWYgKCFjb250ZW50X3R5cGUgfHwgIXZhbGlkVHlwZXMuaW5jbHVkZXMoY29udGVudF90eXBlKSkge1xuICAgICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNDAwLCBoZWFkZXJzOiBDT1JTX0hFQURFUlMsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiSW52YWxpZCBjb250ZW50IHR5cGUuIFVzZSBKUEVHLCBQTkcsIG9yIFdlYlBcIiB9KSB9O1xuICAgIH1cblxuICAgIC8vIFZlcmlmeSB0aGUgdXNlciBleGlzdHNcbiAgICBjb25zdCB1c2VyUmVzdWx0ID0gYXdhaXQgZHluYW1vLmdldCh7XG4gICAgICBUYWJsZU5hbWU6IFVTRVJTX1RBQkxFLFxuICAgICAgS2V5OiB7IHVzZXJfaWQgfVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIGlmICghdXNlclJlc3VsdC5JdGVtKSB7XG4gICAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA0MDQsIGhlYWRlcnM6IENPUlNfSEVBREVSUywgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJVc2VyIG5vdCBmb3VuZFwiIH0pIH07XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGR1cGxpY2F0ZSBzdWJtaXNzaW9uIGluIHRoZSBzYW1lIG1vbnRoXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCB5ZWFyTW9udGggPSBgJHtub3cuZ2V0RnVsbFllYXIoKX0tJHtTdHJpbmcobm93LmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpfWA7XG5cbiAgICBjb25zdCBleGlzdGluZ1Bob3RvcyA9IGF3YWl0IGR5bmFtby5zY2FuKHtcbiAgICAgIFRhYmxlTmFtZTogUEhPVE9TX1RBQkxFLFxuICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJ3VzZXJfaWQgPSA6dXNlcl9pZCBBTkQgI3N0YXR1cyA9IDpzdGF0dXMgQU5EIGJlZ2luc193aXRoKHVwbG9hZF90aW1lc3RhbXAsIDp5ZWFyX21vbnRoKScsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHsgJyNzdGF0dXMnOiAnc3RhdHVzJyB9LFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAnOnVzZXJfaWQnOiB1c2VyX2lkLFxuICAgICAgICAnOnN0YXR1cyc6ICdhY3RpdmUnLFxuICAgICAgICAnOnllYXJfbW9udGgnOiB5ZWFyTW9udGhcbiAgICAgIH1cbiAgICB9KS5wcm9taXNlKCk7XG5cbiAgICBpZiAoZXhpc3RpbmdQaG90b3MuSXRlbXMgJiYgZXhpc3RpbmdQaG90b3MuSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNDA5LCBoZWFkZXJzOiBDT1JTX0hFQURFUlMsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiWW91IGhhdmUgYWxyZWFkeSBzdWJtaXR0ZWQgYSBwaG90byB0aGlzIG1vbnRoXCIgfSkgfTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSBwaG90byBJRCBhbmQgUzMga2V5XG4gICAgY29uc3QgcGhvdG9faWQgPSBgJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xuICAgIGNvbnN0IGV4dGVuc2lvbiA9IGNvbnRlbnRfdHlwZS5zcGxpdCgnLycpWzFdO1xuICAgIGNvbnN0IGtleSA9IGB1cGxvYWRzLyR7cGhvdG9faWR9LiR7ZXh0ZW5zaW9ufWA7XG5cbiAgICAvLyBHZW5lcmF0ZSBwcmVzaWduZWQgVVJMIGZvciBkaXJlY3QgUzMgdXBsb2FkICgzMCBNQiBsaW1pdCwgNSBtaW51dGVzIGV4cGlyeSlcbiAgICBjb25zdCB1cGxvYWRVcmwgPSBzMy5nZXRTaWduZWRVcmwoJ3B1dE9iamVjdCcsIHtcbiAgICAgIEJ1Y2tldDogQlVDS0VULFxuICAgICAgS2V5OiBrZXksXG4gICAgICBDb250ZW50VHlwZTogY29udGVudF90eXBlLFxuICAgICAgRXhwaXJlczogMzAwIC8vIDUgbWludXRlc1xuICAgIH0pO1xuXG4gICAgLy8gUHJlLWNyZWF0ZSB0aGUgcGhvdG8gcmVjb3JkIGluIER5bmFtb0RCIHdpdGggJ3BlbmRpbmcnIHN0YXR1c1xuICAgIGF3YWl0IGR5bmFtby5wdXQoe1xuICAgICAgVGFibGVOYW1lOiBQSE9UT1NfVEFCTEUsXG4gICAgICBJdGVtOiB7XG4gICAgICAgIHBob3RvX2lkLFxuICAgICAgICB1c2VyX2lkLFxuICAgICAgICB0aXRsZSxcbiAgICAgICAgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uIHx8ICcnLFxuICAgICAgICBzM19rZXk6IGtleSxcbiAgICAgICAgdXBsb2FkX3RpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB2b3RlX2NvdW50OiAwLFxuICAgICAgICBzdGF0dXM6ICdwZW5kaW5nJyAvLyBXaWxsIGJlIGNoYW5nZWQgdG8gJ2FjdGl2ZScgYWZ0ZXIgcHJvY2Vzc2luZ1xuICAgICAgfVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzOiBDT1JTX0hFQURFUlMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHVwbG9hZF91cmw6IHVwbG9hZFVybCxcbiAgICAgICAgcGhvdG9faWQsXG4gICAgICAgIHMzX2tleToga2V5XG4gICAgICB9KVxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiBDT1JTX0hFQURFUlMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkludGVybmFsIHNlcnZlciBlcnJvclwiLCBtZXNzYWdlOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSlcbiAgICB9O1xuICB9XG59O1xuXG4iXX0=