export const GROUPS = ["AGC", "CAMK", "CK1", "CMGC", "STE", "TK", "TKL", "Atypical"];

export const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "show", "find", "list", "get", "all", "any", "that", "this", "those",
  "these", "it", "its", "has", "have", "had", "do", "does", "did",
  "kinase", "kinases", "protein", "proteins", "gene", "genes", "group", "type",
  "which", "what", "who", "how", "where", "when", "me", "my", "not",
  "no", "yes", "so", "if", "than", "then", "also", "very", "just",
  "about", "above", "after", "again", "against", "because", "before",
  "between", "both", "each", "few", "more", "most", "other", "some",
  "such", "only", "own", "same", "too", "under", "up", "down", "out",
  "over", "while", "during", "without", "through", "into", "score",
  "mutated", "mutation", "mutations", "cancer", "tumor", "tumors",
  "associated", "linked", "related", "syndrome", "disease", "diseases",
  "involved", "expressed", "target", "targets", "targeted",
]);

export const TISSUE_KEYWORDS: Record<string, string> = {
  brain: "brain", heart: "heart", cardiac: "heart", liver: "liver", hepatic: "liver",
  lung: "lung", kidney: "kidney", renal: "kidney", pancreas: "pancreas", pancreatic: "pancreas",
  breast: "breast", colon: "colon", intestinal: "colon", skin: "skin", dermal: "skin",
  bone: "bone", skeletal: "bone", blood: "blood", hematopoietic: "blood",
  muscle: "muscle", muscular: "muscle", eye: "eye", ocular: "eye",
  prostate: "prostate", ovary: "ovary", ovarian: "ovary", testis: "testis", testicular: "testis",
  thyroid: "thyroid", stomach: "stomach", gastric: "stomach", adipose: "adipose", fat: "adipose",
  neuron: "brain", neuronal: "brain",
};

export const BINDING_KEYWORDS: Record<string, string> = {
  inhibitor: "inhibitor", agonist: "agonist", antagonist: "antagonist",
  "covalent inhibitor": "covalent", covalent: "covalent", reversible: "reversible",
  "atp-competitive": "atp_competitive", allosteric: "allosteric", bivalent: "bivalent",
};

export const DISEASE_KEYWORDS: Record<string, string> = {
  glioblastoma: "glioblastoma",
  melanoma: "melanoma",
  leukemia: "leukemia",
  lymphoma: "lymphoma",
  carcinoma: "carcinoma",
  sarcoma: "sarcoma",
  neuroblastoma: "neuroblastoma",
  "colorectal cancer": "colorectal cancer",
  "breast cancer": "breast cancer",
  "lung cancer": "lung cancer",
  "brain cancer": "brain cancer",
  "pancreatic cancer": "pancreatic cancer",
  "prostate cancer": "prostate cancer",
  "ovarian cancer": "ovarian cancer",
  "colon cancer": "colorectal cancer",
  "alzheimer": "alzheimer disease",
  "parkinson": "parkinson disease",
  diabetes: "diabetes mellitus",
  hypertension: "hypertension",
  epilepsy: "epilepsy",
  schizophrenia: "schizophrenia",
  autism: "autism",
};

export interface ParsedFilters {
  groups: string[];
  tissues: string[];
  diseases: string[];
  bindingTypes: string[];
  minPdis: number | null;
  maxPdis: number | null;
  freeText: string[];
}

export function parseQuery(query: string): ParsedFilters {
  const lowerQuery = query.toLowerCase();
  const tokens = lowerQuery.split(/[\s,;]+/).filter(Boolean);

  const filters: ParsedFilters = {
    groups: [], tissues: [], diseases: [], bindingTypes: [],
    minPdis: null, maxPdis: null, freeText: [],
  };

  const pdisMatch = lowerQuery.match(
    /pdis\s*(?:score\s+)?(?:>|>=|<|<=|=|between|above|below|greater\s+than|less\s+than|at\s+least|at\s+most|exceeding)\s*(\d+(?:\.\d+)?)/
  );
  if (pdisMatch) {
    const val = parseFloat(pdisMatch[1]);
    const matched = pdisMatch[0];
    if (lowerQuery.includes(">=") || /at\s+least/.test(matched) || /exceeding/.test(matched)) {
      filters.minPdis = val;
    } else if (lowerQuery.includes("<=") || /at\s+most/.test(matched)) {
      filters.maxPdis = val;
    } else if (/between/.test(matched)) {
      const betweenMatch = lowerQuery.match(/between\s*(\d+(?:\.\d+)?)\s*(?:and|-)\s*(\d+(?:\.\d+)?)/);
      if (betweenMatch) {
        filters.minPdis = parseFloat(betweenMatch[1]);
        filters.maxPdis = parseFloat(betweenMatch[2]);
      }
    } else if (/>/.test(matched) || /above/.test(matched) || /greater\s+than/.test(matched)) {
      filters.minPdis = val;
    } else if (/</.test(matched) || /below/.test(matched) || /less\s+than/.test(matched)) {
      filters.maxPdis = val;
    } else if (/^pdis\s*(?:score\s+)?=\s*/.test(matched)) {
      filters.minPdis = val;
      filters.maxPdis = val;
    }
  }

  for (const [phrase, canonical] of Object.entries(DISEASE_KEYWORDS)) {
    if (phrase.includes(" ") && lowerQuery.includes(phrase)) {
      filters.diseases.push(canonical);
    }
  }

  for (const [phrase, binding] of Object.entries(BINDING_KEYWORDS)) {
    if (phrase.includes(" ") && lowerQuery.includes(phrase)) {
      if (!filters.bindingTypes.includes(binding)) filters.bindingTypes.push(binding);
    }
  }

  for (const token of tokens) {
    const clean = token.replace(/[^a-z0-9\-]/g, "");
    const upperClean = clean.toUpperCase();
    if (!clean || STOP_WORDS.has(clean) || /^\d+(\.\d+)?$/.test(clean) || clean === "pdis") continue;
    if (GROUPS.includes(upperClean)) { filters.groups.push(upperClean); continue; }
    if (TISSUE_KEYWORDS[clean]) { filters.tissues.push(TISSUE_KEYWORDS[clean]); continue; }
    let matched = false;
    for (const [keyword, binding] of Object.entries(BINDING_KEYWORDS)) {
      if (!keyword.includes(" ") && clean.includes(keyword)) {
        if (!filters.bindingTypes.includes(binding)) filters.bindingTypes.push(binding);
        matched = true;
      }
    }
    if (!matched && DISEASE_KEYWORDS[clean]) {
      filters.diseases.push(DISEASE_KEYWORDS[clean]);
      matched = true;
    }
    if (!matched) filters.freeText.push(clean);
  }

  return filters;
}
