# Performance Testing Guide

This document outlines performance testing procedures for WhatToRead frontend.

## Target Metrics

The application aims for **Lighthouse score ≥ 90** in all categories:
- Performance: ≥ 90
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- SEO: ≥ 90

## Quick Start

### 1. Manual Lighthouse Testing (Recommended for Development)

1. **Build the application:**
   ```bash
   pnpm run build
   ```

2. **Start preview server:**
   ```bash
   pnpm run preview
   ```

3. **Run Lighthouse in Chrome:**
   - Open Chrome and navigate to `http://localhost:4173`
   - Open DevTools (F12 or Cmd+Option+I)
   - Go to the **Lighthouse** tab
   - Select all categories (Performance, Accessibility, Best Practices, SEO)
   - Click "Analyze page load"
   - Review scores and recommendations

### 2. CLI Lighthouse Testing

```bash
# Install Lighthouse globally (if not already installed)
npm install -g lighthouse

# Build and preview (in one terminal)
pnpm run build && pnpm run preview

# Run Lighthouse (in another terminal)
lighthouse http://localhost:4173 --view --only-categories=performance,accessibility,best-practices,seo
```

### 3. Lighthouse CI (Automated)

For automated CI/CD testing:

```bash
# Install dependencies (already in package.json)
pnpm install

# Build the application
pnpm run build

# Run Lighthouse CI
pnpm run lighthouse:ci
```

The `.lighthouserc.json` configuration will:
- Start the preview server automatically
- Run Lighthouse 3 times and average results
- Assert that all scores are ≥ 90
- Fail the build if targets aren't met

## Performance Metrics to Monitor

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Additional Metrics
- **First Contentful Paint (FCP)**: < 1.8s
- **Speed Index**: < 3.4s
- **Time to Interactive (TTI)**: < 3.8s
- **Total Blocking Time (TBT)**: < 200ms

## Performance Optimization Checklist

### Images
- [ ] Use WebP format with fallbacks
- [ ] Implement lazy loading for images
- [ ] Optimize image sizes (use appropriate dimensions)
- [ ] Use `srcset` for responsive images
- [ ] Compress images (aim for < 100KB per image)

### JavaScript
- [ ] Code splitting enabled (already configured in vite.config.ts)
- [ ] Tree shaking active
- [ ] Minification enabled (esbuild)
- [ ] Avoid large dependencies
- [ ] Use dynamic imports for heavy components
- [ ] Implement service worker for caching (future enhancement)

### CSS
- [ ] Critical CSS inlined (SvelteKit handles this)
- [ ] Unused CSS removed (Tailwind handles this)
- [ ] Minify CSS in production
- [ ] Avoid blocking render

### Network
- [ ] HTTP/2 enabled on server
- [ ] Gzip/Brotli compression enabled
- [ ] CDN for static assets (production)
- [ ] Proper cache headers

### Rendering
- [ ] Reduce render-blocking resources
- [ ] Optimize font loading
- [ ] Minimize layout shifts
- [ ] Use `will-change` sparingly
- [ ] Optimize animations (use transform/opacity)

## Current Optimizations

The application already includes:

✅ **Code Splitting**: Configured in `vite.config.ts` with manual chunks
- Svelte vendor chunk separate from other vendors
- Optimal chunk file naming for caching

✅ **Build Optimization**:
- esbuild minification (faster than terser)
- Source maps disabled in production
- Target: `esnext` for modern browsers

✅ **Lazy Loading**:
- Images use `LazyImage` component
- Route-based code splitting (SvelteKit default)

✅ **Caching**:
- API response caching implemented
- Browser caching via proper cache headers

## Performance Testing Workflow

### Before Each Release

1. **Build Production Bundle:**
   ```bash
   pnpm run build
   ```

2. **Analyze Bundle Size:**
   ```bash
   # Check build output size
   ls -lh build/
   
   # Analyze with bundle analyzer (if installed)
   npx vite-bundle-visualizer
   ```

3. **Run Lighthouse:**
   ```bash
   pnpm run preview
   # In another terminal or use Lighthouse CI
   pnpm run lighthouse:ci
   ```

4. **Check Metrics:**
   - Verify all scores ≥ 90
   - Review Core Web Vitals
   - Check for performance warnings
   - Review opportunities for improvement

5. **Test on Different Networks:**
   - Fast 3G throttling
   - Slow 3G throttling
   - 4G (default)

### Continuous Monitoring

For production environments:

1. **Real User Monitoring (RUM)**:
   - Consider integrating tools like:
     - Google Analytics with Web Vitals
     - Sentry Performance Monitoring
     - New Relic Browser

2. **Synthetic Monitoring**:
   - Lighthouse CI in GitHub Actions
   - WebPageTest integration
   - Pingdom / UptimeRobot for uptime

## Troubleshooting Low Scores

### Performance Score < 90

**Common Issues:**
- Large bundle sizes → Review dependencies, use dynamic imports
- Render-blocking resources → Defer non-critical CSS/JS
- Unoptimized images → Compress, use WebP, lazy load
- Slow server response → Optimize API, use CDN

**Quick Fixes:**
```bash
# Analyze bundle
pnpm run build -- --analyze

# Check what's included
npx vite-bundle-visualizer
```

### Accessibility Score < 90

- Add missing ARIA labels
- Improve color contrast
- Ensure keyboard navigation
- Add alt text to images
- Test with screen readers

### Best Practices Score < 90

- Ensure HTTPS in production
- Remove console.log statements
- Fix deprecated APIs
- Add security headers
- Use modern JavaScript features

### SEO Score < 90

- Add proper meta tags
- Ensure semantic HTML
- Add structured data (JSON-LD)
- Optimize page titles
- Add sitemap.xml

## Performance Budget

Define performance budgets to prevent regressions:

```javascript
// Example performance budget (in vite.config.ts)
const performanceBudget = {
  'initial': '200kb',  // Initial JS bundle
  'total': '500kb',    // Total JS
  'images': '1mb',     // Total images
};
```

## Resources

- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [SvelteKit Performance](https://kit.svelte.dev/docs/adapter-node#performance)

## CI/CD Integration

See `.lighthouserc.json` for Lighthouse CI configuration. Integrate into your CI pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Lighthouse CI
  run: |
    pnpm run build
    pnpm run lighthouse:ci
```

Note: For production testing, deploy to a staging environment and test against the live URL rather than localhost.
