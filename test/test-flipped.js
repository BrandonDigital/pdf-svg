import { PDFDocument } from "../lib/index.js";
import fs from "fs";

// SVG for the character 'a'
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37.85 54.14">
  <path fill="white" d="M.01,53.64L12.02.32c.04-.19.21-.32.4-.32h12.88c.19,0,.36.13.4.32l12.12,53.32c.06.26-.14.5-.4.5h-10.01c-.2,0-.36-.14-.4-.33l-2.54-12.94c-.04-.19-.21-.33-.4-.33h-10.93c-.2,0-.37.14-.4.33l-2.47,12.94c-.04.19-.21.33-.4.33H.41c-.26,0-.46-.24-.4-.5ZM14.62,32.41h8.1c.12,0,.22-.11.2-.24l-4.08-21.44c-.04-.22-.35-.22-.39,0l-4.02,21.44c-.02.12.07.24.2.24Z"/>
</svg>`;

console.log("Creating test PDF with properly oriented SVG...");

// Create PDF with CMYK dimensions
const doc = new PDFDocument({
  width: 500 * 2.835, // 500mm to points
  height: 300 * 2.835, // 300mm to points
});

// Draw background rectangle with CMYK gray
doc.rect(0, 0, 500 * 2.835, 300 * 2.835);
doc.fillColorCMYK(20, 20, 20, 100);
doc.fill();

// Draw rectangle with spot color stroke
doc.defineSpotColor("thru-cut", { c: 88, m: 30, y: 0, k: 0 });
doc.rect(50, 50, 500 * 2.835 - 100, 300 * 2.835 - 100);
doc.strokeSpotColor("thru-cut");
doc.lineWidth(2);
doc.stroke();

// Add SVG in the middle with white (knockout)
const centerX = (500 * 2.835) / 2;
const centerY = (300 * 2.835) / 2;

// Parse and add SVG - centered and sized appropriately
doc.addSVG(svgContent, centerX - 50, centerY - 70, {
  width: 100,
  height: 140,
  useCMYK: true, // Force all SVG colors to CMYK
});

// Generate PDF
const pdfData = doc.end();
fs.writeFileSync("test-flipped.pdf", pdfData);

console.log("✅ PDF generated: test-flipped.pdf");
console.log("The SVG should now appear right-side up!");
