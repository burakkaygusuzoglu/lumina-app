# 📱 Lumina — Mobile Deployment Guide
## iOS (App Store) & Android (Google Play)

---

## Prerequisites

| Platform | Requirement |
|---|---|
| iOS | macOS + Xcode 15+ + Apple Developer Account ($99/yr) |
| Android | Any OS + Android Studio + Google Play Developer Account ($25 one-time) |
| Both | Node.js 18+, npm, this repo |

---

## Step 1 — Initialize native projects (run once)

```bash
cd frontend/web

# Build the web app first
npm run build

# Initialize Capacitor (reads capacitor.config.ts automatically)
npx cap init Lumina com.lumina.app --web-dir dist

# Add platforms
npx cap add ios        # macOS only — requires Xcode
npx cap add android    # Any OS — requires Android Studio

# Sync assets + plugins
npx cap sync
```

---

## Step 2 — Configure Supabase for Google OAuth

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → **Authentication** → **Providers**
2. Enable **Google** provider
3. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/):
   - Create a new project or use existing
   - APIs & Services → **Credentials** → **Create OAuth 2.0 Client ID**
   - Authorized redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback`
4. Paste **Client ID** and **Client Secret** into Supabase Google provider settings
5. For mobile deep links, also add:
   - `com.lumina.app:/oauth2redirect` (iOS)
   - `com.lumina.app:/oauth2redirect` (Android)

---

## Step 3 — iOS Deployment

### 3a. Open in Xcode
```bash
cd frontend/web
npm run cap:ios   # builds + syncs + opens Xcode
```

### 3b. Configure in Xcode
1. Select the **Lumina** target → **Signing & Capabilities**
2. Set your **Team** (Apple Developer Account)
3. Bundle Identifier: `com.lumina.app`
4. In **Info** tab, add these URL schemes for OAuth:
   ```
   lumina
   ```

### 3c. App Icons (already generated!)
Drag these PNG files from `public/icons/` into Xcode's `Assets.xcassets/AppIcon`:
- `icon-1024.png` → 1024×1024 (App Store)  
- `icon-180.png`  → 60pt @3x (iPhone)
- `icon-167.png`  → 83.5pt @2x (iPad Pro)
- `icon-152.png`  → 76pt @2x (iPad)
- `icon-120.png`  → 60pt @2x (iPhone)

> **Tip:** Run `npm run generate-icons` to regenerate if you update the SVG

### 3d. Build & Test
- Connect iPhone or use Simulator
- Press **▶ Run** in Xcode
- For device testing, device must be in your Apple Developer provisioning profile

### 3e. Submit to App Store
1. Product → **Archive**
2. In **Organizer** → **Distribute App** → App Store Connect
3. Fill App Store listing at [App Store Connect](https://appstoreconnect.apple.com/)
4. Screenshots required: 6.5" (iPhone 14 Pro Max), 5.5" (iPhone 8 Plus), 12.9" (iPad Pro)

---

## Step 4 — Android Deployment

### 4a. Open in Android Studio
```bash
cd frontend/web
npm run cap:android   # builds + syncs + opens Android Studio
```

### 4b. Configure
1. Open `android/app/src/main/res/values/strings.xml` — verify `app_name` = "Lumina"
2. Open `android/app/build.gradle` — verify `applicationId "com.lumina.app"`
3. In Android Studio: **Build** → **Generate Signed Bundle / APK**

### 4c. Launcher Icons
Capacitor auto-copies your `public/icons/icon-192.png` as the adaptive icon.
For best quality, replace with Android-specific assets:
```
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png  → 192×192
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png   → 144×144
android/app/src/main/res/mipmap-xhdpi/ic_launcher.png    → 96×96
android/app/src/main/res/mipmap-hdpi/ic_launcher.png     → 72×72
android/app/src/main/res/mipmap-mdpi/ic_launcher.png     → 48×48
```

### 4d. Build APK / AAB
```bash
# Debug APK (for testing)
cd frontend/web/android && ./gradlew assembleDebug

# Release AAB (for Play Store)
cd frontend/web/android && ./gradlew bundleRelease
```

### 4e. Submit to Google Play
1. Go to [Google Play Console](https://play.google.com/console/)
2. Create new app → fill store listing
3. Upload your signed `.aab` file
4. Complete content rating questionnaire
5. Set pricing (free) and publish

---

## Step 5 — Live Reload during development (optional)

Edit `capacitor.config.ts` and uncomment the server block:
```typescript
server: {
  url: 'http://192.168.1.x:5173',  // your local IP
  cleartext: true,
},
```
Then run:
```bash
npm run dev   # terminal 1
npx cap run android   # terminal 2 (or ios)
```

---

## Environment Variables

Create `frontend/web/.env.local` with:
```env
VITE_API_BASE_URL=https://lumina-app-production-bcb5.up.railway.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Quick Command Reference

```bash
# Full rebuild + sync all platforms
npm run cap:sync

# Open iOS in Xcode (macOS only)
npm run cap:ios

# Open Android in Android Studio
npm run cap:android

# Regenerate icons after SVG changes
npm run generate-icons
```

---

## App Store / Play Store Checklist

- [ ] Privacy Policy URL: `https://lumina-app-pink.vercel.app/privacy`
- [ ] Terms of Service URL: `https://lumina-app-pink.vercel.app/tos`
- [ ] App description (short + long)
- [ ] Screenshots for each device size
- [ ] Icon 1024×1024 PNG (for App Store) — run `node scripts/generate-icons.cjs` and manually export at 1024px
- [ ] Age rating: 4+ (no mature content)
- [ ] Category: Health & Fitness / Productivity
- [ ] Keywords: AI, life, wellness, journal, productivity, mind, personal
