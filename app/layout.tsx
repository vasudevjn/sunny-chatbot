import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { AI_DESCRIPTION, BROWSER_TAB_TITLE } from "@/config";
import "./globals.css";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BROWSER_TAB_TITLE,
  description: AI_DESCRIPTION,
  icons: {
    // app/icon.png is picked up automatically; this adds the touch icon.
    apple: "/brand/sunny-icon-180.png",
  },
};

export const viewport: Viewport = {
  // Brand green tints the browser chrome on mobile.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#163d2d" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
