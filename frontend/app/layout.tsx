import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SciCompose — Scientific Figure Editor",
  description:
    "Lay out, recolor, and beautify your exported scientific figures (SVG) inside a realistic journal page, then export submission-ready images."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
