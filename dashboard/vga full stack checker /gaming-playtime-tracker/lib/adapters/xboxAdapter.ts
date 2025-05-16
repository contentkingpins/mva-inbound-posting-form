import axios from 'axios';
import { cache } from '../cache';

// Type definitions
export interface XboxGame {
  id: string;
  name: string;
  hoursPlayed: number;
  coverArt: string;
  platform: string;
}

export interface XboxResponse {
  success: boolean;
  supported: boolean;
  games?: XboxGame[];
  reason?: string;
}

/**
 * Fetch playtime data from Xbox Live API
 * @param gamertag - Xbox Live gamertag of the user
 * @returns XboxResponse object with games and playtime data
 */
export async function getXboxPlaytime(gamertag: string): Promise<XboxResponse> {
  // Check cache first
  const cacheKey = `xbox:${gamertag}`;
  const cachedData = await cache.get<XboxResponse>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // In a real implementation, this would call the Xbox Live API with your client credentials
    // For demo purposes, this is a mock implementation
    const clientId = process.env.XBOX_CLIENT_ID;
    const clientSecret = process.env.XBOX_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return {
        success: false,
        supported: true,
        reason: 'Xbox Live API credentials are not configured'
      };
    }
    
    // This would be the actual API call in a real implementation
    // First we would get an auth token, then query the Xbox Live API
    // const tokenResponse = await axios.post('https://login.live.com/oauth20_token.srf', {
    //   client_id: clientId,
    //   client_secret: clientSecret,
    //   grant_type: 'client_credentials',
    //   scope: 'XboxLive.ReadBasic'
    // });
    // const token = tokenResponse.data.access_token;
    // const response = await axios.get(`https://xapi.us/v2/activity/${gamertag}`, {
    //   headers: { 'X-AUTH': token }
    // });
    
    // Mock data for demonstration
    const mockGames: XboxGame[] = [
      {
        id: 'halo-infinite',
        name: 'Halo Infinite',
        hoursPlayed: 58.2,
        coverArt: 'https://store-images.s-microsoft.com/image/apps.22079.13727851868390641.c9cc5f66-aff8-406c-af6b-440838730be0.68796bde-cbf5-4945-8d92-17c338c712fc',
        platform: 'xbox'
      },
      {
        id: 'forza-horizon-5',
        name: 'Forza Horizon 5',
        hoursPlayed: 32.7,
        coverArt: 'https://store-images.s-microsoft.com/image/apps.34695.13718773309227929.bebdcc0e-1ed5-4778-8134-f232751f4ecb.96889a56-e478-4523-b2f8-424a59dba43c',
        platform: 'xbox'
      }
    ];
    
    const result: XboxResponse = {
      success: true,
      supported: true,
      games: mockGames
    };
    
    // Cache the result
    await cache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Xbox Live data:', error);
    return {
      success: false,
      supported: true,
      reason: 'Failed to fetch Xbox Live data'
    };
  }
} 