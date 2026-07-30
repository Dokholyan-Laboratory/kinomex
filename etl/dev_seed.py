"""Fast dev seed — generates realistic mock data locally without external API calls."""
import asyncio
import logging
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from etl.database import connect, disconnect, get_db, batch_upsert
from etl.database import COLLECTIONS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("kinomex.dev_seed")

TISSUES = [
    ("Brain", "CNS"), ("Cerebellum", "CNS"), ("Spinal cord", "CNS"),
    ("Heart", "Cardiovascular"), ("Artery", "Cardiovascular"), ("Vein", "Cardiovascular"),
    ("Lung", "Respiratory"), ("Bronchus", "Respiratory"),
    ("Liver", "Digestive"), ("Pancreas", "Digestive"), ("Colon", "Digestive"),
    ("Kidney", "Renal"), ("Bladder", "Renal"),
    ("Skin", "Skin"), ("Breast", "Reproductive"),
    ("Bone marrow", "Hematopoietic"), ("Spleen", "Hematopoietic"), ("Blood", "Hematopoietic"),
    ("Thymus", "Immune"), ("Lymph node", "Immune"),
    ("Skeletal muscle", "Musculoskeletal"), ("Bone", "Musculoskeletal"),
    ("Thyroid", "Endocrine"), ("Adrenal gland", "Endocrine"),
    ("Ovary", "Reproductive"), ("Testis", "Reproductive"), ("Prostate", "Reproductive"),
]
ASSAY_TYPES = ["IC50", "Ki", "Kd", "EC50"]
BINDING_TYPES = ["Type I", "Type II", "Type III", "Covalent", "PROTAC", "Orthosteric Type I"]
DISEASES = [
    "Non-small cell lung carcinoma", "Breast cancer", "Colorectal cancer",
    "Melanoma", "Pancreatic cancer", "Prostate cancer", "Ovarian cancer",
    "Glioblastoma", "Acute myeloid leukemia", "Chronic myeloid leukemia",
    "Alzheimer disease", "Parkinson disease", "Diabetes mellitus",
    "Inflammatory bowel disease", "Rheumatoid arthritis", "Asthma",
    "Cardiomyopathy", "Hypertension", "Stroke", "Epilepsy",
]
COMPOUNDS = [
    ("Imatinib", "Imatinib"), ("Gefitinib", "Gefitinib"), ("Erlotinib", "Erlotinib"),
    ("Sorafenib", "Sorafenib"), ("Sunitinib", "Sunitinib"), ("Dasatinib", "Dasatinib"),
    ("Nilotinib", "Nilotinib"), ("Lapatinib", "Lapatinib"), ("Pazopanib", "Pazopanib"),
    ("Vemurafenib", "Vemurafenib"), ("Crizotinib", "Crizotinib"), ("Ruxolitinib", "Ruxolitinib"),
    ("Trametinib", "Trametinib"), ("Osimertinib", "Osimertinib"), ("Alectinib", "Alectinib"),
    ("Bosutinib", "Bosutinib"), ("Ponatinib", "Ponatinib"), ("Ibrutinib", "Ibrutinib"),
    ("Idelalisib", "Idelalisib"), ("Palbociclib", "Palbociclib"), ("Ribociclib", "Ribociclib"),
    ("Abemaciclib", "Abemaciclib"), ("Entrectinib", "Entrectinib"), ("Larotrectinib", "Larotrectinib"),
    ("Midostaurin", "Midostaurin"), ("Gilteritinib", "Gilteritinib"), ("Fedratinib", "Fedratinib"),
    ("Pacritinib", "Pacritinib"), ("Selumetinib", "Selumetinib"), ("Binimetinib", "Binimetinib"),
    ("Cobimetinib", "Cobimetinib"), ("Tofacitinib", "Tofacitinib"), ("Baricitinib", "Baricitinib"),
    ("Upadacitinib", "Upadacitinib"), ("Fostamatinib", "Fostamatinib"),
]


