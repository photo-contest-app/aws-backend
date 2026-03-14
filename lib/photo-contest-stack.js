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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGhvdG8tY29udGVzdC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBob3RvLWNvbnRlc3Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLHFFQUErRDtBQUMvRCwrREFBaUQ7QUFDakQsbUVBQXFEO0FBQ3JELHlFQUEyRDtBQUMzRCx3RkFBMEU7QUFDMUUsc0ZBQXdFO0FBQ3hFLHVEQUF5QztBQUN6QyxpRUFBbUQ7QUFDbkQsdUVBQXlEO0FBQ3pELDRFQUE4RDtBQUM5RCwrREFBaUQ7QUFDakQsd0VBQTBEO0FBQzFELDJDQUE2QjtBQUU3QixNQUFhLGlCQUFrQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzlDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsa0JBQWtCO1FBQ2xCLE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3hELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3RFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxVQUFVLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLFlBQVk7WUFDdkIsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDeEUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVB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QUFDO1NBQ3BFLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFFLFdBQVcsWUFBWSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUN0RSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7SUFDMUYsQ0FBQztDQUNGO0FBMVZELDhDQTBWQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XG5pbXBvcnQgKiBhcyBpbnRlZ3JhdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xuaW1wb3J0ICogYXMgYXV0aG9yaXplcnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1hdXRob3JpemVycyc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cyc7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgY2xhc3MgUGhvdG9Db250ZXN0U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBEeW5hbW9EQiB0YWJsZXNcbiAgICBjb25zdCB1c2Vyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdVc2Vyc1RhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VyX2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSk7XG5cbiAgICB1c2Vyc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ25hbWUtaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdsYXN0X25hbWUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnZmlyc3RfbmFtZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXG4gICAgfSk7XG5cbiAgICBjb25zdCBwaG90b3NUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnUGhvdG9zVGFibGUnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Bob3RvX2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSk7XG5cbiAgICBwaG90b3NUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdzdGF0dXMtdGltZXN0YW1wLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc3RhdHVzJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3VwbG9hZF90aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTFxuICAgIH0pO1xuXG4gICAgY29uc3Qgdm90ZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVm90ZXNUYWJsZScsIHtcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndm90ZV9pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgIH0pO1xuXG4gICAgLy8gSW5kZXggZm9yIHF1ZXJ5aW5nIHZvdGVzIGJ5IHVzZXJfaWQgYW5kIHBob3RvX2lkXG4gICAgdm90ZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICd1c2VyLXBob3RvLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcl9pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdwaG90b19pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMXG4gICAgfSk7XG5cbiAgICBjb25zdCB3aW5uZXJzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1dpbm5lcnNUYWJsZScsIHtcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnbW9udGhfeWVhcicsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgIH0pO1xuXG4gICAgLy8gUzMgYnVja2V0IGZvciBwaG90b3NcbiAgICBjb25zdCBwaG90b0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1Bob3RvQnVja2V0Jywge1xuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlXG4gICAgfSk7XG5cbiAgICAvLyBDbG91ZEZyb250IGZvciBDRE5cbiAgICBjb25zdCBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ1Bob3RvQ0ROJywge1xuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogb3JpZ2lucy5TM0J1Y2tldE9yaWdpbi53aXRoT3JpZ2luQWNjZXNzQ29udHJvbChwaG90b0J1Y2tldClcbiAgICAgIH0sXG4gICAgICBjb21tZW50OiAnUGhvdG8gQ29udGVzdCBDRE4nLFxuICAgIH0pO1xuICAgIChkaXN0cmlidXRpb24ubm9kZS5kZWZhdWx0Q2hpbGQgYXMgY2RrLkNmblJlc291cmNlKS5hcHBseVJlbW92YWxQb2xpY3koY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSk7XG5cbiAgICAvLyBDb2duaXRvIGZvciBhdXRoZW50aWNhdGlvblxuICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1VzZXJQb29sJywge1xuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXG4gICAgICBzaWduSW5BbGlhc2VzOiB7IGVtYWlsOiB0cnVlIH0sXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSk7XG5cbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KHRoaXMsICdVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgIHVzZXJQb29sLFxuICAgICAgYXV0aEZsb3dzOiB7XG4gICAgICAgIHVzZXJQYXNzd29yZDogdHJ1ZSxcbiAgICAgICAgdXNlclNycDogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQ29nbml0byBhdXRob3JpemVyIGZvciBBUEkgR2F0ZXdheVxuICAgIGNvbnN0IGF1dGhvcml6ZXIgPSBuZXcgYXV0aG9yaXplcnMuSHR0cFVzZXJQb29sQXV0aG9yaXplcignVXNlclBvb2xBdXRob3JpemVyJywgdXNlclBvb2wsIHtcbiAgICAgIHVzZXJQb29sQ2xpZW50czogW3VzZXJQb29sQ2xpZW50XVxuICAgIH0pO1xuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9ucyBmb3IgZWFjaCBBUEkgZW5kcG9pbnRcbiAgICBjb25zdCBoZWFsdGhMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ0hlYWx0aExhbWJkYScsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEvaGVhbHRoLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZWdpc3RlckxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnUmVnaXN0ZXJMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL3JlZ2lzdGVyLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgIFVTRVJTX1RBQkxFOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZVxuICAgICAgfVxuICAgIH0pO1xuICAgIHVzZXJzVGFibGUuZ3JhbnRXcml0ZURhdGEocmVnaXN0ZXJMYW1iZGEpO1xuICAgIHJlZ2lzdGVyTGFtYmRhLmFkZFRvUm9sZVBvbGljeShuZXcgY2RrLmF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnY29nbml0by1pZHA6U2lnblVwJ10sXG4gICAgICByZXNvdXJjZXM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl1cbiAgICB9KSk7XG5cbiAgICBjb25zdCBsb2dpbkxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnTG9naW5MYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL2xvZ2luLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXG4gICAgICB9XG4gICAgfSk7XG4gICAgbG9naW5MYW1iZGEuYWRkVG9Sb2xlUG9saWN5KG5ldyBjZGsuYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydjb2duaXRvLWlkcDpJbml0aWF0ZUF1dGgnXSxcbiAgICAgIHJlc291cmNlczogW3VzZXJQb29sLnVzZXJQb29sQXJuXVxuICAgIH0pKTtcblxuICAgIGNvbnN0IGxvZ291dExhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnTG9nb3V0TGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9sb2dvdXQudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJ1xuICAgIH0pO1xuICAgIGxvZ291dExhbWJkYS5hZGRUb1JvbGVQb2xpY3kobmV3IGNkay5hd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2NvZ25pdG8taWRwOkdsb2JhbFNpZ25PdXQnXSxcbiAgICAgIHJlc291cmNlczogW3VzZXJQb29sLnVzZXJQb29sQXJuXVxuICAgIH0pKTtcblxuICAgIGNvbnN0IHZlcmlmeUxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnVmVyaWZ5TGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS92ZXJpZnkudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRcbiAgICAgIH1cbiAgICB9KTtcbiAgICB2ZXJpZnlMYW1iZGEuYWRkVG9Sb2xlUG9saWN5KG5ldyBjZGsuYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydjb2duaXRvLWlkcDpDb25maXJtU2lnblVwJ10sXG4gICAgICByZXNvdXJjZXM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl1cbiAgICB9KSk7XG5cbiAgICBjb25zdCBzdWJtaXRQaG90b0xhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnU3VibWl0UGhvdG9MYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL3N1Ym1pdC1waG90by50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEhPVE9TX1RBQkxFOiBwaG90b3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJTX1RBQkxFOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQlVDS0VUOiBwaG90b0J1Y2tldC5idWNrZXROYW1lXG4gICAgICB9LFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgbm9kZU1vZHVsZXM6IFsnc2hhcnAnXSxcbiAgICAgICAgZm9yY2VEb2NrZXJCdW5kbGluZzogdHJ1ZSwgLy8gUmVxdWlyZWQgdG8gYnVpbGQgU2hhcnAgZm9yIExpbnV4IHg2NCBydW50aW1lXG4gICAgICAgIGNvbW1hbmRIb29rczoge1xuICAgICAgICAgIGJlZm9yZUJ1bmRsaW5nKF9pbnB1dERpcjogc3RyaW5nLCBfb3V0cHV0RGlyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgfSxcbiAgICAgICAgICBiZWZvcmVJbnN0YWxsKF9pbnB1dERpcjogc3RyaW5nLCBfb3V0cHV0RGlyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgfSxcbiAgICAgICAgICBhZnRlckJ1bmRsaW5nKF9pbnB1dERpcjogc3RyaW5nLCBfb3V0cHV0RGlyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAnY2QgL2Fzc2V0LW91dHB1dCcsXG4gICAgICAgICAgICAgICdybSAtcmYgbm9kZV9tb2R1bGVzL3NoYXJwJyxcbiAgICAgICAgICAgICAgJ25wbSBpbnN0YWxsIC0tYXJjaD14NjQgLS1wbGF0Zm9ybT1saW51eCAtLWxpYmM9Z2xpYmMgc2hhcnAnXG4gICAgICAgICAgICBdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIG1lbW9yeVNpemU6IDEwMjQsIC8vIFNoYXJwIHJlcXVpcmVzIG1vcmUgbWVtb3J5IGZvciBpbWFnZSBwcm9jZXNzaW5nXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KTtcbiAgICBwaG90b3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoc3VibWl0UGhvdG9MYW1iZGEpO1xuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkRGF0YShzdWJtaXRQaG90b0xhbWJkYSk7XG4gICAgcGhvdG9CdWNrZXQuZ3JhbnRQdXQoc3VibWl0UGhvdG9MYW1iZGEpO1xuXG4gICAgY29uc3Qgdm90ZUxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnVm90ZUxhbWJkYScsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEvdm90ZS50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEhPVE9TX1RBQkxFOiBwaG90b3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJTX1RBQkxFOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVk9URVNfVEFCTEU6IHZvdGVzVGFibGUudGFibGVOYW1lXG4gICAgICB9XG4gICAgfSk7XG4gICAgcGhvdG9zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHZvdGVMYW1iZGEpO1xuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkRGF0YSh2b3RlTGFtYmRhKTtcbiAgICB2b3Rlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh2b3RlTGFtYmRhKTtcblxuICAgIGNvbnN0IGdldFBob3Rvc0xhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnR2V0UGhvdG9zTGFtYmRhJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYS9nZXQtcGhvdG9zLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQSE9UT1NfVEFCTEU6IHBob3Rvc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVk9URVNfVEFCTEU6IHZvdGVzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBDRE5fVVJMOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kb21haW5OYW1lfWBcbiAgICAgIH1cbiAgICB9KTtcbiAgICBwaG90b3NUYWJsZS5ncmFudFJlYWREYXRhKGdldFBob3Rvc0xhbWJkYSk7XG4gICAgdm90ZXNUYWJsZS5ncmFudFJlYWREYXRhKGdldFBob3Rvc0xhbWJkYSk7XG5cbiAgICBjb25zdCBnZXRQaG90b0xhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnR2V0UGhvdG9MYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL2dldC1waG90by50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEhPVE9TX1RBQkxFOiBwaG90b3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIENETl9VUkw6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRvbWFpbk5hbWV9YFxuICAgICAgfVxuICAgIH0pO1xuICAgIHBob3Rvc1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0UGhvdG9MYW1iZGEpO1xuXG4gICAgY29uc3QgZ2V0UHVibGljUGhvdG9zTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdHZXRQdWJsaWNQaG90b3NMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL2dldC1wdWJsaWMtcGhvdG9zLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQSE9UT1NfVEFCTEU6IHBob3Rvc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQ0ROX1VSTDogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZG9tYWluTmFtZX1gXG4gICAgICB9XG4gICAgfSk7XG4gICAgcGhvdG9zVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRQdWJsaWNQaG90b3NMYW1iZGEpO1xuXG4gICAgY29uc3QgZ2V0V2lubmVyTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdHZXRXaW5uZXJMYW1iZGEnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjRfWCxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhL2dldC13aW5uZXIudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFdJTk5FUlNfVEFCTEU6IHdpbm5lcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIENETl9VUkw6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRvbWFpbk5hbWV9YFxuICAgICAgfVxuICAgIH0pO1xuICAgIHdpbm5lcnNUYWJsZS5ncmFudFJlYWREYXRhKGdldFdpbm5lckxhbWJkYSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheSBIVFRQIEFQSVxuICAgIGNvbnN0IGh0dHBBcGkgPSBuZXcgYXBpZ2F0ZXdheS5IdHRwQXBpKHRoaXMsICdQaG90b0FwaScsIHtcbiAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbJyonXSxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5BTlldLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQXV0aG9yaXphdGlvbicsICdDb250ZW50LVR5cGUnXVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9oZWFsdGgnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdIZWFsdGhJbnRlZ3JhdGlvbicsIGhlYWx0aExhbWJkYSlcbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvcmVnaXN0ZXInLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUmVnaXN0ZXJJbnRlZ3JhdGlvbicsIHJlZ2lzdGVyTGFtYmRhKVxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9sb2dpbicsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdMb2dpbkludGVncmF0aW9uJywgbG9naW5MYW1iZGEpXG4gICAgfSk7XG5cbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2xvZ291dCcsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdMb2dvdXRJbnRlZ3JhdGlvbicsIGxvZ291dExhbWJkYSlcbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvdmVyaWZ5JyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1ZlcmlmeUludGVncmF0aW9uJywgdmVyaWZ5TGFtYmRhKVxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9zdWJtaXQtcGhvdG8nLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignU3VibWl0UGhvdG9JbnRlZ3JhdGlvbicsIHN1Ym1pdFBob3RvTGFtYmRhKSxcbiAgICAgIGF1dGhvcml6ZXJcbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvdm90ZScsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdWb3RlSW50ZWdyYXRpb24nLCB2b3RlTGFtYmRhKSxcbiAgICAgIGF1dGhvcml6ZXJcbiAgICB9KTtcblxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvcGhvdG9zJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UGhvdG9zSW50ZWdyYXRpb24nLCBnZXRQaG90b3NMYW1iZGEpXG4gICAgfSk7XG5cbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3Bob3Rvcy97aWR9JyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UGhvdG9JbnRlZ3JhdGlvbicsIGdldFBob3RvTGFtYmRhKVxuICAgIH0pO1xuXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9wdWJsaWMtcGhvdG9zJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UHVibGljUGhvdG9zSW50ZWdyYXRpb24nLCBnZXRQdWJsaWNQaG90b3NMYW1iZGEpXG4gICAgfSk7XG5cbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3dpbm5lci9sYXN0LW1vbnRoJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0V2lubmVySW50ZWdyYXRpb24nLCBnZXRXaW5uZXJMYW1iZGEpXG4gICAgfSk7XG5cbiAgICAvLyBTY2hlZHVsZWQgTGFtYmRhIGZvciBtb250aGx5IGNvbnRlc3Qgd2lubmVyIGNhbGN1bGF0aW9uXG4gICAgY29uc3QgY2FsY3VsYXRlTW9udGhseVdpbm5lckxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnQ2FsY3VsYXRlTW9udGhseVdpbm5lckxhbWJkYScsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yNF9YLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEvY2FsY3VsYXRlLW1vbnRobHktd2lubmVyLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQSE9UT1NfVEFCTEU6IHBob3Rvc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUlNfVEFCTEU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBXSU5ORVJTX1RBQkxFOiB3aW5uZXJzVGFibGUudGFibGVOYW1lXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBwaG90b3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY2FsY3VsYXRlTW9udGhseVdpbm5lckxhbWJkYSk7XG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWREYXRhKGNhbGN1bGF0ZU1vbnRobHlXaW5uZXJMYW1iZGEpO1xuICAgIHdpbm5lcnNUYWJsZS5ncmFudFdyaXRlRGF0YShjYWxjdWxhdGVNb250aGx5V2lubmVyTGFtYmRhKTtcblxuICAgIC8vIFNjaGVkdWxlIExhbWJkYSB0byBydW4gb24gMXN0IGRheSBvZiBlYWNoIG1vbnRoIGF0IDAwOjAwIFVUQ1xuICAgIG5ldyBldmVudHMuUnVsZSh0aGlzLCAnTW9udGhseVdpbm5lclJ1bGUnLCB7XG4gICAgICBzY2hlZHVsZTogZXZlbnRzLlNjaGVkdWxlLmNyb24oeyBtaW51dGU6ICcwJywgaG91cjogJzAnLCBkYXk6ICcxJywgbW9udGg6ICcqJywgeWVhcjogJyonIH0pLFxuICAgICAgdGFyZ2V0czogW25ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKGNhbGN1bGF0ZU1vbnRobHlXaW5uZXJMYW1iZGEpXVxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaVVybCcsIHsgdmFsdWU6IGh0dHBBcGkuYXBpRW5kcG9pbnQgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NETlVybCcsIHsgdmFsdWU6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRvbWFpbk5hbWV9YCB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHsgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sSWQgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7IHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkIH0pO1xuICB9XG59XG4iXX0=