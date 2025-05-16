import axios from 'axios';
import { cache } from '../cache';

// Type definitions
export interface EpicGame {
  id: string;
  name: string;
  hoursPlayed: number;
  coverArt: string;
  platform: string;
}

export interface EpicResponse {
  success: boolean;
  supported: boolean;
  games?: EpicGame[];
  reason?: string;
}

/**
 * Fetch playtime data from Epic Games API
 * @param epicId - Epic Games ID of the user
 * @returns EpicResponse object with games and playtime data
 */
export async function getEpicPlaytime(epicId: string): Promise<EpicResponse> {
  // Check cache first
  const cacheKey = `epic:${epicId}`;
  const cachedData = await cache.get<EpicResponse>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // In a real implementation, this would call the Epic Games API with your API credentials
    // For demo purposes, this is a mock implementation
    const clientId = process.env.EPIC_CLIENT_ID;
    const clientSecret = process.env.EPIC_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return {
        success: false,
        supported: true,
        reason: 'Epic Games API credentials are not configured'
      };
    }
    
    // This would be the actual API call in a real implementation
    // First we would get an OAuth token, then query the Epic Games API
    // const tokenResponse = await axios.post('https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token', {
    //   grant_type: 'client_credentials',
    //   client_id: clientId,
    //   client_secret: clientSecret
    // });
    // const token = tokenResponse.data.access_token;
    // const response = await axios.get(`https://library-service.live.use1a.on.epicgames.com/library/api/public/user/${epicId}/library`, {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    
    // Mock data for demonstration
    const mockGames: EpicGame[] = [
      {
        id: 'fortnite',
        name: 'Fortnite',
        hoursPlayed: 215.6,
        coverArt: 'https://cdn2.unrealengine.com/fortnite-chapter-4-season-4-key-art-1920x1080-1692793131189.jpg',
        platform: 'epic'
      },
      {
        id: 'rocket-league',
        name: 'Rocket League',
        hoursPlayed: 48.3,
        coverArt: 'https://cdn1.epicgames.com/offer/9773aa1aa54f4f7b80e44bef04986cea/EGS_RocketLeague_PsyonixLLC_S2_1200x1600-2fd2a4757411a2bf58e1bf75bf9a64d8',
        platform: 'epic'
      }
    ];
    
    const result: EpicResponse = {
      success: true,
      supported: true,
      games: mockGames
    };
    
    // Cache the result
    await cache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Epic Games data:', error);
    return {
      success: false,
      supported: true,
      reason: 'Failed to fetch Epic Games data'
    };
  }
} 