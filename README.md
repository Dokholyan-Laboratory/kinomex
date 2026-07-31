# KinomeX

KinomeX is a full-stack research server for exploring the human protein kinase
landscape. It connects kinase identity and classification with molecular
structures, ligand bioactivity, tissue expression, clinically annotated
variants, disease associations, literature, clinical investigation, and a
derived Pharmaceutical Development Interest Score (PDIS).

The server is designed for target exploration and hypothesis generation. It is
not a clinical decision-support system, and PDIS is not a measure of biological
importance, safety, efficacy, or medical recommendation.

- **Repository:** <https://github.com/dokhlab/kinomex>
- **Laboratory:** [Dokholyan Laboratory](https://dokhlab.org)
- **Application:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Database:** MongoDB through Mongoose (application) and Motor (ETL)
- **Data pipeline:** asynchronous Python ingestion with scheduled refreshes
- **Tests:** Jest, Testing Library, ts-jest, and jsdom

## Table of contents

1. [Capabilities](#capabilities)
2. [Architecture](#architecture)
3. [User-facing pages](#user-facing-pages)
4. [Data sources and provenance](#data-sources-and-provenance)
5. [Database model](#database-model)
6. [PDIS](#pharmaceutical-development-interest-score-pdis)
7. [API reference](#api-reference)
8. [Local installation](#local-installation)
9. [Running KinomeX](#running-kinomex)
10. [ETL and database population](#etl-and-database-population)
11. [Automatic source updates](#automatic-source-updates)
12. [AI features](#ai-features)
13. [Security and validation](#security-and-validation)
14. [Testing and quality checks](#testing-and-quality-checks)
15. [Deployment](#deployment)
16. [Operations and troubleshooting](#operations-and-troubleshooting)
17. [Repository layout](#repository-layout)
18. [Known limitations](#known-limitations)

## Capabilities

KinomeX currently provides:

- a searchable catalog of curated human kinases;
- Manning-group classification across AGC, CAMK, CK1, CMGC, STE, TK, TKL,
  and Atypical kinases;
- paginated filtering by gene/name, group, organ system, and PDIS interval;
- a dynamic 20-bin PDIS histogram with draggable minimum and maximum bounds;
- a radial D3 kinome tree with group coloring and PDIS-scaled nodes;
- per-kinase profiles combining sequence, structures, ligand assays,
  expression, variants, diseases, references, and PDIS components;
- interactive NGL and Mol* structure visualization;
- an SVG body-expression map and tissue-expression bar chart;
- mutation and ligand tables with source metadata;
- rule-based natural-language search over groups, diseases, tissues, and PDIS;
- optional database-grounded conversational AI through an OpenAI-compatible
  chat-completions endpoint;
- an eight-step, dependency-aware ETL pipeline;
- a concurrency-safe scheduled updater with MongoDB run history.

Displayed counts are computed from the connected MongoDB database. They may
differ between development, production, and historical snapshots.

## Architecture

```text
Browser
  Next.js App Router pages
  React 18 + Tailwind + Framer Motion + D3 + NGL/Mol*
       │
       │ fetch /api/*
       ▼
Next.js Node.js API routes
  input validation, query construction, enrichment, five-minute local caches
       │
       │ Mongoose / MongoDB driver
       ▼
MongoDB
  kinases, structures, bioactivities, expression, variants,
  diseases, pdis, etl_runs
       ▲
       │ Motor / PyMongo idempotent upserts
       │
Python asynchronous ETL
  UniProt → PDB → ChEMBL → PubChem → GTEx → ClinVar → diseases → PDIS
       │
       ▼
Authoritative public data services
```

The application joins the normalized MongoDB collections at request time.
There is no separate GraphQL layer or data warehouse. Next.js caches selected
list/distribution responses in process memory for five minutes; a server
restart clears those caches.

### Main technology choices

| Layer | Technology | Purpose |
| --- | --- | --- |
| Web framework | Next.js 14 App Router | Pages, API routes, metadata, server runtime |
| UI | React 18, TypeScript, Tailwind CSS | Typed responsive interface |
| Motion | Framer Motion, CSS animation | Page transitions and subtle background motion |
| Visualization | D3, SVG, NGL, Mol* | Tree, histograms, body map, structures |
| Database client | Mongoose | Connection reuse from Next.js |
| ETL database client | Motor/PyMongo | Async ingestion and bulk upsert |
| Network/retry | aiohttp, tenacity | Upstream API requests and retry behavior |
| LLM | OpenAI-compatible SDK | Optional streaming database-grounded chat |
| Tests | Jest, ts-jest, Testing Library | Unit and component verification |

## User-facing pages

| Route | Page | Function |
| --- | --- | --- |
| `/` | Dashboard | Live summary, search, group filters, and paginated kinase cards |
| `/explorer` | Explorer | Gene/group/organ filtering and interactive PDIS histogram |
| `/tree` | Kinome Tree | Radial D3 overview of kinase groups and PDIS values |
| `/search` | AI Search | Rule-based natural-language query parsing and comparison workflow |
| `/kinases/[gene]` | Kinase profile | Structure, distribution, ligands, mutations, diseases, and references |
| `/docs` | Documentation | In-product biological, technical, and reference documentation |

The fixed navigation includes quick search, responsive mobile navigation, and
the KinomeX folded-ribbon identity. The full-screen biomedical background uses
a supplied raster artwork with slow CSS drift, cyan/violet ambient breathing,
and a `prefers-reduced-motion` fallback.

## Data sources and provenance

| Source | Imported or queried information | Primary collection/use |
| --- | --- | --- |
| UniProt | accession, gene symbol, name, sequence, domains, EC number, keywords, reviewed status, disease comments | `kinases`, `diseases` |
| RCSB PDB | structure identifiers, experimental method, resolution, titles, bound ligands | `structures` |
| ChEMBL | human kinase targets, compounds, assays, standardized activity values, documents | `bioactivities` |
| PubChem | compound enrichment and additional assay/compound records | `bioactivities` |
| GTEx | tissue expression, median TPM, tissue-to-organ mapping, specificity | `expression` |
| ClinVar/NCBI | clinically annotated variants and significance | `variants` |
| PubMed/NCBI E-utilities | publication counts for PDIS and profile references | `pdis`, live profile references |
| ClinicalTrials.gov API v2 | active/completed kinase-inhibitor study counts | `pdis` |
| Manning classification | curated group/family mapping | `kinases` classification |

Every external dataset remains subject to its provider's license, attribution,
rate-limit, and redistribution terms. Source APIs can revise records
independently of KinomeX. A successful ETL run indicates that the configured
requests and database writes completed; it does not independently certify the
scientific correctness of every upstream record.

## Database model

The default database is `kinomex`. Collection names are centralized in
`etl/database.py`.

### `kinases`

Canonical metadata used to anchor all other collections.

Important fields include `gene_symbol`, `uniprot_id`, `full_name`, `group`,
`subfamily`, `ec_number`, `protein_sequence`, `seq_length`, `keywords`,
`reviewed`, and domain boundaries. `uniprot_id` is unique; `gene_symbol` and
`ec_number` are indexed.

### `structures`

RCSB structure records such as `pdb_id`, associated gene/accession fields,
title, resolution, experimental method, and bound ligands. `pdb_id` is unique;
gene and resolution fields are indexed. Profile responses currently return at
most 20 structures per kinase.

### `bioactivities`

ChEMBL and PubChem compound/assay records. Typical fields include
`compound_id`, `target_chembl_id`, `target_gene_symbol`, `pubchem_cid`,
`assay_type`, `standard_value`, `standard_units`, document identifiers, and
source metadata. Profile responses currently return at most 200 records and
normalize supported units to nM for display.

### `expression`

One record per gene/tissue combination, including `gene_symbol`, `tissue_site`,
`median_tpm`, `organ_system`, `tau`, and source. The gene/tissue pair is unique.

### `variants`

Variant records including gene/accession, mutation code, residue position,
reference and alternate amino acids, clinical significance/pathogenicity,
gatekeeper status, resistance context, and literature identifiers. Gene,
pathogenicity, and accession/mutation combinations are indexed.

### `diseases`

One gene-level document containing a `diseases` array. Disease items can
include `disease_id`, description, and OMIM identifier.

### `pdis`

One document per gene with `pdis_total` on a 0–100 storage scale, normalized
component values, raw counts, and source metadata. API responses generally
divide the total by 100 and expose a 0–1 display scale.

### `etl_runs`

Singleton scheduled-job state and audit history. It stores the current lease,
status, timestamps, latest per-step results, the latest error, and the last 20
run summaries. The document `_id` is `scheduled-source-refresh`.

## Pharmaceutical Development Interest Score (PDIS)

PDIS is an exploratory ranking signal intended to summarize how much
pharmaceutical-development evidence surrounds a kinase. It must not be
interpreted as clinical advice or intrinsic biological importance.

### Current implemented calculation

The executable calculator in `etl/ingestors/pdis_calculator.py` currently uses:

```text
PDIS = (0.30 × citation
      + 0.30 × clinical_trials
      + 0.15 × structure
      + 0.15 × compound_diversity) / 0.90
```

Each component is calculated on a 0–100 scale:

- **Citation:** `log10(publication_count + 1) / log10(max_count + 1) × 100`,
  using a PubMed query for the gene and kinase terms.
- **Clinical trials:** `min(100, trial_count / 100 × 100)`, using selected
  active or completed ClinicalTrials.gov statuses.
- **Structure:** 60% best-resolution score plus 40% average-resolution score,
  with the useful interval bounded approximately between 1.5 and 4.0 Å.
- **Compound diversity:** log-normalized distinct ChEMBL/PubChem compound
  count linked to the kinase gene.

The calculator refuses to run if verified RCSB structure or ChEMBL/PubChem
imports are absent, or if development-seed records are present. A missing PDIS
document therefore means “not currently verifiable,” never a score of zero.

If the calculation changes, stored PDIS documents must be regenerated by
running the `pdis` target (which automatically includes its prerequisites).

## API reference

All routes return JSON except `/api/chat`, which streams Server-Sent Events
(SSE). Error responses use an `error` string and an appropriate HTTP status.

### `GET /api/kinases`

Returns a validated, enriched, paginated kinase list.

| Parameter | Default | Rules |
| --- | --- | --- |
| `search` | empty | Gene/full-name substring; maximum 100 characters; regex-escaped |
| `group` | empty | `AGC`, `CAMK`, `CK1`, `CMGC`, `STE`, `TK`, `TKL`, or `Atypical` |
| `organ_system` | empty | Maximum 50 characters; aliases such as brain→CNS are resolved |
| `minPDIS` | `0` | Finite number on display scale 0–1 |
| `maxPDIS` | `1` | Finite number on display scale 0–1; must be ≥ minimum |
| `page` | `1` | Positive integer |
| `limit` | `20` | Positive integer, capped at 100 |
| `sort` | `gene_symbol` | Allowlisted field; prefix `-` for descending order |

Allowed sort fields are `gene_symbol`, `full_name`, `group`, `subfamily`, and
`uniprot_id`. Organ and PDIS gene sets are resolved before counting and
pagination, so `total` and `totalPages` describe the filtered result. Kinases
without a PDIS document return `pdis_score: null` and are excluded whenever a
PDIS interval is explicitly requested.

Response shape:

```json
{
  "kinases": [],
  "total": 0,
  "page": 1,
  "totalPages": 0
}
```

Each returned kinase includes its gene symbol, name, group, subfamily,
UniProt ID, normalized PDIS, organ systems, disease identifiers, and mutation
count. Successful non-empty results are cached in the server process for five
minutes.

### `GET /api/kinases/distribution`

Returns 20 PDIS buckets over the stored 0–100 range for the current
`search`, `group`, and `organ_system` filters. It deliberately ignores the
selected PDIS interval so the Explorer histogram remains stable while its
handles move. Kinases without a score are placed in the first bucket.

### `GET /api/kinases/stats`

Returns total kinase, ligand/bioactivity, variant, structure, and disease
document counts; group distribution; average normalized PDIS; and top-mutated
and top-PDIS lists.

### `GET /api/kinases/[gene]`

Returns the unified kinase profile used by the detail page. Gene matching is
case-insensitive and exact. A profile request can additionally query ChEMBL to
resolve a target identifier and PubMed to assemble recent references; those
live lookups use five-second timeouts and degrade to locally available data.

Status codes include `400` for a missing gene, `404` when no kinase is found,
and `500` for an unexpected profile failure.

### `POST /api/ai-search`

Accepts:

```json
{ "query": "high PDIS TK kinases associated with melanoma" }
```

`parseQuery()` extracts group, tissue, disease, binding, and PDIS concepts,
then searches local collections. Candidate sets are capped during retrieval,
deduplicated by gene, enriched, ranked, and sliced to at most 50 results. This
route is rule-based; it does not call an LLM.

### `POST /api/chat`

Accepts a non-empty `messages` array containing only `user` and `assistant`
roles. Limits are 40 messages, 8,000 characters per message, and 24,000 total
characters. The route retrieves up to 15 relevant database records, adds them
to a fixed system prompt, and streams completion deltas:

```text
data: {"content":"..."}

data: [DONE]
```

The endpoint returns `501` when `LLM_API_KEY` is absent, `503` when database
context is unavailable, and `502` for an upstream language-model failure.

## Local installation

### Requirements

- Node.js 20 or newer and npm
- Python 3.10 or newer
- MongoDB 7-compatible server, local or remote
- `lsof` for the convenience launcher's stop command

### Install dependencies

```bash
git clone https://github.com/dokhlab/kinomex.git
cd kinomex
npm install

python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r etl/requirements.txt
cp etl/.env.example etl/.env
```

### Application environment

Create `.env.local` in the repository root:

```dotenv
MONGODB_URI=mongodb://localhost:27017/kinomex

# Optional conversational AI
LLM_API_KEY=your_key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

### ETL environment

`etl/config.py` loads `etl/.env`. Available settings are:

| Variable | Required | Default/purpose |
| --- | --- | --- |
| `MONGODB_URI` | No | `mongodb://localhost:27017/kinomex` |
| `UNIPROT_API_URL` | No | UniProt REST root |
| `RCSB_API_URL` | No | RCSB search endpoint |
| `CHEMBL_API_URL` | No | ChEMBL API root |
| `PUBCHEM_API_URL` | No | PubChem PUG REST root |
| `GTEX_API_URL` | No | GTEx v2 API root |
| `NCBI_EUTILS_URL` | No | NCBI E-utilities root |
| `PUBMED_API_KEY` | No | Raises permitted NCBI request throughput |

Never commit `.env`, `.env.local`, database credentials, or API keys. These
patterns are excluded by `.gitignore`.

## Running KinomeX

The repository-local launcher starts the database population guard and Next.js:

```bash
./run              # start on port 3007
./run 3010         # start on another port
./run -s           # gracefully stop KinomeX on port 3007
./run -s 3010      # gracefully stop KinomeX on another port
```

The launcher:

1. validates the requested TCP port;
2. verifies that `python3` and `npm` are available;
3. starts `python3 -m etl.auto_populate` in the background;
4. writes population output to `etl/auto_populate.log`;
5. starts `npm run dev -- -p <port>`;
6. terminates its background population process when the app exits;
7. refuses to stop a listener whose working directory is not this repository.

Run Next.js without automatic population:

```bash
npm run dev -- -p 3007
```

Production mode:

```bash
npm run build
npm run start -- -p 3007
```

## ETL and database population

### Startup population guard

`python3 -m etl.auto_populate` is intended for local startup. If the kinase
collection is empty, it imports reviewed UniProt metadata. It then:

- reports which scientific evidence collections are absent;
- never invents or seeds structures, bioactivities, variants, diseases,
  expression values, or PDIS scores;
- directs operators to the source ETL for missing evidence.

This guard is not a substitute for a full production ingestion.

### Production ETL

List steps:

```bash
python3 -m etl.pipeline --list-steps
```

Run every step:

```bash
python3 -m etl.pipeline
```

Run target steps:

```bash
python3 -m etl.pipeline uniprot
python3 -m etl.pipeline chembl pubchem
python3 -m etl.pipeline pdis
```

Dependencies are included automatically and run in topological order. For
example, requesting `pdis` schedules `uniprot`, `pdb`, `chembl`, `gtex`,
`clinvar`, `diseases`, and finally `pdis`.

| Step | Depends on | Main effect |
| --- | --- | --- |
| `uniprot` | — | Kinase metadata and sequences |
| `pdb` | `uniprot` | Structural coverage |
| `chembl` | `uniprot` | ChEMBL assays and compounds |
| `pubchem` | `uniprot`, `chembl` | Compound/assay enrichment |
| `gtex` | `uniprot` | Tissue expression |
| `clinvar` | `uniprot` | Clinical variants |
| `diseases` | `uniprot` | UniProt disease annotations |
| `pdis` | all relevant upstream steps | Recomputed development-interest score |

Steps report record counts and elapsed time. An individual failed step is
recorded, later steps continue, and the command exits non-zero if any step
failed.

## Automatic source updates

`.github/workflows/refresh-data.yml` runs every Sunday at **03:17 UTC** and
supports manual dispatch with optional space-separated ETL targets.

Required GitHub repository configuration:

| Secret | Required | Purpose |
| --- | --- | --- |
| `KINOMEX_MONGODB_URI` | Yes | Network-accessible production MongoDB URI |
| `PUBMED_API_KEY` | Recommended | PubMed/NCBI rate allowance |

The workflow installs Python 3.12 and `etl/requirements.txt`, validates the
database secret, allowlists manual target names, and invokes
`python -m etl.scheduled_update`.

The scheduled updater:

- acquires an atomic lease in MongoDB before ingestion;
- skips safely if another refresh owns the lease;
- uses a six-hour default lease and validates custom lease bounds;
- runs all sources or the requested dependency-expanded subset;
- returns non-zero when any ETL step fails;
- stores latest status/results/error and 20 historical summaries;
- uses GitHub Actions concurrency to avoid duplicate workflow jobs.

Run the same protected refresh locally:

```bash
python3 -m etl.scheduled_update
python3 -m etl.scheduled_update uniprot diseases pdis
python3 -m etl.scheduled_update --lease-minutes 480
```

The application reads MongoDB at request time, so a successful refresh does
not require a rebuild. Existing in-memory API entries can remain visible for
up to five minutes.

## AI features

KinomeX separates two AI-like experiences:

- **AI Search** is deterministic parsing and MongoDB filtering. It requires no
  external model or API key.
- **Chat** calls an OpenAI-compatible chat-completions service after retrieving
  a compact kinase context from MongoDB.

The chat model is instructed to prefer retrieved records, preserve uppercase
gene symbols, include groups/PDIS in lists, and acknowledge unavailable data.
This retrieval is lightweight keyword matching, not vector search or a formal
retrieval-evaluation system. Model responses can still be incomplete or
incorrect and should be checked against primary sources.

## Security and validation

Implemented boundaries include:

- allowlisted kinase groups and MongoDB sort fields;
- finite numeric parsing and range validation for pagination and PDIS;
- query length limits;
- escaping of user-derived MongoDB regular expressions;
- chat role, message-count, per-message, and total-size validation;
- generic client-facing database/LLM errors with detailed server-side logs;
- environment-only credentials;
- graceful launcher shutdown that verifies process working directory;
- GitHub Actions read-only repository permissions and workflow concurrency.

The project does **not** currently implement user accounts, authorization,
rate limiting, CSRF protection for authenticated operations, a persistent
distributed API cache, or an administrative web interface. Do not expose it as
an unrestricted public service without adding deployment-level protections
(TLS, rate limiting, request/body limits, monitoring, and database network
controls).

## Testing and quality checks

```bash
npm test -- --runInBand   # Jest unit/component tests
npx tsc --noEmit          # TypeScript checking
npm run lint              # Next.js ESLint rules
python3 -m compileall -q etl
bash -n run
git diff --check
```

The current suite covers cache behavior, query parsing, kinase utilities, API
validation, general utilities, and the PDIS badge component. MongoDB-backed API
integration tests, browser end-to-end tests, ETL contract fixtures, and live
upstream API tests are not yet included.

## Deployment

KinomeX requires a Node.js runtime because API routes use MongoDB and the chat
endpoint streams responses. A production deployment should provide:

1. a network-restricted MongoDB deployment with backups;
2. `MONGODB_URI` in the application runtime;
3. optional `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL`;
4. a separate execution environment for scheduled Python ETL;
5. repository secrets for the GitHub updater;
6. outbound access to the configured scientific APIs;
7. TLS, rate limiting, request logging, alerting, and uptime monitoring.

The default GitHub-hosted runner cannot reach a MongoDB instance bound only to
`localhost` or a private workstation. Use a securely network-accessible
database or an appropriately configured self-hosted runner. Never solve this by
opening MongoDB to the entire internet without authentication and network
controls.

Before release, run `npm run build`; development success alone does not verify
production rendering and bundling.

## Operations and troubleshooting

### Database connection failures

- Confirm MongoDB is running and accepts the configured URI.
- Confirm `.env.local` and `etl/.env` point to the same intended database.
- For hosted MongoDB, verify TLS options, credentials, IP/network rules, and DNS.
- The ETL driver uses a five-second server-selection timeout by default.

### Empty or partial database

- Inspect `etl/auto_populate.log` after launcher startup.
- Run `python3 -m etl.pipeline --list-steps` to verify the environment.
- Use the full pipeline for production; development seeding is intentionally
  incomplete compared with upstream ingestion.
- Inspect `etl_runs` for scheduled-update status and per-step failures.

### Upstream API failures

- Re-run only the failed target; dependencies are added automatically.
- Check provider status, response changes, rate limits, and API-key validity.
- A source failure may leave previously stored records available; it does not
  imply that all old records were deleted.

### Chat failures

- `501`: `LLM_API_KEY` is missing.
- `502`: the configured language-model endpoint rejected or failed the request.
- `503`: MongoDB context retrieval is unavailable.
- Confirm that `LLM_BASE_URL` is OpenAI-compatible and that `LLM_MODEL` exists.

### Stale interface data

- List and histogram endpoints use five-minute process-local caches.
- Wait for expiry or restart the server after a critical refresh.
- Browser favicons are aggressively cached; use a hard refresh after changes.

### Port shutdown is refused

`./run -s` intentionally refuses to terminate a listener whose current working
directory is not the KinomeX repository. Stop that process explicitly or use a
different KinomeX port.

## Repository layout

```text
kinomex/
├── .github/workflows/refresh-data.yml   scheduled source refresh
├── etl/
│   ├── ingestors/                       source-specific ingestion modules
│   ├── auto_populate.py                 development startup guard
│   ├── database.py                      collections, indexes, bulk upsert
│   ├── pipeline.py                      dependency-aware ETL orchestrator
│   ├── scheduled_update.py              lease, audit history, failure status
│   └── requirements.txt                 Python dependencies
├── public/
│   ├── icons/                           KinomeX identity assets
│   └── images/                          biomedical background
├── src/
│   ├── app/                              pages, layout, styles, API routes
│   ├── components/                       UI, kinase, chat, visualizations
│   ├── lib/                              DB, cache, parsing, validation, helpers
│   └── models/                           Mongoose schema definitions
├── run                                   safe development launcher
├── package.json                          Node scripts and dependencies
└── README.md                             this document
```

## Known limitations

- PDIS remains unavailable until verified, kinase-scoped RCSB and ChEMBL
  imports have completed; missing scores are rendered as `N/A`.
- No user authentication or authorization layer is present.
- API caches are per-process and are neither shared nor explicitly invalidated
  after ETL updates.
- Some kinase profile references and ChEMBL target resolution depend on live
  third-party calls at request time.
- The reviewed UniProt Protein kinase keyword set is broader than some
  historical kinome definitions; counts can therefore differ by definition.
- Automated tests do not currently exercise a real MongoDB instance or live
  scientific APIs.
- Upstream schema changes can require ingestor maintenance.

## Data-integrity audit and synthetic-data removal

The July 31, 2026 audit recursively inspected every numeric value and source
field in every scientific collection. The reproducible reports are
`data-audit/audit-before.json` and `data-audit/audit-after.json`.

The initial audit found 10,263 demonstrably synthetic documents: all 3,885
bioactivities, 508 diseases, 3,265 expression measurements, 508 PDIS scores,
575 structures, and 1,522 variants. Every targeted document was exported as
MongoDB Extended JSON in a timestamped gzip backup before deletion. The final
audit contains 59,735 documents, zero records matching a synthetic signature,
and zero non-finite numbers:

| Collection | Final records | Provenance |
| --- | ---: | --- |
| `kinases` | 625 | reviewed UniProt Protein kinase entries |
| `expression` | 33,588 | GTEx v10 median gene expression |
| `variants` | 25,285 | NCBI ClinVar |
| `diseases` | 237 | UniProt disease comments |
| `pdis` | 0 | unavailable until all prerequisites are verified |
| `structures` | 0 | unavailable; broad organism-level fallback rejected |
| `bioactivities` | 0 | unavailable; non-target-scoped fallback rejected |

Run a non-mutating audit with:

```bash
node scripts/audit_database.mjs --output=data-audit/audit-current.json
```

Preview the known synthetic signatures, then back up and remove matches:

```bash
node scripts/purge_synthetic_data.mjs
node scripts/purge_synthetic_data.mjs --apply
```

The purge command is dry-run by default. `--apply` verifies the backup and the
post-delete count for each collection. Backup payloads are excluded from Git.

## Scientific use and citation

When using KinomeX results, cite the original upstream database or publication
supporting each datum. The Manning human-kinome classification is based on:

> Manning G, Whyte DB, Martinez R, Hunter T, Sudarsanam S. The protein kinase
> complement of the human genome. *Science*. 2002;298:1912–1934.

KinomeX is an integration and exploration layer. It does not replace review of
primary literature, source-database records, or expert interpretation.
