# Deployment Guide 🚀

This guide covers deploying the Boxing Timer MVP to various hosting platforms with detailed configuration instructions.

## Table of Contents
- [GitHub Pages (Current)](#github-pages-current)
- [Vercel](#vercel)
- [Netlify](#netlify)
- [Self-Hosted](#self-hosted)
- [Docker Deployment](#docker-deployment)
- [CDN Configuration](#cdn-configuration)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## GitHub Pages (Current)

The project is currently configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup Process

#### 1. Repository Configuration
```bash
# Ensure your repository has the correct structure
git clone https://github.com/angeldimitrov/sports-timer.git
cd sports-timer
```

#### 2. GitHub Pages Settings
1. Go to your repository Settings → Pages
2. Set Source to "GitHub Actions"
3. The deployment workflow will trigger automatically

#### 3. Workflow Configuration
The deployment is handled by `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
        env:
          NODE_ENV: production
      
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

#### 4. Next.js Configuration
The `next.config.mjs` is configured for GitHub Pages:

```javascript
const nextConfig = {
  output: 'export',
  // Only use basePath in production
  ...(process.env.NODE_ENV === 'production' && {
    basePath: '/sports-timer',
    assetPrefix: '/sports-timer',
  }),
  
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.NODE_ENV === 'production' ? '/sports-timer' : '',
  },
  
  images: {
    unoptimized: true, // Required for static export
  }
};
```

#### 5. Deployment URL
- **Production**: https://angeldimitrov.github.io/sports-timer/
- **Build Artifacts**: Stored in the `out/` directory

### Custom Domain (Optional)
To use a custom domain with GitHub Pages:

1. **Add CNAME file**:
   ```bash
   echo "yourdomain.com" > public/CNAME
   ```

2. **Configure DNS**:
   ```
   Type: CNAME
   Name: www (or @)
   Value: yourusername.github.io
   ```

3. **Update Next.js config**:
   ```javascript
   const nextConfig = {
     // Remove basePath for custom domain
     ...(process.env.NODE_ENV === 'production' && process.env.CUSTOM_DOMAIN && {
       // No basePath needed for custom domains
     })
   };
   ```

---

## Vercel

Vercel provides excellent Next.js hosting with zero configuration.

### Automatic Deployment

#### 1. Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js configuration

#### 2. Environment Variables
Set in Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Production
NODE_ENV=production
NEXT_PUBLIC_BASE_PATH=

# Optional: Analytics
VERCEL_ANALYTICS_ID=your_analytics_id
```

#### 3. Build Configuration
Vercel automatically uses:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci"
}
```

#### 4. Custom Configuration (Optional)
Create `vercel.json` for custom settings:

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  },
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/sounds/(.*)",
      "headers": [
        {
          "key": "Cache-Control", 
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/timer",
      "destination": "/",
      "permanent": false
    }
  ]
}
```

### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

---

## Netlify

Netlify offers great static site hosting with advanced features.

### Automatic Deployment

#### 1. Connect Repository
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "New site from Git"
3. Choose your repository
4. Configure build settings

#### 2. Build Configuration
Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "out"

[build.environment]
  NODE_VERSION = "18"
  NPM_FLAGS = "--prefix=/opt/buildhome/.nodejs/lib/node_modules/npm"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/sounds/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# SPA fallback for client-side routing (if needed)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  conditions = {Role = ["admin"]}
```

#### 3. Environment Variables
Set in Netlify Dashboard → Site Settings → Environment Variables:

```bash
NODE_ENV=production
NEXT_PUBLIC_BASE_PATH=
NETLIFY_NEXT_PLUGIN_SKIP=true
```

#### 4. Next.js Configuration
Update for Netlify:

```javascript
const nextConfig = {
  output: 'export',
  trailingSlash: true, // Recommended for Netlify
  images: {
    unoptimized: true,
  },
};
```

### Manual Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=out
```

---

## Self-Hosted

Deploy to your own server or VPS.

### Using PM2 (Recommended)

#### 1. Server Setup
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install nginx
```

#### 2. Application Deployment
```bash
# Clone repository
git clone https://github.com/angeldimitrov/sports-timer.git
cd sports-timer

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
```

#### 3. PM2 Configuration
Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'boxing-timer',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/sports-timer',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_BASE_PATH: ''
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    merge_logs: true
  }]
};
```

#### 4. Nginx Configuration (Optional)
Create `/etc/nginx/sites-available/boxing-timer`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml application/rss+xml application/atom+xml image/svg+xml;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Cache static assets
    location /_next/static/ {
        alias /path/to/sports-timer/out/_next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /sounds/ {
        alias /path/to/sports-timer/out/sounds/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/boxing-timer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Using Static Files Only
For static hosting (Apache, Nginx static):

```bash
# Build static files
npm run build

# Copy files to web server
cp -r out/* /var/www/html/

# Or upload to hosting provider
rsync -avz out/ user@server:/var/www/html/
```

---

## Docker Deployment

Containerized deployment for consistency across environments.

### Dockerfile
Create `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/out /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration for Docker
Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;
        
        # Security headers
        add_header X-Frame-Options "DENY" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        
        # Cache static assets
        location /_next/static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        location /sounds/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Service worker should not be cached
        location /sw.js {
            expires 0;
            add_header Cache-Control "public, max-age=0, must-revalidate";
        }
        
        # SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### Docker Compose
Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  boxing-timer:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
  # Optional: Add a reverse proxy with SSL
  reverse-proxy:
    image: traefik:v2.9
    command:
      - --api.insecure=true
      - --providers.docker=true
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.myresolver.acme.httpchallenge=true
      - --certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web
      - --certificatesresolvers.myresolver.acme.email=your-email@example.com
      - --certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    labels:
      - "traefik.http.routers.boxing-timer.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.boxing-timer.entrypoints=websecure"
      - "traefik.http.routers.boxing-timer.tls.certresolver=myresolver"
```

### Build and Deploy
```bash
# Build image
docker build -t boxing-timer .

# Run container
docker run -d -p 80:80 --name boxing-timer boxing-timer

# Or use docker-compose
docker-compose up -d
```

---

## CDN Configuration

For optimal performance, configure CDN caching rules.

### CloudFlare
```javascript
// Page Rules for CloudFlare
{
  "/sounds/*": {
    "cache_level": "cache_everything",
    "edge_cache_ttl": 31536000, // 1 year
    "browser_cache_ttl": 31536000
  },
  "/_next/static/*": {
    "cache_level": "cache_everything", 
    "edge_cache_ttl": 31536000,
    "browser_cache_ttl": 31536000
  },
  "/sw.js": {
    "cache_level": "bypass",
    "browser_cache_ttl": 0
  }
}
```

### AWS CloudFront
```json
{
  "DefaultCacheBehavior": {
    "TargetOriginId": "boxing-timer-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "managed-caching-optimized"
  },
  "CacheBehaviors": [
    {
      "PathPattern": "/sounds/*",
      "TargetOriginId": "boxing-timer-origin",
      "CachePolicyId": "managed-caching-optimized-for-uncompressed-objects",
      "TTL": 31536000
    },
    {
      "PathPattern": "/_next/static/*",
      "TargetOriginId": "boxing-timer-origin", 
      "CachePolicyId": "managed-caching-optimized-for-uncompressed-objects",
      "TTL": 31536000
    }
  ]
}
```

---

## Environment Variables

### Production Variables
```bash
# Required
NODE_ENV=production
NEXT_PUBLIC_BASE_PATH=/sports-timer  # For GitHub Pages subdirectory

# Optional
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### Development Variables
```bash
NODE_ENV=development
NEXT_PUBLIC_BASE_PATH=
DEBUG=boxing-timer:*
```

---

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

#### Asset Loading Issues
```bash
# Check basePath configuration
console.log('Base path:', process.env.NEXT_PUBLIC_BASE_PATH);

# Verify asset paths in browser network tab
# Should show correct paths: /sports-timer/sounds/bell.mp3
```

#### Service Worker Issues
```bash
# Clear service worker cache
# In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
```

#### Performance Issues
```bash
# Check bundle size
npm run build
npm run analyze  # If analyzer is configured

# Monitor memory usage
# In browser: Performance tab → Memory
```

### Debugging Deployment

#### GitHub Actions
```yaml
# Add debug step to workflow
- name: Debug build output
  run: |
    ls -la out/
    find out/ -name "*.js" -o -name "*.css" | head -20
```

#### Local Testing
```bash
# Test production build locally
npm run build
npx serve out -p 3000

# Test with correct basePath
npx serve out -p 3000 --rewrite /sports-timer
```

#### Health Checks
```bash
# Test application endpoints
curl -I https://yourdomain.com/
curl -I https://yourdomain.com/sw.js
curl -I https://yourdomain.com/sounds/bell.mp3
```

---

## Performance Optimization

### Build Optimization
```javascript
// next.config.mjs optimizations
const nextConfig = {
  // Enable compression
  compress: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: true // For static export
  },
  
  // Bundle analysis
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Enable bundle analysis
      if (process.env.ANALYZE) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(new BundleAnalyzerPlugin());
      }
    }
    return config;
  }
};
```

### Monitoring
```bash
# Add performance monitoring
npm install web-vitals

# Track Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

---

This deployment guide should cover most hosting scenarios. For specific issues or custom requirements, refer to the hosting provider's documentation or open an issue in the repository.