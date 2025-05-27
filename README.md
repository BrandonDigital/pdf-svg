# pdf-svg

A minimal, standalone PDF generator with SVG rendering, CMYK and spot color support. This package provides a lightweight alternative to PDFKit for creating PDFs with vector graphics, focusing specifically on CMYK and spot color workflows.

## Features

- **Minimal and standalone** - No dependencies on PDFKit or SVG-to-PDFKit
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

### Basic Example

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
