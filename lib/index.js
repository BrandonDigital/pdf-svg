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
    if (typeof dict === "string") {
      this.objects[ref] = dict;
      return;
    }
    const lines = ["<<"];
    for (const [key, value] of Object.entries(dict)) {
      if (value !== null && value !== void 0) {
        lines.push(`  /${key} ${value}`);
      }
    }
    lines.push(">>");
    let obj = lines.join("\n");
    if (stream) {
      obj += "\nstream\n";
      this.objects[ref] = obj + Buffer.from(stream).toString("binary") + "\nendstream";
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

// src/svg-parser.js
var SVGParser = class {
  parse(svgString) {
    svgString = svgString.trim();
    const root = this.parseElement(svgString);
    return root;
  }
  parseElement(str) {
    const openTagMatch = str.match(/^<(\w+)([^>]*)>/);
    if (!openTagMatch)
      return null;
    const tagName = openTagMatch[1];
    const attrsString = openTagMatch[2];
    const element = {
      tagName: tagName.toLowerCase(),
      attributes: this.parseAttributes(attrsString),
      children: []
    };
    str = str.substring(openTagMatch[0].length);
    if (attrsString.endsWith("/")) {
      return element;
    }
    const closingTag = `</${tagName}>`;
    const closingIndex = str.lastIndexOf(closingTag);
    if (closingIndex === -1) {
      console.warn(`No closing tag found for ${tagName}`);
      return element;
    }
    const innerContent = str.substring(0, closingIndex);
    element.children = this.parseChildren(innerContent);
    return element;
  }
  parseChildren(str) {
    const children = [];
    let remaining = str.trim();
    while (remaining) {
      remaining = remaining.trim();
      if (!remaining)
        break;
      if (remaining.startsWith("<")) {
        const tagMatch = remaining.match(/^<(\w+)([^>]*)>/);
        if (tagMatch) {
          const tagName = tagMatch[1];
          const isSelfClosing = tagMatch[2].endsWith("/");
          if (isSelfClosing) {
            const element = {
              tagName: tagName.toLowerCase(),
              attributes: this.parseAttributes(tagMatch[2]),
              children: []
            };
            children.push(element);
            remaining = remaining.substring(tagMatch[0].length);
          } else {
            const closingTag = `</${tagName}>`;
            let depth = 1;
            let pos = tagMatch[0].length;
            while (depth > 0 && pos < remaining.length) {
              const nextOpen = remaining.indexOf(`<${tagName}`, pos);
              const nextClose = remaining.indexOf(closingTag, pos);
              if (nextClose === -1)
                break;
              if (nextOpen !== -1 && nextOpen < nextClose) {
                depth++;
                pos = nextOpen + 1;
              } else {
                depth--;
                if (depth === 0) {
                  const fullElement = remaining.substring(
                    0,
                    nextClose + closingTag.length
                  );
                  const element = this.parseElement(fullElement);
                  if (element)
                    children.push(element);
                  remaining = remaining.substring(
                    nextClose + closingTag.length
                  );
                } else {
                  pos = nextClose + 1;
                }
              }
            }
            if (depth > 0) {
              console.warn(`Unclosed tag: ${tagName}`);
              break;
            }
          }
        } else {
          remaining = remaining.substring(1);
        }
      } else {
        const nextTag = remaining.indexOf("<");
        if (nextTag === -1) {
          break;
        } else {
          remaining = remaining.substring(nextTag);
        }
      }
    }
    return children;
  }
  parseAttributes(attrString) {
    const attrs = {};
    const attrRegex = /(\w+(?:-\w+)*)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?/g;
    let match;
    while ((match = attrRegex.exec(attrString)) !== null) {
      const name = match[1];
      const value = match[2] || match[3] || "";
      attrs[name] = value;
    }
    return attrs;
  }
};
function createElement(element) {
  return {
    tagName: element.tagName,
    getAttribute(name) {
      return element.attributes[name] || null;
    },
    children: element.children,
    attributes: element.attributes
  };
}

// src/svg-path.js
var SVGPath = class _SVGPath {
  static apply(doc, pathData) {
    const path = new _SVGPath();
    return path.parse(pathData).applyTo(doc);
  }
  constructor() {
    this.commands = [];
    this.currentX = 0;
    this.currentY = 0;
    this.startX = 0;
    this.startY = 0;
    this.lastCommand = "";
    this.lastControlX = 0;
    this.lastControlY = 0;
  }
  parse(d) {
    if (!d)
      return this;
    const pathData = d.trim();
    let currentIndex = 0;
    while (currentIndex < pathData.length) {
      while (currentIndex < pathData.length && /\s/.test(pathData[currentIndex])) {
        currentIndex++;
      }
      if (currentIndex >= pathData.length)
        break;
      const command = pathData[currentIndex];
      if (!/[MmLlHhVvCcSsQqTtAaZz]/.test(command)) {
        console.warn(`Invalid path command: ${command}`);
        currentIndex++;
        continue;
      }
      currentIndex++;
      const args = [];
      while (currentIndex < pathData.length) {
        while (currentIndex < pathData.length && /[\s,]/.test(pathData[currentIndex])) {
          currentIndex++;
        }
        if (currentIndex < pathData.length && /[MmLlHhVvCcSsQqTtAaZz]/.test(pathData[currentIndex])) {
          break;
        }
        let numStr = "";
        let hasDecimal = false;
        if (currentIndex < pathData.length && pathData[currentIndex] === "-") {
          numStr += "-";
          currentIndex++;
        }
        while (currentIndex < pathData.length && /\d/.test(pathData[currentIndex])) {
          numStr += pathData[currentIndex];
          currentIndex++;
        }
        if (currentIndex < pathData.length && pathData[currentIndex] === ".") {
          numStr += ".";
          currentIndex++;
          hasDecimal = true;
          while (currentIndex < pathData.length && /\d/.test(pathData[currentIndex])) {
            numStr += pathData[currentIndex];
            currentIndex++;
          }
        }
        if (numStr === "" && currentIndex < pathData.length && pathData[currentIndex] === ".") {
          numStr = "0.";
          currentIndex++;
          while (currentIndex < pathData.length && /\d/.test(pathData[currentIndex])) {
            numStr += pathData[currentIndex];
            currentIndex++;
          }
        }
        if (numStr !== "" && numStr !== "-") {
          args.push(parseFloat(numStr));
        } else if (numStr === "-") {
          currentIndex--;
          break;
        }
      }
      if (args.length > 0 || /[Zz]/.test(command)) {
        this.processCommand(command, args);
      }
    }
    return this;
  }
  processCommand(type, args) {
    switch (type) {
      case "M":
        if (args.length >= 2) {
          this.moveTo(args[0], args[1]);
          for (let i = 2; i < args.length; i += 2) {
            if (i + 1 < args.length) {
              this.lineTo(args[i], args[i + 1]);
            }
          }
        }
        break;
      case "m":
        this.moveTo(this.currentX + args[0], this.currentY + args[1]);
        for (let i = 2; i < args.length; i += 2) {
          this.lineTo(this.currentX + args[i], this.currentY + args[i + 1]);
        }
        break;
      case "L":
        for (let i = 0; i < args.length; i += 2) {
          this.lineTo(args[i], args[i + 1]);
        }
        break;
      case "l":
        for (let i = 0; i < args.length; i += 2) {
          this.lineTo(this.currentX + args[i], this.currentY + args[i + 1]);
        }
        break;
      case "H":
        for (let i = 0; i < args.length; i++) {
          this.lineTo(args[i], this.currentY);
        }
        break;
      case "h":
        for (let i = 0; i < args.length; i++) {
          this.lineTo(this.currentX + args[i], this.currentY);
        }
        break;
      case "V":
        for (let i = 0; i < args.length; i++) {
          this.lineTo(this.currentX, args[i]);
        }
        break;
      case "v":
        for (let i = 0; i < args.length; i++) {
          this.lineTo(this.currentX, this.currentY + args[i]);
        }
        break;
      case "C":
        for (let i = 0; i < args.length; i += 6) {
          this.bezierCurveTo(
            args[i],
            args[i + 1],
            args[i + 2],
            args[i + 3],
            args[i + 4],
            args[i + 5]
          );
        }
        break;
      case "c":
        for (let i = 0; i < args.length; i += 6) {
          this.bezierCurveTo(
            this.currentX + args[i],
            this.currentY + args[i + 1],
            this.currentX + args[i + 2],
            this.currentY + args[i + 3],
            this.currentX + args[i + 4],
            this.currentY + args[i + 5]
          );
        }
        break;
      case "S":
        for (let i = 0; i < args.length; i += 4) {
          this.smoothBezierCurveTo(
            args[i],
            args[i + 1],
            args[i + 2],
            args[i + 3]
          );
        }
        break;
      case "s":
        for (let i = 0; i < args.length; i += 4) {
          this.smoothBezierCurveTo(
            this.currentX + args[i],
            this.currentY + args[i + 1],
            this.currentX + args[i + 2],
            this.currentY + args[i + 3]
          );
        }
        break;
      case "Q":
        for (let i = 0; i < args.length; i += 4) {
          this.quadraticCurveTo(args[i], args[i + 1], args[i + 2], args[i + 3]);
        }
        break;
      case "q":
        for (let i = 0; i < args.length; i += 4) {
          this.quadraticCurveTo(
            this.currentX + args[i],
            this.currentY + args[i + 1],
            this.currentX + args[i + 2],
            this.currentY + args[i + 3]
          );
        }
        break;
      case "T":
        for (let i = 0; i < args.length; i += 2) {
          this.smoothQuadraticCurveTo(args[i], args[i + 1]);
        }
        break;
      case "t":
        for (let i = 0; i < args.length; i += 2) {
          this.smoothQuadraticCurveTo(
            this.currentX + args[i],
            this.currentY + args[i + 1]
          );
        }
        break;
      case "A":
        for (let i = 0; i < args.length; i += 7) {
          this.arcTo(
            args[i],
            args[i + 1],
            args[i + 2],
            args[i + 3],
            args[i + 4],
            args[i + 5],
            args[i + 6]
          );
        }
        break;
      case "a":
        for (let i = 0; i < args.length; i += 7) {
          this.arcTo(
            args[i],
            args[i + 1],
            args[i + 2],
            args[i + 3],
            args[i + 4],
            this.currentX + args[i + 5],
            this.currentY + args[i + 6]
          );
        }
        break;
      case "Z":
      case "z":
        this.closePath();
        break;
    }
  }
  moveTo(x, y) {
    this.commands.push({ type: "M", x, y });
    this.currentX = this.startX = x;
    this.currentY = this.startY = y;
    this.lastCommand = "M";
  }
  lineTo(x, y) {
    this.commands.push({ type: "L", x, y });
    this.currentX = x;
    this.currentY = y;
    this.lastCommand = "L";
  }
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    this.commands.push({
      type: "C",
      cp1x,
      cp1y,
      cp2x,
      cp2y,
      x,
      y
    });
    this.currentX = x;
    this.currentY = y;
    this.lastControlX = cp2x;
    this.lastControlY = cp2y;
    this.lastCommand = "C";
  }
  smoothBezierCurveTo(cp2x, cp2y, x, y) {
    let cp1x, cp1y;
    if (this.lastCommand === "C" || this.lastCommand === "S") {
      cp1x = 2 * this.currentX - this.lastControlX;
      cp1y = 2 * this.currentY - this.lastControlY;
    } else {
      cp1x = this.currentX;
      cp1y = this.currentY;
    }
    this.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    this.lastCommand = "S";
  }
  quadraticCurveTo(cpx, cpy, x, y) {
    const cp1x = this.currentX + 2 / 3 * (cpx - this.currentX);
    const cp1y = this.currentY + 2 / 3 * (cpy - this.currentY);
    const cp2x = x + 2 / 3 * (cpx - x);
    const cp2y = y + 2 / 3 * (cpy - y);
    this.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    this.lastControlX = cpx;
    this.lastControlY = cpy;
    this.lastCommand = "Q";
  }
  smoothQuadraticCurveTo(x, y) {
    let cpx, cpy;
    if (this.lastCommand === "Q" || this.lastCommand === "T") {
      cpx = 2 * this.currentX - this.lastControlX;
      cpy = 2 * this.currentY - this.lastControlY;
    } else {
      cpx = this.currentX;
      cpy = this.currentY;
    }
    this.quadraticCurveTo(cpx, cpy, x, y);
    this.lastCommand = "T";
  }
  arcTo(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
    if (rx === 0 || ry === 0) {
      this.lineTo(x, y);
      return;
    }
    const phi = xAxisRotation * Math.PI / 180;
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    largeArcFlag = !!largeArcFlag;
    sweepFlag = !!sweepFlag;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const x1 = cosPhi * (this.currentX - x) / 2 + sinPhi * (this.currentY - y) / 2;
    const y1 = -sinPhi * (this.currentX - x) / 2 + cosPhi * (this.currentY - y) / 2;
    const lambda = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry);
    if (lambda > 1) {
      rx *= Math.sqrt(lambda);
      ry *= Math.sqrt(lambda);
    }
    const sign = largeArcFlag === sweepFlag ? -1 : 1;
    const sq = Math.max(
      0,
      rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    );
    const coef = sign * Math.sqrt(sq / (rx * rx * y1 * y1 + ry * ry * x1 * x1));
    const cx1 = coef * rx * y1 / ry;
    const cy1 = -coef * ry * x1 / rx;
    const cx = cosPhi * cx1 - sinPhi * cy1 + (this.currentX + x) / 2;
    const cy = sinPhi * cx1 + cosPhi * cy1 + (this.currentY + y) / 2;
    const theta1 = Math.atan2((y1 - cy1) / ry, (x1 - cx1) / rx);
    const dtheta = Math.atan2((-y1 - cy1) / ry, (-x1 - cx1) / rx) - theta1;
    let deltaTheta = dtheta;
    if (sweepFlag && deltaTheta < 0) {
      deltaTheta += 2 * Math.PI;
    } else if (!sweepFlag && deltaTheta > 0) {
      deltaTheta -= 2 * Math.PI;
    }
    const segments = Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2));
    const delta = deltaTheta / segments;
    const t = 8 / 3 * Math.sin(delta / 4) * Math.sin(delta / 4) / Math.sin(delta / 2);
    for (let i = 0; i < segments; i++) {
      const theta = theta1 + i * delta;
      const thetaNext = theta + delta;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      const cosThetaNext = Math.cos(thetaNext);
      const sinThetaNext = Math.sin(thetaNext);
      const cp1x = cosPhi * rx * (cosTheta - t * sinTheta) - sinPhi * ry * (sinTheta + t * cosTheta) + cx;
      const cp1y = sinPhi * rx * (cosTheta - t * sinTheta) + cosPhi * ry * (sinTheta + t * cosTheta) + cy;
      const cp2x = cosPhi * rx * (cosThetaNext + t * sinThetaNext) - sinPhi * ry * (sinThetaNext - t * cosThetaNext) + cx;
      const cp2y = sinPhi * rx * (cosThetaNext + t * sinThetaNext) + cosPhi * ry * (sinThetaNext - t * cosThetaNext) + cy;
      const x2 = cosPhi * rx * cosThetaNext - sinPhi * ry * sinThetaNext + cx;
      const y2 = sinPhi * rx * cosThetaNext + cosPhi * ry * sinThetaNext + cy;
      this.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    }
    this.lastCommand = "A";
  }
  closePath() {
    this.commands.push({ type: "Z" });
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.lastCommand = "Z";
  }
  applyTo(doc) {
    for (const cmd of this.commands) {
      switch (cmd.type) {
        case "M":
          doc.moveTo(cmd.x, cmd.y);
          break;
        case "L":
          doc.lineTo(cmd.x, cmd.y);
          break;
        case "C":
          doc.bezierCurveTo(
            cmd.cp1x,
            cmd.cp1y,
            cmd.cp2x,
            cmd.cp2y,
            cmd.x,
            cmd.y
          );
          break;
        case "Z":
          doc.closePath();
          break;
      }
    }
    return doc;
  }
};

