const { app, BrowserWindow, ipcMain, shell } = require("electron");
const http = require("http");
const path = require("path");
const serve = require("electron-serve").default;

const loadURL = serve({ directory: path.join(__dirname, "..", "out") });

let mainWindow;

function createWindow() {
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
