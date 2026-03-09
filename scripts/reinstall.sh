#!/bin/bash
set -e

APP_NAME="Bloom English"

echo "=== Reinstalling $APP_NAME with new icon ==="

# Step 1: Clean old build
echo "[1/4] Cleaning old build output..."
rm -rf dist/

# Step 2: Rebuild the app
echo "[2/4] Building app (next build + electron-builder)..."
npm run dist

# Step 3: Install the new build
DMG=$(find dist/ -name "*.dmg" | head -1)
if [ -z "$DMG" ]; then
  echo "Error: No .dmg found in dist/"
  exit 1
fi
echo "[3/4] Installing from $DMG..."
MOUNT_OUTPUT=$(hdiutil attach "$DMG" -nobrowse)
VOLUME=$(echo "$MOUNT_OUTPUT" | grep -o '/Volumes/.*' | head -1)
if [ -z "$VOLUME" ]; then
  echo "Error: Failed to mount DMG"
  exit 1
fi
APP_PATH=$(find "$VOLUME" -name "*.app" -maxdepth 1 | head -1)
if [ -z "$APP_PATH" ]; then
  echo "Error: No .app found in $VOLUME"
  hdiutil detach "$VOLUME" -quiet
  exit 1
fi
rm -rf "/Applications/$APP_NAME.app"
ditto "$APP_PATH" "/Applications/$APP_NAME.app"
hdiutil detach "$VOLUME" -quiet

# Step 4: Re-sign with entitlements so macOS 26+ accepts mixed Team IDs
echo "[4/5] Re-signing app bundle..."
ENTITLEMENTS="$(dirname "$0")/../electron/entitlements.mac.plist"
APP_INSTALL="/Applications/$APP_NAME.app"
# Sign nested components inside-out, then the main bundle
find "$APP_INSTALL/Contents/Frameworks" -name "*.dylib" -o -name "*.framework" 2>/dev/null | sort -r | while read f; do
  codesign --force --sign - "$f" 2>/dev/null || true
done
find "$APP_INSTALL/Contents/Frameworks" -name "*.app" 2>/dev/null | while read helper; do
  codesign --force --sign - --entitlements "$ENTITLEMENTS" "$helper" 2>/dev/null || true
done
codesign --force --sign - --entitlements "$ENTITLEMENTS" "$APP_INSTALL"

# Step 5: Clear macOS icon cache
echo "[5/5] Clearing icon cache..."
sudo rm -rfv /Library/Caches/com.apple.iconservices.store > /dev/null 2>&1 || true
sudo find /private/var/folders/ -name com.apple.dock.iconcache -exec rm -rf {} + 2>/dev/null || true
sudo find /private/var/folders/ -name com.apple.iconservices -exec rm -rf {} + 2>/dev/null || true
killall Dock

echo ""
echo "=== Done! $APP_NAME reinstalled with new icon ==="
echo "If the old icon still shows, log out and back in."
