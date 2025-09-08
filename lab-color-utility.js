import { ColorSpace } from "./src/color-space.js";

/**
 * LAB Color Utility
 * Provides common LAB colors and conversion utilities
 */

export class LabColorUtility {
  constructor() {
    this.colorSpace = new ColorSpace();
  }

  // Common LAB colors for reference
  static COLORS = {
    // Pure colors
    WHITE: { L: 100, a: 0, b: 0 },
    BLACK: { L: 0, a: 0, b: 0 },

    // Primary colors in LAB
    RED: { L: 53, a: 80, b: 67 },
    GREEN: { L: 87, a: -86, b: 83 },
    BLUE: { L: 32, a: 79, b: -107 },

    // Secondary colors
    CYAN: { L: 91, a: -48, b: -14 },
    MAGENTA: { L: 60, a: 98, b: -60 },
    YELLOW: { L: 97, a: -21, b: 94 },

    // Common brand colors in LAB
    ORANGE: { L: 74, a: 23, b: 78 },
    PURPLE: { L: 30, a: 50, b: -50 },
    PINK: { L: 70, a: 50, b: 0 },
    BROWN: { L: 37, a: 26, b: 42 },

    // Neutral colors
    LIGHT_GRAY: { L: 80, a: 0, b: 0 },
    MEDIUM_GRAY: { L: 50, a: 0, b: 0 },
    DARK_GRAY: { L: 20, a: 0, b: 0 },
  };

  /**
   * Convert RGB (0-255) to LAB
   */
  rgbToLab(r, g, b) {
    return this.colorSpace.rgbToLab(r / 255, g / 255, b / 255);
  }

  /**
   * Convert LAB to RGB (0-255)
   */
  labToRgb(L, a, b) {
    const rgb = this.colorSpace.labToRgb(L, a, b);
    return {
      r: Math.round(rgb.r * 255),
      g: Math.round(rgb.g * 255),
      b: Math.round(rgb.b * 255),
    };
  }

  /**
   * Convert hex color to LAB
   */
  hexToLab(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return this.rgbToLab(r, g, b);
  }

  /**
   * Convert LAB to hex
   */
  labToHex(L, a, b) {
    const rgb = this.labToRgb(L, a, b);
    return `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g
      .toString(16)
      .padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}`;
  }

  /**
   * Calculate color difference (Delta E) between two LAB colors
   * Uses CIE76 formula - values < 2.3 are generally imperceptible
   */
  deltaE(lab1, lab2) {
    const deltaL = lab1.L - lab2.L;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;
    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  }

  /**
   * Find the closest named LAB color
   */
  findClosestColor(targetLab) {
    let minDistance = Infinity;
    let closestColor = null;
    let closestName = null;

    for (const [name, lab] of Object.entries(LabColorUtility.COLORS)) {
      const distance = this.deltaE(targetLab, lab);
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = lab;
        closestName = name;
      }
    }

