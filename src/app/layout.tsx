import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ─── Metadata with Open Graph & Twitter ───
export const metadata: Metadata = {
  title: "UK MART - Fresh Groceries Delivered",
  description:
    "Quality grocery products at wholesale prices. Fresh fruits, vegetables, dairy, staples and more. Minimum order ₹2,500.",

  // ── Favicon (browser tab) ──
  icons: {
    icon: "/favicon.png",          // ✅ Your actual file name
    shortcut: "/favicon.png",
    // apple: "/apple-touch-icon.png", // Optional – create if needed
  },

  // ── Open Graph (WhatsApp, Facebook, LinkedIn, etc.) ──
  openGraph: {
    title: "UK MART - Fresh Groceries Delivered",
    description:
      "Quality grocery products at wholesale prices. Fresh fruits, vegetables, dairy, staples and more.",
    url: "https://ukmart.co.in",          // Adjust if you use www
    siteName: "UK MART",
    images: [
      {
        url: "https://ukmart.co.in/og-image.png",  // ✅ Your 1200×630 banner
        width: 1200,
        height: 630,
        alt: "UK MART Logo",
      },
    ],
    locale: "en_IN",
    type: "website",
  },

  // ── Twitter Card (for X/Twitter previews) ──
  twitter: {
    card: "summary_large_image",
    title: "UK MART - Fresh Groceries Delivered",
    description:
      "Quality grocery products at wholesale prices. Fresh fruits, vegetables, dairy, staples and more.",
    images: ["https://ukmart.co.in/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* JSON‑LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "UK MART",
              "url": "https://ukmart.co.in",
              "logo": "https://ukmart.co.in/logo.png",
              "image": "https://ukmart.co.in/logo.png",
              "sameAs": [
                "https://www.instagram.com/_uk_mart_"
                // Add Facebook/Twitter links if available
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
      >
        <Providers>
          {children}
        </Providers>

        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  );
}