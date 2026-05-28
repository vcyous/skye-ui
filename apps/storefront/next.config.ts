import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server in .next/standalone for Docker.
  output: "standalone",

  // Trace files from the monorepo root so hoisted node_modules are bundled.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