    return {
      name: closestName,
      color: closestColor,
      distance: minDistance,
    };
  }

  /**
   * Generate a LAB color palette with specified lightness and chroma
   */
  generatePalette(lightness = 50, chroma = 50, count = 8) {
    const colors = [];
    const angleStep = 360 / count;

    for (let i = 0; i < count; i++) {
      const angle = (i * angleStep * Math.PI) / 180;
      const a = chroma * Math.cos(angle);
      const b = chroma * Math.sin(angle);

      colors.push({
        L: lightness,
        a: Math.max(-128, Math.min(127, a)),
        b: Math.max(-128, Math.min(127, b)),
      });
    }

    return colors;
  }

  /**
   * Create a LAB color gradient between two colors
   */
  createGradient(startLab, endLab, steps = 10) {
    const gradient = [];

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const L = startLab.L + (endLab.L - startLab.L) * t;
      const a = startLab.a + (endLab.a - startLab.a) * t;
      const b = startLab.b + (endLab.b - startLab.b) * t;

      gradient.push({ L, a, b });
    }

    return gradient;
  }

  /**
   * Adjust the lightness of a LAB color
   */
  adjustLightness(lab, amount) {
    return {
      L: Math.max(0, Math.min(100, lab.L + amount)),
      a: lab.a,
      b: lab.b,
    };
  }

  /**
   * Adjust the chroma (colorfulness) of a LAB color
   */
  adjustChroma(lab, factor) {
    return {
      L: lab.L,
      a: lab.a * factor,
      b: lab.b * factor,
    };
  }

  /**
   * Get the complementary color in LAB space
   */
  getComplementary(lab) {
    return {
      L: lab.L,
      a: -lab.a,
      b: -lab.b,
    };
  }

  /**
   * Convert RGB to CMYK
   */
  rgbToCmyk(r, g, b) {
    // Ensure values are in 0-1 range
    r = r / 255;
    g = g / 255;
    b = b / 255;

    const k = 1 - Math.max(r, g, b);
    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 1 };
    }
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);
    return {
      c: Math.max(0, Math.min(1, c)),
      m: Math.max(0, Math.min(1, m)),
      y: Math.max(0, Math.min(1, y)),
      k: Math.max(0, Math.min(1, k)),
    };
  }

  /**
   * Validate LAB values
   */
  validateLab(L, a, b) {
    return {
      L: Math.max(0, Math.min(100, L)),
      a: Math.max(-128, Math.min(127, a)),
      b: Math.max(-128, Math.min(127, b)),
    };
  }

  /**
   * Print color information for debugging
   */
  printColorInfo(lab, name = "Color") {
    const rgb = this.labToRgb(lab.L, lab.a, lab.b);
    const hex = this.labToHex(lab.L, lab.a, lab.b);

    console.log(`${name}:`);
    console.log(
      `  LAB: L=${lab.L.toFixed(1)} a=${lab.a.toFixed(1)} b=${lab.b.toFixed(1)}`
    );
    console.log(`  RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}`);
    console.log(`  HEX: ${hex}`);
  }
}

// Example usage and testing
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("LAB Color Utility - Testing and Examples\n");

  const labUtil = new LabColorUtility();

  // Test color conversions
  console.log("=== Color Conversion Tests ===");
  const testRgb = { r: 255, g: 100, b: 50 };
  const labFromRgb = labUtil.rgbToLab(testRgb.r, testRgb.g, testRgb.b);
  const backToRgb = labUtil.labToRgb(labFromRgb.L, labFromRgb.a, labFromRgb.b);

  console.log(`Original RGB: ${testRgb.r}, ${testRgb.g}, ${testRgb.b}`);
  console.log(
    `Converted to LAB: L=${labFromRgb.L.toFixed(1)} a=${labFromRgb.a.toFixed(
      1
    )} b=${labFromRgb.b.toFixed(1)}`
  );
  console.log(`Back to RGB: ${backToRgb.r}, ${backToRgb.g}, ${backToRgb.b}\n`);

  // Test common colors
  console.log("=== Common LAB Colors ===");
  for (const [name, lab] of Object.entries(LabColorUtility.COLORS)) {
    labUtil.printColorInfo(lab, name);
    console.log("");
  }

  // Test palette generation
  console.log("=== Generated Color Palette ===");
  const palette = labUtil.generatePalette(60, 40, 6);
  palette.forEach((color, index) => {
    labUtil.printColorInfo(color, `Palette Color ${index + 1}`);
    console.log("");
  });

  // Test color difference
  console.log("=== Color Difference Test ===");
  const red1 = LabColorUtility.COLORS.RED;
  const red2 = { L: 55, a: 75, b: 65 };
  const deltaE = labUtil.deltaE(red1, red2);
  console.log(`Delta E between two reds: ${deltaE.toFixed(2)}`);
  console.log(`Perceptible difference: ${deltaE > 2.3 ? "Yes" : "No"}\n`);
}
