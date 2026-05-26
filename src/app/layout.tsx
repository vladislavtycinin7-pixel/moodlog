import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoodLog — Дневник настроения",
  description: "Отслеживай свои эмоции, замечай тренды и становись лучше с каждым днём",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0f] text-white`}
      >
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(20, 20, 28, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            },
          }}
        />
      </body>
    </html>
  );
}
