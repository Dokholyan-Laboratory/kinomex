import { parseQuery } from "@/lib/query-parser";

describe("parseQuery", () => {
  it("detects group keyword", () => {
    const result = parseQuery("TK kinases");
    expect(result.groups).toEqual(["TK"]);
  });

  it("detects tissue keyword", () => {
    const result = parseQuery("kinases expressed in brain");
    expect(result.tissues).toEqual(["brain"]);
  });

  it("detects disease keyword", () => {
    const result = parseQuery("kinases in melanoma");
    expect(result.diseases).toEqual(["melanoma"]);
  });

  it("detects multi-word disease phrase", () => {
    const result = parseQuery("breast cancer kinases");
    expect(result.diseases).toContain("breast cancer");
  });

  it("detects binding type", () => {
    const result = parseQuery("allosteric inhibitors");
    expect(result.bindingTypes).toContain("allosteric");
  });

  it("parses PDIS >= threshold", () => {
    const result = parseQuery("pdis >= 0.3");
    expect(result.minPdis).toBe(0.3);
    expect(result.maxPdis).toBeNull();
  });

  it("parses PDIS <= threshold", () => {
    const result = parseQuery("pdis <= 0.1");
    expect(result.maxPdis).toBe(0.1);
    expect(result.minPdis).toBeNull();
  });

  it("parses 'pdis above' as min", () => {
    const result = parseQuery("pdis above 0.25");
    expect(result.minPdis).toBe(0.25);
  });

  it("parses 'pdis below' as max", () => {
    const result = parseQuery("pdis below 0.15");
    expect(result.maxPdis).toBe(0.15);
  });

  it("parses 'pdis between' range", () => {
    const result = parseQuery("pdis between 0.1 and 0.5");
    expect(result.minPdis).toBe(0.1);
    expect(result.maxPdis).toBe(0.5);
  });

  it("parses 'pdis at least' as min", () => {
    const result = parseQuery("pdis at least 0.4");
    expect(result.minPdis).toBe(0.4);
  });

  it("parses 'pdis at most' as max", () => {
    const result = parseQuery("pdis at most 0.05");
    expect(result.maxPdis).toBe(0.05);
  });

  it("parses 'pdis greater than' as min", () => {
    const result = parseQuery("pdis greater than 0.3");
    expect(result.minPdis).toBe(0.3);
  });

  it("parses 'pdis less than' as max", () => {
    const result = parseQuery("pdis less than 0.2");
    expect(result.maxPdis).toBe(0.2);
  });

  it("parses 'pdis score >' format", () => {
    const result = parseQuery("pdis score > 0.5");
    expect(result.minPdis).toBe(0.5);
  });

  it("collects free text tokens", () => {
    const result = parseQuery("inhibitors of EGFR");
    expect(result.freeText).toContain("egfr");
  });

  it("filters stop words", () => {
    const result = parseQuery("show all kinases in the brain");
    expect(result.groups).toEqual([]);
    expect(result.tissues).toEqual(["brain"]);
    expect(result.freeText).not.toContain("show");
    expect(result.freeText).not.toContain("all");
    expect(result.freeText).not.toContain("the");
  });

  it("combines multiple filter types", () => {
    const result = parseQuery("TK inhibitors in lung cancer pdis > 0.3");
    expect(result.groups).toEqual(["TK"]);
    expect(result.bindingTypes).toContain("inhibitor");
    expect(result.diseases).toContain("lung cancer");
    expect(result.minPdis).toBe(0.3);
  });

  it("handles complex query", () => {
    const result = parseQuery("covalent EGFR inhibitors in brain cancer");
    expect(result.bindingTypes).toContain("covalent");
    expect(result.freeText).toContain("egfr");
    expect(result.diseases).toContain("brain cancer");
  });

  it("returns empty filters for empty query", () => {
    const result = parseQuery("");
    expect(result.groups).toEqual([]);
    expect(result.tissues).toEqual([]);
    expect(result.diseases).toEqual([]);
    expect(result.bindingTypes).toEqual([]);
    expect(result.minPdis).toBeNull();
    expect(result.maxPdis).toBeNull();
    expect(result.freeText).toEqual([]);
  });

  it("maps tissue aliases correctly", () => {
    const result = parseQuery("cardiac and hepatic and renal");
    expect(result.tissues).toContain("heart");
    expect(result.tissues).toContain("liver");
    expect(result.tissues).toContain("kidney");
  });

  it("maps disease aliases correctly", () => {
    const result = parseQuery("alzheimer and parkinson");
    expect(result.diseases).toContain("alzheimer disease");
    expect(result.diseases).toContain("parkinson disease");
  });

  it("handles 'pdis exceeding' as min", () => {
    const result = parseQuery("pdis exceeding 0.5");
    expect(result.minPdis).toBe(0.5);
  });

  it("handles 'pdis = value' as exact match (min)", () => {
    const result = parseQuery("pdis = 0.3");
    expect(result.minPdis).toBe(0.3);
  });
});
