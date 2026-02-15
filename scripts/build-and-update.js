#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PKG = require(path.join(ROOT, "package.json"));
const APP_NAME = PKG.build.productName; // "Bloom English"
const VERSION = PKG.version;
const IS_MAC = process.platform === "darwin";
const IS_WIN = process.platform === "win32";

function log(msg) {
  console.log(`\n🔧 ${msg}`);
}

function run(cmd, opts = {}) {
  console.log(`   > ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function findBuiltApp() {
  if (IS_MAC) {
    // electron-builder outputs to dist/mac-arm64/ or dist/mac/ depending on arch
    const candidates = [
      path.join(DIST, `mac-arm64`, `${APP_NAME}.app`),
      path.join(DIST, `mac`, `${APP_NAME}.app`),
      path.join(DIST, `mac-x64`, `${APP_NAME}.app`),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    // Fallback: search dist for any .app directory
    if (fs.existsSync(DIST)) {
      for (const entry of fs.readdirSync(DIST)) {
        const sub = path.join(DIST, entry);
        if (fs.statSync(sub).isDirectory()) {
          const appPath = path.join(sub, `${APP_NAME}.app`);
          if (fs.existsSync(appPath)) return appPath;
        }
      }
    }
    return null;
  }

  if (IS_WIN) {
    // NSIS installer path
    const candidates = [
      path.join(DIST, `${APP_NAME} Setup ${VERSION}.exe`),
      path.join(DIST, `${APP_NAME}-Setup-${VERSION}.exe`),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    // Fallback: find any Setup .exe
    if (fs.existsSync(DIST)) {
      const exe = fs.readdirSync(DIST).find(
        (f) => f.endsWith(".exe") && f.toLowerCase().includes("setup")
      );
      if (exe) return path.join(DIST, exe);
    }
    return null;
  }

  return null;
}

function killRunningApp() {
  log("Closing running instances...");
  try {
    if (IS_MAC) {
      execSync(`osascript -e 'quit app "${APP_NAME}"'`, { stdio: "ignore" });
      // Give it a moment to quit gracefully
      execSync("sleep 1");
    } else if (IS_WIN) {
      execSync(`taskkill /IM "${APP_NAME}.exe" /F`, { stdio: "ignore" });
    }
  } catch {
    // App wasn't running — that's fine
  }
}

function installApp(builtPath) {
  if (IS_MAC) {
    const dest = `/Applications/${APP_NAME}.app`;
    log(`Installing to ${dest}`);
    // Remove old version
    if (fs.existsSync(dest)) {
      run(`rm -rf "${dest}"`);
    }
    // Copy new version
    run(`cp -R "${builtPath}" "/Applications/"`);
    console.log(`   ✅ Installed to ${dest}`);
  } else if (IS_WIN) {
    log(`Running installer: ${path.basename(builtPath)}`);
    // /S = silent install for NSIS
    run(`"${builtPath}" /S`);
    console.log(`   ✅ Installer completed`);
  }
}

function launchApp() {
  log("Launching app...");
  if (IS_MAC) {
    execSync(`open -a "${APP_NAME}"`, { stdio: "ignore" });
  } else if (IS_WIN) {
    const exePath = path.join(
      process.env.LOCALAPPDATA || "",
      APP_NAME,
      `${APP_NAME}.exe`
    );
    if (fs.existsSync(exePath)) {
      execSync(`start "" "${exePath}"`, { stdio: "ignore", shell: true });
    }
  }
}

// --- Main ---
async function main() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  Build & Update: ${APP_NAME} v${VERSION}`);
  console.log(`  Platform: ${IS_MAC ? "macOS" : IS_WIN ? "Windows" : process.platform}`);
  console.log(`${"=".repeat(50)}`);

  if (!IS_MAC && !IS_WIN) {
    console.error("❌ This script supports macOS and Windows only.");
    process.exit(1);
  }

  // Step 0 (Windows): Add Defender exclusion for dist folder to prevent file locking
  if (IS_WIN) {
    log("Adding Windows Defender exclusion for dist folder...");
    try {
      execSync(
        `powershell -Command "Add-MpPreference -ExclusionPath '${DIST}'"`,
        { stdio: "ignore" }
      );
      console.log("   ✅ Defender exclusion added");
    } catch {
      console.log(
        "   ⚠️  Could not add Defender exclusion (may need admin). Continuing anyway..."
      );
    }
  }

  // Step 0.5: Clean dist folder to avoid stale locked files
  if (fs.existsSync(DIST)) {
    log("Cleaning dist folder...");
    try {
      fs.rmSync(DIST, { recursive: true, force: true });
      console.log("   ✅ dist folder cleaned");
    } catch (e) {
      console.log(
        `   ⚠️  Could not fully clean dist folder (${e.code}). electron-builder will overwrite.`
      );
    }
  }

  // Step 1: Build
  log("Building Next.js app...");
  run("npm run build");

  log("Packaging with electron-builder...");
  run("npx electron-builder");

  // Step 2: Find the built artifact
  const builtPath = findBuiltApp();
  if (!builtPath) {
    console.error("❌ Could not find built application in dist/");
    console.error("   Check electron-builder output above for errors.");
    process.exit(1);
  }
  log(`Found built app: ${builtPath}`);

  // Step 3: Close running app, install, and relaunch
  killRunningApp();
  installApp(builtPath);

  const shouldLaunch = !process.argv.includes("--no-launch");
  if (shouldLaunch) {
    launchApp();
  }

  console.log(`\n✅ ${APP_NAME} v${VERSION} has been updated!\n`);
}

main().catch((err) => {
  console.error("❌ Build failed:", err.message);
  process.exit(1);
});
