export class ColorSpace {
  constructor() {
    this.spotColors = new Map();
  }

  // Convert RGB to CMYK using simple conversion formula
  rgbToCMYK(r, g, b) {
    // Ensure values are in 0-1 range
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));

    const k = 1 - Math.max(r, g, b);

    if (k === 1) {
      // Pure black
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

  // Convert RGB to LAB color space
  rgbToLab(r, g, b) {
    // Ensure values are in 0-1 range
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));

    // Convert RGB to XYZ
    const xyz = this.rgbToXyz(r, g, b);

    // Convert XYZ to LAB
    return this.xyzToLab(xyz.x, xyz.y, xyz.z);
  }

  // Convert RGB to XYZ color space (D65 illuminant)
  rgbToXyz(r, g, b) {
    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Apply sRGB to XYZ transformation matrix (D65)
    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
    const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

    return { x, y, z };
  }

  // Convert XYZ to LAB color space
  xyzToLab(x, y, z) {
    // D65 reference white point
    const xn = 0.95047;
    const yn = 1.0;
    const zn = 1.08883;

    // Normalize by reference white
    x = x / xn;
    y = y / yn;
    z = z / zn;

    // Apply LAB transformation
    const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b_lab = 200 * (fy - fz);

    return {
      L: Math.max(0, Math.min(100, L)),
      a: Math.max(-128, Math.min(127, a)),
      b: Math.max(-128, Math.min(127, b_lab)),
    };
  }

  // Convert LAB to XYZ color space
  labToXyz(L, a, b) {
    // D65 reference white point
    const xn = 0.95047;
    const yn = 1.0;
    const zn = 1.08883;

    const fy = (L + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - b / 200;

    const x = fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16 / 116) / 7.787;
    const y = fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16 / 116) / 7.787;
    const z = fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16 / 116) / 7.787;

    return {
      x: x * xn,
      y: y * yn,
      z: z * zn,
    };
  }

  // Convert LAB to RGB color space
  labToRgb(L, a, b) {
    // Convert LAB to XYZ
    const xyz = this.labToXyz(L, a, b);

    // Convert XYZ to RGB
    return this.xyzToRgb(xyz.x, xyz.y, xyz.z);
  }

  // Convert XYZ to RGB color space
  xyzToRgb(x, y, z) {
    // Apply XYZ to sRGB transformation matrix (D65)
    let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.969266 + y * 1.8760108 + z * 0.041556;
    let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

    // Apply gamma correction
    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

    return {
      r: Math.max(0, Math.min(1, r)),
      g: Math.max(0, Math.min(1, g)),
      b: Math.max(0, Math.min(1, b)),
    };
  }

  // Register a spot color with CMYK fallback
  defineSpotColor(name, cmyk) {
    this.spotColors.set(name, {
      name,
      fallback: {
        c: cmyk.c / 100,
        m: cmyk.m / 100,
        y: cmyk.y / 100,
        k: cmyk.k / 100,
      },
    });
    return this;
  }

  // Register a LAB spot color with LAB fallback
  defineLabSpotColor(name, lab) {
    this.spotColors.set(name, {
      name,
      type: "lab",
      fallback: {
        L: Math.max(0, Math.min(100, lab.L)),
        a: Math.max(-128, Math.min(127, lab.a)),
        b: Math.max(-128, Math.min(127, lab.b)),
      },
    });
    return this;
  }

  // Register a LAB spot color with RGB input (auto-converted to LAB)
  defineLabSpotColorFromRgb(name, r, g, b) {
    const lab = this.rgbToLab(r / 255, g / 255, b / 255);
    return this.defineLabSpotColor(name, lab);
  }

  // Get spot color by name
  getSpotColor(name) {
    return this.spotColors.get(name);
  }

  // Check if a color name is a registered spot color
  isSpotColor(name) {
    return this.spotColors.has(name);
  }
}
