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
const USERS_TABLE = process.env.USERS_TABLE;
const VOTES_TABLE = process.env.VOTES_TABLE;
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json'
};
const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { user_id, photo_id } = body;
        if (!user_id || !photo_id) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "user_id and photo_id are required" }) };
        }
        // Verify the user exists
        const userResult = await dynamo.get({
            TableName: USERS_TABLE,
            Key: { user_id }
        }).promise();
        if (!userResult.Item) {
            return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "User not found" }) };
        }
        // Verify the photo exists and is active
        const photoResult = await dynamo.get({
            TableName: PHOTOS_TABLE,
            Key: { photo_id }
        }).promise();
        if (!photoResult.Item || photoResult.Item.status !== 'active') {
            return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "Photo not found" }) };
        }
        // Prevent voting on own photo
        if (photoResult.Item.user_id === user_id) {
            return { statusCode: 403, headers: CORS_HEADERS, body: JSON.stringify({ error: "You cannot vote for your own photo" }) };
        }
        // Verify photo is from the current contest month
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!photoResult.Item.upload_timestamp.startsWith(yearMonth)) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "You can only vote for photos from the current month" }) };
        }
        // Check if user already voted for this photo
        const existingVotes = await dynamo.query({
            TableName: VOTES_TABLE,
            IndexName: 'user-photo-index',
            KeyConditionExpression: 'user_id = :user_id AND photo_id = :photo_id',
            ExpressionAttributeValues: {
                ':user_id': user_id,
                ':photo_id': photo_id
            }
        }).promise();
        if (existingVotes.Items && existingVotes.Items.length > 0) {
            return { statusCode: 409, headers: CORS_HEADERS, body: JSON.stringify({ error: "You have already voted for this photo" }) };
        }
        const vote_id = `${user_id}-${photo_id}-${Date.now()}`;
        // Record the vote
        await dynamo.put({
            TableName: VOTES_TABLE,
            Item: {
                vote_id,
                user_id,
                photo_id,
                timestamp: new Date().toISOString()
            }
        }).promise();
        // Increment vote count on photo
        await dynamo.update({
            TableName: PHOTOS_TABLE,
            Key: { photo_id },
            UpdateExpression: 'SET vote_count = if_not_exists(vote_count, :zero) + :inc',
            ExpressionAttributeValues: {
                ':inc': 1,
                ':zero': 0
            }
        }).promise();
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: "Vote registered" }) };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm90ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZvdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNkNBQStCO0FBRS9CLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUVqRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQWEsQ0FBQztBQUMvQyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVksQ0FBQztBQUM3QyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVksQ0FBQztBQUU3QyxNQUFNLFlBQVksR0FBRztJQUNuQiw2QkFBNkIsRUFBRSxHQUFHO0lBQ2xDLDhCQUE4QixFQUFFLDZCQUE2QjtJQUM3RCxjQUFjLEVBQUUsa0JBQWtCO0NBQ25DLENBQUM7QUFFSyxNQUFNLE9BQU8sR0FBMkIsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO0lBQzdELElBQUksQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVuQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDMUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxtQ0FBbUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUMxSCxDQUFDO1FBRUQseUJBQXlCO1FBQ3pCLE1BQU0sVUFBVSxHQUFHLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUNsQyxTQUFTLEVB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V0FBVztZQUN0QixJQUFJLEVBQUU7Z0JBQ0osT0FBTztnQkFDUCxPQUFPO2dCQUNQLFFBQVE7Z0JBQ1IsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2FBQ3BDO1NBQ0YsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWIsZ0NBQWdDO1FBQ2hDLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNsQixTQUFTLEVBQUUsWUFBWTtZQUN2QixHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUU7WUFDakIsZ0JBQWdCLEVBQUUsMERBQTBEO1lBQzVFLHlCQUF5QixFQUFFO2dCQUN6QixNQUFNLEVBQUUsQ0FBQztnQkFDVCxPQUFPLEVBQUUsQ0FBQzthQUNYO1NBQ0YsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWIsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUMxRyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9CLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRyxLQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDNUYsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUF6RlcsUUFBQSxPQUFPLFdBeUZsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUhhbmRsZXIgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIEFXUyBmcm9tICdhd3Mtc2RrJztcblxuY29uc3QgZHluYW1vID0gbmV3IEFXUy5EeW5hbW9EQi5Eb2N1bWVudENsaWVudCgpO1xuXG5jb25zdCBQSE9UT1NfVEFCTEUgPSBwcm9jZXNzLmVudi5QSE9UT1NfVEFCTEUhO1xuY29uc3QgVVNFUlNfVEFCTEUgPSBwcm9jZXNzLmVudi5VU0VSU19UQUJMRSE7XG5jb25zdCBWT1RFU19UQUJMRSA9IHByb2Nlc3MuZW52LlZPVEVTX1RBQkxFITtcblxuY29uc3QgQ09SU19IRUFERVJTID0ge1xuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdBdXRob3JpemF0aW9uLCBDb250ZW50LVR5cGUnLFxuICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG59O1xuXG5leHBvcnQgY29uc3QgaGFuZGxlcjogQVBJR2F0ZXdheVByb3h5SGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkgfHwgJ3t9Jyk7XG4gICAgY29uc3QgeyB1c2VyX2lkLCBwaG90b19pZCB9ID0gYm9keTtcblxuICAgIGlmICghdXNlcl9pZCB8fCAhcGhvdG9faWQpIHtcbiAgICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcInVzZXJfaWQgYW5kIHBob3RvX2lkIGFyZSByZXF1aXJlZFwiIH0pIH07XG4gICAgfVxuXG4gICAgLy8gVmVyaWZ5IHRoZSB1c2VyIGV4aXN0c1xuICAgIGNvbnN0IHVzZXJSZXN1bHQgPSBhd2FpdCBkeW5hbW8uZ2V0KHtcbiAgICAgIFRhYmxlTmFtZTogVVNFUlNfVEFCTEUsXG4gICAgICBLZXk6IHsgdXNlcl9pZCB9XG4gICAgfSkucHJvbWlzZSgpO1xuXG4gICAgaWYgKCF1c2VyUmVzdWx0Lkl0ZW0pIHtcbiAgICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwNCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIlVzZXIgbm90IGZvdW5kXCIgfSkgfTtcbiAgICB9XG5cbiAgICAvLyBWZXJpZnkgdGhlIHBob3RvIGV4aXN0cyBhbmQgaXMgYWN0aXZlXG4gICAgY29uc3QgcGhvdG9SZXN1bHQgPSBhd2FpdCBkeW5hbW8uZ2V0KHtcbiAgICAgIFRhYmxlTmFtZTogUEhPVE9TX1RBQkxFLFxuICAgICAgS2V5OiB7IHBob3RvX2lkIH1cbiAgICB9KS5wcm9taXNlKCk7XG5cbiAgICBpZiAoIXBob3RvUmVzdWx0Lkl0ZW0gfHwgcGhvdG9SZXN1bHQuSXRlbS5zdGF0dXMgIT09ICdhY3RpdmUnKSB7XG4gICAgICByZXR1cm4geyBzdGF0dXNDb2RlOiA0MDQsIGhlYWRlcnM6IENPUlNfSEVBREVSUywgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJQaG90byBub3QgZm91bmRcIiB9KSB9O1xuICAgIH1cblxuICAgIC8vIFByZXZlbnQgdm90aW5nIG9uIG93biBwaG90b1xuICAgIGlmIChwaG90b1Jlc3VsdC5JdGVtLnVzZXJfaWQgPT09IHVzZXJfaWQpIHtcbiAgICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMywgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIllvdSBjYW5ub3Qgdm90ZSBmb3IgeW91ciBvd24gcGhvdG9cIiB9KSB9O1xuICAgIH1cblxuICAgIC8vIFZlcmlmeSBwaG90byBpcyBmcm9tIHRoZSBjdXJyZW50IGNvbnRlc3QgbW9udGhcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIGNvbnN0IHllYXJNb250aCA9IGAke25vdy5nZXRGdWxsWWVhcigpfS0ke1N0cmluZyhub3cuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyl9YDtcbiAgICBpZiAoIXBob3RvUmVzdWx0Lkl0ZW0udXBsb2FkX3RpbWVzdGFtcC5zdGFydHNXaXRoKHllYXJNb250aCkpIHtcbiAgICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIllvdSBjYW4gb25seSB2b3RlIGZvciBwaG90b3MgZnJvbSB0aGUgY3VycmVudCBtb250aFwiIH0pIH07XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBhbHJlYWR5IHZvdGVkIGZvciB0aGlzIHBob3RvXG4gICAgY29uc3QgZXhpc3RpbmdWb3RlcyA9IGF3YWl0IGR5bmFtby5xdWVyeSh7XG4gICAgICBUYWJsZU5hbWU6IFZPVEVTX1RBQkxFLFxuICAgICAgSW5kZXhOYW1lOiAndXNlci1waG90by1pbmRleCcsXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndXNlcl9pZCA9IDp1c2VyX2lkIEFORCBwaG90b19pZCA9IDpwaG90b19pZCcsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6dXNlcl9pZCc6IHVzZXJfaWQsXG4gICAgICAgICc6cGhvdG9faWQnOiBwaG90b19pZFxuICAgICAgfVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIGlmIChleGlzdGluZ1ZvdGVzLkl0ZW1zICYmIGV4aXN0aW5nVm90ZXMuSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNDA5LCBoZWFkZXJzOiBDT1JTX0hFQURFUlMsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiWW91IGhhdmUgYWxyZWFkeSB2b3RlZCBmb3IgdGhpcyBwaG90b1wiIH0pIH07XG4gICAgfVxuXG4gICAgY29uc3Qgdm90ZV9pZCA9IGAke3VzZXJfaWR9LSR7cGhvdG9faWR9LSR7RGF0ZS5ub3coKX1gO1xuXG4gICAgLy8gUmVjb3JkIHRoZSB2b3RlXG4gICAgYXdhaXQgZHluYW1vLnB1dCh7XG4gICAgICBUYWJsZU5hbWU6IFZPVEVTX1RBQkxFLFxuICAgICAgSXRlbToge1xuICAgICAgICB2b3RlX2lkLFxuICAgICAgICB1c2VyX2lkLFxuICAgICAgICBwaG90b19pZCxcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgIH1cbiAgICB9KS5wcm9taXNlKCk7XG5cbiAgICAvLyBJbmNyZW1lbnQgdm90ZSBjb3VudCBvbiBwaG90b1xuICAgIGF3YWl0IGR5bmFtby51cGRhdGUoe1xuICAgICAgVGFibGVOYW1lOiBQSE9UT1NfVEFCTEUsXG4gICAgICBLZXk6IHsgcGhvdG9faWQgfSxcbiAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgdm90ZV9jb3VudCA9IGlmX25vdF9leGlzdHModm90ZV9jb3VudCwgOnplcm8pICsgOmluYycsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6aW5jJzogMSxcbiAgICAgICAgJzp6ZXJvJzogMFxuICAgICAgfVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDIwMCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6IFwiVm90ZSByZWdpc3RlcmVkXCIgfSkgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IENPUlNfSEVBREVSUyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiSW50ZXJuYWwgc2VydmVyIGVycm9yXCIsIG1lc3NhZ2U6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSB9KVxuICAgIH07XG4gIH1cbn07XG4iXX0=