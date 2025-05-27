import { PDFDocument } from "../lib/index.js";
import fs from "fs";

// Character 'a' path data
const aCharacter = {
  path: "M.01,53.64L12.02.32c.04-.19.21-.32.4-.32h12.88c.19,0,.36.13.4.32l12.12,53.32c.06.26-.14.5-.4.5h-10.01c-.2,0-.36-.14-.4-.33l-2.54-12.94c-.04-.19-.21-.33-.4-.33h-10.93c-.2,0-.37.14-.4.33l-2.47,12.94c-.04.19-.21.33-.4.33H.41c-.26,0-.46-.24-.4-.5ZM14.62,32.41h8.1c.12,0,.22-.11.2-.24l-4.08-21.44c-.04-.22-.35-.22-.39,0l-4.02,21.44c-.02.12.07.24.2.24Z",
  viewBox: "0 0 37.83 54",
};

// Convert mm to points
const mmToPoints = (mm) => mm * 2.834645669;

console.log("Creating PDF with proper SVG parsing...");

// Create PDF: 500mm x 300mm
const doc = new PDFDocument({
  width: mmToPoints(500),
  height: mmToPoints(300),
});

// Define the thru-cut spot color
doc.defineSpotColor("thru-cut", { c: 88, m: 30, y: 0, k: 0 });

// 1. Background rectangle with CMYK (0.2,0.2,0.2,1)
console.log("Drawing background rectangle...");
doc.rect(0, 0, mmToPoints(500), mmToPoints(300));
doc.fillColorCMYK(20, 20, 20, 100);
doc.fill();

// 2. Stroke rectangle with thru-cut spot color
console.log("Drawing stroke rectangle with thru-cut spot color...");
doc.rect(10, 10, mmToPoints(500) - 20, mmToPoints(300) - 20);
doc.strokeSpotColor("thru-cut", 1.0);
doc.lineWidth(2);
doc.stroke();

// 3. SVG 'a' character in the middle with white (CMYK 0,0,0,0)
const svgString = `<svg viewBox="${aCharacter.viewBox}" xmlns="http://www.w3.org/2000/svg">
  <path d="${aCharacter.path}" fill="white"/>
</svg>`;

// Calculate center position
const svgWidth = 200;
const svgHeight = 200;
const centerX = (mmToPoints(500) - svgWidth) / 2;
const centerY = (mmToPoints(300) - svgHeight) / 2;

console.log(`Adding SVG 'a' character at center: ${centerX}, ${centerY}`);
console.log("SVG will be rendered with white fill (CMYK 0,0,0,0)");

// Add the SVG with proper white color handling
doc.addSVG(svgString, centerX, centerY, {
  width: svgWidth,
  height: svgHeight,
  useCMYK: true, // This ensures white is converted to CMYK (0,0,0,0)
});

// Add some test elements to verify everything is working
console.log("Adding test elements...");

// Test circle with spot color
doc.save();
doc.translate(100, 100);
doc.circle(0, 0, 30);
doc.fillSpotColor("thru-cut", 0.5);
doc.fill();
doc.restore();

// Test rectangle with CMYK white
doc.save();
doc.translate(mmToPoints(500) - 100, 100);
doc.rect(-30, -30, 60, 60);
doc.fillColorCMYK(0, 0, 0, 0); // White in CMYK
doc.fill();
doc.restore();

// Add some text labels (as paths since we don't have text support)
const labelSvg = `<svg viewBox="0 0 200 50">
  <rect x="0" y="0" width="200" height="50" fill="white" stroke="none"/>
</svg>`;

doc.addSVG(labelSvg, 50, mmToPoints(300) - 100, {
  width: 200,
  height: 50,
  useCMYK: true,
});

// Generate PDF
const pdfData = doc.end();
fs.writeFileSync("proper-svg-test.pdf", pdfData);

console.log("\n✅ PDF generated successfully!");
console.log("📄 File: proper-svg-test.pdf");
console.log("\n📋 Features demonstrated:");
console.log("  • 500mm × 300mm page size");
console.log("  • Background: CMYK (20%, 20%, 20%, 100%)");
console.log("  • Stroke rectangle: thru-cut spot color");
console.log('  • SVG character "a": white (CMYK 0%, 0%, 0%, 0%)');
console.log("  • Proper SVG path parsing");
console.log("  • Adobe Illustrator compatible PDF structure");
console.log("\n🎯 This PDF should open correctly in Adobe Illustrator!");
