"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const aws_sdk_1 = require("aws-sdk");
const cognito = new aws_sdk_1.CognitoIdentityServiceProvider();
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json'
};
const handler = async (event) => {
    try {
        // Extract access token from Authorization header
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: "Missing or invalid Authorization header" })
            };
        }
        const accessToken = authHeader.substring(7);
        // Call Cognito GlobalSignOut to invalidate all tokens for this user
        await cognito.globalSignOut({
            AccessToken: accessToken
        }).promise();
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: "Logout successful" })
        };
    }
    catch (error) {
        console.error('Error:', error);
        // Handle Cognito-specific errors
        if (error.code === 'NotAuthorizedException') {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: "Invalid or expired token" })
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nb3V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9nb3V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHFDQUF5RDtBQUV6RCxNQUFNLE9BQU8sR0FBRyxJQUFJLHdDQUE4QixFQUFFLENBQUM7QUFFckQsTUFBTSxZQUFZLEdBQUc7SUFDbkIsNkJBQTZCLEVBQUUsR0FBRztJQUNsQyw4QkFBOEIsRUFBRSw2QkFBNkI7SUFDN0QsY0FBYyxFQUFFLGtCQUFrQjtDQUNuQyxDQUFDO0FBRUssTUFBTSxPQUFPLEdBQTJCLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtJQUM3RCxJQUFJLENBQUM7UUFDSCxpREFBaUQ7UUFDakQsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE9BQU8sRUFBRSxhQUFhLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUM7UUFFaEYsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNyRCxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxZQUFZO2dCQUNyQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSx5Q0FBeUMsRUFBRSxDQUFDO2FBQzNFLENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU1QyxvRUFBb0U7UUFDcEUsTUFBTSxPQUFPLENBQUMsYUFBYSxDQUFDO1lBQzFCLFdBQVcsRUFBRSxXQUFXO1NBQ3pCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUViLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLENBQUM7U0FDdkQsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRS9CLGlDQUFpQztRQUNqQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssd0JBQXdCLEVBQUUsQ0FBQztZQUM1QyxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxZQUFZO2dCQUNyQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSwwQkFBMEIsRUFBRSxDQUFDO2FBQzVELENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLFlBQVk7WUFDckIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNqRixDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTNDVyxRQUFBLE9BQU8sV0EyQ2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5SGFuZGxlciB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyIH0gZnJvbSAnYXdzLXNkayc7XG5cbmNvbnN0IGNvZ25pdG8gPSBuZXcgQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyKCk7XG5cbmNvbnN0IENPUlNfSEVBREVSUyA9IHtcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQXV0aG9yaXphdGlvbiwgQ29udGVudC1UeXBlJyxcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xufTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IEFQSUdhdGV3YXlQcm94eUhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgdHJ5IHtcbiAgICAvLyBFeHRyYWN0IGFjY2VzcyB0b2tlbiBmcm9tIEF1dGhvcml6YXRpb24gaGVhZGVyXG4gICAgY29uc3QgYXV0aEhlYWRlciA9IGV2ZW50LmhlYWRlcnM/LkF1dGhvcml6YXRpb24gfHwgZXZlbnQuaGVhZGVycz8uYXV0aG9yaXphdGlvbjtcblxuICAgIGlmICghYXV0aEhlYWRlciB8fCAhYXV0aEhlYWRlci5zdGFydHNXaXRoKCdCZWFyZXIgJykpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcbiAgICAgICAgaGVhZGVyczogQ09SU19IRUFERVJTLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIk1pc3Npbmcgb3IgaW52YWxpZCBBdXRob3JpemF0aW9uIGhlYWRlclwiIH0pXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IGFjY2Vzc1Rva2VuID0gYXV0aEhlYWRlci5zdWJzdHJpbmcoNyk7XG5cbiAgICAvLyBDYWxsIENvZ25pdG8gR2xvYmFsU2lnbk91dCB0byBpbnZhbGlkYXRlIGFsbCB0b2tlbnMgZm9yIHRoaXMgdXNlclxuICAgIGF3YWl0IGNvZ25pdG8uZ2xvYmFsU2lnbk91dCh7XG4gICAgICBBY2Nlc3NUb2tlbjogYWNjZXNzVG9rZW5cbiAgICB9KS5wcm9taXNlKCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVyczogQ09SU19IRUFERVJTLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiBcIkxvZ291dCBzdWNjZXNzZnVsXCIgfSlcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuXG4gICAgLy8gSGFuZGxlIENvZ25pdG8tc3BlY2lmaWMgZXJyb3JzXG4gICAgaWYgKGVycm9yLmNvZGUgPT09ICdOb3RBdXRob3JpemVkRXhjZXB0aW9uJykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxuICAgICAgICBoZWFkZXJzOiBDT1JTX0hFQURFUlMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiSW52YWxpZCBvciBleHBpcmVkIHRva2VuXCIgfSlcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IENPUlNfSEVBREVSUyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiSW50ZXJuYWwgc2VydmVyIGVycm9yXCIsIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSlcbiAgICB9O1xuICB9XG59O1xuXG4iXX0=