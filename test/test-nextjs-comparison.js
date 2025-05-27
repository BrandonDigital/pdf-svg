import { PDFDocument } from "../lib/index.js";
import fs from "fs";

console.log("Creating comparison PDF for Next.js debugging...");

// Helper: mm to points
const mm = (val) => val * 2.835;

// Create PDF with exact same dimensions as the failing one
const doc = new PDFDocument({
  width: mm(802), // Based on MediaBox in the failing PDF
  height: mm(502),
});

// Draw background rectangle
doc.rect(0, 0, mm(802), mm(502));
doc.fillColorCMYK(0, 0, 0, 100); // Black background
doc.fill();

// Draw inner rectangle
doc.rect(2, 2, mm(798), mm(498));
doc.fillColorCMYK(0, 0, 0, 0); // White fill
doc.fill();

// Draw another rectangle
doc.rect(2, 2, mm(798), mm(498));
doc.fillColorCMYK(0, 0, 0, 100); // Black again
doc.fill();

// Draw content area
doc.rect(41, 41, 720, 420);
doc.fillColorCMYK(0, 0, 0, 100);
doc.fill();

// Test SVG content similar to what might be in Next.js
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37.85 54.14">
  <path d="M.01,53.64L12.02.32c.04-.19.21-.32.4-.32h12.88c.19,0,.36.13.4.32l12.12,53.32c.06.26-.14.5-.4.5h-10.01c-.2,0-.36-.14-.4-.33l-2.54-12.94c-.04-.19-.21-.33-.4-.33h-10.93c-.2,0-.37.14-.4.33l-2.47,12.94c-.04.19-.21.33-.4.33H.41c-.26,0-.46-.24-.4-.5ZM14.62,32.41h8.1c.12,0,.22-.11.2-.24l-4.08-21.44c-.04-.22-.35-.22-.39,0l-4.02,21.44c-.02.12.07.24.2.24Z"/>
</svg>`;

// Add multiple SVG instances like in the failing PDF
const positions = [
  { x: 41, y: 41, width: 143.897848585847, height: 420 },
  { x: 196.23643258584698, y: 41, width: 107.64761075811448, height: 420 },
  { x: 315.2226273439615, y: 41, width: 117.38534515884851, height: 420 },
  {
    x: 456.78438994127777,
    y: 216,
    width: 89.86483750854023,
    height: 65.33333333333333,
  },
  { x: 557.9878080105517, y: 41, width: 110.61457670833812, height: 420 },
  { x: 679.9409687188898, y: 41, width: 81.05903128111022, height: 420 },
];

positions.forEach((pos, index) => {
  // Draw background for each position
  doc.rect(pos.x, pos.y, pos.width, pos.height);
  doc.fillColorCMYK(0, 0, 0, 100);
  doc.fill();

  // Add SVG with custom color
  doc.addSVG(svgContent, pos.x, pos.y, {
    width: pos.width,
    height: pos.height,
    useCMYK: true,
    colorCallback: (color) => {
      return { c: 0, m: 0, y: 0, k: 0 }; // White
    },
  });
});

// Define spot color like in the failing PDF
doc.defineSpotColor("Thru-cut", { c: 88.39, m: 76.85, y: 0, k: 0 });

// Draw final rectangle with spot color stroke
doc.rect(2, 2, mm(798), mm(498));
doc.strokeSpotColor("Thru-cut");
doc.lineWidth(0.25);
doc.stroke();

// Generate PDF
const pdfData = doc.end();
fs.writeFileSync("test-nextjs-comparison.pdf", pdfData);

console.log("✅ Comparison PDF generated: test-nextjs-comparison.pdf");
console.log(
  "Compare this with the failing Next.js PDF to identify differences."
);

// Also create a minimal test
const minimalDoc = new PDFDocument({
  width: 200,
  height: 200,
});

minimalDoc.addSVG(svgContent, 50, 50, {
  width: 100,
  height: 100,
  useCMYK: true,
  colorCallback: (color) => {
    return { c: 0, m: 0, y: 0, k: 0 };
  },
});

const minimalPdf = minimalDoc.end();
fs.writeFileSync("test-minimal.pdf", minimalPdf);

console.log("✅ Minimal test PDF generated: test-minimal.pdf");
