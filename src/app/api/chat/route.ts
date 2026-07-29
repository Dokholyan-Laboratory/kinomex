import { NextRequest } from "next/server";
import OpenAI from "openai";
import { connectToDatabase } from "@/lib/mongodb";

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY || "sk-placeholder",
  baseURL: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
});

const GROUPS = ["AGC", "CAMK", "CK1", "CMGC", "STE", "TK", "TKL", "Atypical"];

const STOP_WORDS = new Set([
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
]);

const TISSUE_KEYWORDS: Record<string, string> = {
  brain: "brain", heart: "heart", cardiac: "heart", liver: "liver", hepatic: "liver",
  lung: "lung", kidney: "kidney", renal: "kidney", pancreas: "pancreas", pancreatic: "pancreas",
  breast: "breast", colon: "colon", intestinal: "colon", skin: "skin", dermal: "skin",
  bone: "bone", skeletal: "bone", blood: "blood", hematopoietic: "blood",
  muscle: "muscle", muscular: "muscle", eye: "eye", ocular: "eye",
  prostate: "prostate", ovary: "ovary", ovarian: "ovary", testis: "testis", testicular: "testis",
  thyroid: "thyroid", stomach: "stomach", gastric: "stomach", adipose: "adipose", fat: "adipose",
  neuron: "brain", neuronal: "brain",
};

const SYSTEM_PROMPT_BASE = `You are KinomeX AI, a helpful assistant specialized in the human kinome — the complete set of protein kinases encoded in the human genome. You help researchers and students explore kinase data, understand kinase biology, and discover connections between kinases, diseases, tissues, and drugs.

You have access to the KinomeX database which contains kinase data for 501 human kinases.

DATABASE SCHEMA:
- gene_symbol (string, e.g. "EGFR", "BRAF", "CDK2") — standard HGNC gene symbol
- full_name (string, e.g. "Epidermal growth factor receptor")
- group (string: AGC, CAMK, CK1, CMGC, STE, TK, TKL, Atypical)
- family (string) — kinase family within the group
- pdis_score (number, 0-1) — Pathway-Druggability Importance Score
- organ_systems_impacted (string[]) — tissues where the kinase is expressed
- diseases_associated (string[]) — diseases linked to the kinase
- mutation_count (number) — number of ClinVar missense variants
- ligand_count (number) — number of assayed compounds
- fda_approval_status (boolean) — whether any FDA-approved drug targets this kinase

KINASE GROUPS:
- TK — Tyrosine Kinases (e.g. EGFR, SRC, ABL1, JAK2, MET)
- TKL — Tyrosine Kinase-Like (e.g. RAF1, BRAF, MLK, IRAK)
- STE — Sterile (e.g. MAP2K, MAP3K, PAK)
- CMGC — CDK/MAPK/GSK3/CLK (e.g. CDK1/2/4/6, MAPK1/3, GSK3B)
- AGC — PKA/PKG/PKC (e.g. AKT1/2, PRKACA, ROCK1/2, SGK)
- CAMK — Calcium/Calmodulin (e.g. CAMK2A/B, DAPK, PINK1)
- CK1 — Casein Kinase 1 (e.g. CSNK1A1/D1/E)
- Atypical — atypical kinases (e.g. MTOR, ATM, ATR, CHEK1/2)

PDIS (Pathway-Druggability Importance Score):
- Ranges 0-1, higher = more therapeutically relevant
- >0.5: exceptional (highly drugged, strong clinical evidence)
- >0.3: high druggability relevance
- >0.15: moderate
- <0.15: lower (less studied or harder to drug)

Guidelines:
- Answer based on the provided context. If the context doesn't have the data, say you don't know rather than guessing.
- Be concise and scientific. Use markdown for formatting.
- Use standard gene symbols in UPPERCASE (e.g. EGFR, BRAF).
- When listing kinases, include their group and PDIS score.
- If the user asks about a query format you don't understand, ask clarifying questions.
- Do NOT mention internal implementation details.
- When the user asks for "top" or "high PDIS" or "PDIS above/below X", the RELEVANT KINASES FROM DATABASE section contains the actual data — use it to answer with real scores and rankings.
- If the context lists kinases, prefer answering from that list rather than making up examples.`;

