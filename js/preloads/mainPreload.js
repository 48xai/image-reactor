const os = require("os");
const path = require("path");
const { contextBridge, ipcRenderer } = require("electron");
const {
  clipboardCopyMac,
  clipboardPasteMac,
} = require("../utils.js");

contextBridge.exposeInMainWorld("os", {
  homedir: () => os.homedir(),
});

contextBridge.exposeInMainWorld("path", {
  join: (...args) => path.join(...args),
});

contextBridge.exposeInMainWorld("ipcRenderer", {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) =>
    ipcRenderer.on(channel, (event, ...args) => func(...args)),
});

contextBridge.exposeInMainWorld("filters", {
  imageFilter: (image, filterType, args) =>
    ipcRenderer.invoke("image-filter", image, filterType, args),
});

contextBridge.exposeInMainWorld("preloadClipboard", {
  copy: clipboardCopyMac,
  paste: clipboardPasteMac,
});

