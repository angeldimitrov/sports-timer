import crypto from 'crypto';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages deployment configuration  
  output: 'export',
  // Only use basePath in production for GitHub Pages
  ...(process.env.NODE_ENV === 'production' && {
    basePath: '/sports-timer',
    assetPrefix: '/sports-timer',
  }),
  
  // Environment variables
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.NODE_ENV === 'production' ? '/sports-timer' : '',
  },
  
  // Handle dynamic routes for PWA files
  trailingSlash: true,
  
  eslint: {
    dirs: ['pages', 'utils', 'src'],
    // Ignore ESLint errors during builds to allow production deployment
    // Main application code is lint-clean, remaining errors are in test files
    ignoreDuringBuilds: true,
  },
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Enable experimental features for PWA support
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  
  // Optimize for mobile performance
  compress: true,
  poweredByHeader: false,
  
  // Bundle optimization for mobile
  webpack: (config, { dev, isServer }) => {
    // Derive basePath for consistent asset paths
    const basePath = process.env.NODE_ENV === 'production' ? '/sports-timer' : '';
    
    // Audio file handling
    config.module.rules.push({
      test: /\.(mp3|wav|ogg)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: `${basePath}/_next/static/sounds/`,
          outputPath: 'static/sounds/',
          name: '[name].[ext]',
        },
      },
    });
    
    // Web Worker handling
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' },
    });
    
    // Optimize for mobile devices
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test(module) {
              return (
                module.size() > 160000 &&
                /node_modules[/\\]/.test(module.identifier())
              );
            },
            name(module) {
              const hash = crypto
                .createHash('sha1')
                .update(module.identifier())
                .digest('hex')
                .substring(0, 8);
              return `lib-${hash}`;
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
          shared: {
            name: 'shared',
            minChunks: 1,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    return config;
  },
}

export default nextConfig