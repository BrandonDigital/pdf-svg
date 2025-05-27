// SVG Path Parser based on SVG-to-PDFKit implementation
export class SVGPath {
  static apply(doc, pathData) {
    const path = new SVGPath();
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
    if (!d) return this;

    // More robust path parsing that handles decimal numbers correctly
    const pathData = d.trim();
    let currentIndex = 0;

    while (currentIndex < pathData.length) {
      // Skip whitespace
      while (
        currentIndex < pathData.length &&
        /\s/.test(pathData[currentIndex])
      ) {
        currentIndex++;
      }

      if (currentIndex >= pathData.length) break;

      // Get command letter
      const command = pathData[currentIndex];
      if (!/[MmLlHhVvCcSsQqTtAaZz]/.test(command)) {
        console.warn(`Invalid path command: ${command}`);
        currentIndex++;
        continue;
      }

      currentIndex++;
      const args = [];

      // Parse numbers for this command
      while (currentIndex < pathData.length) {
        // Skip whitespace and commas
        while (
          currentIndex < pathData.length &&
          /[\s,]/.test(pathData[currentIndex])
        ) {
          currentIndex++;
        }

        // Check if we've hit the next command
        if (
          currentIndex < pathData.length &&
          /[MmLlHhVvCcSsQqTtAaZz]/.test(pathData[currentIndex])
        ) {
          break;
        }

        // Parse a number (including negative and decimal)
        let numStr = "";
        let hasDecimal = false;

        // Handle negative sign
        if (currentIndex < pathData.length && pathData[currentIndex] === "-") {
          numStr += "-";
          currentIndex++;
        }

        // Parse digits before decimal
        while (
          currentIndex < pathData.length &&
          /\d/.test(pathData[currentIndex])
        ) {
          numStr += pathData[currentIndex];
          currentIndex++;
        }

        // Parse decimal point and digits after
        if (currentIndex < pathData.length && pathData[currentIndex] === ".") {
          numStr += ".";
          currentIndex++;
          hasDecimal = true;

          while (
            currentIndex < pathData.length &&
            /\d/.test(pathData[currentIndex])
          ) {
            numStr += pathData[currentIndex];
            currentIndex++;
          }
        }

        // Handle special case where number starts with decimal point (e.g., .01)
        if (
          numStr === "" &&
          currentIndex < pathData.length &&
          pathData[currentIndex] === "."
        ) {
          numStr = "0.";
          currentIndex++;

          while (
            currentIndex < pathData.length &&
            /\d/.test(pathData[currentIndex])
          ) {
            numStr += pathData[currentIndex];
            currentIndex++;
          }
        }

        if (numStr !== "" && numStr !== "-") {
          args.push(parseFloat(numStr));
        } else if (numStr === "-") {
          // Handle case where we just have a minus sign (could be part of next number)
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
          // After M, subsequent pairs are implicit L commands
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
      y,
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
    // Convert quadratic to cubic bezier
    const cp1x = this.currentX + (2 / 3) * (cpx - this.currentX);
    const cp1y = this.currentY + (2 / 3) * (cpy - this.currentY);
    const cp2x = x + (2 / 3) * (cpx - x);
    const cp2y = y + (2 / 3) * (cpy - y);

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
    // Convert arc to bezier curves
    if (rx === 0 || ry === 0) {
      this.lineTo(x, y);
      return;
    }

    const phi = (xAxisRotation * Math.PI) / 180;
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    largeArcFlag = !!largeArcFlag;
    sweepFlag = !!sweepFlag;

    // Compute center
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    const x1 =
      (cosPhi * (this.currentX - x)) / 2 + (sinPhi * (this.currentY - y)) / 2;
    const y1 =
      (-sinPhi * (this.currentX - x)) / 2 + (cosPhi * (this.currentY - y)) / 2;

    // Correct radii
    const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
    if (lambda > 1) {
      rx *= Math.sqrt(lambda);
      ry *= Math.sqrt(lambda);
    }

    // Compute center
    const sign = largeArcFlag === sweepFlag ? -1 : 1;
    const sq = Math.max(
      0,
      rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    );
    const coef = sign * Math.sqrt(sq / (rx * rx * y1 * y1 + ry * ry * x1 * x1));

    const cx1 = (coef * rx * y1) / ry;
    const cy1 = (-coef * ry * x1) / rx;

    const cx = cosPhi * cx1 - sinPhi * cy1 + (this.currentX + x) / 2;
    const cy = sinPhi * cx1 + cosPhi * cy1 + (this.currentY + y) / 2;

    // Compute angles
    const theta1 = Math.atan2((y1 - cy1) / ry, (x1 - cx1) / rx);
    const dtheta = Math.atan2((-y1 - cy1) / ry, (-x1 - cx1) / rx) - theta1;

    let deltaTheta = dtheta;
    if (sweepFlag && deltaTheta < 0) {
      deltaTheta += 2 * Math.PI;
    } else if (!sweepFlag && deltaTheta > 0) {
      deltaTheta -= 2 * Math.PI;
    }

    // Convert to bezier curves
    const segments = Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2));
    const delta = deltaTheta / segments;
    const t =
      ((8 / 3) * Math.sin(delta / 4) * Math.sin(delta / 4)) /
      Math.sin(delta / 2);

    for (let i = 0; i < segments; i++) {
      const theta = theta1 + i * delta;
      const thetaNext = theta + delta;

      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      const cosThetaNext = Math.cos(thetaNext);
      const sinThetaNext = Math.sin(thetaNext);

      const cp1x =
        cosPhi * rx * (cosTheta - t * sinTheta) -
        sinPhi * ry * (sinTheta + t * cosTheta) +
        cx;
      const cp1y =
        sinPhi * rx * (cosTheta - t * sinTheta) +
        cosPhi * ry * (sinTheta + t * cosTheta) +
        cy;
      const cp2x =
        cosPhi * rx * (cosThetaNext + t * sinThetaNext) -
        sinPhi * ry * (sinThetaNext - t * cosThetaNext) +
        cx;
      const cp2y =
        sinPhi * rx * (cosThetaNext + t * sinThetaNext) +
        cosPhi * ry * (sinThetaNext - t * cosThetaNext) +
        cy;
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
}
