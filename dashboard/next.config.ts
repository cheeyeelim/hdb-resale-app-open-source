import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Required for standalone deployment build
  output: "standalone",

  // Prevent Next.js from bundling native DuckDB bindings
  // This makes node.js resolves the native bindings at runtime
  // Disabling this will lead to build error
  serverExternalPackages: ["@duckdb/node-api", "@duckdb/node-bindings"],
};

export default nextConfig;
