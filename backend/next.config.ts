import type { NextConfig } from "next";

// API-only app: no pages to cache or prefetch, so the scaffold's
// cacheComponents/partialPrefetching flags are left off.
const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (Vercel ignores this).
  output: "standalone",
  // The API has no home page; send visitors to the Swagger docs.
  async redirects() {
    return [{ source: "/", destination: "/api/docs", permanent: false }];
  },
};

export default nextConfig;