async def seed_bioactivities(db, gene_symbols: list[str]) -> int:
    existing = await db[COLLECTIONS["bioactivities"]].count_documents({})
    if existing > 0:
        logger.info("bioactivities already has %d records — skipping", existing)
        return existing
    records = []
    for gene in gene_symbols:
        n = random.randint(3, 12)
        sampled = random.sample(COMPOUNDS, min(n, len(COMPOUNDS)))
        for cid, cname in sampled:
            assay_type = random.choice(ASSAY_TYPES)
            val_nm = round(10 ** random.uniform(-1, 4), 2)
            records.append({
                "compound_id": cid.lower(),
                "compound_name": cname,
                "canonical_smiles": "",
                "assay_type": assay_type,
                "standard_value": val_nm,
                "standard_units": "nM" if assay_type in ("IC50", "EC50") else "nM",
                "standard_relation": "=",
                "target_gene_symbol": gene,
                "target_organism": "Homo sapiens",
                "target_pref_name": gene,
                "binding_type": random.choice(BINDING_TYPES),
                "pubmed_ids": [str(random.randint(20000000, 40000000))],
                "doi": f"10.10{random.randint(1000, 9999)}/journal.{random.randint(10000, 99999)}",
                "pchembl_value": round(random.uniform(4.0, 10.0), 2),
                "assay_chembl_id": f"CHEMBL_DEV_{random.randint(100000, 999999)}",
                "document_journal": random.choice(["J Med Chem", "Cancer Res", "Nature", "Cell", "Science", "Blood", "J Clin Oncol"]),
                "document_year": random.randint(2000, 2025),
                "pubchem_cid": random.randint(1000000, 9999999),
                "source": "dev_seed",
            })
    await batch_upsert(COLLECTIONS["bioactivities"], records, key_fields=["compound_id", "assay_chembl_id"])
    logger.info("Seeded %d bioactivity records", len(records))
    return len(records)


async def seed_variants(db, gene_symbols: list[str]) -> int:
    existing = await db[COLLECTIONS["variants"]].count_documents({})
    if existing > 0:
        logger.info("variants already has %d records — skipping", existing)
        return existing
    aas = list("ACDEFGHIKLMNPQRSTVWY")
    records = []
    for gene in gene_symbols:
        n = random.randint(1, 5)
        for _ in range(n):
            wt = random.choice(aas)
            pos = random.randint(100, 1500)
            mt = random.choice(aas)
            while mt == wt:
                mt = random.choice(aas)
            records.append({
                "gene_symbol": gene,
                "mutation_code": f"{wt}{pos}{mt}",
                "wildtype_aa": wt,
                "position": pos,
                "mutant_aa": mt,
                "pathogenicity": random.choice(["Pathogenic", "Likely Pathogenic", "Uncertain Significance", "Benign"]),
                "source_title": f"Dev seed mutation {gene}",
                "pubmed_id": str(random.randint(20000000, 40000000)) if random.random() > 0.3 else "",
                "doi": "",
                "is_gatekeeper": random.random() < 0.1,
                "drug_resistance_context": random.choice(["", "Imatinib resistance", "Osimertinib resistance", "Crizotinib resistance"]) if random.random() > 0.7 else "",
                "omim_id": str(random.randint(100000, 300000)) if random.random() > 0.8 else "",
                "source": "dev_seed",
            })
    await batch_upsert(COLLECTIONS["variants"], records, key_fields=["gene_symbol", "mutation_code"])
    logger.info("Seeded %d variant records", len(records))
    return len(records)


