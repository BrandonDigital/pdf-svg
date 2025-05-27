export function SVGtoPDF(doc, svg, x = 0, y = 0, options = {}) {
  const parser = new SVGParser(doc, options);

  // Parse SVG
  let svgElement;
  if (typeof svg === "string") {
    // For Node.js environments, we'll use a simple regex-based parser
    // In a browser environment, you would use DOMParser
    svgElement = parseSVGString(svg);
  } else {
    svgElement = svg;
  }

  // Save state
  doc.save();

  // Apply initial transformation
  doc.translate(x, y);

  // Process viewBox and dimensions
  const viewBox = svgElement.getAttribute("viewBox");
  const width =
    parseFloat(svgElement.getAttribute("width")) || options.width || doc.width;
  const height =
    parseFloat(svgElement.getAttribute("height")) ||
    options.height ||
    doc.height;

  if (viewBox) {
    const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(parseFloat);
    const scale = Math.min(width / vw, height / vh);
    doc.scale(scale, scale);
    doc.translate(-vx, -vy);
  }

  // Parse and render
  parser.parseElement(svgElement);

  // Restore state
  doc.restore();
}

class SVGParser {
  constructor(doc, options) {
    this.doc = doc;
    this.options = options;
    this.colorSpace = doc.colorSpace;
    this.spotColors = doc.spotColors;
  }

  parseElement(element, inheritedStyle = {}) {
    const tagName = element.tagName?.toLowerCase();
    if (!tagName) return;

    // Compute style for this element
    const style = this.computeStyle(element, inheritedStyle);

    // Apply transformations
    const transform = element.getAttribute("transform");
    if (transform) {
      this.doc.save();
      this.applyTransform(transform);
    }

    // Process element based on type
    switch (tagName) {
      case "svg":
      case "g":
        // Process children
        for (let child of element.children) {
          this.parseElement(child, style);
        }
        break;

      case "rect":
        this.drawRect(element, style);
        break;

      case "circle":
        this.drawCircle(element, style);
        break;

      case "ellipse":
        this.drawEllipse(element, style);
        break;

      case "path":
        this.drawPath(element, style);
        break;

      case "line":
        this.drawLine(element, style);
        break;

      case "polyline":
        this.drawPolyline(element, style);
        break;

      case "polygon":
        this.drawPolygon(element, style);
        break;
    }

    // Restore transformation
    if (transform) {
      this.doc.restore();
    }
  }

  computeStyle(element, inherited) {
    const style = { ...inherited };

    // Get presentation attributes
    const attrs = [
      "fill",
      "stroke",
      "fill-opacity",
      "stroke-opacity",
      "opacity",
      "stroke-width",
      "fill-rule",
    ];

    attrs.forEach((attr) => {
      const value = element.getAttribute(attr);
      if (value !== null) {
        style[attr] = value;
      }
    });

    // Apply opacity
    if (style.opacity) {
      const opacity = parseFloat(style.opacity);
      style["fill-opacity"] = (
        parseFloat(style["fill-opacity"] || 1) * opacity
      ).toString();
      style["stroke-opacity"] = (
        parseFloat(style["stroke-opacity"] || 1) * opacity
      ).toString();
    }

    return style;
  }

  applyTransform(transform) {
    const transforms = transform.match(/(\w+)\(([^)]+)\)/g);
    if (!transforms) return;

