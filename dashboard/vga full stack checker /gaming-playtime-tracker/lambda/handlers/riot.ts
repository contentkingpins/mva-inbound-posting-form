import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getRiotPlaytime } from '../../lib/adapters/riotAdapter';
import { DynamoRateLimiter } from '../utils/rateLimiter';
import { successResponse, errorResponse } from '../utils/response';

const rateLimiter = new DynamoRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Get the client IP address for rate limiting
  const clientIp = event.requestContext.identity?.sourceIp || 'unknown';
  
  // Check rate limit
  const isAllowed = await rateLimiter.isAllowed(`riot:${clientIp}`);
  
  if (!isAllowed) {
    return errorResponse(429, 'Rate limit exceeded. Please try again later.');
  }

  try {
    const riotId = event.pathParameters?.riotId;
    
    if (!riotId) {
      return errorResponse(400, 'Invalid Riot ID provided');
    }

    const playtimeData = await getRiotPlaytime(riotId);
    
    return successResponse(playtimeData);
  } catch (error) {
    console.error('Error in Riot Lambda handler:', error);
    
    return errorResponse(500, 'An internal server error occurred');
  }
}; 