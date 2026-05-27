import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingAssistant from "@/components/FloatingAssistant";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeSelector from "@/components/ThemeSelector";
import AvatarProvider from "@/components/AvatarProvider";
import { SubjectsProvider } from "@/context/SubjectsContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import RouteTracker from "@/components/RouteTracker";
import { ToastProvider } from "@/components/Toast";
import BackToTop from "@/components/BackToTop";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import { Suspense } from "react";

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
  metadataBase: new URL('https://paperino.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://paperino.vercel.app',
    title: 'Paperino – SRM Study Hub',
    description:
      'Access semester-wise study materials, PYQ predictor, ATS analyzer, GPA calculator and more. Built for SRM students.',
    siteName: 'Paperino',
    images: [{ url: '/logo-final.png', width: 512, height: 512, alt: 'Paperino Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Paperino – SRM Study Hub',
    description: 'Smart academic tools for SRM students.',
    images: ['/logo-final.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Paperino' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-gray-200 overflow-x-hidden w-full" suppressHydrationWarning>

        {/* GA4 — loads after hydration, never blocks render */}
        <GoogleAnalytics />

        <ToastProvider>
          <ThemeProvider>
            <AuthProvider>
              <SubjectsProvider>

                {/* Route change tracker */}
                <Suspense fallback={null}>
                  <RouteTracker />
                </Suspense>

                {/* Maintenance banner — sits above navbar, reads from Firestore */}
                <MaintenanceBanner />

                <Navbar />
                <main className="flex-1 flex flex-col relative z-20 pb-8 md:pb-12">
                  {children}
                </main>
                <Footer />

                {/* Floating global elements */}
                <FloatingAssistant />
                <ThemeSelector />
                <AvatarProvider />
                <BackToTop />

              </SubjectsProvider>
            </AuthProvider>
          </ThemeProvider>
        </ToastProvider>

      </body>
    </html>
  );
}