async def seed_diseases(db, gene_symbols: list[str]) -> int:
    existing = await db[COLLECTIONS["diseases"]].count_documents({})
    if existing > 0:
        logger.info("diseases already has %d records — skipping", existing)
        return existing
    records = []
    for gene in gene_symbols:
        n = random.randint(1, 4)
        sampled = random.sample(DISEASES, min(n, len(DISEASES)))
        diseases = []
        for d in sampled:
            diseases.append({
                "disease_id": d,
                "disease_accession": f"DEV:{random.randint(10000, 99999)}",
                "description": f"{gene} associated with {d.lower()}",
                "omim_id": str(random.randint(100000, 300000)) if random.random() > 0.5 else "",
            })
        records.append({
            "uniprot_id": "",
            "gene_symbol": gene,
            "diseases": diseases,
        })
    if records:
        db_coll = db[COLLECTIONS["diseases"]]
        await db_coll.delete_many({})
        await db_coll.insert_many(records, ordered=False)
        await db_coll.create_index("gene_symbol")
    logger.info("Seeded %d disease records", len(records))
    return len(records)


async def seed_expression(db, gene_symbols: list[str]) -> int:
    existing = await db[COLLECTIONS["expression"]].count_documents({})
    if existing > 0:
        logger.info("expression already has %d records — skipping", existing)
        return existing
    records = []
    for gene in gene_symbols:
        n = random.randint(3, 10)
        sampled = random.sample(TISSUES, min(n, len(TISSUES)))
        for tissue, system in sampled:
            records.append({
                "gene_symbol": gene,
                "tissue_site": tissue,
                "median_tpm": round(random.uniform(0.1, 500), 2),
                "organ_system": system,
                "tau": round(random.uniform(0.3, 1.0), 3),
                "source": "dev_seed",
            })
    await batch_upsert(COLLECTIONS["expression"], records, key_fields=["gene_symbol", "tissue_site"])
    logger.info("Seeded %d expression records", len(records))
    return len(records)


# Known major kinase drug targets with approved inhibitors
HIGH_PDIS_GENES: set[str] = {
    "ABL1", "ABL2", "ALK", "AXL", "BRAF", "BTK", "CDK4", "CDK6", "CSF1R",
    "EGFR", "EPHA2", "ERBB2", "FGFR1", "FGFR2", "FGFR3", "FGFR4", "FLT3",
    "IGF1R", "IKBKE", "INSR", "JAK1", "JAK2", "JAK3", "KDR", "KIT", "LCK",
    "MAP2K1", "MAP2K2", "MET", "MTOR", "NTRK1", "NTRK2", "NTRK3", "PDGFRA",
    "PDGFRB", "PIK3CA", "PIK3CB", "PIK3CD", "PIK3CG", "RAF1", "RET",
    "ROCK1", "ROCK2", "SRC", "SYK", "TYK2", "VEGFA",
}

MEDIUM_PDIS_GENES: set[str] = {
    "AKT1", "AKT2", "AURKA", "AURKB", "CHEK1", "CHEK2", "CLK1", "CLK2",
    "DDR1", "DDR2", "DYRK1A", "EPHB4", "ERBB3", "ERBB4", "FES", "FGR",
    "FYN", "GAK", "HCK", "HIPK2", "ILK", "ITK", "KHSRP", "LATS1", "LATS2",
    "LIMK1", "LIMK2", "LRRK2", "LYN", "MAP3K1", "MAP3K7", "MAP4K4",
    "MAPK1", "MAPK3", "MAPK8", "MAPK9", "MAPK10", "MAPK14", "MELK",
    "MERTK", "MST1R", "NEK2", "NEK9", "NLK", "PAK1", "PAK2", "PAK4",
    "PLK1", "PLK4", "PRKACA", "PRKCA", "PRKCD", "PRKCI", "PRKCQ",
    "PTK2", "PTK2B", "PYK2", "RIPK1", "RIPK2", "RPS6KA1", "RPS6KB1",
    "SRMS", "STK10", "STK11", "STK3", "STK4", "TAOK1", "TBK1", "TEC",
    "TEK", "TIE1", "TLK1", "TLK2", "TNK2", "TTK", "TXK", "TYK2",
    "ULK1", "ULK2", "VRK1", "WEE1", "WNK1", "YES1", "ZAP70",
}


