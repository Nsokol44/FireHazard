import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Cache map tiles, vulnerability GeoJSON, and app shell aggressively so the
  // tool keeps working with no signal in the field, then syncs at the
  // firehouse when wifi is back.
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|pbf|webp)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "map-tiles",
        expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: /\/api\/vulnerability/,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "vulnerability-data" },
    },
    {
      urlPattern: /\/api\/incidents/,
      handler: "NetworkFirst",
      options: { cacheName: "incidents-data", networkTimeoutSeconds: 3 },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
