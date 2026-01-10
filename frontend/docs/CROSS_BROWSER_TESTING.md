# Cross-Browser Testing Guide

This document outlines the cross-browser testing strategy for WhatToRead frontend.

## Supported Browsers

The application should be tested on the following browsers:

### Desktop Browsers
- **Chrome** (latest 2 versions) - Primary browser
- **Firefox** (latest 2 versions)
- **Safari** (latest 2 versions) - macOS/iOS
- **Edge** (latest 2 versions) - Windows

### Mobile Browsers
- **Safari** (iOS 14+) - iPhone/iPad
- **Chrome Mobile** (Android 10+)

## Testing Checklist

### Core Functionality
- [ ] Search bar input and submission
- [ ] Book recommendations display
- [ ] Book card swipe gestures (mobile)
- [ ] Book detail modal opens/closes
- [ ] Taste profile visualization
- [ ] Saved books functionality
- [ ] Navigation between pages
- [ ] Keyboard shortcuts

### Visual & Layout
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark Academia theme displays correctly
- [ ] Animations work smoothly
- [ ] Images load correctly
- [ ] Typography renders properly
- [ ] Colors and contrast meet accessibility standards

### Performance
- [ ] Page load time < 3 seconds
- [ ] Smooth animations (60fps)
- [ ] No layout shifts (CLS < 0.1)
- [ ] Interactive elements respond quickly

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] ARIA labels present
- [ ] Color contrast ratios meet WCAG AA
- [ ] Focus indicators visible

## Manual Testing Steps

### 1. Chrome Testing
```bash
# Build the application
pnpm run build

# Start preview server
pnpm run preview

# Open in Chrome and test all features
```

**Chrome DevTools Checks:**
- Open DevTools (F12)
- Test responsive design (Ctrl+Shift+M / Cmd+Shift+M)
- Check Console for errors
- Verify Network tab for failed requests
- Test Performance tab for bottlenecks
- Run Lighthouse audit

### 2. Firefox Testing
1. Install Firefox (latest version)
2. Open `http://localhost:4173` (or deployed URL)
3. Test all core functionality
4. Check Firefox DevTools console for errors
5. Verify CSS rendering (Firefox may render some CSS differently)

**Firefox-Specific Checks:**
- CSS Grid/Flexbox compatibility
- Custom properties (CSS variables)
- Web animations API
- Pointer events for swipe gestures

### 3. Safari Testing

**macOS Safari:**
1. Open Safari
2. Enable Developer menu: Preferences > Advanced > Show Develop menu
3. Test all features
4. Check Safari Web Inspector for errors

**Safari-Specific Checks:**
- `-webkit-` prefixes for animations
- Intersection Observer support
- Touch event handling (for swipe gestures)
- CSS backdrop-filter support
- Safe area insets for notched devices

**iOS Safari (Mobile):**
1. Connect iPhone/iPad to Mac
2. Enable Web Inspector on iOS device
3. Open Safari on Mac > Develop > [Device] > [Your Site]
4. Test touch gestures, swipe interactions
5. Verify viewport meta tag behavior

### 4. Edge Testing
1. Install Microsoft Edge (Chromium-based)
2. Test all features (should be similar to Chrome)
3. Verify compatibility mode if needed

**Edge-Specific Checks:**
- Legacy Edge compatibility (if supporting older versions)
- Microsoft-specific APIs (if used)

## Automated Testing Options

### Option 1: BrowserStack (Recommended for CI/CD)
BrowserStack provides automated cross-browser testing.

```bash
# Install BrowserStack CLI
npm install -g browserstack-cli

# Configure and run tests
browserstack config
browserstack test
```

### Option 2: Playwright (Recommended for Local Testing)
Playwright supports multiple browsers automatically.

```bash
# Install Playwright
pnpm add -D @playwright/test

# Run tests across browsers
npx playwright test --browser=all
```

Example Playwright config:
```javascript
// playwright.config.js
export default {
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
};
```

### Option 3: Selenium WebDriver
Traditional cross-browser automation framework.

```bash
# Install Selenium
pnpm add -D selenium-webdriver

# Run tests with different drivers
```

## Common Browser Issues & Solutions

### Safari Issues
**Problem:** CSS animations not working
- **Solution:** Add `-webkit-` prefixes, use `@supports` queries

**Problem:** Touch events not firing
- **Solution:** Use pointer events API, add touch-action CSS property

**Problem:** Viewport height issues on iOS
- **Solution:** Use CSS custom properties with `vh` units, handle safe areas

### Firefox Issues
**Problem:** CSS Grid inconsistencies
- **Solution:** Use explicit grid definitions, test thoroughly

**Problem:** Custom properties fallbacks
- **Solution:** Provide fallback values

### Chrome Issues
**Problem:** Autofill styles interfering
- **Solution:** Use `:-webkit-autofill` selectors to override

## Testing Tools

### Browser Testing Tools
- **BrowserStack**: Cloud-based cross-browser testing
- **Sauce Labs**: Automated cross-browser testing
- **LambdaTest**: Live interactive testing
- **Playwright**: Open-source browser automation
- **Puppeteer**: Chrome/Chromium automation

### Browser Compatibility Checkers
- **Can I Use**: Check feature support (https://caniuse.com)
- **MDN Browser Compatibility**: Reference documentation
- **Browserslist**: Configure target browsers

### Responsive Testing Tools
- **Responsive Design Mode** (Chrome/Firefox DevTools)
- **BrowserStack Responsive**: Test multiple viewports
- **Responsively App**: Local responsive testing

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Cross-Browser Testing

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm run build
      - run: pnpm run preview &
      - run: npx playwright test --browser=${{ matrix.browser }}
```

## Performance Testing Across Browsers

Different browsers may have different performance characteristics:

- **Chrome**: Generally fastest for JavaScript execution
- **Firefox**: Good CSS rendering, slightly slower JS
- **Safari**: Optimized for Apple hardware, good for mobile
- **Edge**: Similar to Chrome (Chromium-based)

Run Lighthouse audits on each browser to compare performance.

## Browser Support Matrix

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| CSS Grid | ✅ | ✅ | ✅ | ✅ |
| Flexbox | ✅ | ✅ | ✅ | ✅ |
| Custom Properties | ✅ | ✅ | ✅ | ✅ |
| Intersection Observer | ✅ | ✅ | ✅ | ✅ |
| Pointer Events | ✅ | ✅ | ✅ | ✅ |
| Web Animations API | ✅ | ✅ | ✅ | ✅ |
| Fetch API | ✅ | ✅ | ✅ | ✅ |
| ES6+ Features | ✅ | ✅ | ✅ | ✅ |

## Notes

- Testing should be performed after each major feature addition
- Before production deployment, full cross-browser testing is required
- Automated tests should run on every commit (CI/CD)
- Manual testing should be performed before major releases
- Document any browser-specific workarounds in code comments

## Resources

- [MDN Browser Compatibility](https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent)
- [Can I Use](https://caniuse.com/)
- [BrowserStack Documentation](https://www.browserstack.com/docs)
- [Playwright Documentation](https://playwright.dev/)
- [Web Platform Tests](https://web-platform-tests.org/)
