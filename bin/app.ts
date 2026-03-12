import * as cdk from 'aws-cdk-lib';
import { PhotoContestStack } from '../lib/photo-contest-stack';

const app = new cdk.App();

new PhotoContestStack(app, 'PhotoContestStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'eu-north-1'
  }
});
