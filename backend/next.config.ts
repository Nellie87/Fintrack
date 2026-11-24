import type { NextConfig } from "next";

// API-only app: no pages to cache or prefetch, so the scaffold's
// cacheComponents/partialPrefetching flags are left off.
const nextConfig: NextConfig = {};

export default nextConfig;
