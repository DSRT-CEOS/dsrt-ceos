import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0033ff",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dsrt-ceos.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "DSRT CEOS - Construction Enterprise Operating System",
  description: "AI-powered tender management, billing, and compliance for Indian construction enterprises",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DSRT CEOS",
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/logo.png",
  },
  openGraph: {
    title: "DSRT CEOS",
    description: "Construction Enterprise OS",
    images: ["/logo.png"],
    url: APP_URL,
    siteName: "DSRT CEOS",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans bg-background text-foreground antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(0 0% 8%)",
              color: "hsl(0 0% 96%)",
              border: "1px solid hsl(0 0% 16%)",
              fontSize: "13px",
            },
            success: { iconTheme: { primary: "hsl(226 100% 50%)", secondary: "#fff" } },
            error: { iconTheme: { primary: "hsl(0 84% 60%)", secondary: "#fff" } },
          }}
        />
      </body>
    </html>
  );
}