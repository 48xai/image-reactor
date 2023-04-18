function linkRangeSliderToTextbox(rangeSlider, textBox, initialValue) {
  rangeSlider.addEventListener("input", () => {
    textBox.value = rangeSlider.value;
  });
  textBox.addEventListener("change", () => {
    rangeSlider.value = textBox.value;
  });
  rangeSlider.value = textBox.value = initialValue;
}

function addRadioGroupEventListener(e, func) {
  for (let i = 0; i < e.length; i++) {
    e[i].addEventListener("change", func);
  }
}