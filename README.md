# pdf-svg

A minimal, standalone PDF generator with SVG rendering, CMYK, LAB, and spot color support. This package provides a lightweight alternative to PDFKit for creating PDFs with vector graphics, focusing specifically on professional color workflows including CMYK, LAB, and spot colors.

## Features

- **Minimal and standalone** - No dependencies on PDFKit or SVG-to-PDFKit
- **TypeScript support** - Full type definitions included
- **CMYK color space** - Native support for CMYK colors
- **LAB color space** - Device-independent LAB color support with utilities
- **Spot colors** - Define and use CMYK and LAB spot colors (e.g., Pantone colors)
- **SVG parsing** - Parse and render SVG elements to PDF
- **Individual elements** - Each SVG element is rendered individually (not grouped)
- **Shape support** - Rectangle, circle, ellipse, and path support
- **Transformations** - Support for translate, scale, rotate, and matrix transforms

## What's NOT included

This package is intentionally minimal and does NOT include:

- RGB color export (all colors are converted to CMYK)
- Multiple pages
- Text rendering
- Font embedding
- Image support
- Filters
- Gradients

## Installation

```bash
npm install pdf-svg
```

## Usage

### Basic Example (JavaScript)

```javascript
import { PDFDocument } from "pdf-svg";
import fs from "fs";

// Create a new PDF document
const doc = new PDFDocument({
  width: 595.28, // A4 width in points
  height: 841.89, // A4 height in points
});

// Draw a rectangle with CMYK color
doc.rect(50, 50, 100, 50);
doc.fillColorCMYK(100, 0, 100, 0); // Cyan
doc.fill();

// Draw a circle
doc.circle(200, 75, 25);
doc.fillColorCMYK(0, 100, 100, 0); // Magenta
doc.fill();

// Generate PDF
const pdfData = doc.end();
fs.writeFileSync("output.pdf", pdfData);
```

### TypeScript Example

```typescript
import { PDFDocument, CMYKColor, SVGOptions } from "pdf-svg";
import fs from "fs";

// Create a new PDF document with type safety
const doc = new PDFDocument({
  width: 595.28,
  height: 841.89,
});

// Define spot color with proper typing
const pantoneRed: CMYKColor = { c: 0, m: 91, y: 76, k: 0 };
doc.defineSpotColor("PantoneRed", pantoneRed);

// Use spot color
doc.rect(50, 50, 100, 50);
doc.fillSpotColor("PantoneRed", 1.0);
doc.fill();

// SVG with options
const svgOptions: SVGOptions = {
  useCMYK: true,
  spotColorMap: {
    "#FF0000": { name: "PantoneRed", tint: 0.8 },
  },
};

const svg =
  '<svg><rect x="10" y="10" width="50" height="50" fill="#FF0000"/></svg>';
doc.addSVG(svg, 100, 100, svgOptions);

// Generate PDF
const pdfData: Buffer = doc.end();
fs.writeFileSync("output.pdf", pdfData);
```

### LAB Colors

```javascript
// Direct LAB colors (L*: 0-100, a*: -128 to 127, b*: -128 to 127)
doc.rect(50, 50, 100, 50);
doc.fillColorLab(53, 80, 67); // Vibrant red in LAB space
doc.fill();

// LAB spot colors
doc.defineLabSpotColorLab("BrandRed", 53, 80, 67);
doc.rect(200, 50, 100, 50);
doc.fillSpotColor("BrandRed", 1.0);
doc.fill();

// Color conversion utilities
import { LabColorUtility } from "pdf-svg/lab-color-utility";
const labUtil = new LabColorUtility();
const lab = labUtil.rgbToLab(255, 100, 50);
const rgb = labUtil.labToRgb(53, 80, 67);
```

### Spot Colors

```javascript
// Define CMYK spot colors with CMYK fallback
doc.defineSpotColor("Pantone 185 C", { c: 0, m: 91, y: 76, k: 0 });
doc.defineSpotColor("Gold", { c: 0, m: 20, y: 60, k: 20 });

// Define LAB spot colors with LAB fallback
doc.defineLabSpotColorLab("PreciseRed", 53, 80, 67);
doc.defineLabSpotColorLab("PreciseBlue", 32, 79, -107);

// Use spot colors
doc.circle(100, 100, 50);
doc.fillSpotColor("Pantone 185 C", 1.0); // 100% tint
doc.fill();

doc.rect(200, 75, 100, 50);
doc.fillSpotColor("Gold", 0.5); // 50% tint
doc.fill();
```

