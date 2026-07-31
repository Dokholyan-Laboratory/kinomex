const KINASE_GROUPS = new Set([
  "AGC", "CAMK", "CK1", "CMGC", "STE", "TK", "TKL", "Atypical",
]);

export const KINASE_SORT_FIELDS = new Set([
  "gene_symbol", "full_name", "group", "subfamily", "uniprot_id",
]);

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseFiniteNumber(
  value: string | null,
  fallback: number
): number | null {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isKinaseGroup(value: string): boolean {
  return value === "" || KINASE_GROUPS.has(value);
}

export function isSafeSort(value: string): boolean {
  return KINASE_SORT_FIELDS.has(value.replace(/^-/, ""));
}

export type ClientChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function validateChatMessages(value: unknown): ClientChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return null;

  let totalLength = 0;
  const validated: ClientChatMessage[] = [];
  for (const message of value) {
    if (
      typeof message !== "object" || message === null ||
      !("role" in message) || !("content" in message) ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" || message.content.length === 0 ||
      message.content.length > 8_000
    ) {
      return null;
    }
    totalLength += message.content.length;
    if (totalLength > 24_000) return null;
    validated.push({ role: message.role, content: message.content });
  }
  return validated;
}
