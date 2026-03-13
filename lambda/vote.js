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
        // Check if user already voted this month
        // Get start and end of current month for filtering
        const startOfMonth = `${yearMonth}-01T00:00:00.000Z`;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const endOfMonth = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999Z`;
        const existingVotes = await dynamo.query({
            TableName: VOTES_TABLE,
            IndexName: 'user-photo-index',
            KeyConditionExpression: 'user_id = :user_id',
            FilterExpression: '#timestamp BETWEEN :start AND :end',
            ExpressionAttributeNames: {
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':user_id': user_id,
                ':start': startOfMonth,
                ':end': endOfMonth
            }
        }).promise();
        // If user already voted for a different photo this month, remove the old vote
        if (existingVotes.Items && existingVotes.Items.length > 0) {
            const oldVote = existingVotes.Items[0];
            // If voting for the same photo, just return success
            if (oldVote.photo_id === photo_id) {
                return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: "Vote already registered" }) };
            }
            // Remove the old vote
            await dynamo.delete({
                TableName: VOTES_TABLE,
                Key: { vote_id: oldVote.vote_id }
            }).promise();
            // Decrement vote count on the old photo
            await dynamo.update({
                TableName: PHOTOS_TABLE,
                Key: { photo_id: oldVote.photo_id },
                UpdateExpression: 'SET vote_count = if_not_exists(vote_count, :one) - :dec',
                ExpressionAttributeValues: {
                    ':dec': 1,
                    ':one': 1
                }
            }).promise();
        }
        const vote_id = `${user_id}-${photo_id}-${Date.now()}`;
        // Record the new vote
        await dynamo.put({
            TableName: VOTES_TABLE,
            Item: {
                vote_id,
                user_id,
                photo_id,
                timestamp: new Date().toISOString()
            }
        }).promise();
        // Increment vote count on the new photo
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm90ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZvdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNkNBQStCO0FBRS9CLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUVqRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQWEsQ0FBQztBQUMvQyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVksQ0FBQztBQUM3QyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVksQ0FBQztBQUU3QyxNQUFNLFlBQVksR0FBRztJQUNuQiw2QkFBNkIsRUFBRSxHQUFHO0lBQ2xDLDhCQUE4QixFQUFFLDZCQUE2QjtJQUM3RCxjQUFjLEVBQUUsa0JBQWtCO0NBQ25DLENBQUM7QUFFSyxNQUFNLE9BQU8sR0FBMkIsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO0lBQzdELElBQUksQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVuQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDMUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxtQ0FBbUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUMxSCxDQUFDO1FBRUQseUJBQXlCO1FBQ3pCLE1BQU0sVUFBVSxHQUFHLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUNsQyxTQUFTLEVB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RUFBRSxXQUFXO1lBQ3RCLElBQUksRUFBRTtnQkFDSixPQUFPO2dCQUNQLE9BQU87Z0JBQ1AsUUFBUTtnQkFDUixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7YUFDcEM7U0FDRixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFYix3Q0FBd0M7UUFDeEMsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2xCLFNBQVMsRUFBRSxZQUFZO1lBQ3ZCLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRTtZQUNqQixnQkFBZ0IsRUFBRSwwREFBMEQ7WUFDNUUseUJBQXlCLEVBQUU7Z0JBQ3pCLE1BQU0sRUFBRSxDQUFDO2dCQUNULE9BQU8sRUFBRSxDQUFDO2FBQ1g7U0FDRixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFYixPQUFPLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxDQUFDO0lBQzFHLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0IsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLFlBQVk7WUFDckIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxFQUFHLEtBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUM1RixDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTFIVyxRQUFBLE9BQU8sV0EwSGxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5SGFuZGxlciB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgQVdTIGZyb20gJ2F3cy1zZGsnO1xuXG5jb25zdCBkeW5hbW8gPSBuZXcgQVdTLkR5bmFtb0RCLkRvY3VtZW50Q2xpZW50KCk7XG5cbmNvbnN0IFBIT1RPU19UQUJMRSA9IHByb2Nlc3MuZW52LlBIT1RPU19UQUJMRSE7XG5jb25zdCBVU0VSU19UQUJMRSA9IHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFITtcbmNvbnN0IFZPVEVTX1RBQkxFID0gcHJvY2Vzcy5lbnYuVk9URVNfVEFCTEUhO1xuXG5jb25zdCBDT1JTX0hFQURFUlMgPSB7XG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0F1dGhvcml6YXRpb24sIENvbnRlbnQtVHlwZScsXG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbn07XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBBUElHYXRld2F5UHJveHlIYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSB8fCAne30nKTtcbiAgICBjb25zdCB7IHVzZXJfaWQsIHBob3RvX2lkIH0gPSBib2R5O1xuXG4gICAgaWYgKCF1c2VyX2lkIHx8ICFwaG90b19pZCkge1xuICAgICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNDAwLCBoZWFkZXJzOiBDT1JTX0hFQURFUlMsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwidXNlcl9pZCBhbmQgcGhvdG9faWQgYXJlIHJlcXVpcmVkXCIgfSkgfTtcbiAgICB9XG5cbiAgICAvLyBWZXJpZnkgdGhlIHVzZXIgZXhpc3RzXG4gICAgY29uc3QgdXNlclJlc3VsdCA9IGF3YWl0IGR5bmFtby5nZXQoe1xuICAgICAgVGFibGVOYW1lOiBVU0VSU19UQUJMRSxcbiAgICAgIEtleTogeyB1c2VyX2lkIH1cbiAgICB9KS5wcm9taXNlKCk7XG5cbiAgICBpZiAoIXVzZXJSZXN1bHQuSXRlbSkge1xuICAgICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNDA0LCBoZWFkZXJzOiBDT1JTX0hFQURFUlMsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiVXNlciBub3QgZm91bmRcIiB9KSB9O1xuICAgIH1cblxuICAgIC8vIFZlcmlmeSB0aGUgcGhvdG8gZXhpc3RzIGFuZCBpcyBhY3RpdmVcbiAgICBjb25zdCBwaG90b1Jlc3VsdCA9IGF3YWl0IGR5bmFtby5nZXQoe1xuICAgICAgVGFibGVOYW1lOiBQSE9UT1NfVEFCTEUsXG4gICAgICBLZXk6IHsgcGhvdG9faWQgfVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIGlmICghcGhvdG9SZXN1bHQuSXRlbSB8fCBwaG90b1Jlc3VsdC5JdGVtLnN0YXR1cyAhPT0gJ2FjdGl2ZScpIHtcbiAgICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwNCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIlBob3RvIG5vdCBmb3VuZFwiIH0pIH07XG4gICAgfVxuXG4gICAgLy8gUHJldmVudCB2b3Rpbmcgb24gb3duIHBob3RvXG4gICAgaWYgKHBob3RvUmVzdWx0Lkl0ZW0udXNlcl9pZCA9PT0gdXNlcl9pZCkge1xuICAgICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNDAzLCBoZWFkZXJzOiBDT1JTX0hFQURFUlMsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiWW91IGNhbm5vdCB2b3RlIGZvciB5b3VyIG93biBwaG90b1wiIH0pIH07XG4gICAgfVxuXG4gICAgLy8gVmVyaWZ5IHBob3RvIGlzIGZyb20gdGhlIGN1cnJlbnQgY29udGVzdCBtb250aFxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgeWVhck1vbnRoID0gYCR7bm93LmdldEZ1bGxZZWFyKCl9LSR7U3RyaW5nKG5vdy5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKX1gO1xuICAgIGlmICghcGhvdG9SZXN1bHQuSXRlbS51cGxvYWRfdGltZXN0YW1wLnN0YXJ0c1dpdGgoeWVhck1vbnRoKSkge1xuICAgICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNDAwLCBoZWFkZXJzOiBDT1JTX0hFQURFUlMsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiWW91IGNhbiBvbmx5IHZvdGUgZm9yIHBob3RvcyBmcm9tIHRoZSBjdXJyZW50IG1vbnRoXCIgfSkgfTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiB1c2VyIGFscmVhZHkgdm90ZWQgdGhpcyBtb250aFxuICAgIC8vIEdldCBzdGFydCBhbmQgZW5kIG9mIGN1cnJlbnQgbW9udGggZm9yIGZpbHRlcmluZ1xuICAgIGNvbnN0IHN0YXJ0T2ZNb250aCA9IGAke3llYXJNb250aH0tMDFUMDA6MDA6MDAuMDAwWmA7XG4gICAgY29uc3QgZGF5c0luTW9udGggPSBuZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSwgbm93LmdldE1vbnRoKCkgKyAxLCAwKS5nZXREYXRlKCk7XG4gICAgY29uc3QgZW5kT2ZNb250aCA9IGAke3llYXJNb250aH0tJHtTdHJpbmcoZGF5c0luTW9udGgpLnBhZFN0YXJ0KDIsICcwJyl9VDIzOjU5OjU5Ljk5OVpgO1xuXG4gICAgY29uc3QgZXhpc3RpbmdWb3RlcyA9IGF3YWl0IGR5bmFtby5xdWVyeSh7XG4gICAgICBUYWJsZU5hbWU6IFZPVEVTX1RBQkxFLFxuICAgICAgSW5kZXhOYW1lOiAndXNlci1waG90by1pbmRleCcsXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndXNlcl9pZCA9IDp1c2VyX2lkJyxcbiAgICAgIEZpbHRlckV4cHJlc3Npb246ICcjdGltZXN0YW1wIEJFVFdFRU4gOnN0YXJ0IEFORCA6ZW5kJyxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xuICAgICAgICAnI3RpbWVzdGFtcCc6ICd0aW1lc3RhbXAnXG4gICAgICB9LFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAnOnVzZXJfaWQnOiB1c2VyX2lkLFxuICAgICAgICAnOnN0YXJ0Jzogc3RhcnRPZk1vbnRoLFxuICAgICAgICAnOmVuZCc6IGVuZE9mTW9udGhcbiAgICAgIH1cbiAgICB9KS5wcm9taXNlKCk7XG5cbiAgICAvLyBJZiB1c2VyIGFscmVhZHkgdm90ZWQgZm9yIGEgZGlmZmVyZW50IHBob3RvIHRoaXMgbW9udGgsIHJlbW92ZSB0aGUgb2xkIHZvdGVcbiAgICBpZiAoZXhpc3RpbmdWb3Rlcy5JdGVtcyAmJiBleGlzdGluZ1ZvdGVzLkl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IG9sZFZvdGUgPSBleGlzdGluZ1ZvdGVzLkl0ZW1zWzBdO1xuXG4gICAgICAvLyBJZiB2b3RpbmcgZm9yIHRoZSBzYW1lIHBob3RvLCBqdXN0IHJldHVybiBzdWNjZXNzXG4gICAgICBpZiAob2xkVm90ZS5waG90b19pZCA9PT0gcGhvdG9faWQpIHtcbiAgICAgICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogMjAwLCBoZWFkZXJzOiBDT1JTX0hFQURFUlMsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogXCJWb3RlIGFscmVhZHkgcmVnaXN0ZXJlZFwiIH0pIH07XG4gICAgICB9XG5cbiAgICAgIC8vIFJlbW92ZSB0aGUgb2xkIHZvdGVcbiAgICAgIGF3YWl0IGR5bmFtby5kZWxldGUoe1xuICAgICAgICBUYWJsZU5hbWU6IFZPVEVTX1RBQkxFLFxuICAgICAgICBLZXk6IHsgdm90ZV9pZDogb2xkVm90ZS52b3RlX2lkIH1cbiAgICAgIH0pLnByb21pc2UoKTtcblxuICAgICAgLy8gRGVjcmVtZW50IHZvdGUgY291bnQgb24gdGhlIG9sZCBwaG90b1xuICAgICAgYXdhaXQgZHluYW1vLnVwZGF0ZSh7XG4gICAgICAgIFRhYmxlTmFtZTogUEhPVE9TX1RBQkxFLFxuICAgICAgICBLZXk6IHsgcGhvdG9faWQ6IG9sZFZvdGUucGhvdG9faWQgfSxcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCB2b3RlX2NvdW50ID0gaWZfbm90X2V4aXN0cyh2b3RlX2NvdW50LCA6b25lKSAtIDpkZWMnLFxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICAgJzpkZWMnOiAxLFxuICAgICAgICAgICc6b25lJzogMVxuICAgICAgICB9XG4gICAgICB9KS5wcm9taXNlKCk7XG4gICAgfVxuXG4gICAgY29uc3Qgdm90ZV9pZCA9IGAke3VzZXJfaWR9LSR7cGhvdG9faWR9LSR7RGF0ZS5ub3coKX1gO1xuXG4gICAgLy8gUmVjb3JkIHRoZSBuZXcgdm90ZVxuICAgIGF3YWl0IGR5bmFtby5wdXQoe1xuICAgICAgVGFibGVOYW1lOiBWT1RFU19UQUJMRSxcbiAgICAgIEl0ZW06IHtcbiAgICAgICAgdm90ZV9pZCxcbiAgICAgICAgdXNlcl9pZCxcbiAgICAgICAgcGhvdG9faWQsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICB9XG4gICAgfSkucHJvbWlzZSgpO1xuXG4gICAgLy8gSW5jcmVtZW50IHZvdGUgY291bnQgb24gdGhlIG5ldyBwaG90b1xuICAgIGF3YWl0IGR5bmFtby51cGRhdGUoe1xuICAgICAgVGFibGVOYW1lOiBQSE9UT1NfVEFCTEUsXG4gICAgICBLZXk6IHsgcGhvdG9faWQgfSxcbiAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgdm90ZV9jb3VudCA9IGlmX25vdF9leGlzdHModm90ZV9jb3VudCwgOnplcm8pICsgOmluYycsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6aW5jJzogMSxcbiAgICAgICAgJzp6ZXJvJzogMFxuICAgICAgfVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDIwMCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6IFwiVm90ZSByZWdpc3RlcmVkXCIgfSkgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IENPUlNfSEVBREVSUyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiSW50ZXJuYWwgc2VydmVyIGVycm9yXCIsIG1lc3NhZ2U6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSB9KVxuICAgIH07XG4gIH1cbn07XG4iXX0=