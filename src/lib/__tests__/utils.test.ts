import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names with a space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });

  it("returns empty string when all falsy", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("handles single class", () => {
    expect(cn("foo")).toBe("foo");
  });
});
