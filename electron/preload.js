const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("puterAuth", {
  isElectron: true,
  login: () => ipcRenderer.invoke("puter:login"),
});
