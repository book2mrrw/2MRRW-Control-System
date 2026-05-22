/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicit distDir so Vercel adapter / output tracing never see undefined paths.
  distDir: ".next",
  // Mutable object required: Vercel's Next adapter sets experimental.* in modifyConfig.
  experimental: {}
};

export default nextConfig;
