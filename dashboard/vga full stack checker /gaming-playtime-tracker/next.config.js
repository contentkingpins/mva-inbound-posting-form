/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure for Amplify static hosting
  output: 'export',
  distDir: 'out',
  // Disable API routes when exporting
  trailingSlash: true,
  // API routes won't work in export mode, so all API calls 
  // will need to be handled by our Lambda functions
  
  // Adjust image settings to work correctly in Amplify environment
  images: {
    unoptimized: true,
    domains: ['cdn.cloudflare.steamstatic.com'],
  },
};

module.exports = nextConfig; 