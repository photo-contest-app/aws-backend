import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as path from 'path';

export class PhotoContestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
    (distribution.node.defaultChild as cdk.CfnResource).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

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
    const healthLambda = new NodejsFunction(this, 'HealthLambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      entry: path.join(__dirname, '../lambda/health.ts'),
      handler: 'handler',
    });

    const registerLambda = new NodejsFunction(this, 'RegisterLambda', {
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

    const loginLambda = new NodejsFunction(this, 'LoginLambda', {
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

    const logoutLambda = new NodejsFunction(this, 'LogoutLambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      entry: path.join(__dirname, '../lambda/logout.ts'),
      handler: 'handler'
    });
    logoutLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['cognito-idp:GlobalSignOut'],
      resources: [userPool.userPoolArn]
    }));

    const verifyLambda = new NodejsFunction(this, 'VerifyLambda', {
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

    const submitPhotoLambda = new NodejsFunction(this, 'SubmitPhotoLambda', {
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
          beforeBundling(_inputDir: string, _outputDir: string): string[] {
            return [];
          },
          beforeInstall(_inputDir: string, _outputDir: string): string[] {
            return [];
          },
          afterBundling(_inputDir: string, _outputDir: string): string[] {
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

    const voteLambda = new NodejsFunction(this, 'VoteLambda', {
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

    const getPhotosLambda = new NodejsFunction(this, 'GetPhotosLambda', {
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

    const getPhotoLambda = new NodejsFunction(this, 'GetPhotoLambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      entry: path.join(__dirname, '../lambda/get-photo.ts'),
      handler: 'handler',
      environment: {
        PHOTOS_TABLE: photosTable.tableName,
        CDN_URL: `https://${distribution.domainName}`
      }
    });
    photosTable.grantReadData(getPhotoLambda);

    const getPublicPhotosLambda = new NodejsFunction(this, 'GetPublicPhotosLambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      entry: path.join(__dirname, '../lambda/get-public-photos.ts'),
      handler: 'handler',
      environment: {
        PHOTOS_TABLE: photosTable.tableName,
        CDN_URL: `https://${distribution.domainName}`
      }
    });
    photosTable.grantReadData(getPublicPhotosLambda);

    const getWinnerLambda = new NodejsFunction(this, 'GetWinnerLambda', {
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
    const calculateMonthlyWinnerLambda = new NodejsFunction(this, 'CalculateMonthlyWinnerLambda', {
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
