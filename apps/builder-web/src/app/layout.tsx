import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Bucket Builder",
  description: "Build full-stack apps by composing modular feature buckets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface-0 text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
