import { PDFDocument } from "./src/index.js";
import fs from "fs";

// Helper function to convert millimeters to points
const mm = (val) => val * 2.835;

// Color definitions
const COLORS = {
  richBlack: { c: 20, m: 20, y: 20, k: 100 }, // CMYK(0.2, 0.2, 0.2, 1)
  thruCut: { c: 88, m: 36, y: 0, k: 0 }, // CMYK(0.88, 0.36, 0, 0)
  white: { c: 0, m: 0, y: 0, k: 0 }, // CMYK white
};

// Utility function to create white color callback for SVG
function createWhiteColorCallback() {
  return (color) => {
    const colorLower = color.toLowerCase();

    // Convert various white color formats to CMYK white
    const whiteFormats = [
      "white",
      "#ffffff",
      "#fff",
      "rgb(255,255,255)",
      "rgb(255, 255, 255)",
      "rgba(255,255,255,1)",
      "rgba(255, 255, 255, 1)",
    ];

    if (whiteFormats.includes(colorLower)) {
      return COLORS.white;
    }

    return color;
  };
}

// Create star SVG path
function createStarSVG(size = 80) {
  const center = size / 2;
  const outerRadius = center * 0.9;
  const innerRadius = center * 0.4;

  // Calculate star points (5-pointed star)
  let path = "";
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = center + radius * Math.sin(angle);
    const y = center - radius * Math.cos(angle);

    if (i === 0) {
      path += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
    } else {
      path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }
  path += " Z";

  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <path d="${path}" fill="white" stroke="none"/>
</svg>
  `.trim();
}

// Main function to create the document
function createTestDocument() {
  // Create a new PDF document (500mm x 300mm)
  const doc = new PDFDocument({
    width: mm(500), // 500mm width
    height: mm(300), // 300mm height
  });

  // 1. Create background rectangle with rich black (full page dimensions)
  console.log("Creating rich black background...");
  doc.rect(0, 0, mm(500), mm(300));
  doc.fillColorCMYK(
    COLORS.richBlack.c,
    COLORS.richBlack.m,
    COLORS.richBlack.y,
    COLORS.richBlack.k
  );
  doc.fill();

  // 2. Define and create spot color rectangle
  console.log("Creating Thru-cut spot color rectangle...");
  doc.defineSpotColor("Thru-cut", COLORS.thruCut);

  // Create centered rectangle (100mm x 60mm)
  const rectWidth = mm(100);
  const rectHeight = mm(60);
  const rectX = (mm(500) - rectWidth) / 2; // Center horizontally
  const rectY = (mm(300) - rectHeight) / 2; // Center vertically

  doc.rect(rectX, rectY, rectWidth, rectHeight);
  doc.fillSpotColor("Thru-cut", 1.0); // 100% tint
  doc.fill();

  // 3. Create white stars using SVG
  console.log("Adding white stars...");
  const starSize = 80;
  const starSVG = createStarSVG(starSize);
  const margin = mm(30);

  // Star positions
  const starPositions = [
    { x: margin, y: mm(300) - margin - mm(starSize), label: "top-left" },
    {
      x: mm(500) - margin - mm(starSize),
      y: mm(300) - margin - mm(starSize),
      label: "top-right",
    },
    { x: (mm(500) - mm(starSize)) / 2, y: margin, label: "bottom-center" },
  ];

  // Add stars with white CMYK color
  starPositions.forEach((pos, index) => {
    console.log(`  Adding star ${index + 1} at ${pos.label}`);
    doc.addSVG(starSVG, pos.x, pos.y, {
      useCMYK: true,
      colorCallback: createWhiteColorCallback(),
    });
  });

  return doc;
}

// Create and save the document
console.log("Creating 500mm x 300mm test document...");
const doc = createTestDocument();

// Generate and save the PDF
const pdfData = doc.end();
fs.writeFileSync("advanced-500x300-example.pdf", pdfData);

// Print summary
console.log("\n✅ PDF created successfully: advanced-500x300-example.pdf");
console.log("\n📐 Document Specifications:");
console.log(
  `   Dimensions: 500mm x 300mm (${mm(500).toFixed(1)} x ${mm(300).toFixed(
    1
  )} points)`
);
console.log(
  `   Background: Rich black CMYK(${COLORS.richBlack.c}%, ${COLORS.richBlack.m}%, ${COLORS.richBlack.y}%, ${COLORS.richBlack.k}%)`
);
console.log(
  `   Rectangle: Thru-cut spot color CMYK(${COLORS.thruCut.c}%, ${COLORS.thruCut.m}%, ${COLORS.thruCut.y}%, ${COLORS.thruCut.k}%)`
);
console.log(`   Rectangle size: 100mm x 60mm (centered)`);
console.log(
  `   Stars: White CMYK(${COLORS.white.c}%, ${COLORS.white.m}%, ${COLORS.white.y}%, ${COLORS.white.k}%)`
);
console.log(`   Star count: 3 (top-left, top-right, bottom-center)`);
console.log(`   Star size: 80mm x 80mm each`);

// Export utility functions for reuse
export { COLORS, createWhiteColorCallback, createStarSVG, mm };
