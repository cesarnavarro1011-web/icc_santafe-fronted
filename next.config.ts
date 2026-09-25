
import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

/** Cabeceras para todo el sitio. */
const cabeceras = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // HSTS solo en producción (con HTTPS)
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

/**
 * Política de contenido para el espacio de estudio y el login: solo recursos propios.
 * Next.js necesita 'unsafe-inline' (y 'unsafe-eval' en desarrollo) para sus scripts.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false, // no anunciar "X-Powered-By: Next.js"
  images: {
    domains: ["images.unsplash.com", "pexels.com", "www.pexels.com"],
  },
  experimental: {
    // Tareas en PDF (10 MB), material de cursos (20 MB) y comprobantes se suben por server actions
    serverActions: { bodySizeLimit: "25mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: cabeceras },
      { source: "/workspace/:path*", headers: [{ key: "Content-Security-Policy", value: csp }] },
      { source: "/login", headers: [{ key: "Content-Security-Policy", value: csp }] },
    ];
  },
};

export default nextConfig;
