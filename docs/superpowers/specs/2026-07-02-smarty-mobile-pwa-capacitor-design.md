# Design Spec: Smarty Mobile App (PWA + Capacitor)

**Created:** 2026-07-02
**Status:** Approved
**Goal:** Convert the existing Smarty Next.js marketplace into Android and iOS apps listable on Google Play Store and Apple App Store, with minimal code duplication.

---

## 1. Architecture Overview

```
                    ┌──────────────────────────┐
                    │     Smarty Next.js App    │
                    │   (smarty/ — unchanged)   │
                    │                          │
                    │  ┌────────────────────┐   │
                    │  │   PWA Layer        │   │
                    │  │  - manifest.json   │   │
                    │  │  - sw.js           │   │
                    │  │  - meta tags       │   │
                    │  └────────────────────┘   │
                    │           │               │
                    │           ▼               │
                    │  Instalabil din browser   │
                    └──────────────────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │   Capacitor Shell        │
                    │   (smarty-mobile/)        │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │  WebView + Plugins  │  │
                    │  │  - Camera           │  │
                    │  │  - Push Notifs      │  │
                    │  │  - Share            │  │
                    │  └─────────────────────┘  │
                    │           │               │
                    │  ┌────────▼────────────┐  │
                    │  │  Android  │   iOS    │  │
                    │  │  (.aab)   │  (.ipa)  │  │
                    │  └──────────┴──────────┘  │
                    └───────────────────────────┘
```

**Key principle:** One codebase. The Next.js app stays exactly as it is. PWA provides browser installability. Capacitor wraps the PWA into native containers for store distribution.

---

## 2. PWA Layer (in smarty/)

### 2.1 New Files

| File | Purpose |
|------|---------|
| `public/manifest.json` | App metadata (name, icons, theme color, display mode) |
| `public/sw.js` | Service worker: network-first caching for offline support |
| `public/icons/icon-192.png` | 192x192 PWA icon |
| `public/icons/icon-512.png` | 512x512 PWA icon |
| `public/icons/icon-512-maskable.png` | 512x512 maskable icon (adaptive icons on Android) |

### 2.2 Modified Files

**`src/app/layout.tsx`** — Add:
- `<link rel="manifest" href="/manifest.json" />`
- `<meta name="theme-color" content="#d946ef" />`
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`
- `<script>` block that registers `sw.js` on page load

**`next.config.ts`** — No changes needed. Already has `output: "standalone"` which is ideal.

### 2.3 Service Worker Strategy

- **Network-first** for HTML pages (fresh content, fallback to cache)
- **Cache-first** for static assets (JS, CSS, fonts, images)
- Auto-updates when a new version is detected
- Offline fallback page when network is unavailable

### 2.4 Icons

Generated manually from the Smarty brand colors (fuchsia/pink `#d946ef`). A simple geometric logo + text mark.

---

## 3. Capacitor Shell (in smarty-mobile/)

### 3.1 Project Structure

```
smarty-mobile/
├── capacitor.config.ts       # server.url → Next.js prod URL
├── package.json              # @capacitor/core + @capacitor/cli
├── android/                  # Generated Android project
├── ios/                      # Generated iOS project
└── resources/                # Native icons & splash screens
```

### 3.2 capacitor.config.ts

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ro.smarty.app',
  appName: 'Smarty',
  webDir: 'out',             // PWA build output
  server: {
    url: 'https://smarty.ro', // Production URL
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000
    }
  }
};

export default config;
```

### 3.3 Capacitor Plugins

Three plugins to satisfy Apple's "not just a website" requirement:

| Plugin | Native Feature | User Benefit |
|--------|---------------|--------------|
| `@capacitor/camera` | Take product photos from camera | Listing creation |
| `@capacitor/push-notifications` | Push for offers, orders, messages | Real-time engagement |
| `@capacitor/share` | Share products to social apps | Viral growth |

Integration approach: detect Capacitor runtime at page load. If available, use native feature; if not (browser), fall back to web equivalent (file input for camera, Web Share API for share, SSE for notifications).

### 3.4 Build & Sync Flow

```
1. npm run build (in smarty/)     → .next/standalone output
2. npm run export-static (if SSR) → out/ directory
3. npx cap sync (in smarty-mobile/) → copies web build to android/ + ios/
4. npx cap open android           → Android Studio for .aab build
5. npx cap open ios               → Xcode for .ipa build
```

---

## 4. Store Publishing

### 4.1 Google Play Store

**Requirements:**
- Google Play Developer account (~$25 one-time)
- Signed `.aab` (Android App Bundle)
- App icon (512x512)
- Feature graphic (1024x500)
- Privacy policy URL
- Content rating questionnaire

**Process:**
1. Generate keystore for app signing
2. Build release `.aab` from Android Studio
3. Upload to Google Play Console
4. Fill store listing, content rating, pricing (free)
5. Submit for review (~2-48h)

### 4.2 Apple App Store

**Requirements:**
- Apple Developer Program ($99/year)
- Mac with Xcode (or cloud Mac)
- Signed `.ipa`
- App icons (all required sizes via `@capacitor/assets`)
- Privacy policy URL
- App Store listing screenshots (6.7" and 5.5" displays)

**Process:**
1. Generate iOS signing certificates in Xcode
2. Build release `.ipa` via Xcode Archive
3. Upload via Transporter or Xcode
4. Fill App Store Connect listing
5. Submit for review (~24-72h; first review typically longer)

**Note:** Apple review is stricter. The Capacitor plugins (camera, push, share) provide the native functionality Apple requires to distinguish from a plain website. If rejected, add biometric authentication (`@capacitor/biometric-auth`) for seller verification.

---

## 5. Runtime Detection Pattern

A utility module detects the platform at runtime:

```ts
// src/lib/platform.ts (new file)
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

// Usage in components:
// if (isNative) use Camera plugin, else use <input type="file">
```

This keeps the PWA fully functional standalone while enabling native features when running inside Capacitor.

---

## 6. Non-Goals (for this phase)

- **Not rewriting any existing UI** — the Tailwind responsive layout already works on mobile
- **Not adding offline database sync** — service worker provides basic offline, full sync is future work
- **Not changing the backend** — tRPC API stays exactly the same
- **Not rebuilding native UI** — Capacitor uses WebView, not native components
- **Not CI/CD for mobile builds** — manual store upload for v1

---

## 7. Estimated Effort

| Task | Hours |
|------|-------|
| PWA manifest + service worker + meta tags | 2h |
| PWA icons generation | 1h |
| Capacitor project setup + config | 1h |
| Capacitor plugin integration (camera, push, share) | 3h |
| Native icon/splash generation | 1h |
| Android build + signing config | 1h |
| iOS build + signing config | 2h |
| Store listing materials | 1h |

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Apple rejects for "website in a box" | Camera + push plugins prove native functionality; add biometric auth if needed |
| SSR pages don't work in WebView | `output: "standalone"` in Next.js already handles this; test `/produse/[id]` early |
| Stripe SCA/3DS in WebView | Capacitor's `server.url` points to deployed HTTPS; Stripe handles 3DS normally |
| Sameday EasyBox in WebView | External redirects work as Capacitor opens links in system browser by default |
| Local dev testing complexity | PWA works standalone in Chrome DevTools; Capacitor testing via `npx cap run android` |

---

## 9. Next Steps After Implementation

- **Firebase Crashlytics** for crash reporting on both platforms
- **Capacitor Live Updates** for OTA updates without store review
- **Capacitor Biometric Auth** for secure seller login
- **Deep linking** (smarty://product/123) for sharing between users
