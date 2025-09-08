import { PDFDocument } from "./src/index.js";
import fs from "fs";

// Helper function to convert millimeters to points
const mm = (val) => val * 2.835;

console.log("Creating LAB color example...");

// Create a new PDF document
const doc = new PDFDocument({
  width: mm(210), // A4 width
  height: mm(297), // A4 height
});

// === LAB Spot Colors ===
console.log("Defining LAB spot colors...");

// Define PANTONE Blue 072 C with exact LAB values
doc.defineLabSpotColorLab("PANTONE Blue 072 C", 17.2549, 42, -76);

// Define custom LAB spot colors
doc.defineLabSpotColorLab("Brand Red", 53, 80, 67);
doc.defineLabSpotColorLab("Brand Green", 87, -86, 83);

// === Using LAB Spot Colors ===
console.log("Creating shapes with LAB spot colors...");

// PANTONE Blue rectangle
doc.rect(mm(20), mm(250), mm(50), mm(30));
doc.fillSpotColor("PANTONE Blue 072 C", 1.0);
doc.fill();

// Brand colors
doc.rect(mm(80), mm(250), mm(50), mm(30));
doc.fillSpotColor("Brand Red", 1.0);
doc.fill();

doc.rect(mm(140), mm(250), mm(50), mm(30));
doc.fillSpotColor("Brand Green", 1.0);
doc.fill();

// === Tint Variations ===
console.log("Creating tint variations...");

const tints = [1.0, 0.8, 0.6, 0.4, 0.2];
tints.forEach((tint, index) => {
  doc.rect(mm(20 + index * 35), mm(200), mm(30), mm(25));
  doc.fillSpotColor("PANTONE Blue 072 C", tint);
  doc.fill();
});

// === Additional LAB Spot Colors ===
console.log("Creating additional LAB spot color shapes...");

// Define more LAB spot colors
doc.defineLabSpotColorLab("LAB Orange", 74, 23, 78);
doc.defineLabSpotColorLab("LAB Blue", 32, 79, -107);

// Use the additional LAB spot colors
doc.rect(mm(20), mm(150), mm(40), mm(30));
doc.fillSpotColor("LAB Orange", 1.0);
doc.fill();

doc.rect(mm(70), mm(150), mm(40), mm(30));
doc.fillSpotColor("LAB Blue", 1.0);
doc.fill();

// === Mixed Color Spaces ===
console.log("Mixing LAB spot colors with other color spaces...");

// LAB spot color fill with CMYK stroke
doc.rect(mm(120), mm(150), mm(60), mm(30));
doc.fillSpotColor("Brand Green", 1.0); // LAB spot color
doc.strokeColorCMYK(0, 100, 100, 0); // Red stroke in CMYK
doc.lineWidth(2);
doc.fillAndStroke();

// === Geometric Shapes ===
console.log("Creating geometric shapes...");

// Define another LAB spot color for geometric shapes
doc.defineLabSpotColorLab("LAB Magenta", 60, 98, -60);

// Circle with LAB spot color
doc.circle(mm(50), mm(100), mm(20));
doc.fillSpotColor("Brand Red", 0.8);
doc.fill();

// Ellipse with LAB spot color
doc.ellipse(mm(120), mm(100), mm(25), mm(15));
doc.fillSpotColor("LAB Magenta", 1.0);
doc.fill();

// Generate and save the PDF
console.log("Generating PDF...");
const pdfData = doc.end();
fs.writeFileSync("example-lab-colors.pdf", pdfData);

console.log("✓ LAB color example PDF created: example-lab-colors.pdf");

console.log("\n=== LAB Color Features Demonstrated ===");
console.log("✓ LAB spot color definition with defineLabSpotColorLab()");
console.log(
  "✓ PANTONE Blue 072 C with exact LAB values (L:17.25, a:42, b:-76)"
);
console.log("✓ Custom brand colors in LAB space");
console.log("✓ Spot color tint variations (100% to 20%)");
console.log("✓ Multiple LAB spot colors (Orange, Blue, Magenta)");
console.log("✓ Mixed color spaces (LAB spot colors + CMYK)");
console.log("✓ Professional PlateNames metadata included");

console.log("\n=== Benefits of LAB Colors ===");
console.log("• Device-independent color reproduction");
console.log("• Exact PANTONE color matching");
console.log("• Professional print workflow compatibility");
console.log("• Wider color gamut than RGB/CMYK");
console.log("• Perceptually uniform color space");
