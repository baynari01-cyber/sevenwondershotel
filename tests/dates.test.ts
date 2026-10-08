import { describe, expect, it } from "vitest";
import { addDays, diffNights, isIsoDate, nightsBetween, rangesOverlap, dayOfWeek } from "@/lib/utils/dates";

describe("date helpers", () => {
  it("validates ISO dates strictly", () => {
    expect(isIsoDate("2026-11-10")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-1-1")).toBe(false);
    expect(isIsoDate(20261110)).toBe(false);
  });

  it("treats check-out as end-exclusive", () => {
    expect(nightsBetween("2026-11-10", "2026-11-12")).toEqual(["2026-11-10", "2026-11-11"]);
    expect(diffNights("2026-11-10", "2026-11-12")).toBe(2);
    expect(nightsBetween("2026-11-10", "2026-11-10")).toEqual([]);
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("detects overlap with end-exclusive semantics", () => {
    expect(rangesOverlap("2026-11-10", "2026-11-12", "2026-11-12", "2026-11-14")).toBe(false);
    expect(rangesOverlap("2026-11-10", "2026-11-12", "2026-11-11", "2026-11-14")).toBe(true);
  });

  it("computes weekday", () => {
    expect(dayOfWeek("2026-10-09")).toBe(5); // Friday
  });
});
