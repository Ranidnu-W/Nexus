import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/webhook/:path*",
        destination: "http://localhost:5678/webhook/:path*",
      },
    ];
  },
};

export default nextConfig;
