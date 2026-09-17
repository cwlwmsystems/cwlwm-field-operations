import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lint is enforced separately with `npm run lint`.
  // Remove this exception once the existing lint baseline is remediated.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
