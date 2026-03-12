import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
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
    const healthLambda = new lambda.Function(this, 'HealthLambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'health.handler',
      code: lambda.Code.fromAsset('lambda')
    });

    const submitPhotoLambda = new lambda.Function(this, 'SubmitPhotoLambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'submit-photo.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        PHOTOS_TABLE: photosTable.tableName,
        USERS_TABLE: usersTable.tableName,
        BUCKET: photoBucket.bucketName
      }
    });
    photosTable.grantReadWriteData(submitPhotoLambda);
    usersTable.grantReadWriteData(submitPhotoLambda);
    photoBucket.grantPut(submitPhotoLambda);

    const voteLambda = new lambda.Function(this, 'VoteLambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'vote.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        PHOTOS_TABLE: photosTable.tableName,
        USERS_TABLE: usersTable.tableName,
        VOTES_TABLE: votesTable.tableName
      }
    });
    photosTable.grantReadWriteData(voteLambda);
    usersTable.grantReadData(voteLambda);
    votesTable.grantReadWriteData(voteLambda);

    const getPhotosLambda = new lambda.Function(this, 'GetPhotosLambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'get-photos.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        PHOTOS_TABLE: photosTable.tableName,
        VOTES_TABLE: votesTable.tableName
      }
    });
    photosTable.grantReadData(getPhotosLambda);
    votesTable.grantReadData(getPhotosLambda);

    const getPhotoLambda = new lambda.Function(this, 'GetPhotoLambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'get-photo.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        PHOTOS_TABLE: photosTable.tableName
      }
    });
    photosTable.grantReadData(getPhotoLambda);

    const getWinnerLambda = new lambda.Function(this, 'GetWinnerLambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'get-winner.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        WINNERS_TABLE: winnersTable.tableName
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
    const calculateMonthlyWinnerLambda = new lambda.Function(this, 'CalculateMonthlyWinnerLambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'calculate-monthly-winner.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        PHOTOS_TABLE: photosTable.tableName,
        VOTES_TABLE: votesTable.tableName,
        WINNERS_TABLE: winnersTable.tableName
      }
    });

    photosTable.grantReadWriteData(calculateMonthlyWinnerLambda);
    votesTable.grantReadWriteData(calculateMonthlyWinnerLambda);
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
