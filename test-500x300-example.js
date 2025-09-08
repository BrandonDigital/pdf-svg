import { PDFDocument } from "./src/index.js";
import fs from "fs";

// Helper function to convert millimeters to points
const mm = (val) => val * 2.835;

// Create a new PDF document (500mm x 300mm)
const doc = new PDFDocument({
  width: mm(500), // 500mm width
  height: mm(300), // 300mm height
});

// Define colors
const richBlack = { c: 20, m: 20, y: 20, k: 100 }; // CMYK(0.2, 0.2, 0.2, 1)
const thruCutColor = { c: 88, m: 36, y: 0, k: 0 }; // CMYK(0.88, 0.36, 0, 0)
const white = { c: 0, m: 0, y: 0, k: 0 }; // CMYK white

// 1. Create background rectangle with rich black (same dimensions as page)
doc.rect(0, 0, mm(500), mm(300));
doc.fillColorCMYK(richBlack.c, richBlack.m, richBlack.y, richBlack.k);
doc.fill();

// 2. Define and use spot color for smaller rectangle
doc.defineSpotColor("Thru-cut", thruCutColor);

// Create smaller rectangle with spot color (centered, 100mm x 60mm)
const rectWidth = mm(100);
const rectHeight = mm(60);
const rectX = (mm(500) - rectWidth) / 2; // Center horizontally
const rectY = (mm(300) - rectHeight) / 2; // Center vertically

doc.rect(rectX, rectY, rectWidth, rectHeight);
doc.fillSpotColor("Thru-cut", 1.0); // 100% tint
doc.fill();

// 3. Create star SVG with white fill
const starSVG = `
<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
  <path d="M 40 5 L 47 25 L 70 25 L 52 40 L 59 60 L 40 47 L 21 60 L 28 40 L 10 25 L 33 25 Z" 
        fill="white" 
        stroke="none"/>
</svg>
`;

// Position star in top-left corner (with some margin)
const starX = mm(30);
const starY = mm(250); // From bottom

// Add star SVG with white CMYK color
doc.addSVG(starSVG, starX, starY, {
  useCMYK: true,
  colorCallback: (color) => {
    const colorLower = color.toLowerCase();

    // Convert white colors to CMYK white
    if (
      colorLower === "white" ||
      colorLower === "#ffffff" ||
      colorLower === "#fff" ||
      colorLower === "rgb(255,255,255)" ||
      colorLower === "rgb(255, 255, 255)"
    ) {
      return white;
    }

    return color;
  },
});

// Add another star in top-right corner
doc.addSVG(starSVG, mm(500) - mm(30) - mm(80), starY, {
  useCMYK: true,
  colorCallback: (color) => {
    const colorLower = color.toLowerCase();
    if (
      colorLower === "white" ||
      colorLower === "#ffffff" ||
      colorLower === "#fff" ||
      colorLower === "rgb(255,255,255)" ||
      colorLower === "rgb(255, 255, 255)"
    ) {
      return white;
    }
    return color;
  },
});

// Add a third star in bottom-center
doc.addSVG(starSVG, (mm(500) - mm(80)) / 2, mm(30), {
  useCMYK: true,
  colorCallback: (color) => {
    const colorLower = color.toLowerCase();
    if (
      colorLower === "white" ||
      colorLower === "#ffffff" ||
      colorLower === "#fff" ||
      colorLower === "rgb(255,255,255)" ||
      colorLower === "rgb(255, 255, 255)"
    ) {
      return white;
    }
    return color;
  },
});

// Generate and save the PDF
const pdfData = doc.end();
fs.writeFileSync("test-500x300-example.pdf", pdfData);

console.log("500mm x 300mm test PDF created: test-500x300-example.pdf");
console.log("Document dimensions: 500mm x 300mm");
console.log("Background: Rich black CMYK(20%, 20%, 20%, 100%)");
console.log("Rectangle: Thru-cut spot color CMYK(88%, 36%, 0%, 0%)");
console.log("Stars: White CMYK(0%, 0%, 0%, 0%)");
console.log("Rectangle size: 100mm x 60mm (centered)");
console.log("Star size: 80mm x 80mm (3 stars positioned)");
