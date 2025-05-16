import { NextApiRequest, NextApiResponse } from 'next';
import { getRiotPlaytime } from '../../../../lib/adapters/riotAdapter';
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
  const isAllowed = await rateLimiter.isAllowed(`riot:${clientIp}`);
  
  if (!isAllowed) {
    return res.status(429).json({
      success: false,
      reason: 'Rate limit exceeded. Please try again later.'
    });
  }

  try {
    const { puuid } = req.query;
    
    if (!puuid || Array.isArray(puuid)) {
      return res.status(400).json({
        success: false,
        reason: 'Invalid Riot Games PUUID provided'
      });
    }

    const playtimeData = await getRiotPlaytime(puuid);
    
    return res.status(200).json(playtimeData);
  } catch (error) {
    console.error('Error in Riot Games API handler:', error);
    
    return res.status(500).json({
      success: false,
      reason: 'An internal server error occurred'
    });
  }
} 