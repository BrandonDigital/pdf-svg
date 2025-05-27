import pako from "pako";

export class PDFWriter {
  constructor() {
    this.objectCount = 0;
    this.objects = [];
    this.xref = [];
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
      MediaBox: `[0 0 ${doc.width} ${doc.height}]`,
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
    const lines = ["<<"];

    for (const [key, value] of Object.entries(dict)) {
      if (value !== null && value !== undefined) {
        lines.push(`/${key} ${value}`);
      }
    }

    lines.push(">>");
    let obj = lines.join("\n");

    if (stream) {
      obj += "\nstream";
      // Don't add newline before binary data
      this.objects[ref] = obj;
      this.objects[ref] +=
        "\n" + Buffer.from(stream).toString("binary") + "\nendstream";
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
          C1: `[${cs.tintTransform.c} ${cs.tintTransform.m} ${cs.tintTransform.y} ${cs.tintTransform.k}]`, // 100% tint
          N: 1,
        });

        const csRef = this.allocateObject();
        // Separation color space must be an array, not a dictionary
        // Escape the color name properly
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
}
