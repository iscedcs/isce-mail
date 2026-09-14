import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Enable instrumentation.ts (required for the scheduler setInterval)
  experimental: {
    instrumentationHook: true,
  },

  webpack(config) {
    // Add @emails alias so email templates can be imported from anywhere
    config.resolve.alias["@emails"] = path.resolve(__dirname, "emails");
    return config;
  },
};

export default nextConfig;
