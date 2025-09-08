import { PDFWriter } from "./pdf-writer.js";
import { SVGtoPDF } from "./svg-to-pdf.js";
import { ColorSpace } from "./color-space.js";

export class PDFDocument {
  constructor(options = {}) {
    this.width = options.width || 595.28; // A4 width in points
    this.height = options.height || 841.89; // A4 height in points
    this.colorSpace = new ColorSpace();
    this.writer = new PDFWriter();
    this.currentColor = { type: "rgb", r: 0, g: 0, b: 0 };
    this.currentStrokeColor = { type: "rgb", r: 0, g: 0, b: 0 };
    this.currentLineWidth = 1;
    this.currentOpacity = { fill: 1, stroke: 1 };
    this.spotColors = new Map();
    this.contentStream = [];
    this.resources = {
      ColorSpace: {},
      Pattern: {},
      ExtGState: {},
    };
    this._ctm = [1, 0, 0, 1, 0, 0]; // Current transformation matrix
    this._ctmStack = [];
  }

  // SVG rendering using SVG-to-PDFKit approach
  addSVG(svg, x, y, options = {}) {
    SVGtoPDF(this, svg, x, y, options);
    return this;
  }

  // Helper method to format numbers for PDF
  _formatNumber(num) {
    if (typeof num !== "number" || !isFinite(num)) {
      console.warn(`Invalid number in PDF: ${num}, using 0`);
      return "0";
    }
    // Round to 6 decimal places to avoid precision issues
    return Number(num.toFixed(6)).toString();
  }

  // Path drawing
  moveTo(x, y) {
    this.contentStream.push(
      `${this._formatNumber(x)} ${this._formatNumber(y)} m`
    );
    return this;
  }

