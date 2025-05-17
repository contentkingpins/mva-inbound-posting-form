import * as AWS from 'aws-sdk';

interface RateLimiterOptions {
  tableName?: string;
  windowMs: number;
  maxRequests: number;
}

export class DynamoRateLimiter {
  private readonly dynamoDb: AWS.DynamoDB.DocumentClient;
  private readonly tableName: string;
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options: RateLimiterOptions) {
    this.dynamoDb = new AWS.DynamoDB.DocumentClient();
    this.tableName = options.tableName || process.env.DYNAMODB_TABLE || 'RateLimiter';
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
  }

  async isAllowed(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const ttl = Math.floor((now + this.windowMs * 2) / 1000); // TTL in seconds, 2x window for cleanup

    try {
      // Get existing record
      const result = await this.dynamoDb.query({
        TableName: this.tableName,
        KeyConditionExpression: 'id = :id AND ttl >= :windowStart',
        ExpressionAttributeValues: {
          ':id': key,
          ':windowStart': Math.floor(windowStart / 1000), // Convert to seconds for TTL
        },
      }).promise();

      const count = result.Items?.length || 0;

      // If count is at or above limit, deny the request
      if (count >= this.maxRequests) {
        return false;
      }

      // Record this request
      await this.dynamoDb.put({
        TableName: this.tableName,
        Item: {
          id: key,
          ttl: ttl,
          timestamp: now,
        },
      }).promise();

      return true;
    } catch (error) {
      console.error('Rate limiter error:', error);
      // If there's an error, we'll allow the request by default
      return true;
    }
  }
} 