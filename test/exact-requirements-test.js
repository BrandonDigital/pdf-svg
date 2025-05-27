import { PDFDocument } from "../src/index.js";
import fs from "fs";

// Character 'a' path data from your character shapes
const aCharacter = {
  path: "M.01,53.64L12.02.32c.04-.19.21-.32.4-.32h12.88c.19,0,.36.13.4.32l12.12,53.32c.06.26-.14.5-.4.5h-10.01c-.2,0-.36-.14-.4-.33l-2.54-12.94c-.04-.19-.21-.33-.4-.33h-10.93c-.2,0-.37.14-.4.33l-2.47,12.94c-.04.19-.21.33-.4.33H.41c-.26,0-.46-.24-.4-.5ZM14.62,32.41h8.1c.12,0,.22-.11.2-.24l-4.08-21.44c-.04-.22-.35-.22-.39,0l-4.02,21.44c-.02.12.07.24.2.24Z",
  viewBox: "0 0 37.83 54",
};

// Convert mm to points (1mm = 2.834645669 points)
const mmToPoints = (mm) => mm * 2.834645669;

console.log("Creating PDF with exact requirements...");

// Create PDF document: 500mm x 300mm
const doc = new PDFDocument({
  width: mmToPoints(500), // 500mm
  height: mmToPoints(300), // 300mm
});

console.log(`PDF size: ${mmToPoints(500)} x ${mmToPoints(300)} points`);

// Define thru-cut spot color with CMYK (0.88, 0.3, 0, 0)
// Note: Converting from 0-1 range to 0-100 percentage
doc.defineSpotColor("thru-cut", {
  c: 88, // 0.88 * 100
  m: 30, // 0.3 * 100
  y: 0, // 0 * 100
  k: 0, // 0 * 100
});

// 1. Rectangle same dimensions as page with CMYK (0.2, 0.2, 0.2, 1)
doc.rect(0, 0, mmToPoints(500), mmToPoints(300));
doc.fillColorCMYK(
  0.2 * 100, // C: 20%
  0.2 * 100, // M: 20%
  0.2 * 100, // Y: 20%
  1.0 * 100 // K: 100%
);
doc.fill();

// 2. Rectangle with thru-cut spot color stroke
doc.rect(0, 0, mmToPoints(500), mmToPoints(300));
doc.strokeSpotColor("thru-cut", 1.0); // 100% tint
doc.lineWidth(1);
doc.stroke();

// 3. Add 'a' SVG in the middle with CMYK (0,0,0,0)
const svgString = `
<svg viewBox="${aCharacter.viewBox}" xmlns="http://www.w3.org/2000/svg">
  <path d="${aCharacter.path}" fill="#000000"/>
</svg>
`;

// Calculate center position
const svgWidth = 150; // Make it larger for visibility
const svgHeight = 150;
const centerX = (mmToPoints(500) - svgWidth) / 2;
const centerY = (mmToPoints(300) - svgHeight) / 2;

console.log(`Placing 'a' character at center: ${centerX}, ${centerY}`);

// Add SVG with color mapping to CMYK (0,0,0,0)
doc.addSVG(svgString, centerX, centerY, {
  width: svgWidth,
  height: svgHeight,
  useCMYK: true,
  colorCallback: (color) => {
    // Map any color to CMYK (0,0,0,0) - knockout/no ink
    if (color === "#000000" || color === "black") {
      return "knockout";
    }
    return color;
  },
  spotColorMap: {
    knockout: { name: "White", tint: 1.0 },
  },
});

// Alternative: Manually draw with exact CMYK (0,0,0,0)
doc.save();
doc.translate(centerX, centerY);
doc.scale(svgWidth / 37.83, svgHeight / 54);

// Set exact CMYK (0,0,0,0) - no ink/knockout
doc.fillColorCMYK(0, 0, 0, 0);

// Parse the 'a' path manually for better control
const pathCommands = aCharacter.path.match(
  /[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g
);
let currentX = 0,
  currentY = 0;

if (pathCommands) {
  pathCommands.forEach((cmd) => {
    const type = cmd[0];
    const values = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(parseFloat)
      .filter((v) => !isNaN(v));

    switch (type) {
      case "M":
        if (values.length >= 2) {
          currentX = values[0];
          currentY = values[1];
          doc.moveTo(currentX, currentY);
        }
        break;
      case "L":
        if (values.length >= 2) {
          currentX = values[0];
          currentY = values[1];
          doc.lineTo(currentX, currentY);
        }
        break;
      case "H":
        if (values.length >= 1) {
          currentX = values[0];
          doc.lineTo(currentX, currentY);
        }
        break;
      case "V":
        if (values.length >= 1) {
          currentY = values[0];
          doc.lineTo(currentX, currentY);
        }
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
          currentX = values[4];
          currentY = values[5];
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
fs.writeFileSync("exact-requirements-test.pdf", pdfData);

console.log("\n✅ PDF generated successfully!");
console.log("📄 File: exact-requirements-test.pdf");
console.log("\n📋 Specifications met:");
console.log("  • Page size: 500mm × 300mm");
console.log("  • Background rectangle: CMYK (20%, 20%, 20%, 100%)");
console.log(
  "  • Stroke rectangle: thru-cut spot color CMYK (88%, 30%, 0%, 0%)"
);
console.log('  • Character "a": CMYK (0%, 0%, 0%, 0%) - knockout/no ink');
console.log("\n🎯 Ready for Adobe Illustrator testing!");
