const { dialog } = require("electron");

// todo: move out of /renderer

function openFileDialog(callback) {
  return dialog.showOpenDialog({
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif"] }],
    properties: ["openFile"],
  });
}

function saveFileDialog(path) {
  return dialog.showSaveDialog({
    defaultPath: path,
    filters: [
      { name: "Png", extensions: ["png"] },
      { name: "Jpg", extensions: ["jpg"] },
    ],
  });
}

module.exports = { openFileDialog, saveFileDialog };
