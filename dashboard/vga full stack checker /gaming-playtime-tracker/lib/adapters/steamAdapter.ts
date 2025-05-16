import axios from 'axios';
import { cache } from '../cache';

// Type definitions
export interface SteamGame {
  id: string;
  name: string;
  hoursPlayed: number;
  coverArt: string;
  platform: string;
}

export interface SteamResponse {
  success: boolean;
  supported: boolean;
  games?: SteamGame[];
  reason?: string;
}

/**
 * Fetch playtime data from Steam API
 * @param steamId - Steam ID of the user
 * @returns SteamResponse object with games and playtime data
 */
export async function getSteamPlaytime(steamId: string): Promise<SteamResponse> {
  // Check cache first
  const cacheKey = `steam:${steamId}`;
  const cachedData = await cache.get<SteamResponse>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // In a real implementation, this would call the Steam API with your API key
    // For demo purposes, this is a mock implementation
    const apiKey = process.env.STEAM_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        supported: true,
        reason: 'Steam API key is not configured'
      };
    }
    
    // This would be the actual API call in a real implementation
    // const response = await axios.get(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`);
    
    // Mock data for demonstration
    const mockGames: SteamGame[] = [
      {
        id: '570',
        name: 'Dota 2',
        hoursPlayed: 156.7,
        coverArt: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
        platform: 'steam'
      },
      {
        id: '730',
        name: 'Counter-Strike 2',
        hoursPlayed: 273.2,
        coverArt: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
        platform: 'steam'
      }
    ];
    
    const result: SteamResponse = {
      success: true,
      supported: true,
      games: mockGames
    };
    
    // Cache the result
    await cache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Steam data:', error);
    return {
      success: false,
      supported: true,
      reason: 'Failed to fetch Steam data'
    };
  }
} 