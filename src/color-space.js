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

  // Get spot color by name
  getSpotColor(name) {
    return this.spotColors.get(name);
  }

  // Check if a color name is a registered spot color
  isSpotColor(name) {
    return this.spotColors.has(name);
  }
}
