# Rich Black CMYK Colors in PDF-SVG

This guide shows you how to set rich black CMYK colors (C=20%, M=20%, Y=20%, K=100%) for SVG path, rect, and other fill elements in your PDF-SVG library.

## What is Rich Black?

Rich black is a printing technique that uses a combination of CMYK colors to create a deeper, richer black than using 100% black (K) alone. The standard rich black formula is:

- **C=20%, M=20%, Y=20%, K=100%**

This creates a much more vibrant black that's ideal for print production.

## Quick Start

### Method 1: Using the Utility Function (Easiest)

```javascript
import { PDFDocument } from "./src/index.js";
import { addSVGWithRichBlack } from "./rich-black-utility.js";

const doc = new PDFDocument();
const svg = '<rect fill="black" width="100" height="50"/>';

// This automatically converts all black colors to rich black
addSVGWithRichBlack(doc, svg, 50, 50);
```

### Method 2: Using Color Callback

```javascript
import { PDFDocument } from "./src/index.js";

const doc = new PDFDocument();
const richBlack = { c: 20, m: 20, y: 20, k: 100 };

doc.addSVG(svgContent, x, y, {
  useCMYK: true,
  colorCallback: (color) => {
    const colorLower = color.toLowerCase();

    // Convert black colors to rich black
    if (
      colorLower === "black" ||
      colorLower === "#000000" ||
      colorLower === "#000" ||
      colorLower === "rgb(0,0,0)"
    ) {
      return richBlack;
    }

    return color; // Keep other colors unchanged
  },
});
```

### Method 3: Using Spot Colors

```javascript
import { PDFDocument } from "./src/index.js";

const doc = new PDFDocument();

// Define rich black as a spot color
doc.defineSpotColor("RichBlack", { c: 20, m: 20, y: 20, k: 100 });

doc.addSVG(svgContent, x, y, {
  spotColorMap: {
    black: { name: "RichBlack", tint: 1.0 },
    "#000000": { name: "RichBlack", tint: 1.0 },
    "#000": { name: "RichBlack", tint: 1.0 },
  },
});
```

## Complete Examples

### Example 1: Basic Rich Black Conversion

```javascript
import { PDFDocument } from "./src/index.js";
import fs from "fs";

const mm = (val) => val * 2.835; // Convert mm to points

const doc = new PDFDocument({
  width: mm(210), // A4 width
  height: mm(297), // A4 height
});

const svg = `
<svg width="200" height="100">
  <rect x="10" y="10" width="80" height="40" fill="black"/>
  <path d="M 100 10 L 180 10 L 180 50 L 100 50 Z" fill="#000000"/>
  <circle cx="50" cy="70" r="20" fill="rgb(0,0,0)"/>
</svg>
`;

// Rich black CMYK values
const richBlack = { c: 20, m: 20, y: 20, k: 100 };

doc.addSVG(svg, mm(20), mm(200), {
  useCMYK: true,
  colorCallback: (color) => {
    const colorLower = color.toLowerCase();

    // List of black color formats to convert
    const blackFormats = [
      "black",
      "#000000",
      "#000",
      "rgb(0,0,0)",
      "rgb(0, 0, 0)",
    ];

    if (blackFormats.includes(colorLower)) {
      return richBlack;
    }

    return color;
  },
});

const pdfData = doc.end();
fs.writeFileSync("rich-black.pdf", pdfData);
```

### Example 2: Multiple Rich Black Variations

```javascript
import { PDFDocument } from "./src/index.js";
import {
  RICH_BLACK_VARIATIONS,
  createRichBlackCallback,
} from "./rich-black-utility.js";

const doc = new PDFDocument();

// Standard rich black
doc.addSVG(svg, 50, 200, {
  useCMYK: true,
  colorCallback: createRichBlackCallback(RICH_BLACK_VARIATIONS.standard),
});

// Warm rich black (more magenta/yellow)
doc.addSVG(svg, 200, 200, {
  useCMYK: true,
  colorCallback: createRichBlackCallback(RICH_BLACK_VARIATIONS.warm),
});

// Cool rich black (more cyan)
doc.addSVG(svg, 350, 200, {
  useCMYK: true,
  colorCallback: createRichBlackCallback(RICH_BLACK_VARIATIONS.cool),
});
```

