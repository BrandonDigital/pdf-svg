# LAB Color Support Guide

Your PDF-SVG package now supports LAB color space in addition to RGB, CMYK, and spot colors. LAB color space provides device-independent, perceptually uniform colors that offer better color accuracy and a wider color gamut.

## What is LAB Color Space?

LAB color space consists of three components:

- **L\*** (Lightness): 0-100 (black to white)
- **a\***: -128 to +127 (green to red)
- **b\***: -128 to +127 (blue to yellow)

LAB colors are device-independent and provide consistent color reproduction across different devices and media.

## Basic LAB Color Usage

### Direct LAB Colors

```javascript
import { PDFDocument } from "./src/index.js";

const doc = new PDFDocument();

// Fill with LAB color
doc.rect(50, 50, 100, 50);
doc.fillColorLab(53, 80, 67); // Vibrant red
doc.fill();

// Stroke with LAB color
doc.rect(200, 50, 100, 50);
doc.strokeColorLab(32, 79, -107); // Vibrant blue
doc.lineWidth(3);
doc.stroke();

// Fill and stroke with different LAB colors
doc.rect(350, 50, 100, 50);
doc.fillColorLab(87, -86, 83); // Vibrant green
doc.strokeColorLab(74, 23, 78); // Orange
doc.lineWidth(2);
doc.fillAndStroke();
```

### LAB Spot Colors

```javascript
// Define LAB spot colors
doc.defineLabSpotColorLab("BrandRed", 53, 80, 67);
doc.defineLabSpotColorLab("BrandGreen", 87, -86, 83);
doc.defineLabSpotColorLab("BrandBlue", 32, 79, -107);

// Use LAB spot colors
doc.rect(50, 150, 100, 50);
doc.fillSpotColor("BrandRed", 1.0); // Full tint
doc.fill();

doc.rect(200, 150, 100, 50);
doc.fillSpotColor("BrandGreen", 0.5); // 50% tint
doc.fill();

// Alternative definition method
doc.defineLabSpotColor("CustomOrange", { L: 74, a: 23, b: 78 });
```

## Color Conversion Utilities

The package includes a `LabColorUtility` class for color conversions and manipulations:

```javascript
import { LabColorUtility } from "./lab-color-utility.js";

const labUtil = new LabColorUtility();

// Convert RGB to LAB
const lab = labUtil.rgbToLab(255, 100, 50);
console.log(`LAB: L=${lab.L}, a=${lab.a}, b=${lab.b}`);

// Convert LAB to RGB
const rgb = labUtil.labToRgb(53, 80, 67);
console.log(`RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}`);

// Convert hex to LAB
const labFromHex = labUtil.hexToLab("#FF6432");

// Convert LAB to hex
const hex = labUtil.labToHex(53, 80, 67);
```

## Common LAB Colors

The utility provides common LAB color constants:

```javascript
import { LabColorUtility } from "./lab-color-utility.js";

// Access predefined colors
const red = LabColorUtility.COLORS.RED; // L=53, a=80, b=67
const green = LabColorUtility.COLORS.GREEN; // L=87, a=-86, b=83
const blue = LabColorUtility.COLORS.BLUE; // L=32, a=79, b=-107
const cyan = LabColorUtility.COLORS.CYAN; // L=91, a=-48, b=-14
const magenta = LabColorUtility.COLORS.MAGENTA; // L=60, a=98, b=-60
const yellow = LabColorUtility.COLORS.YELLOW; // L=97, a=-21, b=94

// Use in your PDF
doc.fillColorLab(red.L, red.a, red.b);
```

## Advanced LAB Features

### Color Difference Calculation

Calculate perceptual color differences using Delta E:

```javascript
const color1 = { L: 53, a: 80, b: 67 };
const color2 = { L: 55, a: 75, b: 65 };
const deltaE = labUtil.deltaE(color1, color2);

console.log(`Color difference: ${deltaE.toFixed(2)}`);
console.log(`Perceptible: ${deltaE > 2.3 ? "Yes" : "No"}`);
```

### Color Palette Generation

Generate harmonious color palettes:

```javascript
// Generate 8 colors with lightness=60 and chroma=50
const palette = labUtil.generatePalette(60, 50, 8);

palette.forEach((color, index) => {
  doc.rect(50 + index * 60, 250, 50, 50);
  doc.fillColorLab(color.L, color.a, color.b);
  doc.fill();
});
```

