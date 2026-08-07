import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { SubjectsProvider } from "@/context/SubjectsContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import RouteTracker from "@/components/RouteTracker";
import { ToastProvider } from "@/components/Toast";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import ErrorSniffer from "@/components/ErrorSniffer";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import { Suspense } from "react";
import dynamic from "next/dynamic";

const FloatingFeedback = dynamic(() => import("@/components/FloatingFeedback"));
const ThemeSelector = dynamic(() => import("@/components/ThemeSelector"));
const AvatarProvider = dynamic(() => import("@/components/AvatarProvider"));
const BackToTop = dynamic(() => import("@/components/BackToTop"));

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: { default: 'Paperino – SRM Study Hub', template: '%s | Paperino' },
  description:
    'Access semester-wise study materials, PYQ predictor, ATS analyzer, GPA calculator and more. Built for SRM students.',
  keywords: [
    'SRM',
    'study materials',
    'question papers',
    'GPA calculator',
    'ATS',
    'PYQ',
    'SRM University',
    'Paperino',
  ],
  authors: [{ name: 'S. Mohamed Sajid' }],
  creator: 'Paperino Team',
  metadataBase: new URL('https://paperino-eta.vercel.app'),
  verification: {
    google: 'google4d1ef317bb669c0f',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://paperino-eta.vercel.app',
    title: 'Paperino – SRM Study Hub',
    description:
      'Access semester-wise study materials, PYQ predictor, ATS analyzer, GPA calculator and more. Built for SRM students.',
    siteName: 'Paperino',
    images: [{ url: '/og-image.png?v=2', width: 1200, height: 630, alt: 'Paperino Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Paperino – SRM Study Hub',
    description: 'Smart academic tools for SRM students.',
    images: ['/og-image.png?v=2'],
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Paperino' },
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icon.png?v=2', type: 'image/png', sizes: '32x32' },
      { url: '/logo-simple.png?v=2', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: [
      { url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`} suppressHydrationWarning style={{ overflowX: 'clip', maxWidth: '100%', width: '100%' }}>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7388792038614675"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('paperino-theme') || 'cosmic-violet';
              if (theme && theme !== 'cosmic-violet') {
                document.documentElement.setAttribute('data-theme', theme);
              }
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-gray-200 overflow-x-hidden w-full max-w-full" suppressHydrationWarning style={{ overflowX: 'clip' }}>

        {/* GA4 — loads after hydration, never blocks render */}
        <GoogleAnalytics />
        <ErrorSniffer />

        <ToastProvider>
          <ThemeProvider>
            <AuthProvider>
              <NotificationProvider>
                <SubjectsProvider>

                  {/* Route change tracker */}
                  <Suspense fallback={null}>
                    <RouteTracker />
                  </Suspense>

                  {/* Maintenance banner — sits above navbar, reads from Firestore */}
                  <MaintenanceBanner />

                  <MaintenanceGuard>
                    <Navbar />
                    <main className="flex-1 flex flex-col relative z-20 pb-8 md:pb-12 overflow-x-hidden w-full max-w-full">
                      {children}
                    </main>
                    <Footer />

                    {/* Floating global elements */}
                    <FloatingFeedback />
                    <ThemeSelector />
                    <AvatarProvider />
                    <BackToTop />
                  </MaintenanceGuard>

                </SubjectsProvider>
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </ToastProvider>

      </body>
    </html>
  );
}


