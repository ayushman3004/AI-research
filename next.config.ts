import type { NextConfig } from "next";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const nextConfig: NextConfig = {
  // These packages use native Node.js bindings and cannot be bundled
  // by Turbopack/webpack into a serverless function. They must be
  // loaded via native require() at runtime on Vercel.
  serverExternalPackages: [
    'firebase-admin',
    'firebase-admin/app',
    'firebase-admin/auth',
    'mongoose',
  ],
};

export default nextConfig;
