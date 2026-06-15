import { describe, expect, it } from "vitest";
import { adjustConfidenceForHoleMode, assessHoleMode } from "../hole-mode";

describe("hole-mode", () => {
  it("classifies angle holes below 75° dip magnitude", () => {
    expect(assessHoleMode(-60).mode).toBe("angle");
    expect(assessHoleMode(-74.9).mode).toBe("angle");
    expect(assessHoleMode(-74.9).severity).toBe("normal");
  });

  it("classifies high-angle holes from 75° to 84.9°", () => {
    expect(assessHoleMode(-75).mode).toBe("high-angle");
    expect(assessHoleMode(-84.9).mode).toBe("high-angle");
    expect(assessHoleMode(-80).severity).toBe("watch");
  });

  it("classifies near-vertical holes from 85° to 90°", () => {
    expect(assessHoleMode(-85).mode).toBe("near-vertical");
    expect(assessHoleMode(-90).mode).toBe("near-vertical");
    expect(assessHoleMode(-88).severity).toBe("risk");
  });

  it("downgrades confidence for high-angle holes", () => {
    expect(adjustConfidenceForHoleMode("High", "high-angle")).toBe("Medium");
    expect(adjustConfidenceForHoleMode("Medium", "high-angle")).toBe("Medium");
    expect(adjustConfidenceForHoleMode("Low", "high-angle")).toBe("Low");
  });

  it("downgrades confidence further for near-vertical holes", () => {
    expect(adjustConfidenceForHoleMode("High", "near-vertical")).toBe("Medium");
    expect(adjustConfidenceForHoleMode("Medium", "near-vertical")).toBe("Low");
    expect(adjustConfidenceForHoleMode("Low", "near-vertical")).toBe("Low");
  });

  it("leaves angle-hole confidence unchanged", () => {
    expect(adjustConfidenceForHoleMode("High", "angle")).toBe("High");
  });
});
