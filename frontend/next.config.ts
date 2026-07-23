import type { NextConfig } from "next";

// All /api/* traffic is proxied to the FastAPI backend so the session cookie is
// first-party and CORS never applies. The voice WebSocket connects directly
// (rewrites do not carry the upgrade handshake reliably) via NEXT_PUBLIC_WS_URL.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
