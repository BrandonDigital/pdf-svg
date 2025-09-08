/**
 * Rich Black CMYK Utility for PDF-SVG
 *
 * This utility provides helper functions to easily apply rich black
 * CMYK colors (0.2, 0.2, 0.2, 1.0) to SVG elements.
 */

// Standard rich black CMYK values (20% CMY, 100% K)
export const RICH_BLACK = { c: 20, m: 20, y: 20, k: 100 };

// Alternative rich black variations
export const RICH_BLACK_VARIATIONS = {
  standard: { c: 20, m: 20, y: 20, k: 100 }, // Standard rich black
  warm: { c: 15, m: 25, y: 25, k: 100 }, // Warm rich black (more magenta/yellow)
  cool: { c: 25, m: 15, y: 15, k: 100 }, // Cool rich black (more cyan)
  neutral: { c: 20, m: 20, y: 20, k: 100 }, // Neutral rich black
};

/**
 * Creates a color callback that converts black colors to rich black
 * @param {Object} richBlackColor - CMYK color object {c, m, y, k}
 * @param {boolean} convertAllColors - If true, converts ALL colors to rich black
 * @returns {Function} Color callback function for use with addSVG
 */
export function createRichBlackCallback(
  richBlackColor = RICH_BLACK,
  convertAllColors = false
) {
  return (color) => {
    if (convertAllColors) {
      return richBlackColor;
    }

    const colorLower = color.toLowerCase();

    // Check if the color is black in any common format
    const blackFormats = [
      "black",
      "#000000",
      "#000",
      "rgb(0,0,0)",
      "rgb(0, 0, 0)",
      "rgba(0,0,0,1)",
      "rgba(0, 0, 0, 1)",
    ];

    if (blackFormats.includes(colorLower)) {
      return richBlackColor;
    }

    // Keep other colors unchanged
    return color;
  };
}

/**
 * Creates SVG options with rich black color callback
 * @param {Object} options - Additional SVG options
 * @param {Object} richBlackColor - CMYK color object {c, m, y, k}
 * @returns {Object} SVG options object with rich black callback
 */
export function createRichBlackSVGOptions(
  options = {},
  richBlackColor = RICH_BLACK
) {
  return {
    useCMYK: true,
    colorCallback: createRichBlackCallback(richBlackColor),
    ...options,
  };
}

/**
 * Creates a spot color map for rich black
 * @param {string} spotColorName - Name for the spot color
 * @param {Object} richBlackColor - CMYK color object {c, m, y, k}
 * @returns {Object} Spot color map object
 */
export function createRichBlackSpotColorMap(
  spotColorName = "RichBlack",
  richBlackColor = RICH_BLACK
) {
  return {
    black: { name: spotColorName, tint: 1.0 },
    "#000000": { name: spotColorName, tint: 1.0 },
    "#000": { name: spotColorName, tint: 1.0 },
    "rgb(0,0,0)": { name: spotColorName, tint: 1.0 },
    "rgb(0, 0, 0)": { name: spotColorName, tint: 1.0 },
  };
}

/**
 * Helper function to add SVG with rich black colors
 * @param {PDFDocument} doc - PDF document instance
 * @param {string} svgContent - SVG content string
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} options - Additional options
 */
export function addSVGWithRichBlack(doc, svgContent, x, y, options = {}) {
  const richBlackOptions = createRichBlackSVGOptions(options);
  doc.addSVG(svgContent, x, y, richBlackOptions);
}

// Usage examples:

/**
 * Example 1: Simple rich black conversion
 *
 * import { addSVGWithRichBlack, RICH_BLACK } from './rich-black-utility.js';
 *
 * const svg = '<rect fill="black" width="100" height="50"/>';
 * addSVGWithRichBlack(doc, svg, 50, 50);
 */

/**
 * Example 2: Custom rich black variation
 *
 * import { createRichBlackCallback, RICH_BLACK_VARIATIONS } from './rich-black-utility.js';
 *
 * doc.addSVG(svgContent, x, y, {
 *   useCMYK: true,
 *   colorCallback: createRichBlackCallback(RICH_BLACK_VARIATIONS.warm)
 * });
 */

/**
 * Example 3: Using spot colors
 *
 * import { createRichBlackSpotColorMap, RICH_BLACK } from './rich-black-utility.js';
 *
 * doc.defineSpotColor("RichBlack", RICH_BLACK);
 * doc.addSVG(svgContent, x, y, {
 *   spotColorMap: createRichBlackSpotColorMap()
 * });
 */

/**
 * Example 4: Convert all colors to rich black
 *
 * import { createRichBlackCallback } from './rich-black-utility.js';
 *
 * doc.addSVG(svgContent, x, y, {
 *   useCMYK: true,
 *   colorCallback: createRichBlackCallback(RICH_BLACK, true) // true = convert all colors
 * });
 */
