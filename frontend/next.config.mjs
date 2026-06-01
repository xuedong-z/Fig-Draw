/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully client-side app (SVG processing runs in the browser, no API/SSR) → export a
  // static site that any static host (Cloudflare Pages) can serve.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: false // fabric.js canvas init doesn't like double-invoked effects in dev
};

export default nextConfig;
