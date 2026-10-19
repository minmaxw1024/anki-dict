import path from "node:path";
import type { NextConfig } from "next";

// The app imports the extension's parsers from ../src/lib (the `@shared/*`
// alias), so the bundler and file tracing must look one level up.
const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
