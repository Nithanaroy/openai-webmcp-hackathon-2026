import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md / CLAUDE.md on dev/build.
  agentRules: false,
};

export default nextConfig;
