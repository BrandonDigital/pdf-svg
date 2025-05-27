export interface PDFDocumentOptions {
  width?: number;
  height?: number;
}

export interface CMYKColor {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface SpotColorInfo {
  name: string;
  tint?: number;
}

export interface SVGOptions {
  width?: number;
  height?: number;
  useCMYK?: boolean;
  spotColorMap?: Record<string, SpotColorInfo>;
  colorCallback?: (color: string) => string | null;
}

export interface ColorSpaceResource {
  type: string;
  name: string;
  alternateSpace: string;
  tintTransform: CMYKColor;
  resourceName?: string;
}

export interface ExtGStateResource {
  ca?: number;
  CA?: number;
}

export interface Resources {
  ColorSpace: Record<string, ColorSpaceResource>;
  Pattern: Record<string, any>;
  ExtGState: Record<string, ExtGStateResource>;
}

export declare class ColorSpace {
  constructor();

  rgbToCMYK(r: number, g: number, b: number): CMYKColor;
  defineSpotColor(name: string, cmyk: CMYKColor): this;
  getSpotColor(name: string): any;
  isSpotColor(name: string): boolean;
}

export declare class PDFWriter {
  constructor();

  generatePDF(doc: PDFDocument): Buffer;
}

export declare class PDFDocument {
  width: number;
  height: number;
  colorSpace: ColorSpace;
  writer: PDFWriter;
  currentColor: any;
  currentStrokeColor: any;
  currentLineWidth: number;
  currentOpacity: { fill: number; stroke: number };
  spotColors: Map<string, any>;
  contentStream: string[];
  resources: Resources;

  constructor(options?: PDFDocumentOptions);

  // SVG rendering
  addSVG(
    svg: string | Element,
    x?: number,
    y?: number,
    options?: SVGOptions
  ): this;

  // Path drawing
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): this;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): this;
  closePath(): this;

  // Shape drawing
  rect(x: number, y: number, width: number, height: number): this;
  circle(cx: number, cy: number, r: number): this;
  ellipse(cx: number, cy: number, rx: number, ry: number): this;

  // Path operations
  fill(fillRule?: "nonzero" | "evenodd"): this;
  stroke(): this;
  fillAndStroke(fillRule?: "nonzero" | "evenodd"): this;

  // Line width
  lineWidth(width: number): this;

  // Opacity
  fillOpacity(opacity: number): this;
  strokeOpacity(opacity: number): this;
  opacity(opacity: number): this;

  // Color methods (RGB - converted to CMYK internally)
  fillColor(color: string): this;
  fillColor(r: number, g: number, b: number): this;
  strokeColor(color: string): this;
  strokeColor(r: number, g: number, b: number): this;

  // CMYK color methods
  fillColorCMYK(c: number, m: number, y: number, k: number): this;
  strokeColorCMYK(c: number, m: number, y: number, k: number): this;

  // Spot color methods
  defineSpotColor(name: string, cmykFallback: CMYKColor): this;
  fillSpotColor(name: string, tint?: number): this;
  strokeSpotColor(name: string, tint?: number): this;

  // Transformation methods
  save(): this;
  restore(): this;
  translate(x: number, y: number): this;
  scale(sx: number, sy?: number): this;
  rotate(angle: number, cx?: number, cy?: number): this;
  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ): this;

  // Generate PDF
  end(): Buffer;
}

export function SVGtoPDF(
  doc: PDFDocument,
  svg: string | Element,
  x?: number,
  y?: number,
  options?: SVGOptions
): void;
