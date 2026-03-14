import { DynamoDB } from 'aws-sdk';
const dynamo = new DynamoDB.DocumentClient();

export const handler = async () => {
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = lastMonthDate.getFullYear();
  const month = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
  const monthYear = `${year}-${month}`;

  // Build start/end strings manually to avoid UTC offset issues
  const daysInMonth = new Date(year, lastMonthDate.getMonth() + 1, 0).getDate();
  const startOfLastMonth = `${monthYear}-01T00:00:00.000Z`;
  const endOfLastMonth = `${monthYear}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999Z`;

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

  // Sort by vote_count descending, then by earliest upload_timestamp as tie-breaker
  const winner = photos.Items?.sort((a, b) => {
    const voteDiff = (b.vote_count || 0) - (a.vote_count || 0);
    if (voteDiff !== 0) return voteDiff;
    return a.upload_timestamp < b.upload_timestamp ? -1 : 1;
  })[0];

  if (winner) {
    // Fetch user information
    const userResult = await dynamo.get({
      TableName: process.env.USERS_TABLE!,
      Key: { user_id: winner.user_id }
    }).promise();

    const user = userResult.Item;

    await dynamo.put({
      TableName: process.env.WINNERS_TABLE!,
      Item: {
        month_year: monthYear,
        user_id: winner.user_id,
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        photo_id: winner.photo_id,
        photo_s3_url: winner.s3_key,
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
