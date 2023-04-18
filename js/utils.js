const sharp = require("sharp");
const { clipboard, nativeImage } = require('electron');

function menuItem(label, action, accelerator) {
  accelerator = accelerator || "";
  accelerator = accelerator.replace("Ctrl+", "CmdOrCtrl+"); // mac support
  return {
    label: label,
    click: action,
    accelerator: accelerator,
  };
}

function getIsDev() {
  return process.env.NODE_ENV !== "development";
}

function getIsMac() {
  return process.platform === "darwin";
}

function loadImageAsync(filePath) {
  return new Promise((resolve, reject) => {
    const fs = require("fs");

    // Read the image data from the file using fs.readFile()
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      const imageUrl = "data:image/jpeg;base64," + data.toString("base64");
      resolve(imageUrl);
    });
  });
}

function getImageAsSharpImage(imageData) {
  // Extract the image format (e.g. "jpeg" or "png") from the data URI prefix
  const formatMatch = imageData.match(/^data:image\/(\w+);base64,/);
  if (!formatMatch) {
    console.log("could not match format");
    return null;
  }
  // const format = formatMatch[1];

  // Remove the data URI prefix to get the raw image data
  const imageDataWithoutPrefix = imageData.replace(
    /^data:image\/\w+;base64,/,
    ""
  );

  // Decode the base64-encoded image data into a buffer
  const imageBuffer = Buffer.from(imageDataWithoutPrefix, "base64");

  // Convert the image buffer to JPEG or PNG format, depending on the input format
  let sharpImage = sharp(imageBuffer);

  return sharpImage;
}

function saveBase64ImageToFile(imageData, filePath, callback) {
  // Extract the image format (e.g. "jpeg" or "png") from the data URI prefix
  const formatMatch = imageData.match(/^data:image\/(\w+);base64,/);
  if (!formatMatch) {
    return callback(
      new Error(
        "Invalid base64-encoded image string: missing or invalid data URI prefix"
      )
    );
  }
  const format = formatMatch[1];

  // Remove the data URI prefix to get the raw image data
  const imageDataWithoutPrefix = imageData.replace(
    /^data:image\/\w+;base64,/,
    ""
  );

  // Decode the base64-encoded image data into a buffer
  const imageBuffer = Buffer.from(imageDataWithoutPrefix, "base64");

  // Convert the image buffer to JPEG or PNG format, depending on the input format
  let sharpImage = sharp(imageBuffer);
  if (format.toLowerCase() === "png") {
    sharpImage = sharpImage.png();
  } else if (
    format.toLowerCase() === "jpeg" ||
    format.toLowerCase() === "jpg"
  ) {
    sharpImage = sharpImage.jpeg();
  } else {
    return callback(
      new Error("Invalid base64-encoded image string: unsupported image format")
    );
  }

  // Save the image to disk using the specified file path
  sharpImage.toFile(filePath, (err, info) => {
    if (err) {
      callback(err);
    } else {
      callback(null, info.path);
    }
  });
}

function clipboardPasteMac() {
  const clipboardImage = clipboard.readImage("clipboard");
  if (!clipboardImage.isEmpty()) {
    const data = clipboardImage.toPNG();
    return data;
  } else {
    console.log('no image data in clipboard')
    return null;
  }
}

function clipboardCopyMac(imageData) {
  // only works for mac
  const imageFormats = ['image/png', 'image/jpeg', 'image/gif'];
  const imageBuffer = Buffer.from(imageData, 'base64');
  clipboard.writeImage(nativeImage.createFromDataURL(imageData));
}

module.exports = {
  menuItem,
  getIsDev,
  getIsMac,
  loadImageAsync,
  saveBase64ImageToFile,
  getImageAsSharpImage,
  clipboardPasteMac,
  clipboardCopyMac,
};
