import { getScoreColor, parseMutationCode, deriveGroup } from "@/lib/kinase-utils";

describe("getScoreColor", () => {
  it("returns green for score >= 0.45", () => {
    expect(getScoreColor(0.45)).toBe("#34d399");
    expect(getScoreColor(0.8)).toBe("#34d399");
    expect(getScoreColor(1)).toBe("#34d399");
  });

  it("returns blue for score >= 0.25", () => {
    expect(getScoreColor(0.25)).toBe("#38bdf8");
    expect(getScoreColor(0.3)).toBe("#38bdf8");
    expect(getScoreColor(0.44)).toBe("#38bdf8");
  });

  it("returns amber for score >= 0.1", () => {
    expect(getScoreColor(0.1)).toBe("#f59e0b");
    expect(getScoreColor(0.15)).toBe("#f59e0b");
    expect(getScoreColor(0.24)).toBe("#f59e0b");
  });

  it("returns rose for score < 0.1", () => {
    expect(getScoreColor(0)).toBe("#f43f5e");
    expect(getScoreColor(0.05)).toBe("#f43f5e");
    expect(getScoreColor(0.099)).toBe("#f43f5e");
  });
});

describe("parseMutationCode", () => {
  it("parses single-letter format", () => {
    const result = parseMutationCode("R47C");
    expect(result).toEqual({ position: 47, wildtype_aa: "R", mutant_aa: "C" });
  });

  it("parses single-letter format with numeric mutant", () => {
    const result = parseMutationCode("T315*");
    expect(result).toEqual({ position: 315, wildtype_aa: "T", mutant_aa: "*" });
  });

  it("parses three-letter format", () => {
    const result = parseMutationCode("Thr315Ile");
    expect(result).toEqual({ position: 315, wildtype_aa: "Thr", mutant_aa: "Ile" });
  });

  it("parses three-letter format with frameshift", () => {
    const result = parseMutationCode("Arg47fs");
    expect(result).toEqual({ position: 47, wildtype_aa: "Arg", mutant_aa: "fs" });
  });

  it("parses deletion format", () => {
    const result = parseMutationCode("deletion_19");
    expect(result).toEqual({ position: 19, wildtype_aa: "del", mutant_aa: "del" });
  });

  it("parses deletion format case-insensitive", () => {
    const result = parseMutationCode("Deletion_5");
    expect(result).toEqual({ position: 5, wildtype_aa: "del", mutant_aa: "del" });
  });

  it("returns zero position for unknown formats", () => {
    const result = parseMutationCode("ITD");
    expect(result).toEqual({ position: 0, wildtype_aa: "", mutant_aa: "" });
  });

  it("returns zero position for empty string", () => {
    const result = parseMutationCode("");
    expect(result).toEqual({ position: 0, wildtype_aa: "", mutant_aa: "" });
  });

  it("handles lowercase single-letter", () => {
    const result = parseMutationCode("r47c");
    expect(result).toEqual({ position: 47, wildtype_aa: "r", mutant_aa: "c" });
  });

  it("handles three-letter lowercase", () => {
    const result = parseMutationCode("thr315ile");
    expect(result).toEqual({ position: 315, wildtype_aa: "thr", mutant_aa: "ile" });
  });
});

describe("deriveGroup", () => {
  it("returns TK for tyrosine-protein kinase", () => {
    expect(deriveGroup(["Tyrosine-protein kinase", "Transferase"])).toBe("TK");
  });

  it("returns TK for case-insensitive match", () => {
    expect(deriveGroup(["tyrosine-protein kinase"])).toBe("TK");
  });

  it("returns CMGC for serine/threonine-protein kinase", () => {
    expect(deriveGroup(["Serine/threonine-protein kinase"])).toBe("CMGC");
  });

  it("returns Atypical for generic kinase keywords", () => {
    expect(deriveGroup(["kinase", "atp-binding"])).toBe("Atypical");
  });

  it("returns Atypical for no matching keywords", () => {
    expect(deriveGroup(["receptor", "membrane"])).toBe("Atypical");
  });

  it("returns Atypical for empty array", () => {
    expect(deriveGroup([])).toBe("Atypical");
  });

  it("TK takes priority over kinase keyword", () => {
    expect(deriveGroup(["Tyrosine-protein kinase", "kinase"])).toBe("TK");
  });
});
