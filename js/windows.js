const path = require("path");

const { BrowserWindow } = require("electron");

function newSubWindow(
  parent,
  title,
  width = 600,
  height = 600,
  file = null,
  preloadFile = null
) {
  var webPreferences = { nodeIntegration: true };
  if (preloadFile) {
    webPreferences.preload = path.join(__dirname, preloadFile);
  }
  let result = new BrowserWindow({
    width: width,
    height: height,
    title: title,
    parent: parent,
    show: false,
    menuBarVisible: false,
    webPreferences: webPreferences,
    icon: `${__dirname}/../assets/icons/Icon_256x256.png`,
  });
  if (file) {
    result.loadFile(file);
  }
  result.setMenu(null); // hide top menubar
  return result;
}

let _aboutWindow = null;
function getAboutWindow(parent) {
  // coding this as a singleton because electron doesn't like it if this is initialized before the app is
  if (!_aboutWindow) {
    _aboutWindow = newSubWindow(
      parent,
      "About Image Reactor",
      400,
      500,
      "renderer/about.html",
      "preloads/standardPreload.js"
    );
    _aboutWindow.on("closed", function () {
      _aboutWindow = null;
    });
  }
  // _aboutWindow.webContents.openDevTools();
  return _aboutWindow;
}

let _hslWindow = null;
function getHslWindow(parent) {
  // coding this as a singleton because electron doesn't like it if this is initialized before the app is
  if (!_hslWindow) {
    _hslWindow = newSubWindow(
      parent,
      "HSL",
      500,
      250,
      "renderer/hslColors.html",
      "preloads/standardPreload.js"
    );
    _hslWindow.on("closed", function () {
      _hslWindow = null;
    });
  }
  // _hslWindow.webContents.openDevTools();
  return _hslWindow;
}

let _resizeWindow = null;
function getResizeWindow(parent) {
  // coding this as a singleton because electron doesn't like it if this is initialized before the app is
  if (!_resizeWindow) {
    _resizeWindow = newSubWindow(
      parent,
      "Resize",
      400,
      400,
      "renderer/resize.html",
      "preloads/standardPreload.js"
    );
    _resizeWindow.on("closed", function () {
      _resizeWindow = null;
    });
  }
  _resizeWindow.setMenu(null);
   _resizeWindow.webContents.openDevTools();
  return _resizeWindow;
}

module.exports = {
  getAboutWindow,
  getHslWindow,
  getResizeWindow,
};