  lineTo(x, y) {
    this.contentStream.push(
      `${this._formatNumber(x)} ${this._formatNumber(y)} l`
    );
    return this;
  }

  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    this.contentStream.push(
      `${this._formatNumber(cp1x)} ${this._formatNumber(
        cp1y
      )} ${this._formatNumber(cp2x)} ${this._formatNumber(
        cp2y
      )} ${this._formatNumber(x)} ${this._formatNumber(y)} c`
    );
    return this;
  }

  quadraticCurveTo(cpx, cpy, x, y) {
    // Convert quadratic to cubic bezier
    const cp1x = cpx;
    const cp1y = cpy;
    const cp2x = cpx;
    const cp2y = cpy;
    return this.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }

  closePath() {
    this.contentStream.push("h");
    return this;
  }

  // Rectangle drawing
  rect(x, y, width, height) {
    this.contentStream.push(
      `${this._formatNumber(x)} ${this._formatNumber(y)} ${this._formatNumber(
        width
      )} ${this._formatNumber(height)} re`
    );
    return this;
  }

  // Circle (using bezier curves)
  circle(cx, cy, r) {
    const kappa = 0.5522847498;
    const ox = r * kappa;
    const oy = r * kappa;

    this.moveTo(cx - r, cy);
    this.bezierCurveTo(cx - r, cy + oy, cx - ox, cy + r, cx, cy + r);
    this.bezierCurveTo(cx + ox, cy + r, cx + r, cy + oy, cx + r, cy);
    this.bezierCurveTo(cx + r, cy - oy, cx + ox, cy - r, cx, cy - r);
    this.bezierCurveTo(cx - ox, cy - r, cx - r, cy - oy, cx - r, cy);
    this.closePath();
    return this;
  }

  // Ellipse
  ellipse(cx, cy, rx, ry) {
    const kappa = 0.5522847498;
    const ox = rx * kappa;
    const oy = ry * kappa;

    this.moveTo(cx - rx, cy);
    this.bezierCurveTo(cx - rx, cy + oy, cx - ox, cy + ry, cx, cy + ry);
    this.bezierCurveTo(cx + ox, cy + ry, cx + rx, cy + oy, cx + rx, cy);
    this.bezierCurveTo(cx + rx, cy - oy, cx + ox, cy - ry, cx, cy - ry);
    this.bezierCurveTo(cx - ox, cy - ry, cx - rx, cy - oy, cx - rx, cy);
    this.closePath();
    return this;
  }

  // Path operations
  fill(fillRule) {
    this._setFillColor();
    this._setFillOpacity();
    this.contentStream.push(fillRule === "evenodd" ? "f*" : "f");
    return this;
  }

  stroke() {
    this._setStrokeColor();
    this._setStrokeOpacity();
    this._setLineWidth();
    this.contentStream.push("S");
    return this;
  }

  fillAndStroke(fillRule) {
    this._setFillColor();
    this._setStrokeColor();
    this._setFillOpacity();
    this._setStrokeOpacity();
    this._setLineWidth();
    this.contentStream.push(fillRule === "evenodd" ? "B*" : "B");
    return this;
  }

  // Line width
  lineWidth(width) {
    this.currentLineWidth = width;
    return this;
  }

  // Opacity
  fillOpacity(opacity) {
    this.currentOpacity.fill = opacity;
    return this;
  }

  strokeOpacity(opacity) {
    this.currentOpacity.stroke = opacity;
    return this;
  }

  opacity(opacity) {
    this.currentOpacity.fill = opacity;
    this.currentOpacity.stroke = opacity;
    return this;
  }

  // Color methods
  fillColor(r, g, b) {
    if (typeof r === "string") {
      const color = this._parseColor(r);
      this.currentColor = color;
    } else {
      this.currentColor = { type: "rgb", r: r / 255, g: g / 255, b: b / 255 };
    }
    return this;
  }

  strokeColor(r, g, b) {
    if (typeof r === "string") {
      const color = this._parseColor(r);
      this.currentStrokeColor = color;
    } else {
      this.currentStrokeColor = {
        type: "rgb",
        r: r / 255,
        g: g / 255,
        b: b / 255,
      };
    }
    return this;
  }

  fillColorCMYK(c, m, y, k) {
    this.currentColor = {
      type: "cmyk",
      c: c / 100,
      m: m / 100,
      y: y / 100,
      k: k / 100,
    };
    return this;
  }

  strokeColorCMYK(c, m, y, k) {
    this.currentStrokeColor = {
      type: "cmyk",
      c: c / 100,
      m: m / 100,
      y: y / 100,
      k: k / 100,
    };
    return this;
  }

  // LAB color methods
  fillColorLab(L, a, b) {
    this.currentColor = {
      type: "lab",
      L: Math.max(0, Math.min(100, L)),
      a: Math.max(-128, Math.min(127, a)),
      b: Math.max(-128, Math.min(127, b)),
    };
    return this;
  }

  strokeColorLab(L, a, b) {
    this.currentStrokeColor = {
      type: "lab",
      L: Math.max(0, Math.min(100, L)),
      a: Math.max(-128, Math.min(127, a)),
      b: Math.max(-128, Math.min(127, b)),
    };
    return this;
  }

  defineSpotColor(name, cmykFallback) {
    const spotColor = {
      name,
      fallback: {
        c: cmykFallback.c / 100,
        m: cmykFallback.m / 100,
        y: cmykFallback.y / 100,
        k: cmykFallback.k / 100,
      },
    };
    this.spotColors.set(name, spotColor);

    // Register spot color in resources
    const colorSpaceName = `CS${
      Object.keys(this.resources.ColorSpace).length + 1
    }`;
    this.resources.ColorSpace[colorSpaceName] = {
      type: "Separation",
      name: name,
      alternateSpace: "DeviceCMYK",
      tintTransform: spotColor.fallback,
    };
    spotColor.resourceName = colorSpaceName;

    return this;
  }

  // Convenience method for defining spot colors with CMYK values
  defineSpotColorCMYK(name, c, m, y, k) {
    return this.defineSpotColor(name, { c, m, y, k });
  }

  // Define LAB spot color
  defineLabSpotColor(name, labFallback) {
    const spotColor = {
      name,
      type: "lab",
      fallback: {
        L: Math.max(0, Math.min(100, labFallback.L)),
        a: Math.max(-128, Math.min(127, labFallback.a)),
        b: Math.max(-128, Math.min(127, labFallback.b)),
      },
    };
    this.spotColors.set(name, spotColor);

    // Register LAB spot color in resources
    const colorSpaceName = `CS${
      Object.keys(this.resources.ColorSpace).length + 1
    }`;
    this.resources.ColorSpace[colorSpaceName] = {
      type: "Lab",
      name: name,
      alternateSpace: "Lab",
      labFallback: spotColor.fallback,
    };
    spotColor.resourceName = colorSpaceName;

    return this;
  }

  // Convenience method for defining LAB spot colors with LAB values
  defineLabSpotColorLab(name, L, a, b) {
    return this.defineLabSpotColor(name, { L, a, b });
  }

  fillSpotColor(name, tint = 1.0) {
    const spotColor = this.spotColors.get(name);
    if (spotColor) {
      this.currentColor = { type: "spot", name, tint, spotColor };
    }
    return this;
  }

  strokeSpotColor(name, tint = 1.0) {
    const spotColor = this.spotColors.get(name);
    if (spotColor) {
      this.currentStrokeColor = { type: "spot", name, tint, spotColor };
    }
    return this;
  }

  // Transformation methods
  save() {
    this.contentStream.push("q");
    this._ctmStack.push([...this._ctm]);
    return this;
  }

  restore() {
    this.contentStream.push("Q");
    if (this._ctmStack.length > 0) {
      this._ctm = this._ctmStack.pop();
    }
    return this;
  }

  translate(x, y) {
    this.transform(1, 0, 0, 1, x, y);
    return this;
  }

  scale(sx, sy = sx) {
    this.transform(sx, 0, 0, sy, 0, 0);
    return this;
  }

  rotate(angle, cx = 0, cy = 0) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    if (cx !== 0 || cy !== 0) {
      this.translate(cx, cy);
      this.transform(cos, sin, -sin, cos, 0, 0);
      this.translate(-cx, -cy);
    } else {
      this.transform(cos, sin, -sin, cos, 0, 0);
    }
    return this;
  }

  transform(a, b, c, d, e, f) {
    this.contentStream.push(
      `${this._formatNumber(a)} ${this._formatNumber(b)} ${this._formatNumber(
        c
      )} ${this._formatNumber(d)} ${this._formatNumber(e)} ${this._formatNumber(
        f
      )} cm`
    );

    // Update CTM
    const [a1, b1, c1, d1, e1, f1] = this._ctm;
    this._ctm = [
      a * a1 + b * c1,
      a * b1 + b * d1,
      c * a1 + d * c1,
      c * b1 + d * d1,
      e * a1 + f * c1 + e1,
      e * b1 + f * d1 + f1,
    ];

    return this;
  }

  // Generate PDF
  end() {
    return this.writer.generatePDF(this);
  }

  // Private methods
  _setFillColor() {
    this._setColor(this.currentColor, "fill");
  }

  _setStrokeColor() {
    this._setColor(this.currentStrokeColor, "stroke");
  }

  _setLineWidth() {
    this.contentStream.push(`${this._formatNumber(this.currentLineWidth)} w`);
  }

  _setFillOpacity() {
    if (this.currentOpacity.fill < 1) {
      const gsName = this._getOpacityGState("fill", this.currentOpacity.fill);
      this.contentStream.push(`/${gsName} gs`);
    }
  }

  _setStrokeOpacity() {
    if (this.currentOpacity.stroke < 1) {
      const gsName = this._getOpacityGState(
        "stroke",
        this.currentOpacity.stroke
      );
      this.contentStream.push(`/${gsName} gs`);
    }
  }

  _getOpacityGState(type, value) {
    const key = `${type}_${value}`;
    if (!this.resources.ExtGState[key]) {
      this.resources.ExtGState[key] = {
        [type === "fill" ? "ca" : "CA"]: value,
      };
    }
    return key;
  }

  _ensureLabColorSpace() {
    // Check if we already have a LAB color space
    for (const [name, cs] of Object.entries(this.resources.ColorSpace)) {
      if (cs.type === "Lab" && !cs.name) {
        // Generic LAB space, not a spot color
        return name;
      }
    }

    // Create a new LAB color space
    const colorSpaceName = `LAB${
      Object.keys(this.resources.ColorSpace).length + 1
    }`;
    this.resources.ColorSpace[colorSpaceName] = {
      type: "Lab",
      whitePoint: [0.95047, 1.0, 1.08883], // D65 white point
      range: [0, 100, -128, 127, -128, 127], // L*, a*, and b* ranges
    };

    return colorSpaceName;
  }

  _setColor(color, type) {
    switch (color.type) {
      case "rgb":
        this.contentStream.push(
          `${this._formatNumber(color.r)} ${this._formatNumber(
            color.g
          )} ${this._formatNumber(color.b)} ${type === "fill" ? "rg" : "RG"}`
        );
        break;
      case "cmyk":
        this.contentStream.push(
          `${this._formatNumber(color.c)} ${this._formatNumber(
            color.m
          )} ${this._formatNumber(color.y)} ${this._formatNumber(color.k)} ${
            type === "fill" ? "k" : "K"
          }`
        );
        break;
      case "lab":
        // For LAB colors, we need to use a device-independent color space
        // First ensure we have a LAB color space resource
        const labColorSpaceName = this._ensureLabColorSpace();
        this.contentStream.push(
          `/${labColorSpaceName} ${type === "fill" ? "cs" : "CS"}`,
          `${this._formatNumber(color.L / 100)} ${this._formatNumber(
            (color.a + 128) / 255
          )} ${this._formatNumber((color.b + 128) / 255)} ${
            type === "fill" ? "scn" : "SCN"
          }`
        );
        break;
      case "spot":
        const resourceName = color.spotColor.resourceName;
        this.contentStream.push(
          `/${resourceName} ${type === "fill" ? "cs" : "CS"}`,
          `${this._formatNumber(color.tint)} ${type === "fill" ? "scn" : "SCN"}`
        );
        break;
    }
  }

  _parseColor(colorStr) {
    // Handle hex colors
    if (colorStr.startsWith("#")) {
      const hex = colorStr.slice(1);
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      return { type: "rgb", r, g, b };
    }

    // Handle rgb() colors
    const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        type: "rgb",
        r: parseInt(rgbMatch[1]) / 255,
        g: parseInt(rgbMatch[2]) / 255,
        b: parseInt(rgbMatch[3]) / 255,
      };
    }

    // Handle named colors
    const namedColors = {
      red: { r: 1, g: 0, b: 0 },
      green: { r: 0, g: 1, b: 0 },
      blue: { r: 0, g: 0, b: 1 },
      black: { r: 0, g: 0, b: 0 },
      white: { r: 1, g: 1, b: 1 },
      yellow: { r: 1, g: 1, b: 0 },
      cyan: { r: 0, g: 1, b: 1 },
      magenta: { r: 1, g: 0, b: 1 },
    };

    if (namedColors[colorStr]) {
      return { type: "rgb", ...namedColors[colorStr] };
    }

    return { type: "rgb", r: 0, g: 0, b: 0 };
  }
}