### SVG Rendering

```javascript
const svg = `
<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="80" height="40" fill="#FF0000"/>
  <circle cx="150" cy="30" r="20" fill="#00FF00"/>
</svg>
`;

// Add SVG with automatic CMYK conversion
doc.addSVG(svg, 50, 50, {
  useCMYK: true,
});

// Add SVG with spot color mapping
doc.addSVG(svg, 50, 200, {
  spotColorMap: {
    "#FF0000": { name: "Pantone 185 C", tint: 1.0 },
    "#00FF00": { name: "Gold", tint: 0.8 },
  },
});
```

### Paths and Transformations

```javascript
// Save current state
doc.save();

// Apply transformations
doc.translate(100, 100);
doc.rotate(Math.PI / 4); // 45 degrees
doc.scale(1.5, 1.5);

// Draw a path
doc.moveTo(0, 0);
doc.lineTo(50, 0);
doc.lineTo(50, 50);
doc.lineTo(0, 50);
doc.closePath();
doc.fillColorCMYK(50, 50, 0, 0);
doc.fill();

// Restore state
doc.restore();
```

## TypeScript Support

This package includes full TypeScript type definitions. Import types for better development experience:

```typescript
import {
  PDFDocument,
  PDFDocumentOptions,
  CMYKColor,
  SVGOptions,
  SpotColorInfo,
} from "pdf-svg";
```

### Key Types

- `PDFDocumentOptions` - Constructor options for PDFDocument
- `CMYKColor` - CMYK color values (c, m, y, k as numbers 0-100)
- `SVGOptions` - Options for SVG rendering
- `SpotColorInfo` - Spot color configuration

## API Reference

### PDFDocument

#### Constructor

```javascript
new PDFDocument(options);
```

- `options.width` - Page width in points (default: 595.28 - A4)
- `options.height` - Page height in points (default: 841.89 - A4)

#### Shape Methods

- `rect(x, y, width, height)` - Draw a rectangle
- `circle(cx, cy, r)` - Draw a circle
- `ellipse(cx, cy, rx, ry)` - Draw an ellipse

#### Path Methods

- `moveTo(x, y)` - Move to position
- `lineTo(x, y)` - Draw line to position
- `bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)` - Draw cubic bezier curve
- `quadraticCurveTo(cpx, cpy, x, y)` - Draw quadratic bezier curve
- `closePath()` - Close current path

#### Color Methods

- `fillColorCMYK(c, m, y, k)` - Set fill color in CMYK (0-100)
- `strokeColorCMYK(c, m, y, k)` - Set stroke color in CMYK (0-100)
- `defineSpotColor(name, cmykFallback)` - Define a spot color
- `fillSpotColor(name, tint)` - Set fill to spot color (tint: 0-1)
- `strokeSpotColor(name, tint)` - Set stroke to spot color

#### Drawing Operations

- `fill(fillRule)` - Fill current path (fillRule: 'nonzero' or 'evenodd')
- `stroke()` - Stroke current path
- `fillAndStroke(fillRule)` - Fill and stroke current path

#### Transformation Methods

- `save()` - Save graphics state
- `restore()` - Restore graphics state
- `translate(x, y)` - Translate coordinate system
- `scale(sx, sy)` - Scale coordinate system
- `rotate(angle, cx, cy)` - Rotate coordinate system (angle in radians)
- `transform(a, b, c, d, e, f)` - Apply transformation matrix

#### SVG Methods

- `addSVG(svg, x, y, options)` - Render SVG content
  - `svg` - SVG string or DOM element
  - `x, y` - Position to place SVG
  - `options.useCMYK` - Convert colors to CMYK
  - `options.spotColorMap` - Map colors to spot colors

#### Other Methods

- `lineWidth(width)` - Set line width
- `fillOpacity(opacity)` - Set fill opacity (0-1)
- `strokeOpacity(opacity)` - Set stroke opacity (0-1)
- `end()` - Generate PDF and return as Uint8Array

