const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ipcRenderer", {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) =>
    ipcRenderer.on(channel, (event, ...args) => func(...args)),
});

contextBridge.exposeInMainWorld("preload", {
  closeCurrentWindow: () => ipcRenderer.invoke("close-current-window"),
});

contextBridge.exposeInMainWorld("ipcMainWindow", {
  send: (channel, data) =>
    ipcRenderer.send("run-in-main-window", { channel: channel, data: data }),
});
