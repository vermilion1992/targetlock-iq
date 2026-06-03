import { describe, expect, it } from "vitest";
import { formatTooltipText } from "../info-tip-format";

describe("formatTooltipText", () => {
  it("capitalizes the first letter and adds a period when missing", () => {
    expect(formatTooltipText("load sample data")).toBe("Load sample data.");
  });

  it("preserves existing terminal punctuation", () => {
    expect(formatTooltipText("Already done.")).toBe("Already done.");
    expect(formatTooltipText("Really?")).toBe("Really?");
  });

  it("collapses internal whitespace", () => {
    expect(formatTooltipText("  two   spaces  ")).toBe("Two spaces.");
  });
});
