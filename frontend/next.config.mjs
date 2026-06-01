/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // fabric.js canvas init doesn't like double-invoked effects in dev
  // Allow LAN IP + Cloudflare quick tunnels to load /_next dev resources (HMR, chunks)
  // so the app hydrates when opened from a phone over the tunnel.
  allowedDevOrigins: ["192.168.10.152", "*.trycloudflare.com"]
};

export default nextConfig;
