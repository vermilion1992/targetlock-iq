import { describe, expect, it } from "vitest";
import { assessHoleMode } from "../hole-mode";
import {
  buildRc2ReportContext,
  confidenceDowngradeReason,
  formatReferenceSystemLines,
  northReferenceLabel,
} from "../rc2-report";
import { DEFAULT_REFERENCE_SYSTEM } from "../reference-system";

describe("rc2-report", () => {
  it("formats reference system lines for export", () => {
    const lines = formatReferenceSystemLines({
      ...DEFAULT_REFERENCE_SYSTEM,
      planReference: "grid",
      surveyReference: "true",
      gridRotationDeg: 10,
      magneticDeclinationDeg: 12,
    });
    expect(lines.some((l) => l.includes("Grid North"))).toBe(true);
    expect(lines.some((l) => l.includes("True North"))).toBe(true);
    expect(lines.some((l) => l.includes("10"))).toBe(true);
  });

  it("builds downgrade reason for near-vertical holes", () => {
    const reason = confidenceDowngradeReason("High", "Medium", "near-vertical");
    expect(reason).toContain("Near-vertical");
    expect(reason).toContain("High");
    expect(reason).toContain("Medium");
  });

  it("builds RC2 context with warnings and hole mode", () => {
    const assessment = assessHoleMode(-87);
    const ctx = buildRc2ReportContext({
      referenceSystem: {
        ...DEFAULT_REFERENCE_SYSTEM,
        planReference: "grid",
        surveyReference: "true",
        gridRotationDeg: 10,
      },
      referenceWarnings: [
        {
          id: "mixed-reference",
          severity: "warning",
          message: "Mixed references converted internally.",
        },
      ],
      holeModeAssessment: assessment,
      recoveryConfidence: "Medium",
      baseRecoveryConfidence: "High",
    });

    expect(northReferenceLabel("magnetic")).toBe("Magnetic North");
    expect(ctx.referenceWarnings).toHaveLength(1);
    expect(ctx.holeMode).toBe("Near-vertical hole");
    expect(ctx.confidenceDowngradeReason).toContain("Near-vertical");
    expect(ctx.keyValues.some((kv) => kv.label === "Grid rotation")).toBe(true);
  });
});
