import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../styles/tokens.css";
import "../styles/fonts.css";
import "../styles/spacing.css";
import "../styles/home.css";

export const metadata: Metadata = {
  title: "CarePoint Clinic",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
