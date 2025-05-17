import React from 'react';
import Head from 'next/head';

export default function Home() {
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
          <p className="text-center text-xl mb-4">
            Welcome to the Gaming Playtime Tracker
          </p>
          <p className="text-gray-600 mb-4">
            Track your gaming time across multiple platforms:
          </p>
          <ul className="list-disc pl-5 mb-6">
            <li>Steam</li>
            <li>Riot Games</li>
            <li>Xbox Live</li>
            <li>PlayStation</li>
            <li>Epic Games</li>
            <li>Nintendo</li>
          </ul>
          <div className="text-center">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              onClick={() => alert('Coming soon!')}
            >
              Get Started
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 