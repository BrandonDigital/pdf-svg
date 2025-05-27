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

console.log(`Creating PDF: ${mmToPoints(500)} x ${mmToPoints(300)} points`);

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

// 3. Create a proper SVG for the 'a' character with white fill
const svgString = `
<svg viewBox="${aCharacter.viewBox}" xmlns="http://www.w3.org/2000/svg">
  <path d="${aCharacter.path}" fill="white"/>
</svg>
`;

// Calculate center position for the 'a' character
const svgWidth = 100; // Desired width
const svgHeight = 100; // Desired height
const centerX = (mmToPoints(500) - svgWidth) / 2;
const centerY = (mmToPoints(300) - svgHeight) / 2;

console.log(`Placing SVG at: ${centerX}, ${centerY}`);

// Add the SVG with proper color mapping
doc.addSVG(svgString, centerX, centerY, {
  width: svgWidth,
  height: svgHeight,
  useCMYK: true,
  spotColorMap: {
    white: { name: "thru-cut", tint: 0.0 }, // Map white to knockout
    "#ffffff": { name: "thru-cut", tint: 0.0 },
  },
});

// Alternative: Manually draw the 'a' with white color (CMYK 0,0,0,0)
doc.save();
doc.translate(centerX + 120, centerY); // Offset to show both versions
doc.scale(svgWidth / 37.83, svgHeight / 54); // Scale to fit

// Set fill color to white (CMYK 0,0,0,0)
doc.fillColorCMYK(0, 0, 0, 0);

// Manually parse and draw the simplified 'a' path
// For demonstration, let's draw a simple 'A' shape
doc.moveTo(18, 54); // Bottom left
doc.lineTo(0, 0); // Top left
doc.lineTo(37, 0); // Top right
doc.lineTo(19, 54); // Bottom right
doc.closePath();

// Add the crossbar
doc.moveTo(9, 32);
doc.lineTo(28, 32);
doc.lineTo(28, 22);
doc.lineTo(9, 22);
doc.closePath();

doc.fill();
doc.restore();

// Generate and save PDF
const pdfData = doc.end();
fs.writeFileSync("fixed-svg-test.pdf", pdfData);

console.log("Fixed SVG test completed!");
console.log("Generated: fixed-svg-test.pdf");
console.log("- Page: 500mm x 300mm");
console.log("- Background rect: CMYK (20%, 20%, 20%, 100%)");
console.log("- Stroke rect: thru-cut spot color (88%, 30%, 0%, 0%)");
console.log('- Character "a": White fill (CMYK 0%, 0%, 0%, 0%)');
console.log('- Manual "A": White fill for comparison');
