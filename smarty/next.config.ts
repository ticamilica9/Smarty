import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  allowedDevOrigins: ["192.168.1.6"],

  // ── Preview mode ──
  env: {
    NEXT_PUBLIC_PREVIEW_MODE: process.env.PREVIEW_MODE ?? "",
  },

  // ── Mobile performance optimizations ──

  // Compress responses for faster mobile load
  compress: true,

  // Bundle-optimization: experimental features for smaller JS
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      "lucide-react",
      "@base-ui/react",
      "date-fns",
      "embla-carousel-react",
    ],
  },

  // Cache-Control for static assets (immutable for hashed files)
  headers: async () => [
    {
      source: "/_next/static/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/icons/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=86400",
        },
      ],
    },
  ],

  images: {
    // Use smaller image formats for mobile
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
        pathname: "/**",
      },
    ],
  },

  // Disable unnecessary HTTP headers for smaller responses
  poweredByHeader: false,
};

export default nextConfig;
