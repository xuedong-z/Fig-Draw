/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false // fabric.js canvas init doesn't like double-invoked effects in dev
};

export default nextConfig;
