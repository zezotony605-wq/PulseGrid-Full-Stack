import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dashboard is deployed as a container next to the Kotlin gateway, so the
  // standalone output keeps the runtime image to the server bundle plus traced
  // node_modules instead of the whole workspace.
  output: "standalone",
  reactStrictMode: true,
  // Pin the workspace root: Turbopack otherwise walks up and can pick a
  // lockfile from a parent directory outside the repository.
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
};

export default nextConfig;
