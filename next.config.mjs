/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The workspace/editor is a client-only SPA (Monaco, browser storage, direct
  // GitHub/AI fetches). Type-checking stays on (it catches real bugs); ESLint is
  // run in CI via `npm run lint` rather than blocking a Vercel production build.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
