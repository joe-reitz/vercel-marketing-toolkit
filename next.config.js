/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    disableStaticImages: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg)$/i,
      loader: 'file-loader',
      options: {
        publicPath: '/_next/static/images/',
        outputPath: 'static/images/',
        name: '[name].[hash].[ext]',
      },
    });
    return config;
  },
}

module.exports = nextConfig
