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
exports.PhotoContestStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const authorizers = __importStar(require("aws-cdk-lib/aws-apigatewayv2-authorizers"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const targets = __importStar(require("aws-cdk-lib/aws-events-targets"));
const path = __importStar(require("path"));
class PhotoContestStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // DynamoDB tables
        const usersTable = new dynamodb.Table(this, 'UsersTable', {
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        usersTable.addGlobalSecondaryIndex({
            indexName: 'name-index',
            partitionKey: { name: 'last_name', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'first_name', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        const photosTable = new dynamodb.Table(this, 'PhotosTable', {
            partitionKey: { name: 'photo_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        photosTable.addGlobalSecondaryIndex({
            indexName: 'status-timestamp-index',
            partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'upload_timestamp', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        const votesTable = new dynamodb.Table(this, 'VotesTable', {
            partitionKey: { name: 'vote_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        // Index for querying votes by user_id and photo_id
        votesTable.addGlobalSecondaryIndex({
            indexName: 'user-photo-index',
            partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'photo_id', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });
        const winnersTable = new dynamodb.Table(this, 'WinnersTable', {
            partitionKey: { name: 'month_year', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        // S3 bucket for photos
        const photoBucket = new s3.Bucket(this, 'PhotoBucket', {
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true
        });
        // CloudFront for CDN
        const distribution = new cloudfront.Distribution(this, 'PhotoCDN', {
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(photoBucket)
            },
            comment: 'Photo Contest CDN',
        });
        distribution.node.defaultChild.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
        // Cognito for authentication
        const userPool = new cognito.UserPool(this, 'UserPool', {
            selfSignUpEnabled: true,
            signInAliases: { email: true },
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool,
            authFlows: {
                userPassword: true,
                userSrp: true
            }
        });
        // Cognito authorizer for API Gateway
        const authorizer = new authorizers.HttpUserPoolAuthorizer('UserPoolAuthorizer', userPool, {
            userPoolClients: [userPoolClient]
        });
        // Lambda functions for each API endpoint
        const healthLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'HealthLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/health.ts'),
            handler: 'handler',
        });
        const registerLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'RegisterLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/register.ts'),
            handler: 'handler',
            environment: {
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
                USERS_TABLE: usersTable.tableName
            }
        });
        usersTable.grantWriteData(registerLambda);
        registerLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
            actions: ['cognito-idp:SignUp'],
            resources: [userPool.userPoolArn]
        }));
        const loginLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'LoginLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/login.ts'),
            handler: 'handler',
            environment: {
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
            }
        });
        loginLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
            actions: ['cognito-idp:InitiateAuth'],
            resources: [userPool.userPoolArn]
        }));
        const logoutLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'LogoutLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/logout.ts'),
            handler: 'handler'
        });
        logoutLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
            actions: ['cognito-idp:GlobalSignOut'],
            resources: [userPool.userPoolArn]
        }));
        const verifyLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'VerifyLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/verify.ts'),
            handler: 'handler',
            environment: {
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
            }
        });
        verifyLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
            actions: ['cognito-idp:ConfirmSignUp'],
            resources: [userPool.userPoolArn]
        }));
        const submitPhotoLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'SubmitPhotoLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/submit-photo.ts'),
            handler: 'handler',
            environment: {
                PHOTOS_TABLE: photosTable.tableName,
                USERS_TABLE: usersTable.tableName,
                BUCKET: photoBucket.bucketName
            },
            bundling: {
                nodeModules: ['sharp'],
                forceDockerBundling: true, // Required to build Sharp for Linux x64 runtime
                commandHooks: {
                    beforeBundling(_inputDir, _outputDir) {
                        return [];
                    },
                    beforeInstall(_inputDir, _outputDir) {
                        return [];
                    },
                    afterBundling(_inputDir, _outputDir) {
                        return [
                            'cd /asset-output',
                            'rm -rf node_modules/sharp',
                            'npm install --arch=x64 --platform=linux --libc=glibc sharp'
                        ];
                    }
                }
            },
            memorySize: 1024, // Sharp requires more memory for image processing
            timeout: cdk.Duration.seconds(30)
        });
        photosTable.grantReadWriteData(submitPhotoLambda);
        usersTable.grantReadData(submitPhotoLambda);
        photoBucket.grantPut(submitPhotoLambda);
        const voteLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'VoteLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/vote.ts'),
            handler: 'handler',
            environment: {
                PHOTOS_TABLE: photosTable.tableName,
                USERS_TABLE: usersTable.tableName,
                VOTES_TABLE: votesTable.tableName
            }
        });
        photosTable.grantReadWriteData(voteLambda);
        usersTable.grantReadData(voteLambda);
        votesTable.grantReadWriteData(voteLambda);
        const getPhotosLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'GetPhotosLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/get-photos.ts'),
            handler: 'handler',
            environment: {
                PHOTOS_TABLE: photosTable.tableName,
                VOTES_TABLE: votesTable.tableName,
                CDN_URL: `https://${distribution.domainName}`
            }
        });
        photosTable.grantReadData(getPhotosLambda);
        votesTable.grantReadData(getPhotosLambda);
        const getPhotoLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'GetPhotoLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/get-photo.ts'),
            handler: 'handler',
            environment: {
                PHOTOS_TABLE: photosTable.tableName,
                CDN_URL: `https://${distribution.domainName}`
            }
        });
        photosTable.grantReadData(getPhotoLambda);
        const getWinnerLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'GetWinnerLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/get-winner.ts'),
            handler: 'handler',
            environment: {
                WINNERS_TABLE: winnersTable.tableName,
                CDN_URL: `https://${distribution.domainName}`
            }
        });
        winnersTable.grantReadData(getWinnerLambda);
        // API Gateway HTTP API
        const httpApi = new apigateway.HttpApi(this, 'PhotoApi', {
            corsPreflight: {
                allowOrigins: ['*'],
                allowMethods: [apigateway.CorsHttpMethod.ANY],
                allowHeaders: ['Authorization', 'Content-Type']
            }
        });
        httpApi.addRoutes({
            path: '/health',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('HealthIntegration', healthLambda)
        });
        httpApi.addRoutes({
            path: '/register',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('RegisterIntegration', registerLambda)
        });
        httpApi.addRoutes({
            path: '/login',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('LoginIntegration', loginLambda)
        });
        httpApi.addRoutes({
            path: '/logout',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('LogoutIntegration', logoutLambda)
        });
        httpApi.addRoutes({
            path: '/verify',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('VerifyIntegration', verifyLambda)
        });
        httpApi.addRoutes({
            path: '/submit-photo',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('SubmitPhotoIntegration', submitPhotoLambda),
            authorizer
        });
        httpApi.addRoutes({
            path: '/vote',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('VoteIntegration', voteLambda),
            authorizer
        });
        httpApi.addRoutes({
            path: '/photos',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetPhotosIntegration', getPhotosLambda)
        });
        httpApi.addRoutes({
            path: '/photos/{id}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetPhotoIntegration', getPhotoLambda)
        });
        httpApi.addRoutes({
            path: '/winner/last-month',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetWinnerIntegration', getWinnerLambda)
        });
        // Scheduled Lambda for monthly contest winner calculation
        const calculateMonthlyWinnerLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'CalculateMonthlyWinnerLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/calculate-monthly-winner.ts'),
            handler: 'handler',
            environment: {
                PHOTOS_TABLE: photosTable.tableName,
                WINNERS_TABLE: winnersTable.tableName
            }
        });
        photosTable.grantReadWriteData(calculateMonthlyWinnerLambda);
        winnersTable.grantWriteData(calculateMonthlyWinnerLambda);
        // Schedule Lambda to run on 8th day of each month at 00:00 UTC
        new events.Rule(this, 'MonthlyWinnerRule', {
            schedule: events.Schedule.cron({ minute: '0', hour: '0', day: '8', month: '*', year: '*' }),
            targets: [new targets.LambdaFunction(calculateMonthlyWinnerLambda)]
        });
        new cdk.CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
        new cdk.CfnOutput(this, 'CDNUrl', { value: `https://${distribution.domainName}` });
        new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
        new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    }
}
exports.PhotoContestStack = PhotoContestStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGhvdG8tY29udGVzdC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBob3RvLWNvbnRlc3Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLHFFQUErRDtBQUMvRCwrREFBaUQ7QUFDakQsbUVBQXFEO0FBQ3JELHlFQUEyRDtBQUMzRCx3RkFBMEU7QUFDMUUsc0ZBQXdFO0FBQ3hFLHVEQUF5QztBQUN6QyxpRUFBbUQ7QUFDbkQsdUVBQXlEO0FBQ3pELDRFQUE4RDtBQUM5RCwrREFBaUQ7QUFDakQsd0VBQTBEO0FBQzFELDJDQUE2QjtBQUU3QixNQUFhLGlCQUFrQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzlDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsa0JBQWtCO1FBQ2xCLE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3hELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3RFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxVQUFVLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLFlBQVk7WUFDdkIsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDeEUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVB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QyxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUUxRCwrREFBK0Q7UUFDL0QsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUN6QyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQztZQUMzRixPQUFPLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FBQztTQUNwRSxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUNsRSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxXQUFXLFlBQVksQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDdEUsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0lBQzFGLENBQUM7Q0FDRjtBQXZVRCw4Q0F1VUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBOb2RlanNGdW5jdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xuaW1wb3J0ICogYXMgaW50ZWdyYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcbmltcG9ydCAqIGFzIGF1dGhvcml6ZXJzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItYXV0aG9yaXplcnMnO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIFBob3RvQ29udGVzdFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gRHluYW1vREIgdGFibGVzXG4gICAgY29uc3QgdXNlcnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXNlcnNUYWJsZScsIHtcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcl9pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgIH0pO1xuXG4gICAgdXNlcnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICduYW1lLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnbGFzdF9uYW1lJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2ZpcnN0X25hbWUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxuICAgIH0pO1xuXG4gICAgY29uc3QgcGhvdG9zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1Bob3Rvc1RhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdwaG90b19pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgIH0pO1xuXG4gICAgcGhvdG9zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnc3RhdHVzLXRpbWVzdGFtcC1pbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3N0YXR1cycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd1cGxvYWRfdGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTExcbiAgICB9KTtcblxuICAgIGNvbnN0IHZvdGVzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1ZvdGVzVGFibGUnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3ZvdGVfaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1lcbiAgICB9KTtcblxuICAgIC8vIEluZGV4IGZvciBxdWVyeWluZyB2b3RlcyBieSB1c2VyX2lkIGFuZCBwaG90b19pZFxuICAgIHZvdGVzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAndXNlci1waG90by1pbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJfaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAncGhvdG9faWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxuICAgIH0pO1xuXG4gICAgY29uc3Qgd2lubmVyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdXaW5uZXJzVGFibGUnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ21vbnRoX3llYXInLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1lcbiAgICB9KTtcblxuICAgIC8vIFMzIGJ1Y2tldCBmb3IgcGhvdG9zXG4gICAgY29uc3QgcGhvdG9CdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdQaG90b0J1Y2tldCcsIHtcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZVxuICAgIH0pO1xuXG4gICAgLy8gQ2xvdWRGcm9udCBmb3IgQ0ROXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdQaG90b0NETicsIHtcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICBvcmlnaW46IG9yaWdpbnMuUzNCdWNrZXRPcmlnaW4ud2l0aE9yaWdpbkFjY2Vzc0NvbnRyb2wocGhvdG9CdWNrZXQpXG4gICAgICB9LFxuICAgICAgY29tbWVudDogJ1Bob3RvIENvbnRlc3QgQ0ROJyxcbiAgICB9KTtcbiAgICAoZGlzdHJpYnV0aW9uLm5vZGUuZGVmYXVsdENoaWxkIGFzIGNkay5DZm5SZXNvdXJjZSkuYXBwbHlSZW1vdmFsUG9saWN5KGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1kpO1xuXG4gICAgLy8gQ29nbml0byBmb3IgYXV0aGVudGljYXRpb25cbiAgICBjb25zdCB1c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdVc2VyUG9vbCcsIHtcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxuICAgICAgc2lnbkluQWxpYXNlczogeyBlbWFpbDogdHJ1ZSB9LFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnVXNlclBvb2xDbGllbnQnLCB7XG4gICAgICB1c2VyUG9vbCxcbiAgICAgIGF1dGhGbG93czoge1xuICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgIHVzZXJTcnA6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENvZ25pdG8gYXV0aG9yaXplciBmb3IgQVBJIEdhdGV3YXlcbiAgICBjb25zdCBhdXRob3JpemVyID0gbmV3IGF1dGhvcml6ZXJzLkh0dHBVc2VyUG9vbEF1dGhvcml6ZXIoJ1VzZXJQb29sQXV0aG9yaXplcicsIHVzZXJQb29sLCB7XG4gICAgICB1c2VyUG9vbENsaWVudHM6IFt1c2VyUG9vbENsaWVudF1cbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbnMgZm9yIGVhY2ggQVBJIGVuZHBvaW50XG4gICAgY29uc3QgaGVhbHRoTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdIZWFsdGhMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL2hlYWx0aC50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVnaXN0ZXJMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1JlZ2lzdGVyTGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9yZWdpc3Rlci50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICBVU0VSU19UQUJMRTogdXNlcnNUYWJsZS50YWJsZU5hbWVcbiAgICAgIH1cbiAgICB9KTtcbiAgICB1c2Vyc1RhYmxlLmdyYW50V3JpdGVEYXRhKHJlZ2lzdGVyTGFtYmRhKTtcbiAgICByZWdpc3RlckxhbWJkYS5hZGRUb1JvbGVQb2xpY3kobmV3IGNkay5hd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2NvZ25pdG8taWRwOlNpZ25VcCddLFxuICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dXG4gICAgfSkpO1xuXG4gICAgY29uc3QgbG9naW5MYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ0xvZ2luTGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9sb2dpbi50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9QT09MX0NMSUVOVF9JRDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZFxuICAgICAgfVxuICAgIH0pO1xuICAgIGxvZ2luTGFtYmRhLmFkZFRvUm9sZVBvbGljeShuZXcgY2RrLmF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnY29nbml0by1pZHA6SW5pdGlhdGVBdXRoJ10sXG4gICAgICByZXNvdXJjZXM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl1cbiAgICB9KSk7XG5cbiAgICBjb25zdCBsb2dvdXRMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ0xvZ291dExhbWJkYScsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEvbG9nb3V0LnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcidcbiAgICB9KTtcbiAgICBsb2dvdXRMYW1iZGEuYWRkVG9Sb2xlUG9saWN5KG5ldyBjZGsuYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydjb2duaXRvLWlkcDpHbG9iYWxTaWduT3V0J10sXG4gICAgICByZXNvdXJjZXM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl1cbiAgICB9KSk7XG5cbiAgICBjb25zdCB2ZXJpZnlMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1ZlcmlmeUxhbWJkYScsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEvdmVyaWZ5LnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXG4gICAgICB9XG4gICAgfSk7XG4gICAgdmVyaWZ5TGFtYmRhLmFkZFRvUm9sZVBvbGljeShuZXcgY2RrLmF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnY29nbml0by1pZHA6Q29uZmlybVNpZ25VcCddLFxuICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dXG4gICAgfSkpO1xuXG4gICAgY29uc3Qgc3VibWl0UGhvdG9MYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1N1Ym1pdFBob3RvTGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9zdWJtaXQtcGhvdG8udHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBIT1RPU19UQUJMRTogcGhvdG9zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSU19UQUJMRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEJVQ0tFVDogcGhvdG9CdWNrZXQuYnVja2V0TmFtZVxuICAgICAgfSxcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIG5vZGVNb2R1bGVzOiBbJ3NoYXJwJ10sXG4gICAgICAgIGZvcmNlRG9ja2VyQnVuZGxpbmc6IHRydWUsIC8vIFJlcXVpcmVkIHRvIGJ1aWxkIFNoYXJwIGZvciBMaW51eCB4NjQgcnVudGltZVxuICAgICAgICBjb21tYW5kSG9va3M6IHtcbiAgICAgICAgICBiZWZvcmVCdW5kbGluZyhfaW5wdXREaXI6IHN0cmluZywgX291dHB1dERpcjogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYmVmb3JlSW5zdGFsbChfaW5wdXREaXI6IHN0cmluZywgX291dHB1dERpcjogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYWZ0ZXJCdW5kbGluZyhfaW5wdXREaXI6IHN0cmluZywgX291dHB1dERpcjogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgJ2NkIC9hc3NldC1vdXRwdXQnLFxuICAgICAgICAgICAgICAncm0gLXJmIG5vZGVfbW9kdWxlcy9zaGFycCcsXG4gICAgICAgICAgICAgICducG0gaW5zdGFsbCAtLWFyY2g9eDY0IC0tcGxhdGZvcm09bGludXggLS1saWJjPWdsaWJjIHNoYXJwJ1xuICAgICAgICAgICAgXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LCAvLyBTaGFycCByZXF1aXJlcyBtb3JlIG1lbW9yeSBmb3IgaW1hZ2UgcHJvY2Vzc2luZ1xuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgfSk7XG4gICAgcGhvdG9zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHN1Ym1pdFBob3RvTGFtYmRhKTtcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEoc3VibWl0UGhvdG9MYW1iZGEpO1xuICAgIHBob3RvQnVja2V0LmdyYW50UHV0KHN1Ym1pdFBob3RvTGFtYmRhKTtcblxuICAgIGNvbnN0IHZvdGVMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1ZvdGVMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL3ZvdGUudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBIT1RPU19UQUJMRTogcGhvdG9zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSU19UQUJMRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFZPVEVTX1RBQkxFOiB2b3Rlc1RhYmxlLnRhYmxlTmFtZVxuICAgICAgfVxuICAgIH0pO1xuICAgIHBob3Rvc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh2b3RlTGFtYmRhKTtcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEodm90ZUxhbWJkYSk7XG4gICAgdm90ZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodm90ZUxhbWJkYSk7XG5cbiAgICBjb25zdCBnZXRQaG90b3NMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dldFBob3Rvc0xhbWJkYScsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEvZ2V0LXBob3Rvcy50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEhPVE9TX1RBQkxFOiBwaG90b3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFZPVEVTX1RBQkxFOiB2b3Rlc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQ0ROX1VSTDogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZG9tYWluTmFtZX1gXG4gICAgICB9XG4gICAgfSk7XG4gICAgcGhvdG9zVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRQaG90b3NMYW1iZGEpO1xuICAgIHZvdGVzVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRQaG90b3NMYW1iZGEpO1xuXG4gICAgY29uc3QgZ2V0UGhvdG9MYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dldFBob3RvTGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9nZXQtcGhvdG8udHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBIT1RPU19UQUJMRTogcGhvdG9zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBDRE5fVVJMOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kb21haW5OYW1lfWBcbiAgICAgIH1cbiAgICB9KTtcbiAgICBwaG90b3NUYWJsZS5ncmFudFJlYWREYXRhKGdldFBob3RvTGFtYmRhKTtcblxuICAgIGNvbnN0IGdldFdpbm5lckxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnR2V0V2lubmVyTGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9nZXQtd2lubmVyLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBXSU5ORVJTX1RBQkxFOiB3aW5uZXJzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBDRE5fVVJMOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kb21haW5OYW1lfWBcbiAgICAgIH1cbiAgICB9KTtcbiAgICB3aW5uZXJzVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRXaW5uZXJMYW1iZGEpO1xuXG4gICAgLy8gQVBJIEdhdGV3YXkgSFRUUCBBUElcbiAgICBjb25zdCBodHRwQXBpID0gbmV3IGFwaWdhdGV3YXkuSHR0cEFwaSh0aGlzLCAnUGhvdG9BcGknLCB7XG4gICAgICBjb3JzUHJlZmxpZ2h0OiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXG4gICAgICAgIGFsbG93TWV0aG9kczogW2FwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuQU5ZXSxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0F1dGhvcml6YXRpb24nLCAnQ29udGVudC1UeXBlJ11cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvaGVhbHRoJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignSGVhbHRoSW50ZWdyYXRpb24nLCBoZWFsdGhMYW1iZGEpXG4gICAgfSk7XG5cbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3JlZ2lzdGVyJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1JlZ2lzdGVySW50ZWdyYXRpb24nLCByZWdpc3RlckxhbWJkYSlcbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvbG9naW4nLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignTG9naW5JbnRlZ3JhdGlvbicsIGxvZ2luTGFtYmRhKVxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9sb2dvdXQnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignTG9nb3V0SW50ZWdyYXRpb24nLCBsb2dvdXRMYW1iZGEpXG4gICAgfSk7XG5cbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3ZlcmlmeScsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdWZXJpZnlJbnRlZ3JhdGlvbicsIHZlcmlmeUxhbWJkYSlcbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvc3VibWl0LXBob3RvJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1N1Ym1pdFBob3RvSW50ZWdyYXRpb24nLCBzdWJtaXRQaG90b0xhbWJkYSksXG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG5cbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3ZvdGUnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVm90ZUludGVncmF0aW9uJywgdm90ZUxhbWJkYSksXG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG5cbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3Bob3RvcycsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFBob3Rvc0ludGVncmF0aW9uJywgZ2V0UGhvdG9zTGFtYmRhKVxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9waG90b3Mve2lkfScsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFBob3RvSW50ZWdyYXRpb24nLCBnZXRQaG90b0xhbWJkYSlcbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvd2lubmVyL2xhc3QtbW9udGgnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRXaW5uZXJJbnRlZ3JhdGlvbicsIGdldFdpbm5lckxhbWJkYSlcbiAgICB9KTtcblxuICAgIC8vIFNjaGVkdWxlZCBMYW1iZGEgZm9yIG1vbnRobHkgY29udGVzdCB3aW5uZXIgY2FsY3VsYXRpb25cbiAgICBjb25zdCBjYWxjdWxhdGVNb250aGx5V2lubmVyTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdDYWxjdWxhdGVNb250aGx5V2lubmVyTGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9jYWxjdWxhdGUtbW9udGhseS13aW5uZXIudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBIT1RPU19UQUJMRTogcGhvdG9zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBXSU5ORVJTX1RBQkxFOiB3aW5uZXJzVGFibGUudGFibGVOYW1lXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBwaG90b3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY2FsY3VsYXRlTW9udGhseVdpbm5lckxhbWJkYSk7XG4gICAgd2lubmVyc1RhYmxlLmdyYW50V3JpdGVEYXRhKGNhbGN1bGF0ZU1vbnRobHlXaW5uZXJMYW1iZGEpO1xuXG4gICAgLy8gU2NoZWR1bGUgTGFtYmRhIHRvIHJ1biBvbiA4dGggZGF5IG9mIGVhY2ggbW9udGggYXQgMDA6MDAgVVRDXG4gICAgbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdNb250aGx5V2lubmVyUnVsZScsIHtcbiAgICAgIHNjaGVkdWxlOiBldmVudHMuU2NoZWR1bGUuY3Jvbih7IG1pbnV0ZTogJzAnLCBob3VyOiAnMCcsIGRheTogJzgnLCBtb250aDogJyonLCB5ZWFyOiAnKicgfSksXG4gICAgICB0YXJnZXRzOiBbbmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24oY2FsY3VsYXRlTW9udGhseVdpbm5lckxhbWJkYSldXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywgeyB2YWx1ZTogaHR0cEFwaS5hcGlFbmRwb2ludCB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ0ROVXJsJywgeyB2YWx1ZTogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZG9tYWluTmFtZX1gIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywgeyB2YWx1ZTogdXNlclBvb2wudXNlclBvb2xJZCB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xDbGllbnRJZCcsIHsgdmFsdWU6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQgfSk7XG4gIH1cbn1cbiJdfQ==