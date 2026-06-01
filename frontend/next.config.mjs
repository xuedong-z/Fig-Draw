/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully client-side app (SVG processing runs in the browser, no API/SSR) → export a
  // static site that any static host (Cloudflare Pages) can serve.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: false, // fabric.js canvas init doesn't like double-invoked effects in dev
  // Allow LAN IP + Cloudflare quick tunnels to load /_next dev resources (HMR, chunks)
  // so the app hydrates when opened from a phone over the tunnel. (Dev-only; ignored in export.)
  allowedDevOrigins: ["192.168.10.152", "*.trycloudflare.com"]
};

export default nextConfig;
