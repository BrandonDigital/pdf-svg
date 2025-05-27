# pdf-svg

A minimal, standalone PDF generator with SVG rendering, CMYK and spot color support. This package provides a lightweight alternative to PDFKit for creating PDFs with vector graphics, focusing specifically on CMYK and spot color workflows.

## Features

- **Minimal and standalone** - No dependencies on PDFKit or SVG-to-PDFKit
- **TypeScript support** - Full type definitions included
- **CMYK color space** - Native support for CMYK colors
- **Spot colors** - Define and use spot colors (e.g., Pantone colors)
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

### Spot Colors

```javascript
// Define spot colors with CMYK fallback
doc.defineSpotColor("Pantone 185 C", { c: 0, m: 91, y: 76, k: 0 });
doc.defineSpotColor("Gold", { c: 0, m: 20, y: 60, k: 20 });

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

## Usage Example: CMYK PDF with SVG Paths and mm Units

```js
import { PDFDocument } from "pdf-svg";
import fs from "fs";

// Helper: mm to points
const mm = (val) => val * 2.835;

// SVG path for the character 'a' (no fill specified)
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37.85 54.14">
  <path d="M.01,53.64L12.02.32c.04-.19.21-.32.4-.32h12.88c.19,0,.36.13.4.32l12.12,53.32c.06.26-.14.5-.4.5h-10.01c-.2,0-.36-.14-.4-.33l-2.54-12.94c-.04-.19-.21-.33-.4-.33h-10.93c-.2,0-.37.14-.4.33l-2.47,12.94c-.04.19-.21.33-.4.33H.41c-.26,0-.46-.24-.4-.5ZM14.62,32.41h8.1c.12,0,.22-.11.2-.24l-4.08-21.44c-.04-.22-.35-.22-.39,0l-4.02,21.44c-.02.12.07.24.2.24Z"/>
</svg>
`;

// Create a PDF document sized 500mm x 300mm
const doc = new PDFDocument({
  width: mm(500),
  height: mm(300),
});

// Draw a CMYK background rectangle
doc.rect(0, 0, mm(500), mm(300));
doc.fillColorCMYK(20, 20, 20, 100);
doc.fill();

// Draw a rectangle with a spot color stroke
doc.defineSpotColor("thru-cut", { c: 88, m: 30, y: 0, k: 0 });
doc.rect(mm(10), mm(10), mm(480), mm(280));
doc.strokeSpotColor("thru-cut");
doc.lineWidth(2);
doc.stroke();

// Add SVG in the center, using only CMYK colors
const centerX = mm(500) / 2;
const centerY = mm(300) / 2;
doc.addSVG(svgContent, centerX - 50, centerY - 70, {
  width: 100,
  height: 140,
  useCMYK: true, // Ensures all SVG colors are converted to CMYK
  colorCallback: (color) => {
    // Override any color with white (CMYK knockout)
    return "white";
  },
});

// Output the PDF
const pdfData = doc.end();
fs.writeFileSync("output.pdf", pdfData);
```

**Key Points:**

- Always use `useCMYK: true` in `addSVG` to ensure all SVG colors are converted to CMYK.
- Use `colorCallback` to override SVG colors in code instead of modifying the SVG.
- Use millimeters for all dimensions by converting to points (`mm(val)`).
- Spot colors can be defined and used for strokes or fills.
- All numbers are automatically validated and formatted to prevent "Too few operands" errors.

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
