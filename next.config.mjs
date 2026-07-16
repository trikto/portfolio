/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.medium.com" }],
  },
  async redirects() {
    return [
      { source: "/blog/:article", destination: "https://trikto.medium.com/:article", permanent: true },
      { source: "/json-formatter", destination: "/tools", permanent: true },
      { source: "/yaml-validator", destination: "/yaml", permanent: true },
      { source: "/tools/crontab-validator", destination: "/cron", permanent: true },
      { source: "/tools/cron-validator", destination: "/cron", permanent: true },
      { source: "/tools/yaml-validator", destination: "/yaml", permanent: true },
      { source: "/tools/cron-expression-generator", destination: "/cron", permanent: true },
      { source: "/tools/kubernetes-yaml-validator", destination: "/yaml", permanent: true },
    ];
  },
};

export default nextConfig;
