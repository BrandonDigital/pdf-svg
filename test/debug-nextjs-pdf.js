import fs from "fs";
import zlib from "zlib";

// Read the PDF file from Downloads
const pdfPath = "/Users/brandondiehl/Downloads/design-press-ready (35).pdf";
const pdfContent = fs.readFileSync(pdfPath);

console.log("Analyzing PDF structure...");
console.log("PDF size:", pdfContent.length, "bytes");

// Find content stream (object 4)
const contentStart = pdfContent.indexOf("stream\n") + 7;
const contentEnd = pdfContent.indexOf("\nendstream");
const compressedContent = pdfContent.slice(contentStart, contentEnd);

console.log("Compressed content length:", compressedContent.length);

try {
  // Decompress the content
  const decompressed = zlib.inflateSync(compressedContent);
  const contentStr = decompressed.toString();

  console.log("\n=== PDF Content Stream ===");
  console.log(contentStr);
  console.log("=========================\n");

  // Check for malformed commands
  const lines = contentStr.split("\n").filter((line) => line.trim());
  console.log("Checking for malformed commands:");

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed) {
      // Check for commands that might have missing operands
      if (trimmed.match(/^[a-zA-Z]+$/) && trimmed.length === 1) {
        console.log(`Line ${index + 1}: "${trimmed}" - Single letter command`);
      }

      // Check for incomplete number sequences
      if (trimmed.match(/^\d+\.?\d*\s*$/)) {
        console.log(`Line ${index + 1}: "${trimmed}" - Lone number`);
      }

      // Check for NaN or undefined values
      if (trimmed.includes("NaN") || trimmed.includes("undefined")) {
        console.log(`Line ${index + 1}: "${trimmed}" - Contains NaN/undefined`);
      }

      // Check for malformed path commands
      if (trimmed.match(/[mlhvcsqtaz]/i)) {
        const parts = trimmed.split(/\s+/);
        console.log(
          `Line ${index + 1}: "${trimmed}" - Path command with ${
            parts.length
          } parts`
        );
      }
    }
  });

  // Check spot color definition
  const pdfText = pdfContent.toString("latin1");
  console.log("\nSpot color analysis:");

  const separationMatch = pdfText.match(
    /\[\/Separation\s+\/([^\s]+)\s+\/DeviceCMYK\s+(\d+\s+\d+\s+R)\]/
  );
  if (separationMatch) {
    console.log("✓ Found Separation color space:", separationMatch[1]);
  } else {
    console.log("✗ Separation color space format issue");
  }
} catch (error) {
  console.error("Error decompressing content:", error);
}
