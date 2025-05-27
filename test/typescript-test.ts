import {
  PDFDocument,
  CMYKColor,
  SVGOptions,
  PDFDocumentOptions,
} from "../src/index.js";

// Test type definitions
const options: PDFDocumentOptions = {
  width: 595.28,
  height: 841.89,
};

const doc = new PDFDocument(options);

// Test CMYK color typing
const pantoneRed: CMYKColor = { c: 0, m: 91, y: 76, k: 0 };
doc.defineSpotColor("PantoneRed", pantoneRed);

// Test method chaining with proper return types
doc
  .rect(50, 50, 100, 50)
  .fillColorCMYK(100, 0, 0, 0)
  .fill()
  .circle(200, 75, 25)
  .fillSpotColor("PantoneRed", 1.0)
  .fill();

// Test SVG options typing
const svgOptions: SVGOptions = {
  useCMYK: true,
  spotColorMap: {
    "#FF0000": { name: "PantoneRed", tint: 0.8 },
  },
  colorCallback: (color: string) => (color === "#FF0000" ? "#00FF00" : null),
};

const svg =
  '<svg><rect x="10" y="10" width="50" height="50" fill="#FF0000"/></svg>';
doc.addSVG(svg, 100, 100, svgOptions);

// Test transformation methods
doc
  .save()
  .translate(100, 100)
  .rotate(Math.PI / 4)
  .scale(1.5)
  .restore();

// Test PDF generation
const pdfData: Buffer = doc.end();

console.log(
  "TypeScript types work correctly! PDF size:",
  pdfData.length,
  "bytes"
);
