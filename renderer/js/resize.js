const heightInput = document.getElementById("heightField");
const keepRatio = document.getElementById("useAspectRatio");
const originalHeightField = document.getElementById("originalHeightField");
const originalWidthField = document.getElementById("originalWidthField");
const resizeButton = document.getElementById("resizeButton");
const usePercentsGroup = document.getElementsByName("usePercent");
const widthInput = document.getElementById("widthField");

const usePercentPixels = document.getElementById("usePercentPixels");


var ORIGINAL_WIDTH = 0;
var ORIGINAL_HEIGHT = 0;
var ratio = 1.0;
var baseImage = null;



function init() {
  originalWidthField.innerText = ORIGINAL_WIDTH;
  originalHeightField.innerText = ORIGINAL_HEIGHT;
  ratio = ORIGINAL_WIDTH / ORIGINAL_HEIGHT;
  widthInput.value = ORIGINAL_WIDTH;
  heightInput.value = ORIGINAL_HEIGHT;
}

resizeButton.addEventListener("click", () => {
  var width = widthInput.value;
  var height = heightInput.value;
  if(!usePercentPixels.checked){
      width = percentToNumber(width);
      height = percentToNumber(height);
  }
  ipcMainWindow.send("image-filter", {
    type: "resize",
    size: {
      width: Number(width),
      height: Number(height),
    },
  });
  preload.closeCurrentWindow();
});

widthInput.addEventListener("input", () => {
  if (keepRatio.checked) {
    heightInput.value = Math.round(Number(widthInput.value) / ratio);
  }
});

heightInput.addEventListener("input", () => {
  if (keepRatio.checked) {
    widthInput.value = Math.round(Number(heightInput.value) * ratio);
  }
});

function numberToPercent(value, originalValue) {
  return (100.0 * value) / originalValue;
}

function percentToNumber(value, originalValue) {
  return Math.round(value * originalValue / 100.0);
}

addRadioGroupEventListener(usePercentsGroup, () => {
  if (usePercentPixels.checked) {
    widthInput.value = percentToNumber(widthInput.value, ORIGINAL_WIDTH);
    heightInput.value = percentToNumber(heightInput.value, ORIGINAL_HEIGHT);
  } else {
    widthInput.value = numberToPercent(widthInput.value, ORIGINAL_WIDTH);
    heightInput.value = numberToPercent(heightInput.value, ORIGINAL_HEIGHT);
  }
});

ipcRenderer.on("image-size", (args) => {
  console.log("got image size");
  ORIGINAL_WIDTH = args.size.width;
  ORIGINAL_HEIGHT = args.size.height;
  baseImage = args.image;
  init();
});
