import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Silence "multiple lockfiles" warning by pinning the workspace root
  // to the web/ directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
