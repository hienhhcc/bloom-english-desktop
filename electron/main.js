const { app, BrowserWindow, ipcMain, shell, session, systemPreferences } = require("electron");
const http = require("http");
const path = require("path");
const serve = require("electron-serve").default;

const loadURL = serve({ directory: path.join(__dirname, "..", "out") });

let mainWindow;

function createWindow() {
  // Grant microphone permissions to the renderer
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === "media") {
      callback(true);
      return;
    }
    callback(false);
  });

  // On macOS, request microphone access at the OS level (non-blocking)
  if (process.platform === "darwin") {
    try {
      const micStatus = systemPreferences.getMediaAccessStatus("microphone");
      if (micStatus !== "granted") {
        systemPreferences.askForMediaAccess("microphone").catch(() => {});
      }
    } catch (_e) {
      // Ignore errors — permission will be requested when getUserMedia is called
    }
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  loadURL(mainWindow);

  mainWindow.webContents.on("did-fail-load", (_e, errorCode, _desc, url) => {
    if (errorCode === -6) { // ERR_FILE_NOT_FOUND
      try {
        const { pathname } = new URL(url);
        if (pathname.startsWith("/vocabulary/")) {
          const topicId = pathname.replace("/vocabulary/", "").replace(/\/$/, "");
          mainWindow.loadURL(`app://bloom-english-desktop/vocabulary/dynamic?id=${topicId}`);
        }
      } catch (_urlErr) {
        // Ignore invalid URLs
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Open Puter login in the user's default browser and return the auth token.
 * Mirrors the flow from @heyputer/puter.js/src/init.cjs but uses
 * Electron's shell.openExternal instead of the `open` npm package.
 */
function getAuthToken(guiOrigin = "https://puter.com") {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!DOCTYPE html>
<html><head><title>Authentication Successful</title>
<style>body{font-family:system-ui;background:#404C71;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{background:#fff;border-radius:16px;padding:48px;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);max-width:420px}
h1{color:#1a1a2e;margin-bottom:12px}p{color:#64748b}</style></head>
<body><div class="c"><h1>Authentication Successful</h1>
<p>You can close this tab and return to Bloom English.</p></div></body></html>`);

      const token = new URL(req.url, "http://localhost").searchParams.get("token");
      server.close();
      resolve(token);
    });

    server.listen(0, () => {
      const port = server.address().port;
      const url = `${guiOrigin}/?action=authme&redirectURL=${encodeURIComponent("http://localhost:" + port)}`;
      shell.openExternal(url);
    });
  });
}

// IPC: open Puter login in default browser, return auth token
ipcMain.handle("puter:login", async () => {
  const token = await getAuthToken();
  return token;
});

ipcMain.handle("window:toggleMaximize", () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle("vocabulary:seed", async () => {
  const fs = require("fs");
  const dest = path.join(app.getPath("userData"), "vocabulary");
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // In dev mode, source is the project's data/vocabulary/ directory.
  // We also persist this path so the packaged app can read from it live.
  const projectVocabPath = path.join(__dirname, "..", "data", "vocabulary");
  if (!app.isPackaged) {
    const configPath = path.join(app.getPath("userData"), "vocab-config.json");
    fs.writeFileSync(configPath, JSON.stringify({ vocabSourcePath: projectVocabPath }, null, 2));
  }

  // Determine the live source: prefer the project directory if it exists
  const configPath = path.join(app.getPath("userData"), "vocab-config.json");
  let liveSource = null;
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (config.vocabSourcePath && fs.existsSync(config.vocabSourcePath)) {
      liveSource = config.vocabSourcePath;
    }
  } catch {}

  // The authoritative source: live project dir if available, else bundled resources
  const src = liveSource ?? (app.isPackaged
    ? path.join(process.resourcesPath, "vocabulary")
    : projectVocabPath);

  const srcFiles = new Set(fs.readdirSync(src).filter((f) => f.endsWith(".json")));
  // Always overwrite all files from source so updates and deletions are reflected
  for (const file of srcFiles) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
  // Remove files from userData that were deleted from source
  for (const file of fs.readdirSync(dest)) {
    if (file.endsWith(".json") && !srcFiles.has(file)) {
      fs.unlinkSync(path.join(dest, file));
    }
  }
  return dest;
});

ipcMain.handle("vocabulary:scan", async () => {
  const fs = require("fs");
  const dir = path.join(app.getPath("userData"), "vocabulary");
  const topicsMeta = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, "topics.json"), "utf-8")); }
    catch { return []; }
  })();
  const metaById = Object.fromEntries(topicsMeta.map((t) => [t.id, t]));

  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "topics.json")
    .map((file) => {
      const id = file.replace(".json", "");
      try {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const meta = metaById[id] ?? {};
        const wordCount = data.items?.length ?? 0;
        // Fallbacks for topics not in topics.json
        const name = meta.name ?? id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const createdAt = meta.createdAt ?? fs.statSync(filePath).mtime.toISOString();
        const difficulty = meta.difficulty ?? (data.items?.[0]?.difficulty ?? "intermediate");
        const icon = meta.icon ?? "📖";
        return { id, wordCount, name, createdAt, difficulty, icon,
          nameVietnamese: meta.nameVietnamese ?? "",
          description: meta.description ?? "",
          ...meta };
      } catch { return null; }
    })
    .filter(Boolean);
});

ipcMain.handle("vocabulary:getTopic", async (_e, topicId) => {
  const fs = require("fs");
  const file = path.join(app.getPath("userData"), "vocabulary", `${topicId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
});

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
