import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* Allow mobile / LAN network devices to connect during dev without HMR cross-origin block */
  allowedDevOrigins: [
    '192.168.1.41',
    '192.168.1.41:3000',
    'localhost:3000',
    '127.0.0.1:3000',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
