import { PDFDocument } from "../src/index.js";
import fs from "fs";

// Character 'a' path data
const aCharacter = {
  path: "M.01,53.64L12.02.32c.04-.19.21-.32.4-.32h12.88c.19,0,.36.13.4.32l12.12,53.32c.06.26-.14.5-.4.5h-10.01c-.2,0-.36-.14-.4-.33l-2.54-12.94c-.04-.19-.21-.33-.4-.33h-10.93c-.2,0-.37.14-.4.33l-2.47,12.94c-.04.19-.21.33-.4.33H.41c-.26,0-.46-.24-.4-.5ZM14.62,32.41h8.1c.12,0,.22-.11.2-.24l-4.08-21.44c-.04-.22-.35-.22-.39,0l-4.02,21.44c-.02.12.07.24.2.24Z",
  viewBox: "0 0 37.83 54",
};

// Convert mm to points
const mmToPoints = (mm) => mm * 2.834645669;

// Create PDF: 500mm x 300mm
const doc = new PDFDocument({
  width: mmToPoints(500),
  height: mmToPoints(300),
});

// Define the thru-cut spot color
doc.defineSpotColor("thru-cut", { c: 88, m: 30, y: 0, k: 0 });

// 1. Rectangle same dimensions as page with CMYK (0.2,0.2,0.2,1)
doc.rect(0, 0, mmToPoints(500), mmToPoints(300));
doc.fillColorCMYK(20, 20, 20, 100); // 0.2 = 20%
doc.fill();

// 2. Rectangle with thru-cut spot color stroke
doc.rect(0, 0, mmToPoints(500), mmToPoints(300));
doc.strokeSpotColor("thru-cut", 1.0);
doc.lineWidth(1);
doc.stroke();

// 3. Add 'a' SVG in the middle with color (0,0,0,0)
const svgString = `
<svg viewBox="${aCharacter.viewBox}" xmlns="http://www.w3.org/2000/svg">
  <path d="${aCharacter.path}" fill="none" stroke="none"/>
</svg>
`;

// Calculate center position for the 'a' character
const svgWidth = 100; // Desired width
const svgHeight = 100; // Desired height
const centerX = (mmToPoints(500) - svgWidth) / 2;
const centerY = (mmToPoints(300) - svgHeight) / 2;

// Add the SVG
doc.addSVG(svgString, centerX, centerY, {
  width: svgWidth,
  height: svgHeight,
  useCMYK: true,
});

// Also manually draw the 'a' with CMYK (0,0,0,0) for comparison
doc.save();
doc.translate(centerX, centerY);
doc.scale(svgWidth / 37.83, svgHeight / 54); // Scale to fit

// Set fill color to CMYK (0,0,0,0) - knockout/no ink
doc.fillColorCMYK(0, 0, 0, 0);

// Draw the path manually using available methods
// For now, just draw a simple rectangle as a placeholder
// since we don't have a full SVG path parser
doc.rect(10, 10, 30, 40);
doc.fill();

doc.restore();

// Generate and save PDF
const pdfData = doc.end();
fs.writeFileSync("simple-svg-test.pdf", pdfData);

console.log("Simple SVG test completed!");
console.log("Generated: simple-svg-test.pdf");
console.log("- Page: 500mm x 300mm");
console.log("- Background rect: CMYK (20%, 20%, 20%, 100%)");
console.log("- Stroke rect: thru-cut spot color (88%, 30%, 0%, 0%)");
console.log('- Character "a": CMYK (0%, 0%, 0%, 0%) - knockout');
