import { PDFDocument } from "../lib/index.js";
import fs from "fs";

// Character 'a' path data from user's characterShapes
const characterShapes = {
  a: {
    path: "M.01,53.64L12.02.32c.04-.19.21-.32.4-.32h12.88c.19,0,.36.13.4.32l12.12,53.32c.06.26-.14.5-.4.5h-10.01c-.2,0-.36-.14-.4-.33l-2.54-12.94c-.04-.19-.21-.33-.4-.33h-10.93c-.2,0-.37.14-.4.33l-2.47,12.94c-.04.19-.21.33-.4.33H.41c-.26,0-.46-.24-.4-.5ZM14.62,32.41h8.1c.12,0,.22-.11.2-.24l-4.08-21.44c-.04-.22-.35-.22-.39,0l-4.02,21.44c-.02.12.07.24.2.24Z",
    viewBox: "0 0 37.83 54",
  },
};

// Convert mm to points
const mmToPoints = (mm) => mm * 2.834645669;

console.log("Creating test PDF as requested...");
console.log("- 500mm x 300mm page");
console.log("- Rectangle with CMYK (0.2, 0.2, 0.2, 1)");
console.log('- Rectangle with spot color stroke "thru-cut" (0.88, 0.3, 0, 0)');
console.log('- Character "a" in middle with color (0, 0, 0, 0)');

// Create PDF document
const doc = new PDFDocument({
  width: mmToPoints(500),
  height: mmToPoints(300),
});

// Define the thru-cut spot color with CMYK values (0.88, 0.3, 0, 0)
doc.defineSpotColor("thru-cut", {
  c: 88, // 0.88 * 100
  m: 30, // 0.3 * 100
  y: 0, // 0 * 100
  k: 0, // 0 * 100
});

// 1. Rectangle same dimensions as page with CMYK (0.2, 0.2, 0.2, 1)
console.log(
  "\n1. Drawing full-page rectangle with CMYK (20%, 20%, 20%, 100%)..."
);
doc.rect(0, 0, mmToPoints(500), mmToPoints(300));
doc.fillColorCMYK(20, 20, 20, 100); // Convert 0.2 to 20%
doc.fill();

// 2. Rectangle with just a spot color stroke called thru-cut
console.log("2. Drawing rectangle with thru-cut spot color stroke...");
// Make the stroke rectangle slightly inset so it's visible
const inset = 20;
doc.rect(
  inset,
  inset,
  mmToPoints(500) - 2 * inset,
  mmToPoints(300) - 2 * inset
);
doc.strokeSpotColor("thru-cut", 1.0);
doc.lineWidth(3); // Make stroke visible
doc.stroke();

// 3. Add the 'a' SVG in the middle with the color (0, 0, 0, 0)
console.log('3. Adding character "a" in the middle with CMYK (0, 0, 0, 0)...');

// Create SVG string with the 'a' character
// Using a neutral color that will be converted to CMYK (0,0,0,0)
const svgString = `<svg viewBox="${characterShapes.a.viewBox}" xmlns="http://www.w3.org/2000/svg">
  <path d="${characterShapes.a.path}" fill="white"/>
</svg>`;

// Calculate center position
const svgSize = 150; // Make it a reasonable size
const centerX = (mmToPoints(500) - svgSize) / 2;
const centerY = (mmToPoints(300) - svgSize) / 2;

// Add the SVG
doc.addSVG(svgString, centerX, centerY, {
  width: svgSize,
  height: svgSize,
  useCMYK: true, // Ensure CMYK color space
  // White will automatically be converted to CMYK (0,0,0,0)
});

// Generate PDF
console.log("\nGenerating PDF...");
const pdfData = doc.end();
fs.writeFileSync("final-test.pdf", pdfData);

console.log("\n✅ Success! PDF generated: final-test.pdf");
console.log("\n📊 Summary:");
console.log("  • Page size: 500mm × 300mm");
console.log("  • Background fill: CMYK (20%, 20%, 20%, 100%) - dark gray");
console.log(
  '  • Stroke rectangle: "thru-cut" spot color CMYK (88%, 30%, 0%, 0%)'
);
console.log('  • Character "a": CMYK (0%, 0%, 0%, 0%) - no ink/white');
console.log("\n🎨 The PDF should now work correctly in Adobe Illustrator!");
