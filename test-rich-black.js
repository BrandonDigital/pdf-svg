import { PDFDocument } from "./src/index.js";
import {
  addSVGWithRichBlack,
  RICH_BLACK,
  createRichBlackCallback,
} from "./rich-black-utility.js";
import fs from "fs";

// Helper function to convert millimeters to points
const mm = (val) => val * 2.835;

// Create a new PDF document
const doc = new PDFDocument({
  width: mm(210), // A4 width
  height: mm(297), // A4 height
});

// Test SVG with black elements
const testSVG = `
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="30" height="30" fill="black"/>
  <path d="M 50 10 L 80 10 L 80 40 L 50 40 Z" fill="#000000"/>
  <circle cx="25" cy="70" r="15" fill="rgb(0,0,0)"/>
</svg>
`;

// Method 1: Using the utility function (easiest)
addSVGWithRichBlack(doc, testSVG, mm(20), mm(200));

// Method 2: Using the color callback directly
doc.addSVG(testSVG, mm(120), mm(200), {
  useCMYK: true,
  colorCallback: createRichBlackCallback(RICH_BLACK),
});

// Method 3: Custom CMYK values (your specific rich black: 0.2, 0.2, 0.2, 1)
const customRichBlack = { c: 20, m: 20, y: 20, k: 100 };
doc.addSVG(testSVG, mm(20), mm(100), {
  useCMYK: true,
  colorCallback: (color) => {
    const colorLower = color.toLowerCase();
    if (
      colorLower === "black" ||
      colorLower === "#000000" ||
      colorLower === "#000" ||
      colorLower === "rgb(0,0,0)"
    ) {
      return customRichBlack;
    }
    return color;
  },
});

// Generate and save the PDF
const pdfData = doc.end();
fs.writeFileSync("test-rich-black.pdf", pdfData);

console.log("Rich black test PDF created: test-rich-black.pdf");
console.log("CMYK values used: C=20%, M=20%, Y=20%, K=100%");
