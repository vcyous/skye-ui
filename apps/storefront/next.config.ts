import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server in .next/standalone for Docker.
  output: "standalone",

  // Trace files from the monorepo root so hoisted node_modules are bundled.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
