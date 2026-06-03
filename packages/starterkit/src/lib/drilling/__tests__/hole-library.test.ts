import { describe, expect, it } from "vitest";
import {
  buildBlankProject,
  buildProjectFromSampleData,
  createLibraryWithHole,
  duplicateHole,
  migrateLegacyProject,
  removeHole,
  setActiveHole,
  snapshotProject,
  uniqueHoleName,
  upsertHole,
} from "../hole-library";
import { createEmptyProject } from "../storage";
import { SAMPLE_ACTUAL_CSV, SAMPLE_PLAN_CSV } from "@/lib/sample-data";

describe("hole-library", () => {
  const sampleHole = () =>
    buildProjectFromSampleData("DDH-0247", "Camp A", SAMPLE_PLAN_CSV, SAMPLE_ACTUAL_CSV, "ddh-0247");

  it("migrates legacy single-hole storage shape", () => {
    const legacy = { ...sampleHole(), holeId: "legacy-1" };
    const lib = migrateLegacyProject(legacy);
    expect(lib.holes).toHaveLength(1);
    expect(lib.activeHoleId).toBe("legacy-1");
  });

  it("upserts and switches active hole", () => {
    let lib = createLibraryWithHole(sampleHole());
    const blank = buildBlankProject("DDH-0248", "Camp B", "ddh-0248");
    lib = upsertHole(lib, blank);
    expect(lib.holes).toHaveLength(2);
    const switched = setActiveHole(lib, "ddh-0248");
    expect(switched?.activeHoleId).toBe("ddh-0248");
  });

  it("duplicates hole with new id and clears history", () => {
    const lib = createLibraryWithHole({
      ...sampleHole(),
      history: [
        {
          id: "1",
          timestamp: new Date().toISOString(),
          type: "data_loaded",
          summary: "Loaded",
        },
      ],
    });
    const duped = duplicateHole(lib, "ddh-0247", "DDH-0247 (copy)");
    expect(duped).not.toBeNull();
    expect(duped!.holes).toHaveLength(2);
    const copy = duped!.holes.find((h) => h.holeName === "DDH-0247 (copy)");
    expect(copy?.history).toEqual([]);
    expect(copy?.holeId).not.toBe("ddh-0247");
  });

  it("prevents deleting the last hole", () => {
    const lib = createLibraryWithHole(sampleHole());
    expect(removeHole(lib, "ddh-0247")).toBeNull();
  });

  it("removes hole and reassigns active", () => {
    let lib = createLibraryWithHole(sampleHole());
    lib = upsertHole(lib, buildBlankProject("DDH-0248", "", "ddh-0248"));
    lib = { ...lib, activeHoleId: "ddh-0248" };
    const next = removeHole(lib, "ddh-0248");
    expect(next?.holes).toHaveLength(1);
    expect(next?.activeHoleId).toBe("ddh-0247");
  });

  it("suggests unique hole names", () => {
    const lib = createLibraryWithHole(createEmptyProject("DDH-0247"));
    expect(uniqueHoleName(lib, "DDH-0247")).toBe("DDH-0247-2");
  });

  it("snapshots in-memory project fields", () => {
    const hole = sampleHole();
    const snap = snapshotProject({
      holeId: hole.holeId,
      holeName: hole.holeName,
      siteName: hole.siteName ?? "",
      planRecords: hole.planRecords,
      actualRecords: hole.actualRecords,
      target: hole.target,
      mode: hole.mode,
      history: hole.history,
    });
    expect(snap.holeId).toBe("ddh-0247");
    expect(snap.planRecords.length).toBeGreaterThan(0);
  });
});
