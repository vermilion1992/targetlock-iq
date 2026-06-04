import { migrateLibrary } from "./branch-program-library";
import { TARGETLOCK_APP_VERSION, TARGETLOCK_PACKAGE_FORMAT } from "./app-version";
import type { HoleLibrary } from "./hole-library";
import { validateHoleLibrary } from "./storage-health";

export type TargetLockHolePackage = {
  format: typeof TARGETLOCK_PACKAGE_FORMAT;
  appVersion: string;
  exportedAt: string;
  library: HoleLibrary;
};

export function buildHolePackage(library: HoleLibrary): TargetLockHolePackage {
  return {
    format: TARGETLOCK_PACKAGE_FORMAT,
    appVersion: TARGETLOCK_APP_VERSION,
    exportedAt: new Date().toISOString(),
    library: {
      version: 1,
      activeHoleId: library.activeHoleId,
      holes: library.holes.map((h) => ({ ...h })),
    },
  };
}

export function parseHolePackage(json: string): {
  ok: true;
  package: TargetLockHolePackage;
} | {
  ok: false;
  error: string;
} {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as TargetLockHolePackage).format !== TARGETLOCK_PACKAGE_FORMAT
    ) {
      return { ok: false, error: "Unrecognized package format." };
    }
    const pkg = parsed as TargetLockHolePackage;
    const err = validateHoleLibrary(pkg.library);
    if (err) return { ok: false, error: err };
    return {
      ok: true,
      package: {
        ...pkg,
        library: migrateLibrary(pkg.library),
      },
    };
  } catch {
    return { ok: false, error: "Package file could not be parsed as JSON." };
  }
}

export function holePackageFilename(date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  return `targetlock-hole-package-${d}.json`;
}

export function downloadHolePackage(library: HoleLibrary): void {
  if (typeof window === "undefined") return;
  const pkg = buildHolePackage(library);
  const blob = new Blob([JSON.stringify(pkg, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = holePackageFilename();
  a.click();
  URL.revokeObjectURL(url);
}

export async function readHolePackageFile(file: File): Promise<{
  ok: true;
  package: TargetLockHolePackage;
} | {
  ok: false;
  error: string;
}> {
  try {
    const text = await file.text();
    return parseHolePackage(text);
  } catch {
    return { ok: false, error: `Could not read ${file.name}.` };
  }
}
