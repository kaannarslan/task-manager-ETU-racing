import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents (Next 16 default) is disabled on purpose: this app is a
  // small internal tool and the classic rendering model is simpler for the
  // next maintainer. Pages that read the DB declare `dynamic` explicitly.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
