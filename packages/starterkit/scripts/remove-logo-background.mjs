/**
 * Optional background cleanup for logo PNGs with a flat white/grey plate.
 *
 * Prefer exporting PNG with transparency from your design tool (Figma, Canva,
 * Photoshop) — no script needed and no quality loss.
 *
 * Usage (edge mode, default — only removes background connected to image borders):
 *   node scripts/remove-logo-background.mjs targetlocklogo.png
 *
 * Keep a pristine copy as targetlocklogo-source.png and write output separately:
 *   node scripts/remove-logo-background.mjs targetlocklogo-source.png --out targetlocklogo.png
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const files = args.filter((a) => !a.startsWith("--"));

const inputName = files[0] ?? "targetlocklogo.png";
const outFlag = flags.find((f) => f.startsWith("--out="));
const outputName = outFlag ? outFlag.split("=")[1] : inputName;

const inputPath = path.join(__dirname, "../public/images/targetlock", inputName);
const outputPath = path.join(__dirname, "../public/images/targetlock", outputName);

const EDGE_TOLERANCE = 10;
const MAX_CHROMA = 22;
const MIN_LUMA = 210;

function luma(r, g, b) {
  return (r + g + b) / 3;
}

function chroma(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function colorDist(a, b) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function sampleBorderBackground(data, width, height) {
  const samples = [];
  const step = Math.max(1, Math.floor(width / 24));

  const pick = (x, y) => {
    const i = (y * width + x) * 4;
    const a = data[i + 3];
    if (a < 128) return;
    const rgb = [data[i], data[i + 1], data[i + 2]];
    if (chroma(...rgb) > MAX_CHROMA) return;
    if (luma(...rgb) < MIN_LUMA) return;
    samples.push(rgb);
  };

  for (let x = 0; x < width; x += step) {
    pick(x, 0);
    pick(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    pick(0, y);
    pick(width - 1, y);
  }

  if (!samples.length) return [255, 255, 255];

  const sums = [0, 0, 0];
  samples.forEach(([r, g, b]) => {
    sums[0] += r;
    sums[1] += g;
    sums[2] += b;
  });
  return sums.map((v) => Math.round(v / samples.length));
}

function isEdgeBackgroundPixel(r, g, b, ref) {
  if (chroma(r, g, b) > MAX_CHROMA) return false;
  if (luma(r, g, b) < MIN_LUMA) return false;
  if (luma(r, g, b) > 252) return true;
  return colorDist([r, g, b], ref) <= EDGE_TOLERANCE;
}

function removeBackgroundEdgeFill(data, width, height) {
  const ref = sampleBorderBackground(data, width, height);
  const total = width * height;
  const remove = new Uint8Array(total);
  const queue = [];

  const tryPush = (x, y) => {
    const p = y * width + x;
    if (remove[p]) return;
    const i = p * 4;
    if (data[i + 3] < 128) return;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (!isEdgeBackgroundPixel(r, g, b, ref)) return;
    remove[p] = 1;
    queue.push(p);
  };

  for (let x = 0; x < width; x += 1) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (queue.length) {
    const p = queue.pop();
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) tryPush(x - 1, y);
    if (x < width - 1) tryPush(x + 1, y);
    if (y > 0) tryPush(x, y - 1);
    if (y < height - 1) tryPush(x, y + 1);
  }

  for (let p = 0; p < total; p += 1) {
    if (remove[p]) data[p * 4 + 3] = 0;
  }

  return { ref, removed: remove.reduce((n, v) => n + v, 0) };
}

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { ref, removed } = removeBackgroundEdgeFill(data, info.width, info.height);

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(outputPath);

console.log(
  `Wrote ${outputPath} (${info.width}x${info.height}) — edge fill removed ${removed} px, ref rgb [${ref.join(", ")}]`
);
console.log(
  "Tip: For best quality, re-export PNG with transparency from your design tool and skip this script."
);
