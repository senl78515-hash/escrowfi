/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Required for Solana wallet adapter and web3.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
