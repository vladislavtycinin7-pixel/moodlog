import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript errors should be caught during build — don't ignore them
  // (was previously true which masked real errors on Vercel)
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["0.0.0.0", "http://0.0.0.0:81"],
  // Vercel serverless functions need longer timeouts for cold starts + DB connections
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
