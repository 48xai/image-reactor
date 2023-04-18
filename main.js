const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, ipcMain, Menu, nativeImage, shell,clipboard, } = require("electron");

const {
  openFileDialog,
  saveFileDialog,
} = require("./js/dialogs.js");

const {
  getImageAsSharpImage,
  getIsDev,
  getIsMac,
  loadImageAsync,
  menuItem,
  saveBase64ImageToFile,
} = require("./js/utils.js");

const {
  getAboutWindow,
  getHslWindow,
  getResizeWindow,
} = require("./js/windows.js");



// ------------------------------------- globals -------------------------------------

let mainWindow;
let imagePath = "";
let imageIndex = 0;
let imagePathFiles = [];
let slideShowSpeedIndex = 13; // 4.5s
let slideShowSpeeds = [
 1/10, 1/8, 1/6, 1/5, 1/4, 1/3, 1/2, 1,
 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 8, 10,
 15, 20, 25, 30, 45, 60, 90, 120, 180, 240, 270, 300,
];

let slideshowIntervalId = null;

let randomHistory = []; // history of indexes of random images
let lastGoDirection = ""; // last direction such as 'next' or 'prev'

let lastSaveDir = null; // the last directory a file was saved

const isDev = getIsDev();
const isMac = getIsMac();



// ------------------------------------- functions -------------------------------------
function clipboardPasteMac() {
  const imageFormats = ['image/png', 'image/jpeg', 'image/gif'];
  const clipboardData = clipboard.readImage();

  if (clipboardData.isEmpty()) {
    throw new Error('Clipboard does not contain an image.');
  }

  const imageData = clipboardData.toPNG();

  return imageData;
}

function clipboardCopyMac(imageData) {
  const imageFormats = ['image/png', 'image/jpeg', 'image/gif'];
  const imageBuffer = Buffer.from(imageData, 'base64');

  clipboard.writeImage(nativeImage.createFromBuffer(imageBuffer));
}
function gotoImageIndex(n) {
  let filename = imagePathFiles[imageIndex];
  let s = path.join(imagePath, filename);
  console.log(s);
  loadImageAsync(s).then((result2) =>
    mainWindow.webContents.send("set-image", { image: result2, filename: s })
  );
}

function setBackgroundColor(color) {
  mainWindow.webContents.send("setBackgroundColor", { color: color });
}

function addRandomIndex(x) {
  randomHistory.push(x);
  if (randomHistory.length > 100) {
    randomHistory.shift();
  }
}

function imageGo(x) {
  if (x === "random") {
    imageIndex = Math.floor(Math.random() * imagePathFiles.length);
    addRandomIndex(imageIndex);
  }
  if (x === "first") {
    imageIndex = 0;
  }
  if (x === "prev") {
    imageIndex--;
  }
  if (x === "next") {
    imageIndex++;
  }
  if (x === "last") {
    imageIndex = imagePathFiles.length - 1;
  }
  if (x === "prevRandom") {
    if (randomHistory.length > 0) {
      let next = randomHistory.pop();
      if (next == imageIndex && randomHistory.length > 0) {
        next = randomHistory.pop();
      }
      imageIndex = next;
    }
  }
  if (imageIndex < 0) {
    imageIndex = 0;
  }
  if (imageIndex > imagePathFiles.length - 1) {
    imageIndex = imagePathFiles.length - 1;
  }
  console.log("go to index " + imageIndex);
  gotoImageIndex(imageIndex);
  lastGoDirection = x;
}

function toggleFullscreen() {
  if (mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false);
    mainWindow.setMenuBarVisibility(true);
  } else {
    mainWindow.setFullScreen(true);
    mainWindow.setMenuBarVisibility(false);
  }
}

function openAction() {
  console.log("open action");
  openFileDialog().then((result) => {
    if (!result.canceled && result.filePaths.length > 0) {
      imagePath = path.dirname(result.filePaths[0]);
      const filename = result.filePaths[0]; //!
      loadImageAsync(result.filePaths[0]).then((result2) =>
        mainWindow.webContents.send("set-image", {
          image: result2,
          filename: filename,
        })
      );
      fs.readdir(imagePath, (err, files) => {
        if (err) {
          console.log(err);
          return;
        }
        imagePathFiles = files;
      });
    }
  });
}

function gotoImagePath(filePath) {
  imagePath = path.dirname(filePath);
  fs.readdir(imagePath, (err, files) => {
    if (err) {
      console.log(err);
      return;
    }
    imagePathFiles = files;
  });
  const filename = filePath;
  loadImageAsync(filePath).then((result2) =>
    mainWindow.webContents.send("set-image", {
      image: result2,
      filename: filename,
    })
  );
}

function saveAction() {
  console.log("save action");
  mainWindow.webContents.send("get-image", { action: "save" }); // this is awkward, refactor later
  // see on 'get-image-response'
  return;
}

