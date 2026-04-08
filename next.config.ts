import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Multiple lockfiles on the machine can make Next infer the wrong workspace root,
  // which breaks bare CSS imports like `@import "tailwindcss"` (module resolution).
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
