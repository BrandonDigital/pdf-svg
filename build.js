import esbuild from "esbuild";
import fs from "fs";

// Ensure lib directory exists
if (!fs.existsSync("lib")) {
  fs.mkdirSync("lib");
}

// Build CommonJS version
await esbuild.build({
  entryPoints: ["src/index.js"],
  bundle: true,
  outfile: "lib/index.cjs",
  format: "cjs",
  platform: "node",
  target: "node14",
  external: ["pako"],
  minify: false,
});

// Build ESM version
await esbuild.build({
  entryPoints: ["src/index.js"],
  bundle: true,
  outfile: "lib/index.js",
  format: "esm",
  platform: "node",
  target: "node14",
  external: ["pako"],
  minify: false,
});

// Build browser version
await esbuild.build({
  entryPoints: ["src/index.js"],
  bundle: true,
  outfile: "lib/pdf-svg.browser.js",
  format: "iife",
  globalName: "PDFSvg",
  platform: "browser",
  target: "es2015",
  external: [],
  minify: true,
});

console.log("Build completed successfully!");
