/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  transpilePackages: ["@modspec/api-types"],
};

export default nextConfig;