// src/svg-to-pdf.js
function SVGtoPDF(doc, svg, x = 0, y = 0, options = {}) {
  const renderer = new SVGRenderer(doc, options);
  let svgElement;
  if (typeof svg === "string") {
    const parser = new SVGParser();
    svgElement = parser.parse(svg);
  } else {
    svgElement = svg;
  }
  if (!svgElement) {
    console.warn("SVGtoPDF: No valid SVG element found");
    return;
  }
  const element = createElement(svgElement);
  doc.save();
  doc.translate(x, y);
  const viewBox = element.getAttribute("viewBox");
  const width = parseFloat(element.getAttribute("width")) || options.width || 100;
  const height = parseFloat(element.getAttribute("height")) || options.height || 100;
  if (viewBox) {
    const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(parseFloat);
    if (!isNaN(vw) && !isNaN(vh) && vw > 0 && vh > 0) {
      const scale = Math.min(width / vw, height / vh);
      doc.translate(0, height);
      doc.scale(scale, -scale);
      doc.translate(-vx, -vy);
    }
  } else if (options.width && options.height) {
    const svgWidth = parseFloat(element.getAttribute("width")) || 100;
    const svgHeight = parseFloat(element.getAttribute("height")) || 100;
    const scaleX = options.width / svgWidth;
    const scaleY = options.height / svgHeight;
    doc.translate(0, options.height);
    doc.scale(scaleX, -scaleY);
  } else {
    doc.translate(0, height);
    doc.scale(1, -1);
  }
  renderer.renderElement(element);
  doc.restore();
}
var SVGRenderer = class {
  constructor(doc, options) {
    this.doc = doc;
    this.options = options;
    this.colorSpace = doc.colorSpace;
    this.spotColors = doc.spotColors;
  }
  renderElement(element, inheritedStyle = {}) {
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
        if (element.children) {
          for (let child of element.children) {
            this.renderElement(createElement(child), style);
          }
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
    SVGPath.apply(this.doc, d);
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
  applyStyle(style, strokeOnly = false) {
    const fill = style.fill !== void 0 ? style.fill : "black";
    const stroke = style.stroke;
    const fillOpacity = parseFloat(style["fill-opacity"] || 1);
    const strokeOpacity = parseFloat(style["stroke-opacity"] || 1);
    const strokeWidth = parseFloat(style["stroke-width"] || 1);
    const fillRule = style["fill-rule"] || "nonzero";
    let hasFill = false;
    let hasStroke = false;
    if (fill && fill !== "none" && !strokeOnly) {
      this.applyColor(fill, "fill");
      this.doc.fillOpacity(fillOpacity);
      hasFill = true;
    }
    if (stroke && stroke !== "none") {
      this.applyColor(stroke, "stroke");
      this.doc.strokeOpacity(strokeOpacity);
      this.doc.lineWidth(strokeWidth);
      hasStroke = true;
    }
    if (hasFill && hasStroke) {
      this.doc.fillAndStroke(fillRule);
    } else if (hasFill) {
      this.doc.fill(fillRule);
    } else if (hasStroke) {
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
      const colorLower = color.toLowerCase();
      if (colorLower === "white" || colorLower === "#ffffff" || colorLower === "#fff" || colorLower === "rgb(255,255,255)" || colorLower === "rgb(255, 255, 255)") {
        if (type === "fill") {
          this.doc.fillColorCMYK(0, 0, 0, 0);
        } else {
          this.doc.strokeColorCMYK(0, 0, 0, 0);
        }
        return;
      }
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
  // Convenience method for defining spot colors with CMYK values
  defineSpotColorCMYK(name, c, m, y, k) {
    return this.defineSpotColor(name, { c, m, y, k });
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
  SVGParser,
  SVGPath,
  SVGtoPDF
};
