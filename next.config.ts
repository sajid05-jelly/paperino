import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      {
        source: '/btech',
        destination: '/srm/btech',
        permanent: true,
      },
      {
        source: '/btech/semesters/:semId',
        destination: '/srm/btech/semester-:semId',
        permanent: true,
      },
      {
        source: '/btech/semesters/:semId/subjects/:subjectId',
        destination: '/srm/btech/semester-:semId',
        permanent: true,
      },
      {
        source: '/courses/btech',
        destination: '/srm/btech',
        permanent: true,
      },
      {
        source: '/courses/btech/semesters/:semId',
        destination: '/srm/btech/semester-:semId',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com https://*.googleapis.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://*.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.firebase.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com https://*.firebaseapp.com https://*.firebaseauth.com; frame-ancestors 'self';"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
          }
        ]
      },
      {
        source: "/:path*.(png|jpg|jpeg|svg|webp|ico|woff2|mp3)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
