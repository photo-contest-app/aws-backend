import { DynamoDB } from 'aws-sdk';
const dynamo = new DynamoDB.DocumentClient();

export const handler = async () => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString();
  const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const photos = await dynamo.scan({
    TableName: process.env.PHOTOS_TABLE!,
    FilterExpression: 'upload_timestamp BETWEEN :start AND :end AND #status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':start': startOfLastMonth,
      ':end': endOfLastMonth,
      ':status': 'active'
    }
  }).promise();

  const winner = photos.Items?.sort((a,b) => (b.vote_count||0) - (a.vote_count||0))[0];
  const monthYear = lastMonth.toISOString().substring(0, 7);

  if (winner) {
    await dynamo.put({
      TableName: process.env.WINNERS_TABLE!,
      Item: {
        month_year: monthYear,
        photo_id: winner.photo_id,
        user_id: winner.user_id,
        title: winner.title,
        vote_count: winner.vote_count,
        calculated_at: new Date().toISOString()
      }
    }).promise();
    console.log('Winner for', monthYear, 'saved:', winner.photo_id);
  } else {
    console.log('No winner for', monthYear);
  }
};
