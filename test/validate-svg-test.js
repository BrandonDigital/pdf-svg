import { PDFDocument, SVGPath } from "../lib/index.js";
import fs from "fs";

// Test the SVG path parser directly
console.log("Testing SVG Path Parser...");

const testPath =
  "M.01,53.64L12.02.32c.04-.19.21-.32.4-.32h12.88c.19,0,.36.13.4.32l12.12,53.32";
console.log("Input path:", testPath);

const parser = new SVGPath();
parser.parse(testPath);

console.log("\nParsed commands:");
parser.commands.forEach((cmd, i) => {
  console.log(`${i}: ${JSON.stringify(cmd)}`);
});

// Now test with the full character path
const fullPath =
  "M.01,53.64L12.02.32c.04-.19.21-.32.4-.32h12.88c.19,0,.36.13.4.32l12.12,53.32c.06.26-.14.5-.4.5h-10.01c-.2,0-.36-.14-.4-.33l-2.54-12.94c-.04-.19-.21-.33-.4-.33h-10.93c-.2,0-.37.14-.4.33l-2.47,12.94c-.04.19-.21.33-.4.33H.41c-.26,0-.46-.24-.4-.5ZM14.62,32.41h8.1c.12,0,.22-.11.2-.24l-4.08-21.44c-.04-.22-.35-.22-.39,0l-4.02,21.44c-.02.12.07.24.2.24Z";

// Create a simple test PDF
console.log("\n\nCreating validation test PDF...");

const doc = new PDFDocument({
  width: 200,
  height: 200,
});

// Draw the path directly
doc.save();
doc.translate(50, 50);
doc.scale(2, 2);

// Parse and apply the path
SVGPath.apply(doc, fullPath);

// Fill with black
doc.fillColorCMYK(0, 0, 0, 100);
doc.fill();

doc.restore();

// Add some reference marks
doc.rect(0, 0, 200, 200);
doc.strokeColorCMYK(0, 0, 0, 20);
doc.lineWidth(0.5);
doc.stroke();

// Generate PDF
const pdfData = doc.end();
fs.writeFileSync("validate-svg-test.pdf", pdfData);

console.log("\n✅ Validation test completed!");
console.log("📄 Generated: validate-svg-test.pdf");
console.log('\nThis PDF should show the character "a" properly rendered.');
console.log(
  "If it opens in Adobe Illustrator without errors, the SVG parsing is working correctly!"
);
