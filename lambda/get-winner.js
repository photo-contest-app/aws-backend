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
const WINNERS_TABLE = process.env.WINNERS_TABLE;
const CDN_URL = process.env.CDN_URL;
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json'
};
const handler = async () => {
    try {
        const now = new Date();
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = lastMonthDate.getFullYear();
        const month = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
        const monthYear = `${year}-${month}`;
        const result = await dynamo.get({
            TableName: WINNERS_TABLE,
            Key: { month_year: monthYear }
        }).promise();
        if (!result.Item) {
            return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "No winner found for last month" }) };
        }
        // Add CloudFront URL to winner photo
        const winnerWithUrl = {
            ...result.Item,
            image_url: `${CDN_URL}/${result.Item.s3_key}`
        };
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(winnerWithUrl) };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXdpbm5lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC13aW5uZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNkNBQStCO0FBRS9CLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUVqRCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWMsQ0FBQztBQUNqRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBQztBQUVyQyxNQUFNLFlBQVksR0FBRztJQUNuQiw2QkFBNkIsRUFBRSxHQUFHO0lBQ2xDLDhCQUE4QixFQUFFLDZCQUE2QjtJQUM3RCxjQUFjLEVBQUUsa0JBQWtCO0NBQ25DLENBQUM7QUFFSyxNQUFNLE9BQU8sR0FBMkIsS0FBSyxJQUFJLEVBQUU7SUFDeEQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixNQUFNLGFBQWEsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6RSxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDekMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sU0FBUyxHQUFHLEdBQUcsSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBRXJDLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUM5QixTQUFTLEVBQUUsYUFBYTtZQUN4QixHQUFHLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFO1NBQy9CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUViLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakIsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxnQ0FBZ0MsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUN2SCxDQUFDO1FBRUQscUNBQXFDO1FBQ3JDLE1BQU0sYUFBYSxHQUFHO1lBQ3BCLEdBQUcsTUFBTSxDQUFDLElBQUk7WUFDZCxTQUFTLEVBQUUsR0FBRyxPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7U0FDOUMsQ0FBQztRQUVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztJQUN6RixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9CLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRyxLQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDNUYsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFoQ1csUUFBQSxPQUFPLFdBZ0NsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUhhbmRsZXIgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIEFXUyBmcm9tICdhd3Mtc2RrJztcblxuY29uc3QgZHluYW1vID0gbmV3IEFXUy5EeW5hbW9EQi5Eb2N1bWVudENsaWVudCgpO1xuXG5jb25zdCBXSU5ORVJTX1RBQkxFID0gcHJvY2Vzcy5lbnYuV0lOTkVSU19UQUJMRSE7XG5jb25zdCBDRE5fVVJMID0gcHJvY2Vzcy5lbnYuQ0ROX1VSTCE7XG5cbmNvbnN0IENPUlNfSEVBREVSUyA9IHtcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQXV0aG9yaXphdGlvbiwgQ29udGVudC1UeXBlJyxcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xufTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IEFQSUdhdGV3YXlQcm94eUhhbmRsZXIgPSBhc3luYyAoKSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICBjb25zdCBsYXN0TW9udGhEYXRlID0gbmV3IERhdGUobm93LmdldEZ1bGxZZWFyKCksIG5vdy5nZXRNb250aCgpIC0gMSwgMSk7XG4gICAgY29uc3QgeWVhciA9IGxhc3RNb250aERhdGUuZ2V0RnVsbFllYXIoKTtcbiAgICBjb25zdCBtb250aCA9IFN0cmluZyhsYXN0TW9udGhEYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgIGNvbnN0IG1vbnRoWWVhciA9IGAke3llYXJ9LSR7bW9udGh9YDtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGR5bmFtby5nZXQoe1xuICAgICAgVGFibGVOYW1lOiBXSU5ORVJTX1RBQkxFLFxuICAgICAgS2V5OiB7IG1vbnRoX3llYXI6IG1vbnRoWWVhciB9XG4gICAgfSkucHJvbWlzZSgpO1xuXG4gICAgaWYgKCFyZXN1bHQuSXRlbSkge1xuICAgICAgcmV0dXJuIHsgc3RhdHVzQ29kZTogNDA0LCBoZWFkZXJzOiBDT1JTX0hFQURFUlMsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiTm8gd2lubmVyIGZvdW5kIGZvciBsYXN0IG1vbnRoXCIgfSkgfTtcbiAgICB9XG5cbiAgICAvLyBBZGQgQ2xvdWRGcm9udCBVUkwgdG8gd2lubmVyIHBob3RvXG4gICAgY29uc3Qgd2lubmVyV2l0aFVybCA9IHtcbiAgICAgIC4uLnJlc3VsdC5JdGVtLFxuICAgICAgaW1hZ2VfdXJsOiBgJHtDRE5fVVJMfS8ke3Jlc3VsdC5JdGVtLnMzX2tleX1gXG4gICAgfTtcblxuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDIwMCwgaGVhZGVyczogQ09SU19IRUFERVJTLCBib2R5OiBKU09OLnN0cmluZ2lmeSh3aW5uZXJXaXRoVXJsKSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczogQ09SU19IRUFERVJTLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJJbnRlcm5hbCBzZXJ2ZXIgZXJyb3JcIiwgbWVzc2FnZTogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0pXG4gICAgfTtcbiAgfVxufTtcbiJdfQ==