//function infoAction(){
//   // todo: put in a window pane
//   let filename = imagePathFiles[imageIndex];
//   let s = path.join(imagePath, filename);
//
//   console.log(
//      s + '\n' +
//      'File ' + (imageIndex+1) + ' / ' + imagePathFiles.length
//   );
//}

function filterAction(filterType) {
  mainWindow.webContents.send("image-filter", { type: filterType });
}

function deleteAction() {
  let filename = imagePathFiles[imageIndex];
  let s = path.join(imagePath, filename);
  fs.unlink(s, (error) => {
    if (error) {
      console.error("Failed to delete file " + s + ":", error);
    } else {
      console.log("deleted file " + s);
    }
  });
}

function randomSlideshow() {
  imageGo("random");
}

function orderedSlideshow() {
  imageGo("next");
}

function toggleOrderedSlideshow() {
  if (slideshowIntervalId) {
    console.log("clear ordered slideshow");
    clearInterval(slideshowIntervalId);
    slideshowIntervalId = null;
  } else {
    console.log("run ordered slideshow");
    slideshowIntervalId = setInterval(orderedSlideshow, getSlideShowSpeed());
  }
}

function toggleRandomSlideshow() {
  if (slideshowIntervalId) {
    console.log("clear random slideshow");
    clearInterval(slideshowIntervalId);
    slideshowIntervalId = null;
  } else {
    console.log("run random slideshow");
    slideshowIntervalId = setInterval(randomSlideshow, getSlideShowSpeed());
  }
}

function slideShowSpeed(change) {
  // slideshow speeds stored in seconds
  slideShowSpeedIndex += change;
  if (slideShowSpeedIndex < 0) {
    slideShowSpeedIndex = 0;
  }
  if (slideShowSpeedIndex > slideShowSpeeds.length - 1) {
    slideShowSpeedIndex = slideShowSpeeds.length - 1;
  }
  console.log("set slideshow speed to " + getSlideShowSpeed() + "ms");
}

function getSlideShowSpeed() {
  // in ms
  return 1000.0 * slideShowSpeeds[slideShowSpeedIndex];
}

function openWindow(window) {
  window.once("ready-to-show", () => {
    window.show(); // prevents flicker when opening
  });
}

function openResizeWindow(image, args) {
  var resizeWindow = getResizeWindow(mainWindow);
  resizeWindow.once("show", function () {
    resizeWindow.webContents.send("image-size", {
      image: image,
      size: args.size,
    });
  });
  openWindow(resizeWindow);
}



// ------------------------------------- menus -------------------------------------
const helpMenu = [
  menuItem("Website", () => shell.openExternal("https://www.github.com/")),
  menuItem("About Image Reactor", () =>
    openWindow(getAboutWindow(mainWindow))
  ),
];

const template = [
  {
    label: "File",
    submenu: [
      menuItem("Open", openAction, "O"),
      menuItem("Save As", () => saveAction(), "S"),
      menuItem(
        "New Image",
        () => mainWindow.webContents.send("new-image"),
        "Ctrl+N"
      ),
      // menuItem('Image Info', () => infoAction(), "I"),
      menuItem("Open Image Folder", () => shell.openPath(imagePath)),
      {
        label: "Delete",
        submenu: [menuItem("Delete Image", deleteAction, "Delete")],
      },
      menuItem("Exit", () => app.quit(), isMac ? "Ctrl+Q" : "Alt+F4"),
    ],
  },
  {
    label: "Edit",
    submenu: [
      menuItem("Copy", () => { if(isMac){ mainWindow.webContents.send('clipboard-copy', {}) } }, "Ctrl+C"), // make a function in main.js
      menuItem("Paste", () => { if(isMac){ mainWindow.webContents.send('clipboard-paste', {}) } }, "Ctrl+V"), // make a function in main.js
      menuItem("Undo", () => mainWindow.webContents.send('undo', {}), "Ctrl+Z"),
    ],
  },
  {
    label: "Image",
    submenu: [
      {
        label: "Background",
        submenu: [
          menuItem("Black", () => setBackgroundColor("#000000")),
          menuItem("Grey2", () => setBackgroundColor("#222222")),
          menuItem("Grey6", () => setBackgroundColor("#666666")),
          menuItem("White", () => setBackgroundColor("#ffffff")),
        ],
      },
      {
        label: "Colors",
        submenu: [
          menuItem("Grayscale", () => filterAction("grayscale"), "Ctrl+G"),
          menuItem("Negative", () => filterAction("negative"), "Ctrl+Shift+N"),
          menuItem(
            "HSL",
            () => openWindow(getHslWindow(mainWindow)),
            "Ctrl+Shift+H"
          ),
        ],
      },
      {
        label: "Geometry",
        submenu: [
          menuItem("Rotate Left", () => filterAction("rotateL"), "L"),
          menuItem("Rotate Right", () => filterAction("rotateR"), "R"),
          menuItem("Flip Horizontal", () => filterAction("flipH"), "H"),
          menuItem("Flip Vertical", () => filterAction("flipV"), "V"),
          menuItem(
            "Resize Image",
            () =>
              mainWindow.webContents.send("get-image", {
                action: "openResizeWindow",
              }),
            "Ctrl + R"
          ),
          menuItem("Crop Selection", () => filterAction("crop"), "Ctrl + Y"),
        ],
      },
    ],
  },
  {
    label: "View",
    submenu: [
      menuItem("Toggle Fullscreen", () => toggleFullscreen(), "F"),
      menuItem("First Image", () => imageGo("first"), "Ctrl+Left"),
      menuItem("Prev Image", () => imageGo("prev"), isMac?"":"Left"),
      menuItem("Next Image", () => imageGo("next"), isMac?"":"Right"),
      menuItem("Last Image", () => imageGo("last"), "Ctrl+Right"),
      menuItem("Random Image", () => imageGo("random"), "M"),
      menuItem("Prev Random", () => imageGo("prevRandom"), "Shift+M"),
      {
        label: "Slideshow",
        submenu: [
          menuItem(
            "Start/Stop Ordered",
            () => toggleOrderedSlideshow(),
            "Ctrl+Alt+Right"
          ),
          menuItem(
            "Start/Stop Random",
            () => toggleRandomSlideshow(),
            "Ctrl+Alt+M"
          ),
          menuItem("Speed Up", () => slideShowSpeed(-1), "Ctrl+Alt+Up"),
          menuItem("Slow Down", () => slideShowSpeed(1), "Ctrl+Alt+Down"),
        ],
      },
    ],
  },
];

