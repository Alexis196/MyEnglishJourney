import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the pino logger out of the server bundle (it relies on Node internals).
  serverExternalPackages: ["pino"],
};

export default nextConfig;
