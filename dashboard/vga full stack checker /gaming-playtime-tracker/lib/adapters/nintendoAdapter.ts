import axios from 'axios';
import { cache } from '../cache';

// Type definitions
export interface NintendoGame {
  id: string;
  name: string;
  hoursPlayed: number;
  coverArt: string;
  platform: string;
}

export interface NintendoResponse {
  success: boolean;
  supported: boolean;
  games?: NintendoGame[];
  reason?: string;
}

/**
 * Fetch playtime data from Nintendo API
 * @param nintendoId - Nintendo Account ID of the user
 * @returns NintendoResponse object with games and playtime data
 */
export async function getNintendoPlaytime(nintendoId: string): Promise<NintendoResponse> {
  // Check cache first
  const cacheKey = `nintendo:${nintendoId}`;
  const cachedData = await cache.get<NintendoResponse>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // In a real implementation, this would call the Nintendo API with your API credentials
    // For demo purposes, this is a mock implementation
    const clientId = process.env.NINTENDO_CLIENT_ID;
    const clientSecret = process.env.NINTENDO_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return {
        success: false,
        supported: true,
        reason: 'Nintendo API credentials are not configured'
      };
    }
    
    // This would be the actual API call in a real implementation
    // First we would get an auth token, then query the Nintendo API
    // const tokenResponse = await axios.post('https://accounts.nintendo.com/connect/1.0.0/api/token', {
    //   grant_type: 'client_credentials',
    //   client_id: clientId,
    //   client_secret: clientSecret
    // });
    // const token = tokenResponse.data.access_token;
    // const response = await axios.get(`https://api.ec.nintendo.com/v1/users/${nintendoId}/play_history`, {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    
    // Mock data for demonstration
    const mockGames: NintendoGame[] = [
      {
        id: 'zelda-totk',
        name: 'The Legend of Zelda: Tears of the Kingdom',
        hoursPlayed: 78.5,
        coverArt: 'https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000063714/821f529c7ccd2a21e98f8cda0cc5a56a1dd1fc6a1e9c5a5e1252850df6dcfe5d',
        platform: 'nintendo'
      },
      {
        id: 'mario-odyssey',
        name: 'Super Mario Odyssey',
        hoursPlayed: 35.7,
        coverArt: 'https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000001130/c42553b4fd0312c31e70ec7468c6c9bccd739f340152925b9600631f4d431d7b',
        platform: 'nintendo'
      }
    ];
    
    const result: NintendoResponse = {
      success: true,
      supported: true,
      games: mockGames
    };
    
    // Cache the result
    await cache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Nintendo data:', error);
    return {
      success: false,
      supported: true,
      reason: 'Failed to fetch Nintendo data'
    };
  }
} 