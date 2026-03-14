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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const AWS = __importStar(require("aws-sdk"));
const sharp_1 = __importDefault(require("sharp"));
const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();
const PHOTOS_TABLE = process.env.PHOTOS_TABLE;
const BUCKET = process.env.BUCKET;
const MAX_IMAGE_DIMENSION = 1000; // Maximum width or height in pixels
const handler = async (event) => {
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
            const imageBuffer = s3Object.Body;
            // Process the image with sharp
            const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
            let processedImageBuffer;
            if (metadata.width && metadata.height && (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION)) {
                // Resize to fit within MAX_IMAGE_DIMENSION while maintaining aspect ratio
                processedImageBuffer = await (0, sharp_1.default)(imageBuffer)
                    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .jpeg({ quality: 90 })
                    .toBuffer();
            }
            else {
                // Image is already within limits, just convert to JPEG for consistency
                processedImageBuffer = await (0, sharp_1.default)(imageBuffer)
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
        }
        catch (error) {
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
            }
            catch (dbError) {
                console.error('Error updating photo status to failed:', dbError);
            }
        }
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11cGxvYWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9jZXNzLXVwbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSw2Q0FBK0I7QUFDL0Isa0RBQTBCO0FBRTFCLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDO0FBQ3hCLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUVqRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQWEsQ0FBQztBQUMvQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU8sQ0FBQztBQUNuQyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxDQUFDLG9DQUFvQztBQUUvRCxNQUFNLE9BQU8sR0FBYyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7SUFDaEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO1FBRWpDLDRDQUE0QztRQUM1QyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDOUMsU0FBUztRQUNYLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSCxpQ0FBaUM7WUFDakMsTUFBTSxRQUFRLEdBQUcsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDO2dCQUNsQyxNQUFNLEVBQUUsTUFBTTtnQkFDZCxHQUFHLEVBQUUsR0FBRzthQUNULENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUViLE1BQU0sV0FBVyxHQUFH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RSxRQUFRO3FCQUNwQjtvQkFDRCx5QkFBeUIsRUFBRTt3QkFDekIsU0FBUyxFQUFFLFFBQVE7cUJBQ3BCO2lCQUNGLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNmLENBQUM7WUFBQyxPQUFPLE9BQU8sRUFBRSxDQUFDO2dCQUNqQixPQUFPLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ25FLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUMsQ0FBQztBQTdGVyxRQUFBLE9BQU8sV0E2RmxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUzNIYW5kbGVyIH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBBV1MgZnJvbSAnYXdzLXNkayc7XG5pbXBvcnQgc2hhcnAgZnJvbSAnc2hhcnAnO1xuXG5jb25zdCBzMyA9IG5ldyBBV1MuUzMoKTtcbmNvbnN0IGR5bmFtbyA9IG5ldyBBV1MuRHluYW1vREIuRG9jdW1lbnRDbGllbnQoKTtcblxuY29uc3QgUEhPVE9TX1RBQkxFID0gcHJvY2Vzcy5lbnYuUEhPVE9TX1RBQkxFITtcbmNvbnN0IEJVQ0tFVCA9IHByb2Nlc3MuZW52LkJVQ0tFVCE7XG5jb25zdCBNQVhfSU1BR0VfRElNRU5TSU9OID0gMTAwMDsgLy8gTWF4aW11bSB3aWR0aCBvciBoZWlnaHQgaW4gcGl4ZWxzXG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBTM0hhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgZm9yIChjb25zdCByZWNvcmQgb2YgZXZlbnQuUmVjb3Jkcykge1xuICAgIGNvbnN0IGtleSA9IHJlY29yZC5zMy5vYmplY3Qua2V5O1xuXG4gICAgLy8gT25seSBwcm9jZXNzIGZpbGVzIGluIHRoZSB1cGxvYWRzLyBmb2xkZXJcbiAgICBpZiAoIWtleS5zdGFydHNXaXRoKCd1cGxvYWRzLycpKSB7XG4gICAgICBjb25zb2xlLmxvZygnU2tpcHBpbmcgbm9uLXVwbG9hZCBmaWxlOicsIGtleSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgLy8gR2V0IHRoZSB1cGxvYWRlZCBpbWFnZSBmcm9tIFMzXG4gICAgICBjb25zdCBzM09iamVjdCA9IGF3YWl0IHMzLmdldE9iamVjdCh7XG4gICAgICAgIEJ1Y2tldDogQlVDS0VULFxuICAgICAgICBLZXk6IGtleVxuICAgICAgfSkucHJvbWlzZSgpO1xuXG4gICAgICBjb25zdCBpbWFnZUJ1ZmZlciA9IHMzT2JqZWN0LkJvZHkgYXMgQnVmZmVyO1xuXG4gICAgICAvLyBQcm9jZXNzIHRoZSBpbWFnZSB3aXRoIHNoYXJwXG4gICAgICBjb25zdCBtZXRhZGF0YSA9IGF3YWl0IHNoYXJwKGltYWdlQnVmZmVyKS5tZXRhZGF0YSgpO1xuICAgICAgbGV0IHByb2Nlc3NlZEltYWdlQnVmZmVyOiBCdWZmZXI7XG5cbiAgICAgIGlmIChtZXRhZGF0YS53aWR0aCAmJiBtZXRhZGF0YS5oZWlnaHQgJiYgKG1ldGFkYXRhLndpZHRoID4gTUFYX0lNQUdFX0RJTUVOU0lPTiB8fCBtZXRhZGF0YS5oZWlnaHQgPiBNQVhfSU1BR0VfRElNRU5TSU9OKSkge1xuICAgICAgICAvLyBSZXNpemUgdG8gZml0IHdpdGhpbiBNQVhfSU1BR0VfRElNRU5TSU9OIHdoaWxlIG1haW50YWluaW5nIGFzcGVjdCByYXRpb1xuICAgICAgICBwcm9jZXNzZWRJbWFnZUJ1ZmZlciA9IGF3YWl0IHNoYXJwKGltYWdlQnVmZmVyKVxuICAgICAgICAgIC5yZXNpemUoTUFYX0lNQUdFX0RJTUVOU0lPTiwgTUFYX0lNQUdFX0RJTUVOU0lPTiwge1xuICAgICAgICAgICAgZml0OiAnaW5zaWRlJyxcbiAgICAgICAgICAgIHdpdGhvdXRFbmxhcmdlbWVudDogdHJ1ZVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmpwZWcoeyBxdWFsaXR5OiA5MCB9KVxuICAgICAgICAgIC50b0J1ZmZlcigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSW1hZ2UgaXMgYWxyZWFkeSB3aXRoaW4gbGltaXRzLCBqdXN0IGNvbnZlcnQgdG8gSlBFRyBmb3IgY29uc2lzdGVuY3lcbiAgICAgICAgcHJvY2Vzc2VkSW1hZ2VCdWZmZXIgPSBhd2FpdCBzaGFycChpbWFnZUJ1ZmZlcilcbiAgICAgICAgICAuanBlZyh7IHF1YWxpdHk6IDkwIH0pXG4gICAgICAgICAgLnRvQnVmZmVyKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFVwbG9hZCBwcm9jZXNzZWQgaW1hZ2UgdG8gcGhvdG9zLyBmb2xkZXJcbiAgICAgIGNvbnN0IHBob3RvX2lkID0ga2V5LnNwbGl0KCcvJylbMV0uc3BsaXQoJy4nKVswXTsgLy8gRXh0cmFjdCBwaG90b19pZCBmcm9tIHVwbG9hZHMvcGhvdG9faWQuZXh0XG4gICAgICBjb25zdCBwcm9jZXNzZWRLZXkgPSBgcGhvdG9zLyR7cGhvdG9faWR9LmpwZ2A7XG5cbiAgICAgIGF3YWl0IHMzLnB1dE9iamVjdCh7XG4gICAgICAgIEJ1Y2tldDogQlVDS0VULFxuICAgICAgICBLZXk6IHByb2Nlc3NlZEtleSxcbiAgICAgICAgQm9keTogcHJvY2Vzc2VkSW1hZ2VCdWZmZXIsXG4gICAgICAgIENvbnRlbnRUeXBlOiAnaW1hZ2UvanBlZydcbiAgICAgIH0pLnByb21pc2UoKTtcblxuICAgICAgLy8gVXBkYXRlIER5bmFtb0RCIHJlY29yZCBzdGF0dXMgdG8gJ2FjdGl2ZScgYW5kIHVwZGF0ZSBzM19rZXlcbiAgICAgIGF3YWl0IGR5bmFtby51cGRhdGUoe1xuICAgICAgICBUYWJsZU5hbWU6IFBIT1RPU19UQUJMRSxcbiAgICAgICAgS2V5OiB7IHBob3RvX2lkIH0sXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgI3N0YXR1cyA9IDpzdGF0dXMsIHMzX2tleSA9IDpzM19rZXknLFxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcbiAgICAgICAgICAnI3N0YXR1cyc6ICdzdGF0dXMnXG4gICAgICAgIH0sXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgICAnOnN0YXR1cyc6ICdhY3RpdmUnLFxuICAgICAgICAgICc6czNfa2V5JzogcHJvY2Vzc2VkS2V5XG4gICAgICAgIH1cbiAgICAgIH0pLnByb21pc2UoKTtcblxuICAgICAgLy8gRGVsZXRlIHRoZSBvcmlnaW5hbCB1cGxvYWQgZmlsZVxuICAgICAgYXdhaXQgczMuZGVsZXRlT2JqZWN0KHtcbiAgICAgICAgQnVja2V0OiBCVUNLRVQsXG4gICAgICAgIEtleToga2V5XG4gICAgICB9KS5wcm9taXNlKCk7XG5cbiAgICAgIGNvbnNvbGUubG9nKGBQaG90byAke3Bob3RvX2lkfSBwcm9jZXNzZWQgYW5kIGFjdGl2YXRlZCBzdWNjZXNzZnVsbHlgKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcHJvY2Vzc2luZyBpbWFnZTonLCBrZXksIGVycm9yKTtcblxuICAgICAgLy8gVHJ5IHRvIG1hcmsgdGhlIHBob3RvIGFzIGZhaWxlZCBpbiBEeW5hbW9EQlxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGhvdG9faWQgPSBrZXkuc3BsaXQoJy8nKVsxXS5zcGxpdCgnLicpWzBdO1xuICAgICAgICBhd2FpdCBkeW5hbW8udXBkYXRlKHtcbiAgICAgICAgICBUYWJsZU5hbWU6IFBIT1RPU19UQUJMRSxcbiAgICAgICAgICBLZXk6IHsgcGhvdG9faWQgfSxcbiAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUICNzdGF0dXMgPSA6c3RhdHVzJyxcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcbiAgICAgICAgICAgICcjc3RhdHVzJzogJ3N0YXR1cydcbiAgICAgICAgICB9LFxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgICAgICc6c3RhdHVzJzogJ2ZhaWxlZCdcbiAgICAgICAgICB9XG4gICAgICAgIH0pLnByb21pc2UoKTtcbiAgICAgIH0gY2F0Y2ggKGRiRXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgcGhvdG8gc3RhdHVzIHRvIGZhaWxlZDonLCBkYkVycm9yKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbiJdfQ==