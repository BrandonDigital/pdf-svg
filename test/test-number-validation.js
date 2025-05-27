import { PDFDocument } from "../lib/index.js";
import fs from "fs";

console.log("Testing number validation...");

const doc = new PDFDocument({
  width: 200,
  height: 200,
});

// Test with potentially problematic numbers
console.log("Testing with edge case numbers...");

// These should be handled gracefully
doc.moveTo(NaN, 50); // Should warn and use 0
doc.lineTo(Infinity, 100); // Should warn and use 0
doc.rect(10, 10, undefined, 50); // Should warn and use 0
doc.bezierCurveTo(0, 0, 50, 50, 100, NaN); // Should warn and use 0

// Test with very long decimal numbers (precision issues)
doc.moveTo(1.123456789012345, 2.987654321098765);
doc.lineTo(3.141592653589793, 2.718281828459045);

// Test with very small numbers
doc.rect(0.000001, 0.000002, 0.000003, 0.000004);

// Test normal numbers
doc.circle(100, 100, 25);
doc.fillColorCMYK(0, 0, 0, 100);
doc.fill();

const pdfData = doc.end();
fs.writeFileSync("test-number-validation.pdf", pdfData);

console.log("✅ Number validation test completed!");
console.log("📄 Generated: test-number-validation.pdf");
console.log("Check console for any warnings about invalid numbers.");
