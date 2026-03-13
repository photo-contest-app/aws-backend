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
        // Get start and end of current month for filtering votes
        const startOfMonth = `${yearMonth}-01T00:00:00.000Z`;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const endOfMonth = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999Z`;
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
        // Get all votes by this user THIS MONTH using the GSI
        const votesResult = await dynamo.query({
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
        // Create a set of photo IDs the user has voted on
        const votedPhotoIds = new Set((votesResult.Items || []).map(vote => vote.photo_id));
        // Filter out user's own photo, but keep all other photos (including voted ones)
        const eligiblePhotos = (allActivePhotos.Items || []).filter(photo => photo.user_id !== user_id);
        // Add CloudFront URL and voted status to each photo
        const photosWithUrls = eligiblePhotos.map(photo => ({
            ...photo,
            image_url: `${CDN_URL}/${photo.s3_key}`,
            voted: votedPhotoIds.has(photo.photo_id)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXBob3Rvcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1waG90b3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNkNBQStCO0FBRS9CLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUVqRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQWEsQ0FBQztBQUMvQyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVksQ0FBQztBQUM3QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBQztBQUVyQyxNQUFNLFlBQVksR0FBRztJQUNuQiw2QkFBNkIsRUFBRSxHQUFHO0lBQ2xDLDhCQUE4QixFQUFFLDZCQUE2QjtJQUM3RCxjQUFjLEVBQUUsa0JBQWtCO0NBQ25DLENBQUM7QUFFSyxNQUFNLE9BQU8sR0FBMkIsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO0lBQzdELElBQUksQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUM7UUFFckQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUM1RyxDQUFDO1FBRUQsc0NBQXNDO1FBQ3RDLE1BQU0sR0FBRyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFDdkIsTUFBTSxTQUFTLEdBQUcsR0FBRyxHQUFHLENBQUMsV0FBVyxFQUFFLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMs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RWxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5SGFuZGxlciB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgQVdTIGZyb20gJ2F3cy1zZGsnO1xuXG5jb25zdCBkeW5hbW8gPSBuZXcgQVdTLkR5bmFtb0RCLkRvY3VtZW50Q2xpZW50KCk7XG5cbmNvbnN0IFBIT1RPU19UQUJMRSA9IHByb2Nlc3MuZW52LlBIT1RPU19UQUJMRSE7XG5jb25zdCBWT1RFU19UQUJMRSA9IHByb2Nlc3MuZW52LlZPVEVTX1RBQkxFITtcbmNvbnN0IENETl9VUkwgPSBwcm9jZXNzLmVudi5DRE5fVVJMITtcblxuY29uc3QgQ09SU19IRUFERVJTID0ge1xuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdBdXRob3JpemF0aW9uLCBDb250ZW50LVR5cGUnLFxuICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG59O1xuXG5leHBvcnQgY29uc3QgaGFuZGxlcjogQVBJR2F0ZXdheVByb3h5SGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHVzZXJfaWQgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LnVzZXJfaWQ7XG5cbiAgICBpZiAoIXVzZXJfaWQpIHtcbiAgICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcInVzZXJfaWQgaXMgcmVxdWlyZWRcIiB9KSB9O1xuICAgIH1cblxuICAgIC8vIEdldCBjdXJyZW50IG1vbnRoIGluIFlZWVktTU0gZm9ybWF0XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCB5ZWFyTW9udGggPSBgJHtub3cuZ2V0RnVsbFllYXIoKX0tJHtTdHJpbmcobm93LmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpfWA7XG5cbiAgICAvLyBHZXQgc3RhcnQgYW5kIGVuZCBvZiBjdXJyZW50IG1vbnRoIGZvciBmaWx0ZXJpbmcgdm90ZXNcbiAgICBjb25zdCBzdGFydE9mTW9udGggPSBgJHt5ZWFyTW9udGh9LTAxVDAwOjAwOjAwLjAwMFpgO1xuICAgIGNvbnN0IGRheXNJbk1vbnRoID0gbmV3IERhdGUobm93LmdldEZ1bGxZZWFyKCksIG5vdy5nZXRNb250aCgpICsgMSwgMCkuZ2V0RGF0ZSgpO1xuICAgIGNvbnN0IGVuZE9mTW9udGggPSBgJHt5ZWFyTW9udGh9LSR7U3RyaW5nKGRheXNJbk1vbnRoKS5wYWRTdGFydCgyLCAnMCcpfVQyMzo1OTo1OS45OTlaYDtcblxuICAgIC8vIEdldCBhbGwgYWN0aXZlIHBob3RvcyBmcm9tIHRoZSBjdXJyZW50IG1vbnRoXG4gICAgY29uc3QgYWxsQWN0aXZlUGhvdG9zID0gYXdhaXQgZHluYW1vLnNjYW4oe1xuICAgICAgVGFibGVOYW1lOiBQSE9UT1NfVEFCTEUsXG4gICAgICBGaWx0ZXJFeHByZXNzaW9uOiAnI3N0YXR1cyA9IDpzdGF0dXMgQU5EIGJlZ2luc193aXRoKHVwbG9hZF90aW1lc3RhbXAsIDp5ZWFyX21vbnRoKScsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcbiAgICAgICAgJyNzdGF0dXMnOiAnc3RhdHVzJ1xuICAgICAgfSxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzpzdGF0dXMnOiAnYWN0aXZlJyxcbiAgICAgICAgJzp5ZWFyX21vbnRoJzogeWVhck1vbnRoXG4gICAgICB9XG4gICAgfSkucHJvbWlzZSgpO1xuXG4gICAgLy8gR2V0IGFsbCB2b3RlcyBieSB0aGlzIHVzZXIgVEhJUyBNT05USCB1c2luZyB0aGUgR1NJXG4gICAgY29uc3Qgdm90ZXNSZXN1bHQgPSBhd2FpdCBkeW5hbW8ucXVlcnkoe1xuICAgICAgVGFibGVOYW1lOiBWT1RFU19UQUJMRSxcbiAgICAgIEluZGV4TmFtZTogJ3VzZXItcGhvdG8taW5kZXgnLFxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3VzZXJfaWQgPSA6dXNlcl9pZCcsXG4gICAgICBGaWx0ZXJFeHByZXNzaW9uOiAnI3RpbWVzdGFtcCBCRVRXRUVOIDpzdGFydCBBTkQgOmVuZCcsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcbiAgICAgICAgJyN0aW1lc3RhbXAnOiAndGltZXN0YW1wJ1xuICAgICAgfSxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzp1c2VyX2lkJzogdXNlcl9pZCxcbiAgICAgICAgJzpzdGFydCc6IHN0YXJ0T2ZNb250aCxcbiAgICAgICAgJzplbmQnOiBlbmRPZk1vbnRoXG4gICAgICB9XG4gICAgfSkucHJvbWlzZSgpO1xuXG4gICAgLy8gQ3JlYXRlIGEgc2V0IG9mIHBob3RvIElEcyB0aGUgdXNlciBoYXMgdm90ZWQgb25cbiAgICBjb25zdCB2b3RlZFBob3RvSWRzID0gbmV3IFNldCgodm90ZXNSZXN1bHQuSXRlbXMgfHwgW10pLm1hcCh2b3RlID0+IHZvdGUucGhvdG9faWQpKTtcblxuICAgIC8vIEZpbHRlciBvdXQgdXNlcidzIG93biBwaG90bywgYnV0IGtlZXAgYWxsIG90aGVyIHBob3RvcyAoaW5jbHVkaW5nIHZvdGVkIG9uZXMpXG4gICAgY29uc3QgZWxpZ2libGVQaG90b3MgPSAoYWxsQWN0aXZlUGhvdG9zLkl0ZW1zIHx8IFtdKS5maWx0ZXIocGhvdG8gPT5cbiAgICAgIHBob3RvLnVzZXJfaWQgIT09IHVzZXJfaWRcbiAgICApO1xuXG4gICAgLy8gQWRkIENsb3VkRnJvbnQgVVJMIGFuZCB2b3RlZCBzdGF0dXMgdG8gZWFjaCBwaG90b1xuICAgIGNvbnN0IHBob3Rvc1dpdGhVcmxzID0gZWxpZ2libGVQaG90b3MubWFwKHBob3RvID0+ICh7XG4gICAgICAuLi5waG90byxcbiAgICAgIGltYWdlX3VybDogYCR7Q0ROX1VSTH0vJHtwaG90by5zM19rZXl9YCxcbiAgICAgIHZvdGVkOiB2b3RlZFBob3RvSWRzLmhhcyhwaG90by5waG90b19pZClcbiAgICB9KSk7XG5cbiAgICByZXR1cm4geyBzdGF0dXNDb2RlOiAyMDAsIGhlYWRlcnM6IENPUlNfSEVBREVSUywgYm9keTogSlNPTi5zdHJpbmdpZnkocGhvdG9zV2l0aFVybHMpIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiBDT1JTX0hFQURFUlMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkludGVybmFsIHNlcnZlciBlcnJvclwiLCBtZXNzYWdlOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSlcbiAgICB9O1xuICB9XG59O1xuIl19