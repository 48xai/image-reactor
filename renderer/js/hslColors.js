const hue = document.getElementById("hue");
const hueTextbox = document.getElementById("hue-value");
const luminosity = document.getElementById("luminosity");
const luminosityTextbox = document.getElementById("luminosity-value");
const okButton = document.getElementById("okButton");
const saturation = document.getElementById("saturation");
const saturationTextbox = document.getElementById("saturation-value");


linkRangeSliderToTextbox(hue, hueTextbox, 0);
linkRangeSliderToTextbox(saturation, saturationTextbox, 1);
linkRangeSliderToTextbox(luminosity, luminosityTextbox, 1);



okButton.addEventListener("click", () => {
  ipcMainWindow.send("image-filter", {
    type: "hsl",
    hue: Number(hue.value),
    saturation: Number(saturation.value),
    brightness: Number(luminosity.value),
  });
  preload.closeCurrentWindow();
});