function buildSystemPrompt(context: Record<string, unknown>[]): string {
  if (!context.length) return SYSTEM_PROMPT_BASE;

  const ctxStr = context
    .map((k) => {
      const parts = [
        `${k.gene_symbol}`,
        k.full_name ? `(${k.full_name})` : "",
        `[${k.group}]`,
        k.pdis_score != null ? `PDIS:${k.pdis_score}` : "",
      ];
      return parts.filter(Boolean).join(" ");
    })
    .join("\n");

  return `${SYSTEM_PROMPT_BASE}\n\nRELEVANT KINASES FROM DATABASE:\n${ctxStr}\n\nAnswer the user's question using the above context when relevant.`;
}

async function fetchKinaseContext(
  db: import("mongodb").Db,
  query: string
): Promise<Record<string, unknown>[]> {
  const lowerQuery = query.toLowerCase();
  const tokens = lowerQuery.split(/[\s,;.?]+/).filter(Boolean);

  const groupMatches: string[] = [];
  const tissueMatches: string[] = [];
  const searchTerms: string[] = [];

  for (const token of tokens) {
    const clean = token.replace(/[^a-z0-9\-]/g, "");
    if (!clean || STOP_WORDS.has(clean) || /^\d+(\.\d+)?$/.test(clean)) continue;
    const upper = clean.toUpperCase();
    if (GROUPS.includes(upper)) { groupMatches.push(upper); continue; }
    if (TISSUE_KEYWORDS[clean]) { tissueMatches.push(TISSUE_KEYWORDS[clean]); continue; }
    searchTerms.push(clean);
  }

  // If only PDIS/disease keywords without specific kinase names, fetch top by PDIS
  const hasPdisQuery = /pdis/.test(lowerQuery);
  const diseaseWords = ["cancer", "tumor", "disease", "diseases", "mutation", "mutations",
    "glioblastoma", "breast", "lung", "colorectal", "melanoma", "leukemia", "lymphoma",
    "carcinoma", "sarcoma", "neuroblastoma", "alzheimer", "parkinson", "diabetes"];
  const hasDiseaseQuery = diseaseWords.some((d) => lowerQuery.includes(d));

  // Use meaningful kinase-related search terms only
  const expandedTerms = searchTerms.flatMap((t) => [t, ...t.split(/[-/]/)]);
  const meaningfulTerms = Array.from(new Set(expandedTerms)).filter(
    (t) => t.length >= 2 && /[a-z]{3,}/.test(t)
  );

  const match: Record<string, unknown> = {};

  if (groupMatches.length) {
    match.group = { $in: groupMatches };
  }
  if (meaningfulTerms.length) {
    const orConditions = meaningfulTerms.map((t) => ({
      $or: [
        { gene_symbol: { $regex: t, $options: "i" } },
        { full_name: { $regex: t, $options: "i" } },
      ],
    }));
    match.$and = orConditions;
  }

  let kinases: Record<string, unknown>[] | undefined;

  if (Object.keys(match).length) {
    kinases = await db.collection("kinases").find(match).limit(15).toArray() as Record<string, unknown>[];
  }

  // Fallback: PDIS query → top by PDIS score
  if (!kinases?.length && hasPdisQuery && !meaningfulTerms.length) {
    const pdisDocs = await db.collection("pdis")
      .find()
      .sort({ pdis_total: -1 })
      .limit(15)
      .toArray();
    const genes = pdisDocs.map((p) => p.gene_symbol as string).filter(Boolean);
    if (genes.length) {
      kinases = await db.collection("kinases")
        .find({ gene_symbol: { $in: genes } })
        .toArray() as Record<string, unknown>[];
      const geneOrder = new Map(genes.map((g, i) => [g, i]));
      kinases.sort((a, b) => (geneOrder.get(a.gene_symbol as string) ?? 99) - (geneOrder.get(b.gene_symbol as string) ?? 99));
    }
  }

  // Fallback: disease query → match disease names
  if (!kinases?.length && hasDiseaseQuery && !meaningfulTerms.length) {
    const diseaseWords = lowerQuery.match(/\b(glioblastoma|breast\s+cancer|lung\s+cancer|colorectal\s+cancer|melanoma|leukemia|lymphoma|diabetes|alzheimer|parkinson)\b/g);
    if (diseaseWords) {
      const diseaseName = diseaseWords[0];
      const diseaseDocs = await db.collection("diseases")
        .find({ "diseases.description": { $regex: diseaseName, $options: "i" } })
        .limit(15)
        .toArray()
        .catch(() => []);
      const genes = Array.from(new Set(diseaseDocs.map((d) => d.gene_symbol as string).filter(Boolean)));
      if (genes.length) {
        kinases = await db.collection("kinases")
          .find({ gene_symbol: { $in: genes } })
          .limit(15)
          .toArray() as Record<string, unknown>[];
      }
    }
  }

  if (!kinases?.length) return [];

  const geneSymbols = kinases.map((k) => k.gene_symbol).filter(Boolean);

  const [pdisDocs, varCounts, diseaseDocs] = await Promise.all([
    db.collection("pdis").find({ gene_symbol: { $in: geneSymbols } }).toArray(),
    db.collection("variants").aggregate([
      { $match: { gene_symbol: { $in: geneSymbols } } },
      { $group: { _id: "$gene_symbol", count: { $sum: 1 } } },
    ]).toArray().catch(() => []),
    db.collection("diseases").find({ gene_symbol: { $in: geneSymbols } }).toArray().catch(() => []),
  ]);

  const pdisMap = new Map(pdisDocs.map((p) => [p.gene_symbol, (p.pdis_total || 0) / 100]));
  const varCountMap = new Map(varCounts.map((v) => [v._id, v.count]));
  const diseaseMap = new Map(
    diseaseDocs.map((d) => [
      d.gene_symbol,
      (d.diseases || []).map((dis: { disease_id: string }) => dis.disease_id),
    ])
  );

  return kinases.map((k) => ({
    gene_symbol: k.gene_symbol,
    full_name: k.full_name,
    group: k.group,
    family: k.family,
    pdis_score: pdisMap.get(k.gene_symbol) || 0,
    mutation_count: varCountMap.get(k.gene_symbol) || 0,
    diseases: diseaseMap.get(k.gene_symbol) || [],
  }));
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!process.env.LLM_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "LLM_API_KEY not configured. Set it in .env.local to enable the chatbot.",
        }),
        { status: 501, headers: { "Content-Type": "application/json" } }
      );
    }

    const lastUserMsg = [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === "user");

    let context: Record<string, unknown>[] = [];
    if (lastUserMsg) {
      try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if (!db) throw new Error("MongoDB connection returned no db instance");
        context = await fetchKinaseContext(db, lastUserMsg.content);
      } catch (dbErr) {
        console.error("POST /api/chat db error:", dbErr);
        return new Response(
          JSON.stringify({
            error: `Database error: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`,
          }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const systemMessage = buildSystemPrompt(context);

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemMessage },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    let stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>;
    try {
      stream = await client.chat.completions.create({
        model: process.env.LLM_MODEL || "gpt-4o-mini",
        messages: openaiMessages,
        stream: true,
        temperature: 0.3,
        max_tokens: 2048,
      });
    } catch (llmErr) {
      console.error("POST /api/chat LLM error:", llmErr);
      const message = llmErr instanceof Error ? llmErr.message : String(llmErr);
      return new Response(
        JSON.stringify({ error: `LLM API error: ${message}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("POST /api/chat error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: `Chat failed: ${message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
