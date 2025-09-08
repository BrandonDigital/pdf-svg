import pako from "pako";

export class PDFWriter {
  constructor() {
    this.objectCount = 0;
    this.objects = [];
    this.xref = [];
  }

  formatNumber(num) {
    if (typeof num !== "number" || !isFinite(num)) {
      console.warn(`Invalid number in PDF: ${num}, using 0`);
      return "0";
    }
    return Number(num.toFixed(6)).toString();
  }

  // Helper function to convert LAB to RGB
  labToRgb(L, a, b) {
    // Convert LAB to XYZ
    const fy = (L + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - b / 200;

    const xn = 0.95047;
    const yn = 1.0;
    const zn = 1.08883;

    const x = (fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16 / 116) / 7.787) * xn;
    const y = (fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16 / 116) / 7.787) * yn;
    const z = (fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16 / 116) / 7.787) * zn;

    // Convert XYZ to RGB
    let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.969266 + y * 1.8760108 + z * 0.041556;
    let bl = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

    // Apply gamma correction
    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    bl = bl > 0.0031308 ? 1.055 * Math.pow(bl, 1 / 2.4) - 0.055 : 12.92 * bl;

    return {
      r: Math.max(0, Math.min(1, r)),
      g: Math.max(0, Math.min(1, g)),
      b: Math.max(0, Math.min(1, bl)),
    };
  }

  // Helper function to convert RGB to CMYK
  rgbToCmyk(r, g, b) {
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

  generatePDF(doc) {
    // Reset state
    this.objectCount = 0;
    this.objects = [];
    this.xref = [];

    // Create PDF structure
    const catalogRef = this.allocateObject();
    const pagesRef = this.allocateObject();
    const pageRef = this.allocateObject();
    const contentRef = this.allocateObject();
    const resourcesRef = this.allocateObject();
    const metadataRef = this.allocateObject();

    // Build content stream
    const contentStream = doc.contentStream.join("\n");
    const compressedContent = pako.deflate(contentStream);

    // Build resources dictionary
    const resources = {};
    const colorSpaceDict = this.buildColorSpaceDict(doc.resources.ColorSpace);
    const extGStateDict = this.buildExtGStateDict(doc.resources.ExtGState);

    if (colorSpaceDict) {
      resources.ColorSpace = colorSpaceDict;
    }
    if (extGStateDict) {
      resources.ExtGState = extGStateDict;
    }

    // Generate XMP metadata with PlateNames
    const plateNames = this.getPlateNames(doc.resources.ColorSpace);
    const xmpMetadata = this.generateXMPMetadata(plateNames);

    // Metadata object
    this.addObject(
      metadataRef,
      {
        Type: "/Metadata",
        Subtype: "/XML",
        Length: xmpMetadata.length,
      },
      xmpMetadata
    );

    // Resources object
    this.addObject(resourcesRef, resources);

    // Content stream
    this.addObject(
      contentRef,
      {
        Length: compressedContent.length,
        Filter: "/FlateDecode",
      },
      compressedContent
    );

    // Page object
    this.addObject(pageRef, {
      Type: "/Page",
      Parent: `${pagesRef} 0 R`,
      MediaBox: `[0 0 ${this.formatNumber(doc.width)} ${this.formatNumber(
        doc.height
      )}]`,
      Contents: `${contentRef} 0 R`,
      Resources: `${resourcesRef} 0 R`,
    });

    // Pages object
    this.addObject(pagesRef, {
      Type: "/Pages",
      Kids: `[${pageRef} 0 R]`,
      Count: 1,
    });

    // Catalog
    this.addObject(catalogRef, {
      Type: "/Catalog",
      Pages: `${pagesRef} 0 R`,
      Metadata: `${metadataRef} 0 R`,
    });

    // Build PDF
    let pdf = "%PDF-1.4\n";
    pdf += "%\xFF\xFF\xFF\xFF\n"; // Binary marker

    // Add objects
    for (let i = 1; i <= this.objectCount; i++) {
      const obj = this.objects[i];
      if (obj) {
        this.xref[i] = pdf.length;
        pdf += `${i} 0 obj\n`;
        pdf += obj;
        pdf += "\nendobj\n";
      }
    }

    // Cross-reference table
    const xrefOffset = pdf.length;
    pdf += "xref\n";
    pdf += `0 ${this.objectCount + 1}\n`;
    pdf += "0000000000 65535 f \n";

    for (let i = 1; i <= this.objectCount; i++) {
      const offset = this.xref[i] || 0;
      pdf += offset.toString().padStart(10, "0") + " 00000 n \n";
    }

    // Trailer
    pdf += "trailer\n";
    pdf += `<< /Size ${this.objectCount + 1} /Root ${catalogRef} 0 R >>\n`;
    pdf += "startxref\n";
    pdf += `${xrefOffset}\n`;
    pdf += "%%EOF";

    return Buffer.from(pdf, "binary");
  }

  allocateObject() {
    const ref = ++this.objectCount;
    this.objects[ref] = null; // Reserve the slot
    return ref;
  }

  addObject(ref, dict, stream) {
    if (typeof dict === "string") {
      // Direct object content (like arrays)
      this.objects[ref] = dict;
      return;
    }

    const lines = ["<<"];

    for (const [key, value] of Object.entries(dict)) {
      if (value !== null && value !== undefined) {
        lines.push(`  /${key} ${value}`);
      }
    }

    lines.push(">>");
    let obj = lines.join("\n");

    if (stream) {
      obj += "\nstream\n";
      this.objects[ref] =
        obj + Buffer.from(stream).toString("binary") + "\nendstream";
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

        // Create tint transform function
        this.addObject(funcRef, {
          FunctionType: 2,
          Domain: "[0 1]",
          C0: "[0 0 0 0]", // 0% tint = no color
          C1: `[${this.formatNumber(cs.tintTransform.c)} ${this.formatNumber(
            cs.tintTransform.m
          )} ${this.formatNumber(cs.tintTransform.y)} ${this.formatNumber(
            cs.tintTransform.k
          )}]`, // 100% tint
          N: 1,
        });

        const csRef = this.allocateObject();
        // Separation color space must be an array, not a dictionary
        // Escape the color name properly
        const colorName = cs.name.replace(/[\s()]/g, "#20");
        const separationArray = `[/Separation /${colorName} /DeviceCMYK ${funcRef} 0 R]`;
        this.objects[csRef] = separationArray;

        lines.push(`/${name} ${csRef} 0 R`);
      } else if (cs.type === "Lab") {
        const csRef = this.allocateObject();

        if (cs.name) {
          // LAB spot color - create separation color space exactly like official PDF
          const colorName = cs.name.replace(/[\s()]/g, "#20");

          // Create LAB color space object exactly like the official PDF
          const labRef = this.allocateObject();
          this.objects[labRef] =
            "[/Lab<</BlackPoint[0.0 0.0 0.0]/Range[-128.0 127.0 -128.0 127.0]/WhitePoint[0.964203 1.0 0.824905]>>]";

          // Create the separation array with inline function (matching official PDF structure)
          const separationArray = `[/Separation/${colorName} ${labRef} 0 R<</C0[100.0 0.0 0.0]/C1[${this.formatNumber(
            cs.labFallback.L
          )} ${this.formatNumber(cs.labFallback.a)} ${this.formatNumber(
            cs.labFallback.b
          )}]/Domain[0 1]/FunctionType 2/N 1.0/Range[0.0 100.0 -128.0 127.0 -128.0 127.0]>>]`;

          this.objects[csRef] = separationArray;
        } else {
          // Generic LAB color space
          const labArray = `[/Lab << /WhitePoint [${cs.whitePoint
            .map((n) => this.formatNumber(n))
            .join(" ")}] /Range [${cs.range
            .map((n) => this.formatNumber(n))
            .join(" ")}] >>]`;
          this.objects[csRef] = labArray;
        }

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

  getPlateNames(colorSpaces) {
    const plateNames = [];
    for (const [name, cs] of Object.entries(colorSpaces)) {
      if (cs.type === "Separation" || (cs.type === "Lab" && cs.name)) {
        plateNames.push(cs.name);
      }
    }
    return plateNames;
  }

  generateXMPMetadata(plateNames) {
    const currentDate = new Date().toISOString();

    let plateNamesXML = "";
    if (plateNames.length > 0) {
      plateNamesXML = `
         <xmpTPg:PlateNames>
            <rdf:Seq>
${plateNames
  .map((name) => `               <rdf:li>${name}</rdf:li>`)
  .join("\n")}
            </rdf:Seq>
         </xmpTPg:PlateNames>`;
    }

    return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 9.1-c001 79.675d0f7, 2023/06/11-19:21:16">
   <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <rdf:Description rdf:about=""
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:xmp="http://ns.adobe.com/xap/1.0/"
            xmlns:xmpTPg="http://ns.adobe.com/xap/1.0/t/pg/"
            xmlns:stDim="http://ns.adobe.com/xap/1.0/sType/Dimensions#">
         <dc:format>application/pdf</dc:format>
         <xmp:MetadataDate>${currentDate}</xmp:MetadataDate>
         <xmp:ModifyDate>${currentDate}</xmp:ModifyDate>
         <xmp:CreateDate>${currentDate}</xmp:CreateDate>
         <xmp:CreatorTool>pdf-svg LAB Color Generator</xmp:CreatorTool>
         <xmpTPg:NPages>1</xmpTPg:NPages>${plateNamesXML}
      </rdf:Description>
   </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
  }
}
