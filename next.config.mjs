/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not fail `next build` on TypeScript errors (Vercel will still warn)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Do not fail `next build` on ESLint errors
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
