import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep sql.js out of the serverless bundle so it can load its WASM binary
  serverExternalPackages: ["sql.js"],
};

export default nextConfig;
