# KinomeX

KinomeX is a full-stack human-kinome explorer for kinase classification,
structures, ligands, tissue expression, variants, diseases, and pharmaceutical
development interest scoring (PDIS). It combines a Next.js interface and API,
MongoDB, and an asynchronous Python ETL pipeline.

## Requirements

- Node.js 20 or newer and npm
- Python 3.10 or newer
- MongoDB available at `mongodb://localhost:27017/kinomex` (or a custom URI)

## Local setup

```bash
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install -r etl/requirements.txt
cp etl/.env.example etl/.env
```

Create `.env.local` when AI chat is needed:

```dotenv
MONGODB_URI=mongodb://localhost:27017/kinomex
LLM_API_KEY=your_key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

Do not commit either environment file. The application works without an LLM
key except for the conversational chat endpoint.

## Running the application

From the project directory, use the launcher:

```bash
./run              # start on port 3007
./run 3010         # start on another port
./run -s           # stop KinomeX on port 3007
./run -s 3010      # stop KinomeX on another port
```

The launcher starts `etl.auto_populate` in the background and writes its output
to `kinomex/etl/auto_populate.log`. It then starts the Next.js development
server. The population guard imports UniProt metadata only when the kinase
collection is empty and seeds missing development collections.

To run Next.js without automatic population:

```bash
npm run dev -- -p 3007
```

## ETL pipeline

List the available steps:

```bash
python3 -m etl.pipeline --list-steps
```

Run the complete pipeline or selected targets:

```bash
python3 -m etl.pipeline
python3 -m etl.pipeline uniprot
python3 -m etl.pipeline pdis
```

Selected targets automatically include their prerequisites. For example,
requesting `pdis` runs `uniprot`, `pdb`, `chembl`, `gtex`, `clinvar`, and
`diseases` first. ETL configuration and upstream API overrides live in
`etl/.env`; see `etl/.env.example`.

The main collections are `kinases`, `structures`, `bioactivities`,
`expression`, `variants`, `diseases`, and `pdis`.

### Automatic source updates

The workflow `.github/workflows/refresh-data.yml` checks all upstream sources
every Sunday at 03:17 UTC and can also be started manually. Configure these
repository secrets before enabling it:

- `KINOMEX_MONGODB_URI` — a network-accessible production MongoDB URI
- `PUBMED_API_KEY` — optional, but recommended for PubMed rate limits

The scheduled job runs `python -m etl.scheduled_update`. It uses an atomic
MongoDB lease so scheduled and manually triggered updates cannot overlap,
propagates any failed ETL step to the workflow, and stores the latest result
plus 20 historical runs in the `etl_runs` collection. Since the application
reads MongoDB at request time, refreshed data appears without rebuilding the
website (API caches expire within five minutes).

Run the same protected update locally:

```bash
python3 -m etl.scheduled_update
python3 -m etl.scheduled_update uniprot diseases pdis
```

Each ingestor queries its authoritative upstream API and performs idempotent
upserts, so unchanged records remain stable while new or revised records are
written. A failed source is recorded explicitly rather than being presented as
a successful refresh.

## Development commands

```bash
npm run dev
npm run build
npm run lint
npm test -- --runInBand
npx tsc --noEmit
```

## Application structure

```text
src/app/                 Next.js pages and API routes
src/components/          UI, kinase, chat, and visualization components
src/lib/                 database, cache, parsing, and shared utilities
src/models/              Mongoose schemas
etl/                     Python ingestion, seeding, and PDIS calculation
public/                  static image and icon assets
```

Key routes include the dashboard (`/`), tree (`/tree`), explorer
(`/explorer`), AI search (`/search`), kinase profiles (`/kinases/[gene]`), and
documentation (`/docs`). API routes are under `/api/kinases`, `/api/ai-search`,
and `/api/chat`.

## Data provenance

KinomeX integrates data from UniProt, RCSB PDB, ChEMBL, PubChem, GTEx, ClinVar,
PubMed, and ClinicalTrials.gov. Derived PDIS values use the weighted components
documented in the in-product documentation. Upstream licenses and attribution
requirements still apply when publishing or redistributing imported datasets.

## Troubleshooting

- If the UI returns database errors, verify MongoDB is running and that
  `MONGODB_URI` points to the intended database.
- If the database is empty, inspect `etl/auto_populate.log` instead of restarting
  repeatedly.
- If chat returns `501`, configure `LLM_API_KEY` in `.env.local` and restart.
- Browser favicons are aggressively cached; use a hard refresh after changing
  the icon.
