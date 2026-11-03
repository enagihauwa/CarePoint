import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../styles/tokens.css";
import "../styles/fonts.css";
import "../styles/spacing.css";
import "../styles/home.css";

// Base address for the canonical and Open Graph URLs. Set SITE_URL in .env once the site
// has a real address. Until then it falls back to the local dev server. `||` and not `??`
// because a copied .env.example sets SITE_URL to an empty string, which `??` would keep.
const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "CarePoint Clinic", template: "%s | CarePoint Clinic" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
