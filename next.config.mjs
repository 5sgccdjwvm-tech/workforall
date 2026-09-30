/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude PDF.js worker from Terser minification
    // The worker uses ES modules syntax that Terser can't handle
    config.module.rules.push({
      test: /pdf\.worker(\.min)?\.m?js$/,
      type: 'asset/resource',
      parser: {
        dataUrlCondition: {
          maxSize: 0, // Force file asset, never inline
        },
      },
    });
    
    return config;
  },
};

export default nextConfig;