async def seed_pdis(db, gene_symbols: list[str]) -> int:
    existing = await db[COLLECTIONS["pdis"]].count_documents({})
    if existing > 0:
        logger.info("pdis already has %d records — skipping", existing)
        return existing
    records = []
    for gene in gene_symbols:
        base_cite = random.uniform(10, 60)
        base_clin = random.uniform(5, 45)
        base_struct = random.uniform(5, 45)
        base_patent = random.uniform(5, 45)

        if gene in HIGH_PDIS_GENES:
            cite_bonus = random.uniform(40, 70)
            clin_bonus = random.uniform(35, 70)
            struct_bonus = random.uniform(30, 60)
            patent_bonus = random.uniform(35, 70)
            fda = True
        elif gene in MEDIUM_PDIS_GENES:
            cite_bonus = random.uniform(10, 35)
            clin_bonus = random.uniform(8, 30)
            struct_bonus = random.uniform(8, 25)
            patent_bonus = random.uniform(10, 30)
            fda = random.random() < 0.15
        else:
            cite_bonus = 0
            clin_bonus = 0
            struct_bonus = 0
            patent_bonus = 0
            fda = False

        citation = round(min(100, base_cite + cite_bonus), 1)
        clinical = round(min(100, base_clin + clin_bonus), 1)
        structure = round(min(100, base_struct + struct_bonus), 1)
        patent = round(min(100, base_patent + patent_bonus), 1)

        total = round(
            (0.30 * citation + 0.30 * clinical + 0.15 * structure + 0.15 * patent)
            / 0.90,
            1,
        )

        records.append({
            "gene_symbol": gene,
            "pdis_total": total,
            "components": {
                "citation": citation,
                "clinical_trials": clinical,
                "structure": structure,
                "patent_proxy": patent,
                "fda_approved": fda,
            },
            "raw_values": {
                "pub_count": random.randint(10, 5000),
                "trial_count": random.randint(0, 200),
                "pdb_count": random.randint(0, 50),
                "best_resolution": round(random.uniform(1.5, 3.5), 2),
            },
            "source": "dev_seed",
        })
    await batch_upsert(COLLECTIONS["pdis"], records, key_fields=["gene_symbol"])
    logger.info("Seeded %d PDIS records", len(records))
    return len(records)


async def seed_structures(db, gene_symbols: list[str]) -> int:
    existing = await db[COLLECTIONS["structures"]].count_documents({})
    if existing > 0:
        logger.info("structures already has %d records — skipping", existing)
        return existing
    records = []
    for gene in gene_symbols:
        n = random.randint(0, 4)
        for _ in range(n):
            records.append({
                "pdb_id": f"8DEV{random.randint(100, 999)}",
                "gene_symbols": [gene],
                "resolution": round(random.uniform(1.5, 3.8), 2),
                "method": "X-ray diffraction",
                "organism": "Homo sapiens",
                "title": f"Structure of {gene} kinase domain",
                "source": "dev_seed",
            })
    if records:
        await batch_upsert(COLLECTIONS["structures"], records, key_fields=["pdb_id"])
    logger.info("Seeded %d structure records", len(records))
    return len(records)


async def main() -> None:
    logger.info("Checking database state...")
    await connect()
    db = get_db()

    kinase_count = await db[COLLECTIONS["kinases"]].count_documents({})
    if kinase_count == 0:
        logger.warning("No kinases found — run the uniprot step first (auto_populate handles this)")
        await disconnect()
        return

    gene_symbols = await db[COLLECTIONS["kinases"]].distinct("gene_symbol")
    gene_symbols = [g for g in gene_symbols if g]
    logger.info("Found %d kinase gene symbols to seed", len(gene_symbols))

    await seed_bioactivities(db, gene_symbols)
    await seed_variants(db, gene_symbols)
    await seed_diseases(db, gene_symbols)
    await seed_expression(db, gene_symbols)
    await seed_pdis(db, gene_symbols)

    logger.info("=" * 60)
    for c in ["bioactivities", "variants", "diseases", "expression", "pdis"]:
        cnt = await db[c].count_documents({})
        logger.info("  %-15s %7d records", c, cnt)
    logger.info("=" * 60)

    await disconnect()
    logger.info("Dev seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
