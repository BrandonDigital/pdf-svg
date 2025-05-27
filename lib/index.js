// src/pdf-writer.js
import pako from "pako";
var PDFWriter = class {
  constructor() {
    this.objectCount = 0;
    this.objects = [];
    this.xref = [];
  }
  generatePDF(doc) {
    this.objectCount = 0;
    this.objects = [];
    this.xref = [];
    const catalogRef = this.allocateObject();
    const pagesRef = this.allocateObject();
    const pageRef = this.allocateObject();
    const contentRef = this.allocateObject();
    const resourcesRef = this.allocateObject();
    const contentStream = doc.contentStream.join("\n");
    const compressedContent = pako.deflate(contentStream);
    const resources = {};
    const colorSpaceDict = this.buildColorSpaceDict(doc.resources.ColorSpace);
    const extGStateDict = this.buildExtGStateDict(doc.resources.ExtGState);
    if (colorSpaceDict) {
      resources.ColorSpace = colorSpaceDict;
    }
    if (extGStateDict) {
      resources.ExtGState = extGStateDict;
    }
    this.addObject(resourcesRef, resources);
    this.addObject(
      contentRef,
      {
        Length: compressedContent.length,
        Filter: "/FlateDecode"
      },
      compressedContent
    );
    this.addObject(pageRef, {
      Type: "/Page",
      Parent: `${pagesRef} 0 R`,
      MediaBox: `[0 0 ${doc.width} ${doc.height}]`,
      Contents: `${contentRef} 0 R`,
      Resources: `${resourcesRef} 0 R`
    });
    this.addObject(pagesRef, {
      Type: "/Pages",
      Kids: `[${pageRef} 0 R]`,
      Count: 1
    });
    this.addObject(catalogRef, {
      Type: "/Catalog",
      Pages: `${pagesRef} 0 R`
    });
    let pdf = "%PDF-1.4\n";
    pdf += "%\xFF\xFF\xFF\xFF\n";
    for (let i = 1; i <= this.objectCount; i++) {
      const obj = this.objects[i];
      if (obj) {
        this.xref[i] = pdf.length;
        pdf += `${i} 0 obj
`;
        pdf += obj;
        pdf += "\nendobj\n";
      }
    }
    const xrefOffset = pdf.length;
    pdf += "xref\n";
    pdf += `0 ${this.objectCount + 1}
`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= this.objectCount; i++) {
      const offset = this.xref[i] || 0;
      pdf += offset.toString().padStart(10, "0") + " 00000 n \n";
    }
    pdf += "trailer\n";
    pdf += `<< /Size ${this.objectCount + 1} /Root ${catalogRef} 0 R >>
`;
    pdf += "startxref\n";
    pdf += `${xrefOffset}
`;
    pdf += "%%EOF";
    return Buffer.from(pdf, "binary");
  }
  allocateObject() {
    const ref = ++this.objectCount;
    this.objects[ref] = null;
    return ref;
  }
  addObject(ref, dict, stream) {
    const lines = ["<<"];
    for (const [key, value] of Object.entries(dict)) {
      if (value !== null && value !== void 0) {
        lines.push(`/${key} ${value}`);
      }
    }
    lines.push(">>");
    let obj = lines.join("\n");
    if (stream) {
      obj += "\nstream";
      this.objects[ref] = obj;
      this.objects[ref] += "\n" + Buffer.from(stream).toString("binary") + "\nendstream";
      return;
    }
    this.objects[ref] = obj;
  }
  buildColorSpaceDict(colorSpaces) {
    if (!colorSpaces || Object.keys(colorSpaces).length === 0) {
      return null;
    }
    const lines = ["<<"];
    for (const [name, cs] of Object.entries(colorSpaces)) {
      if (cs.type === "Separation") {
        const funcRef = this.allocateObject();
        this.addObject(funcRef, {
          FunctionType: 2,
          Domain: "[0 1]",
          C0: "[0 0 0 0]",
          // 0% tint = no color
          C1: `[${cs.tintTransform.c} ${cs.tintTransform.m} ${cs.tintTransform.y} ${cs.tintTransform.k}]`,
          // 100% tint
          N: 1
        });
        const csRef = this.allocateObject();
        const colorName = cs.name.replace(/[\s()]/g, "#20");
        const separationArray = `[/Separation /${colorName} /DeviceCMYK ${funcRef} 0 R]`;
        this.objects[csRef] = separationArray;
        lines.push(`/${name} ${csRef} 0 R`);
      }
    }
    lines.push(">>");
    return lines.join("\n");
  }
  buildExtGStateDict(extGStates) {
    if (!extGStates || Object.keys(extGStates).length === 0) {
      return null;
    }
    const lines = ["<<"];
    for (const [name, gs] of Object.entries(extGStates)) {
      const gsRef = this.allocateObject();
      this.addObject(gsRef, gs);
      lines.push(`/${name} ${gsRef} 0 R`);
    }
    lines.push(">>");
    return lines.join("\n");
  }
};

