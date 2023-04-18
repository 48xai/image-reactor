// ---------------------------------------- elements ------------------------------------

const imgElement = document.getElementById("my-image");
const imageBody = document.getElementById("imageBody");
const canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

var rect = {};
var drag = false;
var moved = false;
var magnification = 1.0;
var undoImageSrc = null; // when 'undo' is used this is what is loaded
//var img = document.getElementById("myImage");

// ---------------------------------------- library ------------------------------------

function imageToBlob(callback, imgElement) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = imgElement.naturalWidth;
  canvas.height = imgElement.naturalHeight;
  context.drawImage(imgElement, 0, 0);
  canvas.toBlob(callback, imgElement.src);
}

function imageToClipboardItem(callback, imgElement) {
  imageToBlob((blob) => {
    callback(new ClipboardItem({ [blob.type]: blob }));
  }, imgElement);
}

function getFirstItemInClipboard(searchTerm = "image") {
  const items = event.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf(searchTerm) !== -1) {
      return item;
    }
  }
  return null;
}

function createImage(x = 512, y = 512, color = "#000") {
  const canvas = document.createElement("canvas");
  canvas.width = x;
  canvas.height = y;

  const context = canvas.getContext("2d");

  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);

  return canvas.toDataURL();
}

function rectToSelection(rect) {
  var m = magnification;
  var selection = {
    left: Math.round(rect.startX * m),
    top: Math.round(rect.startY * m),
    width: Math.round(rect.w * m),
    height: Math.round(rect.h * m),
  };
  if (selection.width < 0) {
    selection.left += selection.width;
    selection.width = -selection.width;
  }
  if (selection.height < 0) {
    selection.top += selection.height;
    selection.height = -selection.height;
  }
  if (selection.top < 0) {
    selection.top = 0;
  }
  if (selection.left < 0) {
    selection.left = 0;
  }
  return selection;
}

function getContainedSize(img) {
  if (!img) {
    return {
      containedWidth: 0,
      containedHeight: 0,
      containedTop: 0,
      containedLeft: 0,
    };
  }
  // assume image is constrained by height
  // calculate width
  // assign left
  var ratio = img.naturalWidth / img.naturalHeight;
  var width = img.height * ratio;
  var height = img.height;
  var top = 0;
  var left = Math.abs(width - img.width) / 2;
  if (width > img.width) {
    // if image was actually constrained by width
    width = img.width;
    height = img.width / ratio;
    top = Math.abs(height - img.height) / 2;
    left = 0;
  }

  return {
    containedWidth: width,
    containedHeight: height,
    containedTop: top,
    containedLeft: left,
  };
}

// ----------------------------------------- code ------------------------------------------

function setTitle(title) {
  document.title = title + " - Image Reactor";
}

ipcRenderer.on("get-image", (args) => {
  if (args.action === "openResizeWindow") {
    args.size = {
      width: imgElement.naturalWidth,
      height: imgElement.naturalHeight,
    };
  }
  ipcRenderer.send("get-image-response", { image: imgElement.src, args: args });
});

ipcRenderer.on("image-filter", (args) => {
  undoImageSrc = imgElement.src;
  if (args.type === "crop") {
    args.selection = rectToSelection(rect);
    clearSelection();
  }
  filters.imageFilter(imgElement.src, args.type, args).then((imageUrl) => {
    imgElement.src = imageUrl;
  });
});

ipcRenderer.on("new-image", (x) => {
  imgElement.src = createImage(512, 512, "#000");
  setTitle("Image Reactor");
});

ipcRenderer.on("set-image", (x) => {
  imgElement.src = x.image;
  setTitle(x.filename);
});

ipcRenderer.on("set-title", (x) => {
console.log('running set title on')
console.log(x)
  setTitle(x.title);
});

ipcRenderer.on("setBackgroundColor", (x) => {
  imageBody.style.backgroundColor = x.color;
});


ipcRenderer.on("clipboard-copy", (x) => {
  // mac only
  preloadClipboard.copy(imgElement.src);
});

ipcRenderer.on("clipboard-paste", (x) => {
  // mac only
  var a= preloadClipboard.paste();

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    imgElement.src = dataUrl;
  };
  a=new Blob([a], {type:'image/png'})
  reader.readAsDataURL(a);

  setTitle('clipboard');
});

ipcRenderer.on("undo", (x) => {
  if(undoImageSrc) {
    imgElement.src = undoImageSrc;
    undoImageSrc = null;
  }
});

// windows only
document.addEventListener("copy", (event) => {
  imageToClipboardItem((item) => {
    navigator.clipboard
      .write([item])
      .then(() => {})
      .catch((error) => {
        console.error("Failed to copy image to clipboard:", error);
      });
  }, imgElement);
});

document.addEventListener("keydown", (event) => {
  let SPACE = 32,
    ENTER = 13,
    RIGHT = 39,
    LEFT = 37,
    F = 102;
  if (event.keyCode === SPACE) {
    ipcRenderer.send("next-image");
  }
  if (event.keyCode === RIGHT) {
    ipcRenderer.send("next-image");
  }
  if (event.keyCode === LEFT) {
    ipcRenderer.send("prev-image");
  }
  if (event.keyCode === F || event.keyCode === ENTER) {
    ipcRenderer.send("toggle-fullscreen");
  }
});

document.addEventListener("dragover", (event) => {
  event.preventDefault();
  // do nothing; required in order to handle 'drop'
});

document.addEventListener("drop", (event) => {
  event.preventDefault();
  for (const file of event.dataTransfer.files) {
    ipcRenderer.send("drag-and-drop-file", { filePath: file.path });
  }
});

// windows only
document.addEventListener("paste", (event) => {
  const item = getFirstItemInClipboard("image");
  if (!item) {
    console.log("no image to paste");
    return;
  }
  const blob = item.getAsFile();
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    imgElement.src = dataUrl;
  };
  reader.readAsDataURL(blob);
  setTitle("clipboard");
});



// ----------------------------------------------

window.addEventListener("resize", onWindowResized, false);

function onWindowResized() {
  var temp = getContainedSize(imgElement);

  canvas.width = temp.containedWidth;
  canvas.height = temp.containedHeight;
  canvas.style.top = temp.containedTop + "px";
  canvas.style.left = temp.containedLeft + "px";

  magnification = imgElement.naturalWidth / temp.containedWidth;
  draw();
}

function mouseDown(e) {
  rect.startX = e.pageX - this.offsetLeft;
  rect.startY = e.pageY - this.offsetTop;
  drag = true;
  moved = false;
}

function clearSelection() {
  rect.w = 0;
  rect.h = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function mouseUp() {
  drag = false;
  if (!moved) {
    clearSelection();
  }
}

function mouseMove(e) {
  if (drag) {
    moved = true;
    rect.w = e.pageX - this.offsetLeft - rect.startX;
    rect.h = e.pageY - this.offsetTop - rect.startY;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw();
  }
}

function draw() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fillRect(rect.startX, rect.startY, rect.w, rect.h);
  ctx.strokeRect(rect.startX, rect.startY, rect.w, rect.h);
}

imgElement.onload = () => {
  console.log("image loaded");

  var temp = getContainedSize(imgElement);

  canvas.width = temp.containedWidth;
  canvas.height = temp.containedHeight;
  canvas.style.top = temp.containedTop + "px";
  canvas.style.left = temp.containedLeft + "px";

  magnification = imgElement.naturalWidth / temp.containedWidth;
  draw();
};

canvas.addEventListener("mousedown", mouseDown, false);
canvas.addEventListener("mouseup", mouseUp, false);
canvas.addEventListener("mousemove", mouseMove, false);
