import { describe, expect, it } from "vitest";
import {
  buildBlankProject,
  buildProjectFromSampleData,
  createLibraryWithHole,
  removeHole,
  resetActiveHoleInLibrary,
  upsertHole,
} from "../hole-library";
import { SAMPLE_ACTUAL_CSV, SAMPLE_PLAN_CSV } from "@/lib/sample-data";

describe("resetActiveHoleInLibrary", () => {
  const sampleHole = () =>
    buildProjectFromSampleData("DDH-0247", "Camp A", SAMPLE_PLAN_CSV, SAMPLE_ACTUAL_CSV, "ddh-0247");

  it("clears only the active hole and keeps sibling holes", () => {
    let lib = createLibraryWithHole(sampleHole());
    const sibling = buildBlankProject("DDH-0248", "Camp B", "ddh-0248");
    lib = upsertHole(lib, sibling);

    const reset = resetActiveHoleInLibrary(lib, "ddh-0247");
    expect(reset).not.toBeNull();
    expect(reset!.holes).toHaveLength(2);
    expect(reset!.activeHoleId).toBe(lib.activeHoleId);

    const cleared = reset!.holes.find((h) => h.holeId === "ddh-0247");
    expect(cleared?.planRecords).toEqual([]);
    expect(cleared?.actualRecords).toEqual([]);
    expect(cleared?.history).toEqual([]);
    expect(cleared?.holeName).toBe("DDH-0247");
    expect(cleared?.siteName).toBe("Camp A");

    const kept = reset!.holes.find((h) => h.holeId === "ddh-0248");
    expect(kept?.holeName).toBe("DDH-0248");
  });

  it("returns null for unknown hole id", () => {
    const lib = createLibraryWithHole(sampleHole());
    expect(resetActiveHoleInLibrary(lib, "missing")).toBeNull();
  });

  it("still prevents deleting the last hole", () => {
    const lib = createLibraryWithHole(sampleHole());
    expect(removeHole(lib, "ddh-0247")).toBeNull();
  });
});
