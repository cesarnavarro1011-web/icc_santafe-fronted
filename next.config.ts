
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["images.unsplash.com", "pexels.com", "www.pexels.com"],
  },
  experimental: {
    // Tareas en PDF (10 MB), material de cursos (20 MB) y comprobantes se suben por server actions
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
