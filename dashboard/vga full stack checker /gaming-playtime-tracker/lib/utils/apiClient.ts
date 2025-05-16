import axios, { AxiosRequestConfig } from 'axios';
import apiConfig from '../config/apiConfig';

// Create axios instance
const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface ApiResponse<T> {
  data: T;
  status: number;
}

class ApiClient {
  static async get<T>(
    endpoint: string,
    params: Record<string, any> = {},
    config: AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.get<T>(endpoint, {
        params,
        ...config,
      });

      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          data: error.response.data as T,
          status: error.response.status,
        };
      }
      
      throw error;
    }
  }

  // Steam playtime
  static async getSteamPlaytime(steamId: string): Promise<any> {
    const endpoint = `${apiConfig.endpoints.steam.playtime}/${steamId}`;
    return this.get(endpoint);
  }

  // Riot playtime
  static async getRiotPlaytime(riotId: string): Promise<any> {
    const endpoint = `${apiConfig.endpoints.riot.playtime}/${riotId}`;
    return this.get(endpoint);
  }

  // Xbox playtime
  static async getXboxPlaytime(xboxId: string): Promise<any> {
    const endpoint = `${apiConfig.endpoints.xbox.playtime}/${xboxId}`;
    return this.get(endpoint);
  }

  // PlayStation playtime
  static async getPlayStationPlaytime(playstationId: string): Promise<any> {
    const endpoint = `${apiConfig.endpoints.playstation.playtime}/${playstationId}`;
    return this.get(endpoint);
  }

  // Epic Games playtime
  static async getEpicPlaytime(epicId: string): Promise<any> {
    const endpoint = `${apiConfig.endpoints.epic.playtime}/${epicId}`;
    return this.get(endpoint);
  }

  // Nintendo playtime
  static async getNintendoPlaytime(nintendoId: string): Promise<any> {
    const endpoint = `${apiConfig.endpoints.nintendo.playtime}/${nintendoId}`;
    return this.get(endpoint);
  }
}

export default ApiClient; 