### Example 3: Convert ALL Colors to Rich Black

```javascript
import { PDFDocument } from "./src/index.js";

const doc = new PDFDocument();
const richBlack = { c: 20, m: 20, y: 20, k: 100 };

// This will convert EVERY color in the SVG to rich black
doc.addSVG(svgContent, x, y, {
  useCMYK: true,
  colorCallback: (color) => {
    return richBlack; // Force everything to rich black
  },
});
```

### Example 4: Conditional Color Conversion

```javascript
import { PDFDocument } from "./src/index.js";

const doc = new PDFDocument();

doc.addSVG(svgContent, x, y, {
  useCMYK: true,
  colorCallback: (color) => {
    const colorLower = color.toLowerCase();

    // Rich black for pure black
    if (colorLower === "black" || colorLower === "#000000") {
      return { c: 20, m: 20, y: 20, k: 100 };
    }

    // Lighter rich black for dark grays
    if (colorLower === "#333333" || colorLower === "#333") {
      return { c: 15, m: 15, y: 15, k: 80 };
    }

    // Keep other colors unchanged
    return color;
  },
});
```

## Direct CMYK Drawing (Non-SVG)

You can also draw shapes directly with rich black:

```javascript
import { PDFDocument } from "./src/index.js";

const doc = new PDFDocument();

// Draw rectangle with rich black fill
doc.rect(50, 50, 100, 50);
doc.fillColorCMYK(20, 20, 20, 100); // Rich black
doc.fill();

// Draw circle with rich black fill
doc.circle(200, 75, 25);
doc.fillColorCMYK(20, 20, 20, 100); // Rich black
doc.fill();

// Draw path with rich black stroke
doc.moveTo(300, 50);
doc.lineTo(400, 50);
doc.lineTo(400, 100);
doc.strokeColorCMYK(20, 20, 20, 100); // Rich black
doc.lineWidth(2);
doc.stroke();
```

## Rich Black Variations

Different rich black formulas for different effects:

```javascript
const richBlackVariations = {
  // Standard rich black
  standard: { c: 20, m: 20, y: 20, k: 100 },

  // Warm rich black (more red/yellow)
  warm: { c: 15, m: 25, y: 25, k: 100 },

  // Cool rich black (more cyan)
  cool: { c: 25, m: 15, y: 15, k: 100 },

  // Heavy rich black (more coverage)
  heavy: { c: 30, m: 30, y: 30, k: 100 },

  // Light rich black (for smaller text)
  light: { c: 10, m: 10, y: 10, k: 100 },
};
```

## Tips and Best Practices

1. **Use rich black for large areas**: Rich black is most effective for large filled areas, backgrounds, and thick text.

2. **Avoid rich black for thin lines**: For thin lines or small text, use 100% black (K=100) to avoid registration issues.

3. **Check your printer specifications**: Some printers have specific rich black recommendations.

4. **Test your output**: Always test print your PDFs to ensure the rich black appears as expected.

5. **Consider ink coverage**: Rich black uses more ink, so factor this into your printing costs.

## Troubleshooting

### Colors not converting?

- Make sure you're using `useCMYK: true` in your SVG options
- Check that your color formats match the ones in your callback function
- Verify that your SVG elements actually have the fill colors you expect

### PDF not generating?

- Ensure all your import paths are correct
- Check that you're calling `doc.end()` to generate the PDF
- Verify that your CMYK values are in the correct range (0-100)

### Rich black not appearing rich enough?

- Try increasing the CMY values (e.g., C=30, M=30, Y=30, K=100)
- Check your PDF viewer - some viewers don't accurately display CMYK colors
- Test with actual printing to see the true rich black effect

## Color Format Support

The color callback will catch these black color formats:

- `"black"`
- `"#000000"`
- `"#000"`
- `"rgb(0,0,0)"`
- `"rgb(0, 0, 0)"`
- `"rgba(0,0,0,1)"`
- `"rgba(0, 0, 0, 1)"`

Add more formats to your callback function as needed for your specific SVG content.
