/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully client-side app (SVG processing runs in the browser, no API/SSR) → export a
  // static site that any static host (Cloudflare Pages) can serve.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: false, // fabric.js canvas init doesn't like double-invoked effects in dev
  // Dev-only: let Cloudflare quick tunnels (random *.trycloudflare.com hosts) load /_next
  // dev resources (HMR, chunks, fonts) so the app works when opened over a tunnel — e.g.
  // from a phone. Wildcard only, no private host. Ignored by the static export (no prod effect).
  allowedDevOrigins: ["*.trycloudflare.com"]
};

export default nextConfig;
