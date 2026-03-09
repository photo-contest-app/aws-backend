import * as cdk from 'aws-cdk-lib';
import { PhotoContestStack } from '../lib/photo-contest-stack';

const app = new cdk.App();

new PhotoContestStack(app, 'PhotoContestStack', {
  env: { region: 'eu-north-1' }
});