## License

MIT

## Working with Millimeter Dimensions

PDF documents use points as their base unit (1 point = 1/72 inch), but for print design, millimeters are often more practical. Here's how to work with mm dimensions:

### Converting mm to Points

```js
// Helper function to convert millimeters to points
const mm = (val) => val * 2.835; // 1mm = 2.835 points

// Common paper sizes in mm
const A4 = { width: mm(210), height: mm(297) };
const A3 = { width: mm(297), height: mm(420) };
const Letter = { width: mm(215.9), height: mm(279.4) };
```

### Complete Example with mm Dimensions

```js
import { PDFDocument } from "pdf-svg";
import fs from "fs";

// Helper: mm to points
const mm = (val) => val * 2.835;

// Create a custom-sized PDF (500mm x 300mm landscape)
const doc = new PDFDocument({
  width: mm(500), // 500mm wide
  height: mm(300), // 300mm tall
});

// Example 1: Background with 10mm margins
doc.rect(mm(10), mm(10), mm(480), mm(280)); // 10mm margin on all sides
doc.fillColorCMYK(20, 20, 20, 100);
doc.fill();

// Example 2: Precise positioning with mm
const logoX = mm(25); // 25mm from left
const logoY = mm(250); // 250mm from bottom
const logoWidth = mm(50); // 50mm wide
const logoHeight = mm(30); // 30mm tall

doc.rect(logoX, logoY, logoWidth, logoHeight);
doc.fillColorCMYK(0, 100, 100, 0); // Magenta
doc.fill();

// Example 3: Grid layout using mm
const gridSpacing = mm(20);
const gridSize = mm(15);

for (let x = 0; x < 5; x++) {
  for (let y = 0; y < 3; y++) {
    const posX = mm(50) + x * gridSpacing;
    const posY = mm(50) + y * gridSpacing;

    doc.circle(posX, posY, gridSize / 2);
    doc.fillColorCMYK(0, 0, 100, 0); // Yellow
    doc.fill();
  }
}

// Example 4: SVG with mm positioning
const svgContent = `<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="blue"/>
</svg>`;

doc.addSVG(svgContent, mm(200), mm(150), {
  width: mm(80), // 80mm wide
  height: mm(80), // 80mm tall
  useCMYK: true,
  colorCallback: () => ({ c: 100, m: 50, y: 0, k: 0 }), // Custom blue
});

// Example 5: Text area with mm margins (conceptual - no text support yet)
const textAreaX = mm(300);
const textAreaY = mm(50);
const textAreaWidth = mm(150);
const textAreaHeight = mm(200);

doc.rect(textAreaX, textAreaY, textAreaWidth, textAreaHeight);
doc.strokeColorCMYK(0, 0, 0, 100);
doc.lineWidth(mm(0.5)); // 0.5mm line width
doc.stroke();

// Output the PDF
const pdfData = doc.end();
fs.writeFileSync("output.pdf", pdfData);
```

### Common Paper Sizes and Layouts

```js
// Standard paper sizes in mm
const paperSizes = {
  A4: { width: mm(210), height: mm(297) },
  A3: { width: mm(297), height: mm(420) },
  A5: { width: mm(148), height: mm(210) },
  Letter: { width: mm(215.9), height: mm(279.4) },
  Legal: { width: mm(215.9), height: mm(355.6) },
  Tabloid: { width: mm(279.4), height: mm(431.8) },
};

// Business card (standard 85mm x 55mm)
const businessCard = new PDFDocument({
  width: mm(85),
  height: mm(55),
});

// Poster (A1 size)
const poster = new PDFDocument({
  width: mm(594), // A1 width
  height: mm(841), // A1 height
});
```

### Bleed and Safe Areas

