import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

export function loadFixtureImageBase64(filename: string): string {
  const buf = readFileSync(join(FIXTURES_DIR, filename));
  return `data:image/png;base64,${buf.toString("base64")}`;
}
