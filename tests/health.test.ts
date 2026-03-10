import { handler } from '../lambda/health';

const mockEvent = {} as any;
const mockContext = {} as any;

describe('health', () => {
  it('returns 200 with status ok', async () => {
    const result = await handler(mockEvent, mockContext, () => {}) as any;
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ status: 'ok' });
  });
});