```js
// A4 with 3mm bleed
const bleed = mm(3);
const safeMargin = mm(5);

const doc = new PDFDocument({
  width: mm(210) + bleed * 2, // 216mm total width
  height: mm(297) + bleed * 2, // 303mm total height
});

// Bleed area (extends beyond page)
doc.rect(0, 0, mm(216), mm(303));
doc.fillColorCMYK(0, 0, 0, 5); // Light gray bleed
doc.fill();

// Trim area (actual page size)
doc.rect(bleed, bleed, mm(210), mm(297));
doc.strokeColorCMYK(0, 0, 0, 100);
doc.lineWidth(mm(0.1));
doc.stroke();

// Safe area (content should stay within this)
doc.rect(
  bleed + safeMargin,
  bleed + safeMargin,
  mm(210) - safeMargin * 2,
  mm(297) - safeMargin * 2
);
doc.strokeColorCMYK(0, 100, 0, 0); // Magenta guide
doc.lineWidth(mm(0.1));
doc.stroke();
```

### Precise Measurements and Alignment

```js
// Center elements precisely
const pageWidth = mm(210);
const pageHeight = mm(297);
const elementWidth = mm(80);
const elementHeight = mm(60);

const centerX = (pageWidth - elementWidth) / 2;
const centerY = (pageHeight - elementHeight) / 2;

doc.rect(centerX, centerY, elementWidth, elementHeight);

// Create margins and gutters
const margin = mm(20);
const gutter = mm(5);
const columnWidth = (pageWidth - margin * 2 - gutter) / 2;

// Left column
doc.rect(margin, margin, columnWidth, mm(100));

// Right column
doc.rect(margin + columnWidth + gutter, margin, columnWidth, mm(100));
```

**Key Points:**

- Always use `useCMYK: true` in `addSVG` to ensure all SVG colors are converted to CMYK.
- Use `colorCallback` to override SVG colors in code instead of modifying the SVG.
- Use millimeters for all dimensions by converting to points (`mm(val)`).
- Spot colors can be defined and used for strokes or fills.
- All numbers are automatically validated and formatted to prevent "Too few operands" errors.
- Consider bleed areas (typically 3mm) for print-ready documents.
- Use safe margins (typically 5mm) to ensure content doesn't get cut off.

### Alternative Ways to Set SVG Colors in Code

#### Method 1: Color Callback (Override All Colors)

```js
doc.addSVG(svgContent, x, y, {
  useCMYK: true,
  colorCallback: (color) => {
    return "white"; // Force all colors to white
  },
});
```

#### Method 2: Spot Color Mapping

```js
// Define spot colors first
doc.defineSpotColor("knockout", { c: 0, m: 0, y: 0, k: 0 });

doc.addSVG(svgContent, x, y, {
  useCMYK: true,
  spotColorMap: {
    black: { name: "knockout", tint: 1.0 }, // Map default black to white
    "#000000": { name: "knockout", tint: 1.0 },
  },
});
```

#### Method 3: Conditional Color Callback

```js
doc.addSVG(svgContent, x, y, {
  useCMYK: true,
  colorCallback: (color) => {
    if (color === "black" || color === "#000000") {
      return "white"; // Convert black to white
    }
    return color; // Keep other colors unchanged
  },
});
```

#### Method 4: Custom CMYK Colors

```js
doc.addSVG(svgContent, x, y, {
  useCMYK: true,
  colorCallback: (color) => {
    // Return a custom CMYK color as an object
    return { c: 10, m: 50, y: 80, k: 5 }; // Custom CMYK values
  },
});
```

#### Method 5: Custom Spot Color

```js
// Define your custom spot color first
doc.defineSpotColor("custom-blue", { c: 85, m: 50, y: 0, k: 0 });

doc.addSVG(svgContent, x, y, {
  useCMYK: true,
  spotColorMap: {
    black: { name: "custom-blue", tint: 1.0 },
    "#000000": { name: "custom-blue", tint: 0.8 }, // 80% tint
  },
});
```

#### Method 6: Multiple Custom Colors

```js
doc.addSVG(svgContent, x, y, {
  useCMYK: true,
  colorCallback: (color) => {
    switch (color) {
      case "black":
      case "#000000":
        return { c: 0, m: 0, y: 0, k: 0 }; // White knockout
      case "red":
      case "#FF0000":
        return { c: 0, m: 100, y: 100, k: 0 }; // Pure red in CMYK
      case "blue":
      case "#0000FF":
        return { c: 100, m: 100, y: 0, k: 0 }; // Pure blue in CMYK
      default:
        return color; // Keep other colors unchanged
    }
  },
});
```
