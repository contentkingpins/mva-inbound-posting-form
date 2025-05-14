import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getEpicPlaytime } from '../../lib/adapters/epicAdapter';
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
  const isAllowed = await rateLimiter.isAllowed(`epic:${clientIp}`);
  
  if (!isAllowed) {
    return errorResponse(429, 'Rate limit exceeded. Please try again later.');
  }

  try {
    const epicId = event.pathParameters?.epicId;
    
    if (!epicId) {
      return errorResponse(400, 'Invalid Epic Games ID provided');
    }

    const playtimeData = await getEpicPlaytime(epicId);
    
    return successResponse(playtimeData);
  } catch (error) {
    console.error('Error in Epic Games Lambda handler:', error);
    
    return errorResponse(500, 'An internal server error occurred');
  }
}; 