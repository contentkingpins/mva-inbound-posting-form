import React, { useState, useEffect } from 'react';
import Head from 'next/head';

// Mock data to show when API is unavailable
const MOCK_GAME_DATA = {
  success: true,
  supported: true,
  games: [
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
  ]
};

// Additional mock data for other platforms
const PLATFORM_MOCK_DATA = {
  steam: MOCK_GAME_DATA,
  riot: {
    success: true,
    supported: true,
    games: [
      {
        id: 'lol',
        name: 'League of Legends',
        hoursPlayed: 342.8,
        coverArt: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
        platform: 'riot'
      },
      {
        id: 'val',
        name: 'Valorant',
        hoursPlayed: 128.5,
        coverArt: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
        platform: 'riot'
      }
    ]
  },
  xbox: {
    success: true,
    supported: true,
    games: [
      {
        id: 'halo',
        name: 'Halo Infinite',
        hoursPlayed: 87.3,
        coverArt: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
        platform: 'xbox'
      },
      {
        id: 'forza',
        name: 'Forza Horizon 5',
        hoursPlayed: 112.9,
        coverArt: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
        platform: 'xbox'
      }
    ]
  }
};

export default function Home() {
  const [platform, setPlatform] = useState('steam');
  const [userIdentifier, setUserIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameData, setGameData] = useState(MOCK_GAME_DATA);
  const [error, setError] = useState('');
  const [useMockData, setUseMockData] = useState(true);

  // Load initial mock data
  useEffect(() => {
    setGameData(MOCK_GAME_DATA);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userIdentifier) {
      setError('Please enter a valid user identifier');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // In static export mode, always use mock data
      // This simulates getting data from different platforms
      let mockDataForPlatform = PLATFORM_MOCK_DATA[platform] || MOCK_GAME_DATA;
      
      // Add a personalization touch based on the entered userIdentifier
      let customizedMockData = {
        ...mockDataForPlatform,
        games: mockDataForPlatform.games.map(game => ({
          ...game,
          // Add small random variation to hours based on username length
          hoursPlayed: +(game.hoursPlayed + (userIdentifier.length % 10) * 0.7).toFixed(1)
        }))
      };
      
      setTimeout(() => {
        setGameData(customizedMockData);
        setError('');
        setUseMockData(true);
        setIsLoading(false);
      }, 1000); // Simulate network delay
    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred. Showing mock data instead.');
      setGameData(MOCK_GAME_DATA);
      setUseMockData(true);
      setIsLoading(false);
    }
  };

  // Function to load mock data directly
  const loadMockData = () => {
    setGameData(MOCK_GAME_DATA);
    setUseMockData(true);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Gaming Playtime Tracker</title>
        <meta name="description" content="Track your gaming playtime across multiple platforms" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Gaming Playtime Tracker
        </h1>
        
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="steam">Steam</option>
                <option value="riot">Riot Games</option>
                <option value="xbox">Xbox Live</option>
                <option value="playstation">PlayStation</option>
                <option value="epic">Epic Games</option>
                <option value="nintendo">Nintendo</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                User Identifier
              </label>
              <input
                type="text"
                value={userIdentifier}
                onChange={(e) => setUserIdentifier(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your ID/username"
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}
            
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLoading ? 'Loading...' : 'Track Playtime'}
              </button>
              
              <button
                type="button"
                onClick={loadMockData}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Show Demo Data
              </button>
            </div>
          </form>
        </div>
        
        {gameData && gameData.games && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">
              {useMockData ? 'Demo Data' : 'Your Games'}
              <span className="ml-2 text-sm text-gray-500 font-normal">
                (Static Demo Mode{userIdentifier ? ` for ${userIdentifier}` : ''})
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gameData.games.map(game => (
                <div key={game.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="h-32 bg-gray-200 relative">
                    {game.coverArt ? (
                      <img 
                        src={game.coverArt} 
                        alt={game.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-gray-500">No image available</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold">{game.name}</h3>
                    <p className="text-gray-700">Played for {game.hoursPlayed} hours</p>
                    <p className="text-sm text-gray-500 mt-2">Platform: {game.platform}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 