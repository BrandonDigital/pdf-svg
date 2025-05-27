import fs from "fs";
import zlib from "zlib";

// Read the PDF file
const pdfContent = fs.readFileSync("final-test.pdf");

// Find content stream (object 4 based on the hexdump)
const contentStart = pdfContent.indexOf("stream\n", 0x130) + 7;
const contentEnd = pdfContent.indexOf("\nendstream", contentStart);
const compressedContent = pdfContent.slice(contentStart, contentEnd);

// Decompress the content
const decompressed = zlib.inflateSync(compressedContent);
console.log("PDF Content Stream Commands:");
console.log("===========================");
console.log(decompressed.toString());
console.log("===========================");

// Also check the raw PDF for any issues
console.log("\nChecking PDF structure...");
const pdfText = pdfContent.toString("latin1");

// Check for spot color definition
const spotColorMatch = pdfText.match(
  /\/Separation.*?\/thru-cut.*?\/DeviceCMYK/
);
if (spotColorMatch) {
  console.log("✓ Spot color definition found");
} else {
  console.log("✗ Spot color definition not found properly");
}

// Check for SVG path commands
const pathCommands = decompressed
  .toString()
  .match(/([0-9.-]+\s+){2}[mlcvhMLCVH]/g);
if (pathCommands) {
  console.log(`✓ Found ${pathCommands.length} path commands`);
  console.log("Path commands:", pathCommands.slice(0, 10).join(" | "));
} else {
  console.log("✗ No valid path commands found");
}
