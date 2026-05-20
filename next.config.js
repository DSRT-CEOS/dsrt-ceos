/** @type {import("next").NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "pdf-parse"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;