// src/svg-to-pdf.js
function SVGtoPDF(doc, svg, x = 0, y = 0, options = {}) {
  const parser = new SVGParser(doc, options);
  let svgElement;
  if (typeof svg === "string") {
    svgElement = parseSVGString(svg);
  } else {
    svgElement = svg;
  }
  doc.save();
  doc.translate(x, y);
  const viewBox = svgElement.getAttribute("viewBox");
  const width = parseFloat(svgElement.getAttribute("width")) || options.width || doc.width;
  const height = parseFloat(svgElement.getAttribute("height")) || options.height || doc.height;
  if (viewBox) {
    const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(parseFloat);
    const scale = Math.min(width / vw, height / vh);
    doc.scale(scale, scale);
    doc.translate(-vx, -vy);
  }
  parser.parseElement(svgElement);
  doc.restore();
}
var SVGParser = class {
  constructor(doc, options) {
    this.doc = doc;
    this.options = options;
    this.colorSpace = doc.colorSpace;
    this.spotColors = doc.spotColors;
  }
  parseElement(element, inheritedStyle = {}) {
    var _a;
    const tagName = (_a = element.tagName) == null ? void 0 : _a.toLowerCase();
    if (!tagName)
      return;
    const style = this.computeStyle(element, inheritedStyle);
    const transform = element.getAttribute("transform");
    if (transform) {
      this.doc.save();
      this.applyTransform(transform);
    }
    switch (tagName) {
      case "svg":
      case "g":
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
    if (transform) {
      this.doc.restore();
    }
  }
  computeStyle(element, inherited) {
    const style = { ...inherited };
    const attrs = [
      "fill",
      "stroke",
      "fill-opacity",
      "stroke-opacity",
      "opacity",
      "stroke-width",
      "fill-rule"
    ];
    attrs.forEach((attr) => {
      const value = element.getAttribute(attr);
      if (value !== null) {
        style[attr] = value;
      }
    });
    if (style.opacity) {
      const opacity = parseFloat(style.opacity);
      style["fill-opacity"] = (parseFloat(style["fill-opacity"] || 1) * opacity).toString();
      style["stroke-opacity"] = (parseFloat(style["stroke-opacity"] || 1) * opacity).toString();
    }
    return style;
  }
  applyTransform(transform) {
    const transforms = transform.match(/(\w+)\(([^)]+)\)/g);
    if (!transforms)
      return;
    transforms.forEach((t) => {
      const match = t.match(/(\w+)\(([^)]+)\)/);
      if (!match)
        return;
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
          const angle = (values[0] || 0) * Math.PI / 180;
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
    if (!d)
      return;
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
    this.applyStyle(style, true);
  }
  drawPolyline(element, style) {
    const points = this.parsePoints(element.getAttribute("points"));
    if (points.length < 2)
      return;
    this.doc.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      this.doc.lineTo(points[i], points[i + 1]);
    }
    this.applyStyle(style, true);
  }
  drawPolygon(element, style) {
    const points = this.parsePoints(element.getAttribute("points"));
    if (points.length < 2)
      return;
    this.doc.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      this.doc.lineTo(points[i], points[i + 1]);
    }
    this.doc.closePath();
    this.applyStyle(style);
  }
  parsePoints(pointsStr) {
    if (!pointsStr)
      return [];
    return pointsStr.trim().split(/[\s,]+/).map(parseFloat);
  }
  parsePath(d) {
    const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);
    if (!commands)
      return;
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    commands.forEach((cmd) => {
      const type = cmd[0];
      const values = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter((v) => !isNaN(v));
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
    const fill = style.fill !== void 0 ? style.fill : "black";
    const stroke = style.stroke;
    const fillOpacity = parseFloat(style["fill-opacity"] || 1);
    const strokeOpacity = parseFloat(style["stroke-opacity"] || 1);
    const strokeWidth = parseFloat(style["stroke-width"] || 1);
    const fillRule = style["fill-rule"] || "nonzero";
    if (fill && fill !== "none" && !strokeOnly) {
      this.applyColor(fill, "fill");
      this.doc.fillOpacity(fillOpacity);
    }
    if (stroke && stroke !== "none") {
      this.applyColor(stroke, "stroke");
      this.doc.strokeOpacity(strokeOpacity);
      this.doc.lineWidth(strokeWidth);
    }
    if (fill && fill !== "none" && stroke && stroke !== "none" && !strokeOnly) {
      this.doc.fillAndStroke(fillRule);
    } else if (fill && fill !== "none" && !strokeOnly) {
      this.doc.fill(fillRule);
    } else if (stroke && stroke !== "none") {
      this.doc.stroke();
    }
  }
  applyColor(color, type) {
    if (this.options.colorCallback) {
      const result = this.options.colorCallback(color);
      if (result) {
        color = result;
      }
    }
    if (this.options.spotColorMap && this.options.spotColorMap[color]) {
      const spotInfo = this.options.spotColorMap[color];
      if (type === "fill") {
        this.doc.fillSpotColor(spotInfo.name, spotInfo.tint || 1);
      } else {
        this.doc.strokeSpotColor(spotInfo.name, spotInfo.tint || 1);
      }
      return;
    }
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
    if (type === "fill") {
      this.doc.fillColor(color);
    } else {
      this.doc.strokeColor(color);
    }
  }
  parseColor(colorStr) {
    if (colorStr.startsWith("#")) {
      const hex = colorStr.slice(1);
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      return { r, g, b };
    }
    const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]) / 255,
        g: parseInt(rgbMatch[2]) / 255,
        b: parseInt(rgbMatch[3]) / 255
      };
    }
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
      purple: { r: 0.5, g: 0, b: 0.5 }
    };
    if (namedColors[colorStr.toLowerCase()]) {
      return namedColors[colorStr.toLowerCase()];
    }
    return { r: 0, g: 0, b: 0 };
  }
};
function parseSVGString(svgString) {
  const elements = [];
  const elementStack = [];
  const svgMatch = svgString.match(/<svg([^>]*)>/);
  const svgAttrs = svgMatch ? parseAttributes(svgMatch[1]) : {};
  const root = {
    tagName: "svg",
    getAttribute: (name) => svgAttrs[name] || null,
    children: elements
  };
  const elementRegex = /<(\w+)([^>]*)(\/>|>)/g;
  let match;
  while ((match = elementRegex.exec(svgString)) !== null) {
    const tagName = match[1].toLowerCase();
    const attrs = parseAttributes(match[2]);
    const selfClosing = match[3] === "/>";
    if (tagName === "svg")
      continue;
    const element = {
      tagName,
      getAttribute: (name) => attrs[name] || null,
      children: []
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

// src/color-space.js
var ColorSpace = class {
  constructor() {
    this.spotColors = /* @__PURE__ */ new Map();
  }
  // Convert RGB to CMYK using simple conversion formula
  rgbToCMYK(r, g, b) {
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));
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
      k: Math.max(0, Math.min(1, k))
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
        k: cmyk.k / 100
      }
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
};

// src/pdf-document.js
var PDFDocument = class {
  constructor(options = {}) {
    this.width = options.width || 595.28;
    this.height = options.height || 841.89;
    this.colorSpace = new ColorSpace();
    this.writer = new PDFWriter();
    this.currentColor = { type: "rgb", r: 0, g: 0, b: 0 };
    this.currentStrokeColor = { type: "rgb", r: 0, g: 0, b: 0 };
    this.currentLineWidth = 1;
    this.currentOpacity = { fill: 1, stroke: 1 };
    this.spotColors = /* @__PURE__ */ new Map();
    this.contentStream = [];
    this.resources = {
      ColorSpace: {},
      Pattern: {},
      ExtGState: {}
    };
    this._ctm = [1, 0, 0, 1, 0, 0];
    this._ctmStack = [];
  }
  // SVG rendering using SVG-to-PDFKit approach
  addSVG(svg, x, y, options = {}) {
    SVGtoPDF(this, svg, x, y, options);
    return this;
  }
  // Path drawing
  moveTo(x, y) {
    this.contentStream.push(`${x} ${y} m`);
    return this;
  }
  lineTo(x, y) {
    this.contentStream.push(`${x} ${y} l`);
    return this;
  }
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    this.contentStream.push(`${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x} ${y} c`);
    return this;
  }
  quadraticCurveTo(cpx, cpy, x, y) {
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
    this.contentStream.push(`${x} ${y} ${width} ${height} re`);
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
        b: b / 255
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
      k: k / 100
    };
    return this;
  }
  strokeColorCMYK(c, m, y, k) {
    this.currentStrokeColor = {
      type: "cmyk",
      c: c / 100,
      m: m / 100,
      y: y / 100,
      k: k / 100
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
        k: cmykFallback.k / 100
      }
    };
    this.spotColors.set(name, spotColor);
    const colorSpaceName = `CS${Object.keys(this.resources.ColorSpace).length + 1}`;
    this.resources.ColorSpace[colorSpaceName] = {
      type: "Separation",
      name,
      alternateSpace: "DeviceCMYK",
      tintTransform: spotColor.fallback
    };
    spotColor.resourceName = colorSpaceName;
    return this;
  }
  fillSpotColor(name, tint = 1) {
    const spotColor = this.spotColors.get(name);
    if (spotColor) {
      this.currentColor = { type: "spot", name, tint, spotColor };
    }
    return this;
  }
  strokeSpotColor(name, tint = 1) {
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
    this.contentStream.push(`${a} ${b} ${c} ${d} ${e} ${f} cm`);
    const [a1, b1, c1, d1, e1, f1] = this._ctm;
    this._ctm = [
      a * a1 + b * c1,
      a * b1 + b * d1,
      c * a1 + d * c1,
      c * b1 + d * d1,
      e * a1 + f * c1 + e1,
      e * b1 + f * d1 + f1
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
    this.contentStream.push(`${this.currentLineWidth} w`);
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
        [type === "fill" ? "ca" : "CA"]: value
      };
    }
    return key;
  }
  _setColor(color, type) {
    switch (color.type) {
      case "rgb":
        this.contentStream.push(
          `${color.r} ${color.g} ${color.b} ${type === "fill" ? "rg" : "RG"}`
        );
        break;
      case "cmyk":
        this.contentStream.push(
          `${color.c} ${color.m} ${color.y} ${color.k} ${type === "fill" ? "k" : "K"}`
        );
        break;
      case "spot":
        const resourceName = color.spotColor.resourceName;
        this.contentStream.push(
          `/${resourceName} ${type === "fill" ? "cs" : "CS"}`,
          `${color.tint} ${type === "fill" ? "scn" : "SCN"}`
        );
        break;
    }
  }
  _parseColor(colorStr) {
    if (colorStr.startsWith("#")) {
      const hex = colorStr.slice(1);
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      return { type: "rgb", r, g, b };
    }
    const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        type: "rgb",
        r: parseInt(rgbMatch[1]) / 255,
        g: parseInt(rgbMatch[2]) / 255,
        b: parseInt(rgbMatch[3]) / 255
      };
    }
    const namedColors = {
      red: { r: 1, g: 0, b: 0 },
      green: { r: 0, g: 1, b: 0 },
      blue: { r: 0, g: 0, b: 1 },
      black: { r: 0, g: 0, b: 0 },
      white: { r: 1, g: 1, b: 1 },
      yellow: { r: 1, g: 1, b: 0 },
      cyan: { r: 0, g: 1, b: 1 },
      magenta: { r: 1, g: 0, b: 1 }
    };
    if (namedColors[colorStr]) {
      return { type: "rgb", ...namedColors[colorStr] };
    }
    return { type: "rgb", r: 0, g: 0, b: 0 };
  }
};
export {
  ColorSpace,
  PDFDocument,
  SVGtoPDF
};
