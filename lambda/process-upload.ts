import { S3Handler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import sharp from 'sharp';

const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

const PHOTOS_TABLE = process.env.PHOTOS_TABLE!;
const BUCKET = process.env.BUCKET!;
const MAX_IMAGE_DIMENSION = 1000; // Maximum width or height in pixels

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const key = record.s3.object.key;

    // Only process files in the uploads/ folder
    if (!key.startsWith('uploads/')) {
      console.log('Skipping non-upload file:', key);
      continue;
    }

    try {
      // Get the uploaded image from S3
      const s3Object = await s3.getObject({
        Bucket: BUCKET,
        Key: key
      }).promise();

      const imageBuffer = s3Object.Body as Buffer;

      // Process the image with sharp
      const metadata = await sharp(imageBuffer).metadata();
      let processedImageBuffer: Buffer;

      if (metadata.width && metadata.height && (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION)) {
        // Resize to fit within MAX_IMAGE_DIMENSION while maintaining aspect ratio
        processedImageBuffer = await sharp(imageBuffer)
          .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 90 })
          .toBuffer();
      } else {
        // Image is already within limits, just convert to JPEG for consistency
        processedImageBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 90 })
          .toBuffer();
      }

      // Upload processed image to photos/ folder
      const photo_id = key.split('/')[1].split('.')[0]; // Extract photo_id from uploads/photo_id.ext
      const processedKey = `photos/${photo_id}.jpg`;

      await s3.putObject({
        Bucket: BUCKET,
        Key: processedKey,
        Body: processedImageBuffer,
        ContentType: 'image/jpeg'
      }).promise();

      // Update DynamoDB record status to 'active' and update s3_key
      await dynamo.update({
        TableName: PHOTOS_TABLE,
        Key: { photo_id },
        UpdateExpression: 'SET #status = :status, s3_key = :s3_key',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'active',
          ':s3_key': processedKey
        }
      }).promise();

      // Delete the original upload file
      await s3.deleteObject({
        Bucket: BUCKET,
        Key: key
      }).promise();

      console.log(`Photo ${photo_id} processed and activated successfully`);
    } catch (error) {
      console.error('Error processing image:', key, error);

      // Try to mark the photo as failed in DynamoDB
      try {
        const photo_id = key.split('/')[1].split('.')[0];
        await dynamo.update({
          TableName: PHOTOS_TABLE,
          Key: { photo_id },
          UpdateExpression: 'SET #status = :status',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': 'failed'
          }
        }).promise();
      } catch (dbError) {
        console.error('Error updating photo status to failed:', dbError);
      }
    }
  }
};

