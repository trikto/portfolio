/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/json-formatter", destination: "/tools", permanent: true },
      { source: "/yaml-validator", destination: "/tools/kubernetes-yaml-validator", permanent: true },
    ];
  },
};

export default nextConfig;
