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
const s3n = __importStar(require("aws-cdk-lib/aws-s3-notifications"));
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
            autoDeleteObjects: true,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.DELETE,
                        s3.HttpMethods.HEAD
                    ],
                    allowedOrigins: ['*'], // In production, restrict to your domain
                    allowedHeaders: ['*'],
                    exposedHeaders: [
                        'ETag',
                        'x-amz-server-side-encryption',
                        'x-amz-request-id',
                        'x-amz-id-2'
                    ],
                    maxAge: 3000
                }
            ]
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
        const forgotPasswordLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'ForgotPasswordLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/forgot-password.ts'),
            handler: 'handler',
            environment: {
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
            }
        });
        forgotPasswordLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
            actions: ['cognito-idp:ForgotPassword'],
            resources: [userPool.userPoolArn]
        }));
        const resetPasswordLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'ResetPasswordLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/reset-password.ts'),
            handler: 'handler',
            environment: {
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId
            }
        });
        resetPasswordLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
            actions: ['cognito-idp:ConfirmForgotPassword'],
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
        // Lambda for generating presigned upload URLs (replaces submit-photo for large files)
        const getUploadUrlLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'GetUploadUrlLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/get-upload-url.ts'),
            handler: 'handler',
            environment: {
                PHOTOS_TABLE: photosTable.tableName,
                USERS_TABLE: usersTable.tableName,
                BUCKET: photoBucket.bucketName
            }
        });
        photosTable.grantReadWriteData(getUploadUrlLambda);
        usersTable.grantReadData(getUploadUrlLambda);
        photoBucket.grantPut(getUploadUrlLambda);
        // Lambda for processing uploaded images (triggered by S3)
        const processUploadLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'ProcessUploadLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/process-upload.ts'),
            handler: 'handler',
            environment: {
                PHOTOS_TABLE: photosTable.tableName,
                BUCKET: photoBucket.bucketName
            },
            bundling: {
                nodeModules: ['sharp'],
                forceDockerBundling: true,
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
            memorySize: 1024,
            timeout: cdk.Duration.seconds(60)
        });
        photosTable.grantReadWriteData(processUploadLambda);
        photoBucket.grantReadWrite(processUploadLambda);
        // Add S3 event notification to trigger processing Lambda
        photoBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(processUploadLambda), { prefix: 'uploads/' });
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
        const getPublicPhotosLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'GetPublicPhotosLambda', {
            runtime: lambda.Runtime.NODEJS_24_X,
            entry: path.join(__dirname, '../lambda/get-public-photos.ts'),
            handler: 'handler',
            environment: {
                PHOTOS_TABLE: photosTable.tableName,
                CDN_URL: `https://${distribution.domainName}`
            }
        });
        photosTable.grantReadData(getPublicPhotosLambda);
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
            path: '/forgot-password',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('ForgotPasswordIntegration', forgotPasswordLambda)
        });
        httpApi.addRoutes({
            path: '/reset-password',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('ResetPasswordIntegration', resetPasswordLambda)
        });
        httpApi.addRoutes({
            path: '/get-upload-url',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('GetUploadUrlIntegration', getUploadUrlLambda),
            authorizer
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
            path: '/public-photos',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetPublicPhotosIntegration', getPublicPhotosLambda)
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
                USERS_TABLE: usersTable.tableName,
                WINNERS_TABLE: winnersTable.tableName
            }
        });
        photosTable.grantReadWriteData(calculateMonthlyWinnerLambda);
        usersTable.grantReadData(calculateMonthlyWinnerLambda);
        winnersTable.grantWriteData(calculateMonthlyWinnerLambda);
        // Schedule Lambda to run on 1st day of each month at 00:00 UTC
        new events.Rule(this, 'MonthlyWinnerRule', {
            schedule: events.Schedule.cron({ minute: '0', hour: '0', day: '1', month: '*', year: '*' }),
            targets: [new targets.LambdaFunction(calculateMonthlyWinnerLambda)]
        });
        new cdk.CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
        new cdk.CfnOutput(this, 'CDNUrl', { value: `https://${distribution.domainName}` });
        new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
        new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    }
}
exports.PhotoContestStack = PhotoContestStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGhvdG8tY29udGVzdC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBob3RvLWNvbnRlc3Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLHFFQUErRDtBQUMvRCwrREFBaUQ7QUFDakQsbUVBQXFEO0FBQ3JELHlFQUEyRDtBQUMzRCx3RkFBMEU7QUFDMUUsc0ZBQXdFO0FBQ3hFLHVEQUF5QztBQUN6QyxzRUFBd0Q7QUFDeEQsaUVBQW1EO0FBQ25ELHVFQUF5RDtBQUN6RCw0RUFBOEQ7QUFDOUQsK0RBQWlEO0FBQ2pELHdFQUEwRDtBQUMxRCwyQ0FBNkI7QUFFN0IsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM5QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLGtCQUFrQjtRQUNsQixNQUFNLFVBQVUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUN4RCxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUN0RSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDekMsQ0FBQyxDQUFDO1FBRUgsVUFBVSxDQUFDLHVCQUF1QixDQUFDO1lBQ2pDLFNBQVMsRUFBRSxZQUFZO1lBQ3ZCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3hFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZ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QUFDO0NBQ0Y7QUFuZEQsOENBbWRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgTm9kZWpzRnVuY3Rpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcbmltcG9ydCAqIGFzIGludGVncmF0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XG5pbXBvcnQgKiBhcyBhdXRob3JpemVycyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWF1dGhvcml6ZXJzJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBzM24gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLW5vdGlmaWNhdGlvbnMnO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cyc7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgY2xhc3MgUGhvdG9Db250ZXN0U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBEeW5hbW9EQiB0YWJsZXNcbiAgICBjb25zdCB1c2Vyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdVc2Vyc1RhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VyX2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSk7XG5cbiAgICB1c2Vyc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ25hbWUtaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdsYXN0X25hbWUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnZmlyc3RfbmFtZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXG4gICAgfSk7XG5cbiAgICBjb25zdCBwaG90b3NUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnUGhvdG9zVGFibGUnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Bob3RvX2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSk7XG5cbiAgICBwaG90b3NUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdzdGF0dXMtdGltZXN0YW1wLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc3RhdHVzJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3VwbG9hZF90aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxuICAgIH0pO1xuXG4gICAgY29uc3Qgdm90ZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVm90ZXNUYWJsZScsIHtcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndm90ZV9pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgIH0pO1xuXG4gICAgLy8gSW5kZXggZm9yIHF1ZXJ5aW5nIHZvdGVzIGJ5IHVzZXJfaWQgYW5kIHBob3RvX2lkXG4gICAgdm90ZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICd1c2VyLXBob3RvLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcl9pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdwaG90b19pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXG4gICAgfSk7XG5cbiAgICBjb25zdCB3aW5uZXJzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1dpbm5lcnNUYWJsZScsIHtcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnbW9udGhfeWVhcicsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgIH0pO1xuXG4gICAgLy8gUzMgYnVja2V0IGZvciBwaG90b3NcbiAgICBjb25zdCBwaG90b0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1Bob3RvQnVja2V0Jywge1xuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgY29yczogW1xuICAgICAgICB7XG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkdFVCxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLlBVVCxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLlBPU1QsXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5ERUxFVEUsXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5IRUFEXG4gICAgICAgICAgXSxcbiAgICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sIC8vIEluIHByb2R1Y3Rpb24sIHJlc3RyaWN0IHRvIHlvdXIgZG9tYWluXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICAgIGV4cG9zZWRIZWFkZXJzOiBbXG4gICAgICAgICAgICAnRVRhZycsXG4gICAgICAgICAgICAneC1hbXotc2VydmVyLXNpZGUtZW5jcnlwdGlvbicsXG4gICAgICAgICAgICAneC1hbXotcmVxdWVzdC1pZCcsXG4gICAgICAgICAgICAneC1hbXotaWQtMidcbiAgICAgICAgICBdLFxuICAgICAgICAgIG1heEFnZTogMzAwMFxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgICAvLyBDbG91ZEZyb250IGZvciBDRE5cbiAgICBjb25zdCBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ1Bob3RvQ0ROJywge1xuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogb3JpZ2lucy5TM0J1Y2tldE9yaWdpbi53aXRoT3JpZ2luQWNjZXNzQ29udHJvbChwaG90b0J1Y2tldClcbiAgICAgIH0sXG4gICAgICBjb21tZW50OiAnUGhvdG8gQ29udGVzdCBDRE4nLFxuICAgIH0pO1xuICAgIChkaXN0cmlidXRpb24ubm9kZS5kZWZhdWx0Q2hpbGQgYXMgY2RrLkNmblJlc291cmNlKS5hcHBseVJlbW92YWxQb2xpY3koY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSk7XG5cbiAgICAvLyBDb2duaXRvIGZvciBhdXRoZW50aWNhdGlvblxuICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1VzZXJQb29sJywge1xuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXG4gICAgICBzaWduSW5BbGlhc2VzOiB7IGVtYWlsOiB0cnVlIH0sXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSk7XG5cbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KHRoaXMsICdVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgIHVzZXJQb29sLFxuICAgICAgYXV0aEZsb3dzOiB7XG4gICAgICAgIHVzZXJQYXNzd29yZDogdHJ1ZSxcbiAgICAgICAgdXNlclNycDogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQ29nbml0byBhdXRob3JpemVyIGZvciBBUEkgR2F0ZXdheVxuICAgIGNvbnN0IGF1dGhvcml6ZXIgPSBuZXcgYXV0aG9yaXplcnMuSHR0cFVzZXJQb29sQXV0aG9yaXplcignVXNlclBvb2xBdXRob3JpemVyJywgdXNlclBvb2wsIHtcbiAgICAgIHVzZXJQb29sQ2xpZW50czogW3VzZXJQb29sQ2xpZW50XVxuICAgIH0pO1xuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9ucyBmb3IgZWFjaCBBUEkgZW5kcG9pbnRcbiAgICBjb25zdCBoZWFsdGhMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ0hlYWx0aExhbWJkYScsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEvaGVhbHRoLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZWdpc3RlckxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnUmVnaXN0ZXJMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL3JlZ2lzdGVyLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgIFVTRVJTX1RBQkxFOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZVxuICAgICAgfVxuICAgIH0pO1xuICAgIHVzZXJzVGFibGUuZ3JhbnRXcml0ZURhdGEocmVnaXN0ZXJMYW1iZGEpO1xuICAgIHJlZ2lzdGVyTGFtYmRhLmFkZFRvUm9sZVBvbGljeShuZXcgY2RrLmF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnY29nbml0by1pZHA6U2lnblVwJ10sXG4gICAgICByZXNvdXJjZXM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl1cbiAgICB9KSk7XG5cbiAgICBjb25zdCBsb2dpbkxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnTG9naW5MYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL2xvZ2luLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXG4gICAgICB9XG4gICAgfSk7XG4gICAgbG9naW5MYW1iZGEuYWRkVG9Sb2xlUG9saWN5KG5ldyBjZGsuYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydjb2duaXRvLWlkcDpJbml0aWF0ZUF1dGgnXSxcbiAgICAgIHJlc291cmNlczogW3VzZXJQb29sLnVzZXJQb29sQXJuXVxuICAgIH0pKTtcblxuICAgIGNvbnN0IGxvZ291dExhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnTG9nb3V0TGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9sb2dvdXQudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJ1xuICAgIH0pO1xuICAgIGxvZ291dExhbWJkYS5hZGRUb1JvbGVQb2xpY3kobmV3IGNkay5hd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2NvZ25pdG8taWRwOkdsb2JhbFNpZ25PdXQnXSxcbiAgICAgIHJlc291cmNlczogW3VzZXJQb29sLnVzZXJQb29sQXJuXVxuICAgIH0pKTtcblxuICAgIGNvbnN0IHZlcmlmeUxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnVmVyaWZ5TGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS92ZXJpZnkudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICB2ZXJpZnlMYW1iZGEuYWRkVG9Sb2xlUG9saWN5KG5ldyBjZGsuYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydjb2duaXRvLWlkcDpDb25maXJtU2lnblVwJ10sXG4gICAgICByZXNvdXJjZXM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl1cbiAgICB9KSk7XG5cbiAgICBjb25zdCBmb3Jnb3RQYXNzd29yZExhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnRm9yZ290UGFzc3dvcmRMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL2ZvcmdvdC1wYXNzd29yZC50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9QT09MX0NMSUVOVF9JRDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZFxuICAgICAgfVxuICAgIH0pO1xuICAgIGZvcmdvdFBhc3N3b3JkTGFtYmRhLmFkZFRvUm9sZVBvbGljeShuZXcgY2RrLmF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnY29nbml0by1pZHA6Rm9yZ290UGFzc3dvcmQnXSxcbiAgICAgIHJlc291cmNlczogW3VzZXJQb29sLnVzZXJQb29sQXJuXVxuICAgIH0pKTtcblxuICAgIGNvbnN0IHJlc2V0UGFzc3dvcmRMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1Jlc2V0UGFzc3dvcmRMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL3Jlc2V0LXBhc3N3b3JkLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXG4gICAgICB9XG4gICAgfSk7XG4gICAgcmVzZXRQYXNzd29yZExhbWJkYS5hZGRUb1JvbGVQb2xpY3kobmV3IGNkay5hd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2NvZ25pdG8taWRwOkNvbmZpcm1Gb3Jnb3RQYXNzd29yZCddLFxuICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dXG4gICAgfSkpO1xuXG4gICAgY29uc3Qgc3VibWl0UGhvdG9MYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1N1Ym1pdFBob3RvTGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9zdWJtaXQtcGhvdG8udHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBIT1RPU19UQUJMRTogcGhvdG9zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSU19UQUJMRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEJVQ0tFVDogcGhvdG9CdWNrZXQuYnVja2V0TmFtZVxuICAgICAgfSxcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIG5vZGVNb2R1bGVzOiBbJ3NoYXJwJ10sXG4gICAgICAgIGZvcmNlRG9ja2VyQnVuZGxpbmc6IHRydWUsIC8vIFJlcXVpcmVkIHRvIGJ1aWxkIFNoYXJwIGZvciBMaW51eCB4NjQgcnVudGltZVxuICAgICAgICBjb21tYW5kSG9va3M6IHtcbiAgICAgICAgICBiZWZvcmVCdW5kbGluZyhfaW5wdXREaXI6IHN0cmluZywgX291dHB1dERpcjogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYmVmb3JlSW5zdGFsbChfaW5wdXREaXI6IHN0cmluZywgX291dHB1dERpcjogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgYWZ0ZXJCdW5kbGluZyhfaW5wdXREaXI6IHN0cmluZywgX291dHB1dERpcjogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgJ2NkIC9hc3NldC1vdXRwdXQnLFxuICAgICAgICAgICAgICAncm0gLXJmIG5vZGVfbW9kdWxlcy9zaGFycCcsXG4gICAgICAgICAgICAgICducG0gaW5zdGFsbCAtLWFyY2g9eDY0IC0tcGxhdGZvcm09bGludXggLS1saWJjPWdsaWJjIHNoYXJwJ1xuICAgICAgICAgICAgXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LCAvLyBTaGFycCByZXF1aXJlcyBtb3JlIG1lbW9yeSBmb3IgaW1hZ2UgcHJvY2Vzc2luZ1xuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgfSk7XG4gICAgcGhvdG9zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHN1Ym1pdFBob3RvTGFtYmRhKTtcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEoc3VibWl0UGhvdG9MYW1iZGEpO1xuICAgIHBob3RvQnVja2V0LmdyYW50UHV0KHN1Ym1pdFBob3RvTGFtYmRhKTtcblxuICAgIC8vIExhbWJkYSBmb3IgZ2VuZXJhdGluZyBwcmVzaWduZWQgdXBsb2FkIFVSTHMgKHJlcGxhY2VzIHN1Ym1pdC1waG90byBmb3IgbGFyZ2UgZmlsZXMpXG4gICAgY29uc3QgZ2V0VXBsb2FkVXJsTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdHZXRVcGxvYWRVcmxMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL2dldC11cGxvYWQtdXJsLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQSE9UT1NfVEFCTEU6IHBob3Rvc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUlNfVEFCTEU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBCVUNLRVQ6IHBob3RvQnVja2V0LmJ1Y2tldE5hbWVcbiAgICAgIH1cbiAgICB9KTtcbiAgICBwaG90b3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ2V0VXBsb2FkVXJsTGFtYmRhKTtcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0VXBsb2FkVXJsTGFtYmRhKTtcbiAgICBwaG90b0J1Y2tldC5ncmFudFB1dChnZXRVcGxvYWRVcmxMYW1iZGEpO1xuXG4gICAgLy8gTGFtYmRhIGZvciBwcm9jZXNzaW5nIHVwbG9hZGVkIGltYWdlcyAodHJpZ2dlcmVkIGJ5IFMzKVxuICAgIGNvbnN0IHByb2Nlc3NVcGxvYWRMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1Byb2Nlc3NVcGxvYWRMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL3Byb2Nlc3MtdXBsb2FkLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQSE9UT1NfVEFCTEU6IHBob3Rvc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQlVDS0VUOiBwaG90b0J1Y2tldC5idWNrZXROYW1lXG4gICAgICB9LFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgbm9kZU1vZHVsZXM6IFsnc2hhcnAnXSxcbiAgICAgICAgZm9yY2VEb2NrZXJCdW5kbGluZzogdHJ1ZSxcbiAgICAgICAgY29tbWFuZEhvb2tzOiB7XG4gICAgICAgICAgYmVmb3JlQnVuZGxpbmcoX2lucHV0RGlyOiBzdHJpbmcsIF9vdXRwdXREaXI6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJlZm9yZUluc3RhbGwoX2lucHV0RGlyOiBzdHJpbmcsIF9vdXRwdXREaXI6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGFmdGVyQnVuZGxpbmcoX2lucHV0RGlyOiBzdHJpbmcsIF9vdXRwdXREaXI6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICdjZCAvYXNzZXQtb3V0cHV0JyxcbiAgICAgICAgICAgICAgJ3JtIC1yZiBub2RlX21vZHVsZXMvc2hhcnAnLFxuICAgICAgICAgICAgICAnbnBtIGluc3RhbGwgLS1hcmNoPXg2NCAtLXBsYXRmb3JtPWxpbnV4IC0tbGliYz1nbGliYyBzaGFycCdcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKVxuICAgIH0pO1xuICAgIHBob3Rvc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShwcm9jZXNzVXBsb2FkTGFtYmRhKTtcbiAgICBwaG90b0J1Y2tldC5ncmFudFJlYWRXcml0ZShwcm9jZXNzVXBsb2FkTGFtYmRhKTtcblxuICAgIC8vIEFkZCBTMyBldmVudCBub3RpZmljYXRpb24gdG8gdHJpZ2dlciBwcm9jZXNzaW5nIExhbWJkYVxuICAgIHBob3RvQnVja2V0LmFkZEV2ZW50Tm90aWZpY2F0aW9uKFxuICAgICAgczMuRXZlbnRUeXBlLk9CSkVDVF9DUkVBVEVELFxuICAgICAgbmV3IHMzbi5MYW1iZGFEZXN0aW5hdGlvbihwcm9jZXNzVXBsb2FkTGFtYmRhKSxcbiAgICAgIHsgcHJlZml4OiAndXBsb2Fkcy8nIH1cbiAgICApO1xuXG4gICAgY29uc3Qgdm90ZUxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnVm90ZUxhbWJkYScsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEvdm90ZS50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEhPVE9TX1RBQkxFOiBwaG90b3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJTX1RBQkxFOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVk9URVNfVEFCTEU6IHZvdGVzVGFibGUudGFibGVOYW1lXG4gICAgICB9XG4gICAgfSk7XG4gICAgcGhvdG9zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHZvdGVMYW1iZGEpO1xuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkRGF0YSh2b3RlTGFtYmRhKTtcbiAgICB2b3Rlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh2b3RlTGFtYmRhKTtcblxuICAgIGNvbnN0IGdldFBob3Rvc0xhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnR2V0UGhvdG9zTGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9nZXQtcGhvdG9zLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQSE9UT1NfVEFCTEU6IHBob3Rvc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVk9URVNfVEFCTEU6IHZvdGVzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBDRE5fVVJMOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kb21haW5OYW1lfWBcbiAgICAgIH1cbiAgICB9KTtcbiAgICBwaG90b3NUYWJsZS5ncmFudFJlYWREYXRhKGdldFBob3Rvc0xhbWJkYSk7XG4gICAgdm90ZXNUYWJsZS5ncmFudFJlYWREYXRhKGdldFBob3Rvc0xhbWJkYSk7XG5cbiAgICBjb25zdCBnZXRQaG90b0xhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnR2V0UGhvdG9MYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL2dldC1waG90by50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEhPVE9TX1RBQkxFOiBwaG90b3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIENETl9VUkw6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRvbWFpbk5hbWV9YFxuICAgICAgfVxuICAgIH0pO1xuICAgIHBob3Rvc1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0UGhvdG9MYW1iZGEpO1xuXG4gICAgY29uc3QgZ2V0UHVibGljUGhvdG9zTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdHZXRQdWJsaWNQaG90b3NMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL2dldC1wdWJsaWMtcGhvdG9zLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQSE9UT1NfVEFCTEU6IHBob3Rvc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQ0ROX1VSTDogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZG9tYWluTmFtZX1gXG4gICAgICB9XG4gICAgfSk7XG4gICAgcGhvdG9zVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRQdWJsaWNQaG90b3NMYW1iZGEpO1xuXG4gICAgY29uc3QgZ2V0V2lubmVyTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdHZXRXaW5uZXJMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL2dldC13aW5uZXIudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFdJTk5FUlNfVEFCTEU6IHdpbm5lcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIENETl9VUkw6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRvbWFpbk5hbWV9YFxuICAgICAgfVxuICAgIH0pO1xuICAgIHdpbm5lcnNUYWJsZS5ncmFudFJlYWREYXRhKGdldFdpbm5lckxhbWJkYSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheSBIVFRQIEFQSVxuICAgIGNvbnN0IGh0dHBBcGkgPSBuZXcgYXBpZ2F0ZXdheS5IdHRwQXBpKHRoaXMsICdQaG90b0FwaScsIHtcbiAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbJyonXSxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5BTlldLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQXV0aG9yaXphdGlvbicsICdDb250ZW50LVR5cGUnXVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9oZWFsdGgnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdIZWFsdGhJbnRlZ3JhdGlvbicsIGhlYWx0aExhbWJkYSlcbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvcmVnaXN0ZXInLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUmVnaXN0ZXJJbnRlZ3JhdGlvbicsIHJlZ2lzdGVyTGFtYmRhKVxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9sb2dpbicsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdMb2dpbkludGVncmF0aW9uJywgbG9naW5MYW1iZGEpXG4gICAgfSk7XG5cbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2xvZ291dCcsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdMb2dvdXRJbnRlZ3JhdGlvbicsIGxvZ291dExhbWJkYSlcbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvdmVyaWZ5JyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1ZlcmlmeUludGVncmF0aW9uJywgdmVyaWZ5TGFtYmRhKVxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9mb3Jnb3QtcGFzc3dvcmQnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignRm9yZ290UGFzc3dvcmRJbnRlZ3JhdGlvbicsIGZvcmdvdFBhc3N3b3JkTGFtYmRhKVxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9yZXNldC1wYXNzd29yZCcsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdSZXNldFBhc3N3b3JkSW50ZWdyYXRpb24nLCByZXNldFBhc3N3b3JkTGFtYmRhKVxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9nZXQtdXBsb2FkLXVybCcsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRVcGxvYWRVcmxJbnRlZ3JhdGlvbicsIGdldFVwbG9hZFVybExhbWJkYSksXG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG5cbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3N1Ym1pdC1waG90bycsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdTdWJtaXRQaG90b0ludGVncmF0aW9uJywgc3VibWl0UGhvdG9MYW1iZGEpLFxuICAgICAgYXV0aG9yaXplclxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy92b3RlJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1ZvdGVJbnRlZ3JhdGlvbicsIHZvdGVMYW1iZGEpLFxuICAgICAgYXV0aG9yaXplclxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9waG90b3MnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRQaG90b3NJbnRlZ3JhdGlvbicsIGdldFBob3Rvc0xhbWJkYSlcbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvcGhvdG9zL3tpZH0nLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRQaG90b0ludGVncmF0aW9uJywgZ2V0UGhvdG9MYW1iZGEpXG4gICAgfSk7XG5cbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3B1YmxpYy1waG90b3MnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRQdWJsaWNQaG90b3NJbnRlZ3JhdGlvbicsIGdldFB1YmxpY1Bob3Rvc0xhbWJkYSlcbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvd2lubmVyL2xhc3QtbW9udGgnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRXaW5uZXJJbnRlZ3JhdGlvbicsIGdldFdpbm5lckxhbWJkYSlcbiAgICB9KTtcblxuICAgIC8vIFNjaGVkdWxlZCBMYW1iZGEgZm9yIG1vbnRobHkgY29udGVzdCB3aW5uZXIgY2FsY3VsYXRpb25cbiAgICBjb25zdCBjYWxjdWxhdGVNb250aGx5V2lubmVyTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdDYWxjdWxhdGVNb250aGx5V2lubmVyTGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9jYWxjdWxhdGUtbW9udGhseS13aW5uZXIudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBIT1RPU19UQUJMRTogcGhvdG9zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSU19UQUJMRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFdJTk5FUlNfVEFCTEU6IHdpbm5lcnNUYWJsZS50YWJsZU5hbWVcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHBob3Rvc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjYWxjdWxhdGVNb250aGx5V2lubmVyTGFtYmRhKTtcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEoY2FsY3VsYXRlTW9udGhseVdpbm5lckxhbWJkYSk7XG4gICAgd2lubmVyc1RhYmxlLmdyYW50V3JpdGVEYXRhKGNhbGN1bGF0ZU1vbnRobHlXaW5uZXJMYW1iZGEpO1xuXG4gICAgLy8gU2NoZWR1bGUgTGFtYmRhIHRvIHJ1biBvbiAxc3QgZGF5IG9mIGVhY2ggbW9udGggYXQgMDA6MDAgVVRDXG4gICAgbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdNb250aGx5V2lubmVyUnVsZScsIHtcbiAgICAgIHNjaGVkdWxlOiBldmVudHMuU2NoZWR1bGUuY3Jvbih7IG1pbnV0ZTogJzAnLCBob3VyOiAnMCcsIGRheTogJzEnLCBtb250aDogJyonLCB5ZWFyOiAnKicgfSksXG4gICAgICB0YXJnZXRzOiBbbmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24oY2FsY3VsYXRlTW9udGhseVdpbm5lckxhbWJkYSldXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywgeyB2YWx1ZTogaHR0cEFwaS5hcGlFbmRwb2ludCB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ0ROVXJsJywgeyB2YWx1ZTogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZG9tYWluTmFtZX1gIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywgeyB2YWx1ZTogdXNlclBvb2wudXNlclBvb2xJZCB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xDbGllbnRJZCcsIHsgdmFsdWU6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQgfSk7XG4gIH1cbn1cbiJdfQ==