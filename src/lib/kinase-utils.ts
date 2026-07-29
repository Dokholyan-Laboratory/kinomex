export function getScoreColor(score: number): string {
  if (score >= 0.45) return "#34d399";
  if (score >= 0.25) return "#38bdf8";
  if (score >= 0.1) return "#f59e0b";
  return "#f43f5e";
}

export interface ParsedMutation {
  position: number;
  wildtype_aa: string;
  mutant_aa: string;
}

export function parseMutationCode(code: string): ParsedMutation {
  if (!code || typeof code !== "string") {
    return { position: 0, wildtype_aa: "", mutant_aa: "" };
  }

  const singleLetter = code.match(/^([A-Za-z])(\d+)([A-Za-z*])$/);
  if (singleLetter) {
    return {
      position: parseInt(singleLetter[2], 10),
      wildtype_aa: singleLetter[1],
      mutant_aa: singleLetter[3],
    };
  }

  const threeLetter = code.match(/^([A-Za-z]{3})(\d+)([A-Za-z]{3}|fs)$/);
  if (threeLetter) {
    return {
      position: parseInt(threeLetter[2], 10),
      wildtype_aa: threeLetter[1],
      mutant_aa: threeLetter[3],
    };
  }

  const deletion = code.match(/^deletion_(\d+)$/i);
  if (deletion) {
    return {
      position: parseInt(deletion[1], 10),
      wildtype_aa: "del",
      mutant_aa: "del",
    };
  }

  return { position: 0, wildtype_aa: "", mutant_aa: "" };
}

export function deriveGroup(keywords: string[]): string {
  const kw = keywords.map((k) => k.toLowerCase());
  if (kw.some((k) => k.includes("tyrosine-protein kinase"))) return "TK";
  if (kw.some((k) => k.includes("serine/threonine-protein kinase"))) return "CMGC";
  if (kw.some((k) => k.includes("kinase"))) return "Atypical";
  return "Atypical";
}
