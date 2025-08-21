import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthErrorHandler } from "@/components/auth/AuthErrorHandler";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI Agent Chat",
  description: "Chat with AI agents powered by Google Gemini",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 0.85,  // Zoomed out to 85% for better overview
  maximumScale: 1,
  userScalable: true,  // Allow users to zoom if needed
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthErrorHandler />
          <div className="relative flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
