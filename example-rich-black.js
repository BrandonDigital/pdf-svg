import { PDFDocument } from "./src/index.js";
import fs from "fs";

// Helper function to convert millimeters to points
const mm = (val) => val * 2.835;

// Create a new PDF document
const doc = new PDFDocument({
  width: mm(210), // A4 width
  height: mm(297), // A4 height
});

// Define rich black CMYK values (20% CMY, 100% K)
const richBlack = { c: 20, m: 20, y: 20, k: 100 };

// Example SVG with various elements
const svgContent = `
<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="80" height="40" fill="black"/>
  <path d="M 100 10 L 180 10 L 180 50 L 100 50 Z" fill="#000000"/>
  <circle cx="50" cy="80" r="20" fill="rgb(0,0,0)"/>
  <rect x="100" y="60" width="80" height="40" fill="#333333"/>
</svg>
`;

// Method 1: Override all black colors with rich black
doc.addSVG(svgContent, mm(20), mm(200), {
  useCMYK: true,
  colorCallback: (color) => {
    const colorLower = color.toLowerCase();

    // Check if the color is black in any format
    if (
      colorLower === "black" ||
      colorLower === "#000000" ||
      colorLower === "#000" ||
      colorLower === "rgb(0,0,0)" ||
      colorLower === "rgb(0, 0, 0)"
    ) {
      // Return rich black CMYK values
      return richBlack;
    }

    // For other dark colors, you might also want to convert them
    if (colorLower === "#333333" || colorLower === "#333") {
      return { c: 15, m: 15, y: 15, k: 80 }; // Lighter rich black
    }

    // Keep other colors unchanged
    return color;
  },
});

// Method 2: Force ALL colors to rich black
doc.addSVG(svgContent, mm(120), mm(200), {
  useCMYK: true,
  colorCallback: (color) => {
    // Override every color with rich black
    return richBlack;
  },
});

// Method 3: Using spot color mapping
// First define a spot color for rich black
doc.defineSpotColor("RichBlack", { c: 20, m: 20, y: 20, k: 100 });

doc.addSVG(svgContent, mm(20), mm(100), {
  spotColorMap: {
    black: { name: "RichBlack", tint: 1.0 },
    "#000000": { name: "RichBlack", tint: 1.0 },
    "#000": { name: "RichBlack", tint: 1.0 },
    "rgb(0,0,0)": { name: "RichBlack", tint: 1.0 },
  },
});

// Method 4: Direct CMYK drawing (not SVG)
// Draw shapes directly with rich black
doc.rect(mm(120), mm(100), mm(40), mm(20));
doc.fillColorCMYK(20, 20, 20, 100); // Rich black
doc.fill();

doc.circle(mm(140), mm(140), mm(10));
doc.fillColorCMYK(20, 20, 20, 100); // Rich black
doc.fill();

// Generate and save the PDF
const pdfData = doc.end();
fs.writeFileSync("rich-black-example.pdf", pdfData);

console.log("PDF with rich black colors created: rich-black-example.pdf");
