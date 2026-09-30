/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude pdfjs-dist from minification to prevent "Import/Export" errors
    if (config.optimization && config.optimization.minimizer) {
      config.optimization.minimizer = config.optimization.minimizer.map(minimizer => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          // Configure Terser to exclude pdfjs-dist files
          minimizer.options.exclude = [
            /node_modules\/pdfjs-dist/,
            /\.worker\.(min\.)?mjs$/,
          ];
        }
        return minimizer;
      });
    }

    // Also handle the pdf worker file specifically
    config.module.rules.push({
      test: /pdf\.worker(\.min)?\.mjs$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            publicPath: '/_next/static/media/',
            outputPath: '../static/media/',
          },
        },
      ],
    });

    return config;
  },
  swcMinify: false, // Disable SWC minification to use Terser with our exclusions
};

export default nextConfig;