if(isMac) {
   template.unshift({label: "", submenu: helpMenu});
} else {
   template.push({label: "Help", submenu: helpMenu});
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);



// ------------------------------------- windows/init -------------------------------------

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    //autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      // contextIsolation: true,
      preload: path.join(__dirname, "js/preloads/mainPreload.js"),
    },
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
  });

  mainWindow.loadFile("renderer/index.html");
  if (isDev) {
      // mainWindow.webContents.openDevTools(); // uncomment to show the dev tools
  }
});

app.on("window-all-closed", () => {
  if (isMac) {
    app.quit();
  }
});



// ------------------------------------- ipc actions -------------------------------------

ipcMain.on("drag-and-drop-file", (event, baseArgs) => {
  console.log("user dragged and dropped " + baseArgs.filePath);
  gotoImagePath(baseArgs.filePath);
});

ipcMain.on("save-file", (x) => {
  saveAction(null);
});

ipcMain.on("open-file", (x) => {
  openAction(null);
});

ipcMain.on("prev-image", (x) => {
  imageGo("prev");
});

ipcMain.on("next-image", (x) => {
  imageGo("next");
});

ipcMain.on("toggle-fullscreen", (x) => {
  toggleFullscreen();
});

ipcMain.on("run-in-main-window", (event, baseArgs) => {
  mainWindow.webContents.send(baseArgs.channel, baseArgs.data);
});

function saveImage(imageElement, outputPath) {
  saveBase64ImageToFile(imageElement, outputPath, () => {});
}

ipcMain.handle(
  "image-filter",
  async (event, imageElement, filterType, args) => {
    let a = getImageAsSharpImage(imageElement);

    if (filterType === "grayscale") {
      a = a.grayscale();
    } else if (filterType === "negative") {
      a = a.negate(true);
    } else if (filterType === "flipH") {
      a = a.flop(true);
    } else if (filterType === "flipV") {
      a = a.flip(true);
    } else if (filterType === "rotateR") {
      a = a.rotate(90);
    } else if (filterType === "rotateL") {
      a = a.rotate(-90);
    } else if (filterType === "crop") {
      a = a.extract(args.selection);
    } else if (filterType === "resize") {
      a = a.resize(args.size.width, args.size.height);
    } else if (filterType === "hsl") {
      a.modulate({
        hue: args.hue,
        saturation: args.saturation,
        brightness: args.brightness,
      });
    } else {
      console.log(
        "main process handle image-filter: unrecognized filter: " + filterType
      );
    }

    let x = await a.toBuffer();
    const dataUrl = `data:image/jpeg;base64,${x.toString("base64")}`;
    return dataUrl;
  }
);

ipcMain.handle("close-current-window", (event) => {
  BrowserWindow.getFocusedWindow().close();
});

// todo: do this using a callback or promise?
//       'saveFile()' could be passed to the front using preload
ipcMain.on("get-image-response", (event, baseArgs) => {
  // can be cleaned up? see how the filters pass image data

  const image = baseArgs.image;
  const args = baseArgs.args;

  if (args.action === "save") {
    var filename = null;
    if(lastSaveDir) {
       filename = path.join(lastSaveDir, '');
    }
    saveFileDialog(filename || imagePath)
      .then((result) => {
        if (!result.canceled) {
          lastSaveDir = path.dirname(result.filePath);
          saveImage(image, result.filePath);
          mainWindow.webContents.send("set-title", { title: result.filePath })
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } else if (args.action === "openResizeWindow") {
    openResizeWindow(image, args);
  } else {
    console.log("unrecognized action: " + args.action);
  }
});
