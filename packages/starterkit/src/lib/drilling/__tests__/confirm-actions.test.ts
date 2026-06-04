import { describe, expect, it } from "vitest";
import {
  confirmDeleteHole,
  confirmLoadScenario,
  confirmResetAllLocalData,
  confirmResetActiveHole,
} from "../confirm-actions";

describe("confirm-actions", () => {
  it("builds delete hole confirm with danger variant", () => {
    const req = confirmDeleteHole("DDH-0247");
    expect(req.title).toContain("DDH-0247");
    expect(req.variant).toBe("danger");
    expect(req.confirmLabel).toBe("Delete hole");
  });

  it("builds reset all local data confirm with backup notice", () => {
    const req = confirmResetAllLocalData();
    expect(req.notice).toContain("cannot be undone");
    expect(req.variant).toBe("danger");
  });

  it("builds reset active hole confirm scoped to one hole", () => {
    const req = confirmResetActiveHole("DDH-100");
    expect(req.details?.some((d) => d.includes("not affected"))).toBe(true);
  });

  it("builds load scenario confirm with warning variant", () => {
    const req = confirmLoadScenario("TEST · On plan");
    expect(req.title).toContain("On plan");
    expect(req.variant).toBe("warning");
    expect(req.confirmLabel).toBe("Load scenario");
  });
});
