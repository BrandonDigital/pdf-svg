import { PDFDocument } from "../src/index.js";
import fs from "fs";

// Character shapes data
const characterShapes = {
  a: {
    path: "M.01,53.64L12.02.32c.04-.19.21-.32.4-.32h12.88c.19,0,.36.13.4.32l12.12,53.32c.06.26-.14.5-.4.5h-10.01c-.2,0-.36-.14-.4-.33l-2.54-12.94c-.04-.19-.21-.33-.4-.33h-10.93c-.2,0-.37.14-.4.33l-2.47,12.94c-.04.19-.21.33-.4.33H.41c-.26,0-.46-.24-.4-.5ZM14.62,32.41h8.1c.12,0,.22-.11.2-.24l-4.08-21.44c-.04-.22-.35-.22-.39,0l-4.02,21.44c-.02.12.07.24.2.24Z",
    viewBox: "0 0 37.83 54",
  },
};

// Convert mm to points (1mm = 2.834645669 points)
const mmToPoints = (mm) => mm * 2.834645669;

// Create a new PDF document with 500mm x 300mm dimensions
const doc = new PDFDocument({
  width: mmToPoints(500), // 500mm in points
  height: mmToPoints(300), // 300mm in points
});

console.log(`PDF dimensions: ${mmToPoints(500)} x ${mmToPoints(300)} points`);

// Define spot color for thru-cut
doc.defineSpotColor("thru-cut", { c: 88, m: 30, y: 0, k: 0 });

// 1. Background rectangle with CMYK (0.2,0.2,0.2,1) - same dimensions as page
doc.rect(0, 0, mmToPoints(500), mmToPoints(300));
doc.fillColorCMYK(20, 20, 20, 100); // Convert 0.2 to percentage (20%)
doc.fill();

// 2. Rectangle with spot color stroke (thru-cut)
doc.rect(10, 10, mmToPoints(500) - 20, mmToPoints(300) - 20); // Slightly inset for visibility
doc.strokeSpotColor("thru-cut", 1.0);
doc.lineWidth(2);
doc.stroke();

// 3. Create SVG for the 'a' character and place it in the middle
const aChar = characterShapes.a;

// Create SVG string for the 'a' character
const svgString = `
<svg width="100" height="100" viewBox="${aChar.viewBox}" xmlns="http://www.w3.org/2000/svg">
  <path d="${aChar.path}" fill="#000000"/>
</svg>
`;

// Calculate center position
const centerX = mmToPoints(500) / 2 - 50; // Subtract half the SVG width
const centerY = mmToPoints(300) / 2 - 50; // Subtract half the SVG height

// Add SVG with CMYK color mapping
doc.addSVG(svgString, centerX, centerY, {
  useCMYK: true,
  spotColorMap: {
    "#000000": { name: "thru-cut", tint: 1.0 }, // Map black to thru-cut spot color
  },
});

// Alternative: Add the 'a' character using path commands directly with CMYK (0,0,0,0)
// This creates a "knockout" effect (no ink)
doc.save();
doc.translate(centerX + 150, centerY); // Offset to show both versions

// Parse and draw the path manually
const pathData = aChar.path;
doc.fillColorCMYK(0, 0, 0, 0); // CMYK (0,0,0,0) - no ink/knockout

// Simple path parsing for the 'a' character
// Note: This is a simplified version - for production use, you'd want a more robust SVG path parser
const commands = pathData.match(
  /[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g
);
if (commands) {
  commands.forEach((cmd) => {
    const type = cmd[0];
    const values = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(parseFloat)
      .filter((v) => !isNaN(v));

    switch (type) {
      case "M":
        if (values.length >= 2) doc.moveTo(values[0], values[1]);
        break;
      case "L":
        if (values.length >= 2) doc.lineTo(values[0], values[1]);
        break;
      case "H":
        if (values.length >= 1) doc.lineTo(values[0], doc._currentY || 0);
        break;
      case "V":
        if (values.length >= 1) doc.lineTo(doc._currentX || 0, values[0]);
        break;
      case "C":
        if (values.length >= 6) {
          doc.bezierCurveTo(
            values[0],
            values[1],
            values[2],
            values[3],
            values[4],
            values[5]
          );
        }
        break;
      case "Z":
      case "z":
        doc.closePath();
        break;
    }
  });

  doc.fill();
}

doc.restore();

// Generate PDF
const pdfData = doc.end();

// Save to file
fs.writeFileSync("svg-character-test.pdf", pdfData);

console.log("SVG character test PDF generated successfully!");
console.log("Features tested:");
console.log("- 500mm x 300mm page size");
console.log("- Background rectangle with CMYK (20%, 20%, 20%, 100%)");
console.log('- Stroke rectangle with spot color "thru-cut" (88%, 30%, 0%, 0%)');
console.log('- SVG "a" character in center with spot color mapping');
console.log("- Manual path drawing with CMYK (0%, 0%, 0%, 0%) knockout");
console.log("File saved as: svg-character-test.pdf");
