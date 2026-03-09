const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("puterAuth", {
  isElectron: true,
  login: () => ipcRenderer.invoke("puter:login"),
});

contextBridge.exposeInMainWorld("windowControls", {
  toggleMaximize: () => ipcRenderer.invoke("window:toggleMaximize"),
});

contextBridge.exposeInMainWorld("vocabularyAPI", {
  seed:     ()         => ipcRenderer.invoke("vocabulary:seed"),
  scan:     ()         => ipcRenderer.invoke("vocabulary:scan"),
  getTopic: (topicId)  => ipcRenderer.invoke("vocabulary:getTopic", topicId),
});
