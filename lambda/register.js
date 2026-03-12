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
const aws_sdk_1 = require("aws-sdk");
const cognito = new aws_sdk_1.CognitoIdentityServiceProvider();
const dynamo = new AWS.DynamoDB.DocumentClient();
const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const USERS_TABLE = process.env.USERS_TABLE;
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json'
};
const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { email, password, first_name, last_name } = body;
        if (!email || !password || !first_name || !last_name) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: "email, password, first_name, and last_name are required" })
            };
        }
        // Create user in Cognito
        const signUpResult = await cognito.signUp({
            ClientId: USER_POOL_CLIENT_ID,
            Username: email,
            Password: password,
            UserAttributes: [
                { Name: 'email', Value: email },
                { Name: 'given_name', Value: first_name },
                { Name: 'family_name', Value: last_name }
            ]
        }).promise();
        const user_id = signUpResult.UserSub;
        // Store user in DynamoDB
        await dynamo.put({
            TableName: USERS_TABLE,
            Item: {
                user_id,
                email,
                first_name,
                last_name,
                created_at: new Date().toISOString()
            }
        }).promise();
        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: "User registered successfully. Please check your email to verify your account.",
                user_id
            })
        };
    }
    catch (error) {
        console.error('Error:', error);
        // Handle Cognito-specific errors
        if (error.code === 'UsernameExistsException') {
            return {
                statusCode: 409,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: "User with this email already exists" })
            };
        }
        if (error.code === 'InvalidPasswordException') {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: "Password does not meet requirements" })
            };
        }
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: "Internal server error", message: error.message })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWdpc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSw2Q0FBK0I7QUFDL0IscUNBQXlEO0FBRXpELE1BQU0sT0FBTyxHQUFHLElBQUksd0NBQThCLEVBQUUsQ0FBQztBQUNyRCxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7QUFFakQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFhLENBQUM7QUFDL0MsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFvQixDQUFDO0FBQzdELE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBWSxDQUFDO0FBRTdDLE1BQU0sWUFBWSxHQUFHO0lBQ25CLDZCQUE2QixFQUFFLEdBQUc7SUFDbEMsOEJBQThCLEVBQUUsNkJBQTZCO0lBQzdELGNBQWMsRUFBRSxrQkFBa0I7Q0FDbkMsQ0FBQztBQUVLLE1BQU0sT0FBTyxHQUEyQixLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7SUFDN0QsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFeEQsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JELE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLFlBQVk7Z0JBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHlEQUF5RCxFQUFFLENBQUM7YUFDM0YsQ0FBQztRQUNKLENBQUM7UUFFRCx5QkFBeUI7UUFDekIsTUFBTSxZQUFZLEdBQUcsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDO1lBQ3hDLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsUUFBUSxFQUFFLEtBQUs7WUFDZixRQUFRLEVBQUUsUUFBUTtZQUNsQixjQUFjLEVBQUU7Z0JBQ2QsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7Z0JBQy9CLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFO2dCQUN6QyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRTthQUMxQztTQUNGLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUViLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUM7UUFFckMseUJBQXlCO1FBQ3pCLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUNmLFNBQVMsRUFBRSxXQUFXO1lBQ3RCLElBQUksRUFBRTtnQkFDSixPQUFPO2dCQUNQLEtBQUs7Z0JBQ0wsVUFBVTtnQkFDVixTQUFTO2dCQUNULFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTthQUNyQztTQUNGLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUViLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixPQUFPLEVBQUUsK0VBQStFO2dCQUN4RixPQUFPO2FBQ1IsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUvQixpQ0FBaUM7UUFDakMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLHlCQUF5QixFQUFFLENBQUM7WUFDN0MsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsWUFBWTtnQkFDckIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUscUNBQXFDLEVBQUUsQ0FBQzthQUN2RSxDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLElBQUksS0FBSywwQkFBMEIsRUFBRSxDQUFDO1lBQzlDLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLFlBQVk7Z0JBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHFDQUFxQyxFQUFFLENBQUM7YUFDdkUsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsWUFBWTtZQUNyQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ2pGLENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBekVXLFFBQUEsT0FBTyxXQXlFbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlIYW5kbGVyIH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBBV1MgZnJvbSAnYXdzLXNkayc7XG5pbXBvcnQgeyBDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXIgfSBmcm9tICdhd3Mtc2RrJztcblxuY29uc3QgY29nbml0byA9IG5ldyBDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXIoKTtcbmNvbnN0IGR5bmFtbyA9IG5ldyBBV1MuRHluYW1vREIuRG9jdW1lbnRDbGllbnQoKTtcblxuY29uc3QgVVNFUl9QT09MX0lEID0gcHJvY2Vzcy5lbnYuVVNFUl9QT09MX0lEITtcbmNvbnN0IFVTRVJfUE9PTF9DTElFTlRfSUQgPSBwcm9jZXNzLmVudi5VU0VSX1BPT0xfQ0xJRU5UX0lEITtcbmNvbnN0IFVTRVJTX1RBQkxFID0gcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEUhO1xuXG5jb25zdCBDT1JTX0hFQURFUlMgPSB7XG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0F1dGhvcml6YXRpb24sIENvbnRlbnQtVHlwZScsXG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbn07XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBBUElHYXRld2F5UHJveHlIYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSB8fCAne30nKTtcbiAgICBjb25zdCB7IGVtYWlsLCBwYXNzd29yZCwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lIH0gPSBib2R5O1xuXG4gICAgaWYgKCFlbWFpbCB8fCAhcGFzc3dvcmQgfHwgIWZpcnN0X25hbWUgfHwgIWxhc3RfbmFtZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiBDT1JTX0hFQURFUlMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiZW1haWwsIHBhc3N3b3JkLCBmaXJzdF9uYW1lLCBhbmQgbGFzdF9uYW1lIGFyZSByZXF1aXJlZFwiIH0pXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSB1c2VyIGluIENvZ25pdG9cbiAgICBjb25zdCBzaWduVXBSZXN1bHQgPSBhd2FpdCBjb2duaXRvLnNpZ25VcCh7XG4gICAgICBDbGllbnRJZDogVVNFUl9QT09MX0NMSUVOVF9JRCxcbiAgICAgIFVzZXJuYW1lOiBlbWFpbCxcbiAgICAgIFBhc3N3b3JkOiBwYXNzd29yZCxcbiAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXG4gICAgICAgIHsgTmFtZTogJ2VtYWlsJywgVmFsdWU6IGVtYWlsIH0sXG4gICAgICAgIHsgTmFtZTogJ2dpdmVuX25hbWUnLCBWYWx1ZTogZmlyc3RfbmFtZSB9LFxuICAgICAgICB7IE5hbWU6ICdmYW1pbHlfbmFtZScsIFZhbHVlOiBsYXN0X25hbWUgfVxuICAgICAgXVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIGNvbnN0IHVzZXJfaWQgPSBzaWduVXBSZXN1bHQuVXNlclN1YjtcblxuICAgIC8vIFN0b3JlIHVzZXIgaW4gRHluYW1vREJcbiAgICBhd2FpdCBkeW5hbW8ucHV0KHtcbiAgICAgIFRhYmxlTmFtZTogVVNFUlNfVEFCTEUsXG4gICAgICBJdGVtOiB7XG4gICAgICAgIHVzZXJfaWQsXG4gICAgICAgIGVtYWlsLFxuICAgICAgICBmaXJzdF9uYW1lLFxuICAgICAgICBsYXN0X25hbWUsXG4gICAgICAgIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgfVxuICAgIH0pLnByb21pc2UoKTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDEsXG4gICAgICBoZWFkZXJzOiBDT1JTX0hFQURFUlMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1lc3NhZ2U6IFwiVXNlciByZWdpc3RlcmVkIHN1Y2Nlc3NmdWxseS4gUGxlYXNlIGNoZWNrIHlvdXIgZW1haWwgdG8gdmVyaWZ5IHlvdXIgYWNjb3VudC5cIixcbiAgICAgICAgdXNlcl9pZFxuICAgICAgfSlcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuXG4gICAgLy8gSGFuZGxlIENvZ25pdG8tc3BlY2lmaWMgZXJyb3JzXG4gICAgaWYgKGVycm9yLmNvZGUgPT09ICdVc2VybmFtZUV4aXN0c0V4Y2VwdGlvbicpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwOSxcbiAgICAgICAgaGVhZGVyczogQ09SU19IRUFERVJTLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIlVzZXIgd2l0aCB0aGlzIGVtYWlsIGFscmVhZHkgZXhpc3RzXCIgfSlcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGVycm9yLmNvZGUgPT09ICdJbnZhbGlkUGFzc3dvcmRFeGNlcHRpb24nKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IENPUlNfSEVBREVSUyxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJQYXNzd29yZCBkb2VzIG5vdCBtZWV0IHJlcXVpcmVtZW50c1wiIH0pXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiBDT1JTX0hFQURFUlMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkludGVybmFsIHNlcnZlciBlcnJvclwiLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pXG4gICAgfTtcbiAgfVxufTtcblxuIl19