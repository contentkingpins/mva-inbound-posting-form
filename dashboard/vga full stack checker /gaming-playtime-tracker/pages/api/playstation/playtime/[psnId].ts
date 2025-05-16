import { NextApiRequest, NextApiResponse } from 'next';
import { getPlayStationPlaytime } from '../../../../lib/adapters/playstationAdapter';
import DynamoRateLimiter from '../../../../lib/utils/dynamoRateLimiter';

const rateLimiter = new DynamoRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      reason: 'Method not allowed' 
    });
  }

  // Get the client IP address for rate limiting
  const clientIp = req.headers['x-forwarded-for'] || 
                   req.socket.remoteAddress || 
                   'unknown';
  
  // Check rate limit
  const isAllowed = await rateLimiter.isAllowed(`playstation:${clientIp}`);
  
  if (!isAllowed) {
    return res.status(429).json({
      success: false,
      reason: 'Rate limit exceeded. Please try again later.'
    });
  }

  try {
    const { psnId } = req.query;
    
    if (!psnId || Array.isArray(psnId)) {
      return res.status(400).json({
        success: false,
        reason: 'Invalid PlayStation Network ID provided'
      });
    }

    const playtimeData = await getPlayStationPlaytime(psnId);
    
    return res.status(200).json(playtimeData);
  } catch (error) {
    console.error('Error in PlayStation Network API handler:', error);
    
    return res.status(500).json({
      success: false,
      reason: 'An internal server error occurred'
    });
  }
} 