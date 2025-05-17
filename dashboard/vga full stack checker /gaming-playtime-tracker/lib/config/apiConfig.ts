// API configuration for different environments

interface ApiConfig {
  baseUrl: string;
  endpoints: {
    steam: {
      playtime: string;
    };
    riot: {
      playtime: string;
    };
    xbox: {
      playtime: string;
    };
    playstation: {
      playtime: string;
    };
    epic: {
      playtime: string;
    };
    nintendo: {
      playtime: string;
    };
  };
}

// Lambda API Gateway URL - replace with your deployed API Gateway URL
const LAMBDA_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-gateway-id.execute-api.your-region.amazonaws.com/dev';

const apiConfig: ApiConfig = {
  baseUrl: LAMBDA_API_URL,
  endpoints: {
    steam: {
      playtime: '/steam/playtime',
    },
    riot: {
      playtime: '/riot/playtime',
    },
    xbox: {
      playtime: '/xbox/playtime',
    },
    playstation: {
      playtime: '/playstation/playtime',
    },
    epic: {
      playtime: '/epic/playtime',
    },
    nintendo: {
      playtime: '/nintendo/playtime',
    },
  },
};

export default apiConfig; 