### Color Gradients

Create smooth color transitions:

```javascript
const startColor = LabColorUtility.COLORS.BLUE;
const endColor = LabColorUtility.COLORS.ORANGE;
const gradient = labUtil.createGradient(startColor, endColor, 10);

gradient.forEach((color, index) => {
  doc.rect(50 + index * 50, 350, 45, 50);
  doc.fillColorLab(color.L, color.a, color.b);
  doc.fill();
});
```

### Color Adjustments

Modify existing LAB colors:

```javascript
const baseColor = LabColorUtility.COLORS.RED;

// Adjust lightness
const lighter = labUtil.adjustLightness(baseColor, 20);
const darker = labUtil.adjustLightness(baseColor, -20);

// Adjust chroma (colorfulness)
const moreVibrant = labUtil.adjustChroma(baseColor, 1.5);
const lessSaturated = labUtil.adjustChroma(baseColor, 0.5);

// Get complementary color
const complement = labUtil.getComplementary(baseColor);
```

## Mixed Color Spaces

LAB colors work seamlessly with other color spaces:

```javascript
// LAB fill with CMYK stroke
doc.rect(50, 50, 100, 50);
doc.fillColorLab(74, 23, 78); // Orange in LAB
doc.strokeColorCMYK(0, 50, 100, 0); // Yellow stroke in CMYK
doc.lineWidth(2);
doc.fillAndStroke();

// RGB fill with LAB stroke
doc.rect(200, 50, 100, 50);
doc.fillColor(255, 100, 150); // Pink in RGB
doc.strokeColorLab(32, 79, -107); // Blue stroke in LAB
doc.lineWidth(2);
doc.fillAndStroke();
```

## SVG Processing with LAB Colors

Use LAB colors in SVG processing with color callbacks:

```javascript
const svgContent = `
<svg width="200" height="100">
  <rect x="10" y="10" width="50" height="30" fill="red"/>
  <circle cx="100" cy="25" r="15" fill="green"/>
</svg>`;

doc.addSVG(svgContent, 50, 450, {
  colorCallback: (color) => {
    if (color.toLowerCase() === "red") {
      return { type: "lab", L: 53, a: 80, b: 67 };
    }
    if (color.toLowerCase() === "green") {
      return { type: "lab", L: 87, a: -86, b: 83 };
    }
    return color;
  },
});
```

## Benefits of LAB Colors

1. **Device Independence**: Colors look consistent across different devices
2. **Perceptual Uniformity**: Equal distances in LAB space represent equal perceptual differences
3. **Wide Gamut**: LAB can represent colors outside the RGB and CMYK gamuts
4. **Professional Printing**: Better color accuracy for high-end printing workflows
5. **Color Matching**: More accurate color matching and reproduction

## API Reference

### PDFDocument Methods

- `fillColorLab(L, a, b)` - Set fill color in LAB space
- `strokeColorLab(L, a, b)` - Set stroke color in LAB space
- `defineLabSpotColorLab(name, L, a, b)` - Define LAB spot color
- `defineLabSpotColor(name, {L, a, b})` - Define LAB spot color (object syntax)

### LabColorUtility Methods

- `rgbToLab(r, g, b)` - Convert RGB (0-255) to LAB
- `labToRgb(L, a, b)` - Convert LAB to RGB (0-255)
- `hexToLab(hex)` - Convert hex string to LAB
- `labToHex(L, a, b)` - Convert LAB to hex string
- `deltaE(lab1, lab2)` - Calculate color difference
- `generatePalette(lightness, chroma, count)` - Generate color palette
- `createGradient(startLab, endLab, steps)` - Create color gradient
- `adjustLightness(lab, amount)` - Adjust color lightness
- `adjustChroma(lab, factor)` - Adjust color saturation
- `getComplementary(lab)` - Get complementary color

## Examples

See the following example files:

- `example-lab-colors.js` - Comprehensive LAB color demonstration
- `test-lab-colors.js` - Test suite for LAB functionality
- `lab-color-utility.js` - Utility functions and examples

## Color Value Ranges

- **L\* (Lightness)**: 0 to 100 (automatically clamped)
- **a\* (Green-Red)**: -128 to +127 (automatically clamped)
- **b\* (Blue-Yellow)**: -128 to +127 (automatically clamped)

Values outside these ranges are automatically clamped to valid values.
