import { describe, expect, it } from "vitest";
import { preferredTemp } from "./ProfileProvider";

describe("learned temperature preference", () => {
  it("has no preference before any rides", () => {
    expect(preferredTemp([])).toBeNull();
  });
  it("uses the median of the last five rides", () => {
    expect(preferredTemp([66, 72, 70, 71, 69])).toBe(70);
  });
  it("ignores rides older than the last five", () => {
    expect(preferredTemp([60, 60, 60, 74, 74, 74, 73, 73])).toBe(74);
  });
});
