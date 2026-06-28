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
  icons: {
    icon: "/logo.png", // Changed from .svg to .png for better compatibility
    shortcut: "/logo.png",
    apple: "/apple-touch-icon.png", // Optional – create this in public/ if you want
  },
  openGraph: {
    title: "UK MART - Fresh Groceries Delivered",
    description:
      "Quality grocery products at wholesale prices. Fresh fruits, vegetables, dairy, staples and more.",
    url: "https://ukmart.co.in",
    siteName: "UK MART",
    images: [
      {
        url: "https://ukmart.co.in/logo.png",
        width: 1200,
        height: 630,
        alt: "UK MART Logo",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UK MART - Fresh Groceries Delivered",
    description:
      "Quality grocery products at wholesale prices. Fresh fruits, vegetables, dairy, staples and more.",
    images: ["https://ukmart.co.in/logo.png"],
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
        {/* JSON‑LD Structured Data for Organization */}
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
                // 👆 Add your Facebook URL here too if you have one
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