import type { Metadata } from "next";
import BlogArticleClient from "./BlogArticleClient";

/* ─── SEO Metadata ─── */
export const metadata: Metadata = {
  title: "Paperino: Your All-in-One SRM Study Hub for Notes, PYQs, AI Tools and Smarter Learning",
  description:
    "Discover how Paperino helps SRM students access semester-wise notes, PYQs, AI-powered exam tools, GPA calculators, YouTube Study and career guidance — all in one platform.",
  keywords: [
    "Paperino",
    "SRM Study Hub",
    "SRM study materials",
    "SRM previous year question papers",
    "SRM semester notes",
    "SRM exam preparation",
    "AI study tools for students",
    "YouTube Study for engineering subjects",
    "GPA calculator SRM",
    "ATS resume analyzer",
    "PYQ predictor",
    "SRM University",
    "engineering study materials",
    "college study platform",
  ],
  authors: [{ name: "S. Mohamed Sajid", url: "https://paperino-eta.vercel.app/developer" }],
  creator: "Paperino Team",
  publisher: "Paperino",
  alternates: {
    canonical: "https://paperino-eta.vercel.app/blog/paperino-srm-study-hub",
  },
  openGraph: {
    type: "article",
    locale: "en_IN",
    url: "https://paperino-eta.vercel.app/blog/paperino-srm-study-hub",
    title: "Paperino: Your All-in-One SRM Study Hub for Notes, PYQs, AI Tools and Smarter Learning",
    description:
      "Discover how Paperino helps SRM students access semester-wise notes, PYQs, AI-powered exam tools, GPA calculators, YouTube Study and career guidance — all in one platform.",
    siteName: "Paperino",
    images: [{ url: "/og-image.png?v=2", width: 1200, height: 630, alt: "Paperino – SRM Study Hub" }],
    publishedTime: "2026-10-10T00:00:00+05:30",
    modifiedTime: "2026-10-10T00:00:00+05:30",
    authors: ["S. Mohamed Sajid"],
    tags: [
      "SRM study materials",
      "previous year questions",
      "AI exam tools",
      "GPA calculator",
      "YouTube Study",
      "career guidance",
      "student platform",
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Paperino: Your All-in-One SRM Study Hub",
    description:
      "Semester-wise notes, PYQs, AI exam tools, GPA calculators, YouTube Study and career guidance for SRM students.",
    images: ["/og-image.png?v=2"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function BlogArticlePage() {
  /* JSON-LD Structured Data */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline:
          "Paperino: Your All-in-One SRM Study Hub for Notes, PYQs, AI Tools and Smarter Learning",
        description:
          "Discover how Paperino helps SRM students access semester-wise notes, PYQs, AI-powered exam tools, GPA calculators, YouTube Study and career guidance — all in one platform.",
        image: "https://paperino-eta.vercel.app/og-image.png?v=2",
        datePublished: "2026-10-10T00:00:00+05:30",
        dateModified: "2026-10-10T00:00:00+05:30",
        author: {
          "@type": "Person",
          name: "S. Mohamed Sajid",
          url: "https://paperino-eta.vercel.app/developer",
        },
        publisher: {
          "@type": "Organization",
          name: "Paperino",
          url: "https://paperino-eta.vercel.app",
          logo: {
            "@type": "ImageObject",
            url: "https://paperino-eta.vercel.app/logo-simple.png",
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "https://paperino-eta.vercel.app/blog/paperino-srm-study-hub",
        },
        url: "https://paperino-eta.vercel.app/blog/paperino-srm-study-hub",
        inLanguage: "en-IN",
        keywords:
          "Paperino, SRM Study Hub, SRM study materials, SRM PYQ, AI exam tools, GPA calculator, YouTube Study",
        articleSection: "Education Technology",
        wordCount: 3200,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://paperino-eta.vercel.app" },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: "https://paperino-eta.vercel.app/blog/paperino-srm-study-hub",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Paperino: Your All-in-One SRM Study Hub",
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogArticleClient />
    </>
  );
}
