import { describe, expect, it } from "vitest";
import {
  parseLibraryRaw,
  snapshotFingerprint,
  validateHoleLibrary,
} from "../storage-health";
import { buildBlankProject, createLibraryWithHole } from "../hole-library";
import type { HoleLibrary } from "../hole-library";

describe("validateHoleLibrary", () => {
  it("accepts a valid library", () => {
    const lib = createLibraryWithHole(buildBlankProject("DDH-0247", "", "h1"));
    expect(validateHoleLibrary(lib)).toBeNull();
  });

  it("rejects empty holes array", () => {
    const lib: HoleLibrary = { version: 1, activeHoleId: "x", holes: [] };
    expect(validateHoleLibrary(lib)).toContain("no holes");
  });

  it("rejects missing active hole", () => {
    const lib = createLibraryWithHole(buildBlankProject("DDH-0247", "", "h1"));
    lib.activeHoleId = "missing-id";
    expect(validateHoleLibrary(lib)).toContain("not found");
  });

  it("rejects daughter without parentHoleId", () => {
    const lib = createLibraryWithHole({
      ...buildBlankProject("DDH-0247A", "", "daughter-1"),
      holeRole: "daughter",
    });
    expect(validateHoleLibrary(lib)).toContain("parentHoleId");
  });
});

describe("parseLibraryRaw", () => {
  it("returns corrupt for invalid JSON", () => {
    const r = parseLibraryRaw("{not json");
    expect(r.status).toBe("corrupt");
  });

  it("returns ok for valid library JSON", () => {
    const lib = createLibraryWithHole(buildBlankProject("DDH-0247", "", "h1"));
    const r = parseLibraryRaw(JSON.stringify(lib));
    expect(r.status).toBe("ok");
    expect(r.library?.holes).toHaveLength(1);
  });
});

describe("snapshotFingerprint", () => {
  it("changes when branchProgram changes", () => {
    const hole = buildBlankProject("DDH-0247", "", "m1");
    const a = snapshotFingerprint(hole);
    const b = snapshotFingerprint({
      ...hole,
      holeRole: "mother",
      branchProgram: {
        programId: "bp-1",
        name: "Test",
        site: "",
        targets: [],
        daughters: [],
      },
    });
    expect(a).not.toBe(b);
  });
});
