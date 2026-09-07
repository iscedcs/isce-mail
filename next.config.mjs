/** @type {import("next").NextConfig} */
const nextConfig = {
  // Enable instrumentation.ts (required for the scheduler setInterval)
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
