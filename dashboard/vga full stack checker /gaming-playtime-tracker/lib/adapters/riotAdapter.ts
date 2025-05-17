import axios from 'axios';
import { cache } from '../cache';

// Type definitions
export interface RiotGame {
  id: string;
  name: string;
  hoursPlayed: number;
  coverArt: string;
  platform: string;
}

export interface RiotResponse {
  success: boolean;
  supported: boolean;
  games?: RiotGame[];
  reason?: string;
}

/**
 * Fetch playtime data from Riot Games API
 * @param puuid - Riot Games PUUID of the user
 * @returns RiotResponse object with games and playtime data
 */
export async function getRiotPlaytime(puuid: string): Promise<RiotResponse> {
  // Check cache first
  const cacheKey = `riot:${puuid}`;
  const cachedData = await cache.get<RiotResponse>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // In a real implementation, this would call the Riot Games API with your API key
    // For demo purposes, this is a mock implementation
    const apiKey = process.env.RIOT_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        supported: true,
        reason: 'Riot Games API key is not configured'
      };
    }
    
    // This would be the actual API call in a real implementation
    // const response = await axios.get(`https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20&api_key=${apiKey}`);
    // Then we would get match details for each match to calculate playtime
    
    // Mock data for demonstration
    const mockGames: RiotGame[] = [
      {
        id: 'lol',
        name: 'League of Legends',
        hoursPlayed: 412.5,
        coverArt: 'https://static.wikia.nocookie.net/leagueoflegends/images/7/7b/League_of_Legends_Cover.jpg',
        platform: 'riot'
      },
      {
        id: 'valorant',
        name: 'Valorant',
        hoursPlayed: 87.3,
        coverArt: 'https://static.wikia.nocookie.net/valorant/images/a/a9/Valorant_cover_art.jpg',
        platform: 'riot'
      }
    ];
    
    const result: RiotResponse = {
      success: true,
      supported: true,
      games: mockGames
    };
    
    // Cache the result
    await cache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error fetching Riot Games data:', error);
    return {
      success: false,
      supported: true,
      reason: 'Failed to fetch Riot Games data'
    };
  }
} 