    transforms.forEach((t) => {
      const match = t.match(/(\w+)\(([^)]+)\)/);
      if (!match) return;

      const type = match[1];
      const values = match[2].split(/[\s,]+/).map(parseFloat);

      switch (type) {
        case "translate":
          this.doc.translate(values[0] || 0, values[1] || 0);
          break;
        case "scale":
          this.doc.scale(values[0] || 1, values[1] || values[0] || 1);
          break;
        case "rotate":
          const angle = ((values[0] || 0) * Math.PI) / 180;
          this.doc.rotate(angle, values[1] || 0, values[2] || 0);
          break;
        case "matrix":
          if (values.length === 6) {
            this.doc.transform(...values);
          }
          break;
      }
    });
  }

  drawRect(element, style) {
    const x = parseFloat(element.getAttribute("x")) || 0;
    const y = parseFloat(element.getAttribute("y")) || 0;
    const width = parseFloat(element.getAttribute("width")) || 0;
    const height = parseFloat(element.getAttribute("height")) || 0;
    const rx = parseFloat(element.getAttribute("rx")) || 0;
    const ry = parseFloat(element.getAttribute("ry")) || 0;

    if (rx || ry) {
      // Rounded rectangle
      const r = Math.min(rx || ry, ry || rx, width / 2, height / 2);
      this.doc.moveTo(x + r, y);
      this.doc.lineTo(x + width - r, y);
      this.doc.bezierCurveTo(
        x + width - r * 0.45,
        y,
        x + width,
        y + r * 0.45,
        x + width,
        y + r
      );
      this.doc.lineTo(x + width, y + height - r);
      this.doc.bezierCurveTo(
        x + width,
        y + height - r * 0.45,
        x + width - r * 0.45,
        y + height,
        x + width - r,
        y + height
      );
      this.doc.lineTo(x + r, y + height);
      this.doc.bezierCurveTo(
        x + r * 0.45,
        y + height,
        x,
        y + height - r * 0.45,
        x,
        y + height - r
      );
      this.doc.lineTo(x, y + r);
      this.doc.bezierCurveTo(x, y + r * 0.45, x + r * 0.45, y, x + r, y);
      this.doc.closePath();
    } else {
      this.doc.rect(x, y, width, height);
    }

    this.applyStyle(style);
  }

  drawCircle(element, style) {
    const cx = parseFloat(element.getAttribute("cx")) || 0;
    const cy = parseFloat(element.getAttribute("cy")) || 0;
    const r = parseFloat(element.getAttribute("r")) || 0;

    this.doc.circle(cx, cy, r);
    this.applyStyle(style);
  }

  drawEllipse(element, style) {
    const cx = parseFloat(element.getAttribute("cx")) || 0;
    const cy = parseFloat(element.getAttribute("cy")) || 0;
    const rx = parseFloat(element.getAttribute("rx")) || 0;
    const ry = parseFloat(element.getAttribute("ry")) || 0;

    this.doc.ellipse(cx, cy, rx, ry);
    this.applyStyle(style);
  }

  drawPath(element, style) {
    const d = element.getAttribute("d");
    if (!d) return;

    this.parsePath(d);
    this.applyStyle(style);
  }

  drawLine(element, style) {
    const x1 = parseFloat(element.getAttribute("x1")) || 0;
    const y1 = parseFloat(element.getAttribute("y1")) || 0;
    const x2 = parseFloat(element.getAttribute("x2")) || 0;
    const y2 = parseFloat(element.getAttribute("y2")) || 0;

    this.doc.moveTo(x1, y1);
    this.doc.lineTo(x2, y2);
    this.applyStyle(style, true); // lines only stroke
  }

  drawPolyline(element, style) {
    const points = this.parsePoints(element.getAttribute("points"));
    if (points.length < 2) return;

    this.doc.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      this.doc.lineTo(points[i], points[i + 1]);
    }
    this.applyStyle(style, true); // polylines only stroke by default
  }

  drawPolygon(element, style) {
    const points = this.parsePoints(element.getAttribute("points"));
    if (points.length < 2) return;

    this.doc.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      this.doc.lineTo(points[i], points[i + 1]);
    }
    this.doc.closePath();
    this.applyStyle(style);
  }

  parsePoints(pointsStr) {
    if (!pointsStr) return [];
    return pointsStr
      .trim()
      .split(/[\s,]+/)
      .map(parseFloat);
  }

  parsePath(d) {
    // Simple SVG path parser
    const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);
    if (!commands) return;

    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;

    commands.forEach((cmd) => {
      const type = cmd[0];
      const values = cmd
        .slice(1)
        .trim()
        .split(/[\s,]+/)
        .map(parseFloat)
        .filter((v) => !isNaN(v));

      switch (type) {
        case "M":
          currentX = values[0];
          currentY = values[1];
          startX = currentX;
          startY = currentY;
          this.doc.moveTo(currentX, currentY);
          break;
        case "m":
          currentX += values[0];
          currentY += values[1];
          startX = currentX;
          startY = currentY;
          this.doc.moveTo(currentX, currentY);
          break;
        case "L":
          currentX = values[0];
          currentY = values[1];
          this.doc.lineTo(currentX, currentY);
          break;
        case "l":
          currentX += values[0];
          currentY += values[1];
          this.doc.lineTo(currentX, currentY);
          break;
        case "H":
          currentX = values[0];
          this.doc.lineTo(currentX, currentY);
          break;
        case "h":
          currentX += values[0];
          this.doc.lineTo(currentX, currentY);
          break;
        case "V":
          currentY = values[0];
          this.doc.lineTo(currentX, currentY);
          break;
        case "v":
          currentY += values[0];
          this.doc.lineTo(currentX, currentY);
          break;
        case "C":
          this.doc.bezierCurveTo(
            values[0],
            values[1],
            values[2],
            values[3],
            values[4],
            values[5]
          );
          currentX = values[4];
          currentY = values[5];
          break;
        case "c":
          this.doc.bezierCurveTo(
            currentX + values[0],
            currentY + values[1],
            currentX + values[2],
            currentY + values[3],
            currentX + values[4],
            currentY + values[5]
          );
          currentX += values[4];
          currentY += values[5];
          break;
        case "Q":
          this.doc.quadraticCurveTo(values[0], values[1], values[2], values[3]);
          currentX = values[2];
          currentY = values[3];
          break;
        case "q":
          this.doc.quadraticCurveTo(
            currentX + values[0],
            currentY + values[1],
            currentX + values[2],
            currentY + values[3]
          );
          currentX += values[2];
          currentY += values[3];
          break;
        case "Z":
        case "z":
          this.doc.closePath();
          currentX = startX;
          currentY = startY;
          break;
      }
    });
  }

  applyStyle(style, strokeOnly = false) {
    const fill = style.fill !== undefined ? style.fill : "black";
    const stroke = style.stroke;
    const fillOpacity = parseFloat(style["fill-opacity"] || 1);
    const strokeOpacity = parseFloat(style["stroke-opacity"] || 1);
    const strokeWidth = parseFloat(style["stroke-width"] || 1);
    const fillRule = style["fill-rule"] || "nonzero";

    // Apply colors and styles
    if (fill && fill !== "none" && !strokeOnly) {
      this.applyColor(fill, "fill");
      this.doc.fillOpacity(fillOpacity);
    }

    if (stroke && stroke !== "none") {
      this.applyColor(stroke, "stroke");
      this.doc.strokeOpacity(strokeOpacity);
      this.doc.lineWidth(strokeWidth);
    }

    // Perform fill/stroke operations
    if (fill && fill !== "none" && stroke && stroke !== "none" && !strokeOnly) {
      this.doc.fillAndStroke(fillRule);
    } else if (fill && fill !== "none" && !strokeOnly) {
      this.doc.fill(fillRule);
    } else if (stroke && stroke !== "none") {
      this.doc.stroke();
    }
  }

  applyColor(color, type) {
    // Check for color callback
    if (this.options.colorCallback) {
      const result = this.options.colorCallback(color);
      if (result) {
        color = result;
      }
    }

    // Check for spot color mapping
    if (this.options.spotColorMap && this.options.spotColorMap[color]) {
      const spotInfo = this.options.spotColorMap[color];
      if (type === "fill") {
        this.doc.fillSpotColor(spotInfo.name, spotInfo.tint || 1);
      } else {
        this.doc.strokeSpotColor(spotInfo.name, spotInfo.tint || 1);
      }
      return;
    }

    // Convert to CMYK if requested
    if (this.options.useCMYK) {
      const rgb = this.parseColor(color);
      if (rgb) {
        const cmyk = this.colorSpace.rgbToCMYK(rgb.r, rgb.g, rgb.b);
        if (type === "fill") {
          this.doc.fillColorCMYK(
            cmyk.c * 100,
            cmyk.m * 100,
            cmyk.y * 100,
            cmyk.k * 100
          );
        } else {
          this.doc.strokeColorCMYK(
            cmyk.c * 100,
            cmyk.m * 100,
            cmyk.y * 100,
            cmyk.k * 100
          );
        }
        return;
      }
    }

    // Default RGB color
    if (type === "fill") {
      this.doc.fillColor(color);
    } else {
      this.doc.strokeColor(color);
    }
  }

  parseColor(colorStr) {
    // Handle hex colors
    if (colorStr.startsWith("#")) {
      const hex = colorStr.slice(1);
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      return { r, g, b };
    }

    // Handle rgb() colors
    const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
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
      gray: { r: 0.5, g: 0.5, b: 0.5 },
      grey: { r: 0.5, g: 0.5, b: 0.5 },
      orange: { r: 1, g: 0.647, b: 0 },
      purple: { r: 0.5, g: 0, b: 0.5 },
    };

    if (namedColors[colorStr.toLowerCase()]) {
      return namedColors[colorStr.toLowerCase()];
    }

    return { r: 0, g: 0, b: 0 };
  }
}

// Simple SVG string parser for Node.js environments
function parseSVGString(svgString) {
  const elements = [];
  const elementStack = [];

  // Extract SVG attributes
  const svgMatch = svgString.match(/<svg([^>]*)>/);
  const svgAttrs = svgMatch ? parseAttributes(svgMatch[1]) : {};

  const root = {
    tagName: "svg",
    getAttribute: (name) => svgAttrs[name] || null,
    children: elements,
  };

  // Simple regex-based parser for basic SVG elements
  const elementRegex = /<(\w+)([^>]*)(\/>|>)/g;
  let match;

  while ((match = elementRegex.exec(svgString)) !== null) {
    const tagName = match[1].toLowerCase();
    const attrs = parseAttributes(match[2]);
    const selfClosing = match[3] === "/>";

    if (tagName === "svg") continue;

    const element = {
      tagName,
      getAttribute: (name) => attrs[name] || null,
      children: [],
    };

    elements.push(element);
  }

  return root;
}

function parseAttributes(attrString) {
  const attrs = {};
  const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
  let match;

  while ((match = attrRegex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}
