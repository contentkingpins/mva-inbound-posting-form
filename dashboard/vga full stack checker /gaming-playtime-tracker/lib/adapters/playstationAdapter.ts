import axios from 'axios';
import { cache } from '../cache';

// Type definitions
export interface PlayStationGame {
  id: string;
  name: string;
  hoursPlayed: number;
  coverArt: string;
  platform: string;
}

export interface PlayStationResponse {
  success: boolean;
  supported: boolean;
  games?: PlayStationGame[];
  reason?: string;
}

/**
 * Fetch playtime data from PlayStation Network API
 * @param psnId - PlayStation Network ID of the user
 * @returns PlayStationResponse object with games and playtime data
 */
export async function getPlayStationPlaytime(psnId: string): Promise<PlayStationResponse> {
  // Check cache first
  const cacheKey = `playstation:${psnId}`;
  const cachedData = await cache.get<PlayStationResponse>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // In a real implementation, this would call the PlayStation Network API with your API credentials
    // For demo purposes, this is a mock implementation
    const apiKey = process.env.PLAYSTATION_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        supported: true,
        reason: 'PlayStation Network API key is not configured'
      };
    }
    
    // This would be the actual API call in a real implementation
    // const response = await axios.get(`https://psn-api.io/users/${psnId}/trophies`, {
    //   headers: { 'Authorization': `Bearer ${apiKey}` }
    // });
    
    // Mock data for demonstration
    const mockGames: PlayStationGame[] = [
      {
        id: 'god-of-war-ragnarok',
        name: 'God of War Ragnarök',
        hoursPlayed: 42.8,
        coverArt: 'https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0s.png',
        platform: 'playstation'
      },
      {
        id: 'horizon-forbidden-west',
        name: 'Horizon Forbidden West',
        hoursPlayed: 67.3,
        coverArt: 'https://image.api.playstation.com/vulcan/ap/rnd/202107/3100/HO8vkR9dQM7mJZ5nb9lK3eFj.png',
        platform: 'playstation'
      }
    ];
    
    const result: PlayStationResponse = {
      success: true,
      supported: true,
      games: mockGames
    };
    
    // Cache the result
    await cache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error fetching PlayStation Network data:', error);
    return {
      success: false,
      supported: true,
      reason: 'Failed to fetch PlayStation Network data'
    };
  }
} 