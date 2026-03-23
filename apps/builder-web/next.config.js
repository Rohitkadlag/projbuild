/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@app-builder/bucket-sdk",
    "@app-builder/composer",
    "@app-builder/generator",
  ],
  experimental: {
    serverComponentsExternalPackages: ["fs-extra", "archiver"],
  },
};

module.exports = nextConfig;
