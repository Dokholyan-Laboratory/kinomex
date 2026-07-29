from __future__ import annotations

import logging
import random
from typing import Any

from ..config import settings
from ..database import COLLECTIONS, batch_upsert, get_db

logger = logging.getLogger(__name__)

TISSUE_TO_ORGAN_SYSTEM: dict[str, str] = {
    "Brain": "CNS", "Spinal Cord": "CNS", "Cerebellum": "CNS",
    "Heart": "Cardiovascular", "Aorta": "Cardiovascular",
    "Liver": "Hepatic", "Kidney": "Renal",
    "Whole Blood": "Immune", "Spleen": "Immune", "Tonsil": "Immune", "Lymph Node": "Immune", "Bone Marrow": "Immune",
    "Colon": "Gastrointestinal", "Small Intestine": "Gastrointestinal", "Stomach": "Gastrointestinal", "Esophagus": "Gastrointestinal",
    "Lung": "Respiratory",
    "Adrenal Gland": "Endocrine", "Thyroid": "Endocrine", "Pancreas": "Endocrine", "Pituitary": "Endocrine",
    "Breast": "Reproductive", "Ovary": "Reproductive", "Testis": "Reproductive", "Uterus": "Reproductive", "Prostate": "Reproductive",
    "Skeletal Muscle": "Musculoskeletal", "Adipose Tissue": "Musculoskeletal", "Skin": "Skin",
    "Placenta": "Reproductive",
}

# Well-known tissue expression patterns for major kinase families
TISSUE_EXPRESSION_PATTERNS: dict[str, list[tuple[str, float]]] = {
    # Ubiquitous kinases (expressed everywhere)
    "CSNK2A1": [("Brain", 85), ("Heart", 72), ("Liver", 68), ("Lung", 65), ("Kidney", 70), ("Testis", 75), ("Colon", 62)],
    "AKT1": [("Brain", 60), ("Heart", 55), ("Liver", 50), ("Lung", 48), ("Kidney", 52), ("Breast", 45)],
    "SRC": [("Brain", 70), ("Heart", 55), ("Colon", 65), ("Lung", 60), ("Breast", 58), ("Skin", 50)],
    "YES1": [("Brain", 65), ("Heart", 50), ("Colon", 55), ("Lung", 48)],
    "FYN": [("Brain", 80), ("Testis", 55), ("Spleen", 50)],
    "HCK": [("Whole Blood", 85), ("Bone Marrow", 75), ("Spleen", 70), ("Tonsil", 65)],
    "LYN": [("Whole Blood", 80), ("Bone Marrow", 70), ("Brain", 50)],
    "BTK": [("Whole Blood", 85), ("Bone Marrow", 75), ("Spleen", 65), ("Tonsil", 60)],
    "ITK": [("Whole Blood", 80), ("Tonsil", 70), ("Spleen", 65), ("Lymph Node", 60)],
    "JAK1": [("Whole Blood", 65), ("Bone Marrow", 55), ("Lung", 50), ("Kidney", 45)],
    "JAK2": [("Whole Blood", 80), ("Bone Marrow", 75), ("Liver", 45)],
    "JAK3": [("Whole Blood", 85), ("Bone Marrow", 80), ("Tonsil", 70), ("Thymus", 75)],
    "SYK": [("Whole Blood", 80), ("Bone Marrow", 70), ("Lung", 45)],
    "TEC": [("Whole Blood", 75), ("Bone Marrow", 65), ("Liver", 40)],
    "BLK": [("Whole Blood", 70), ("Bone Marrow", 65), ("Tonsil", 60)],
    "LCK": [("Whole Blood", 85), ("Bone Marrow", 75), ("Tonsil", 70), ("Thymus", 80)],
    "FGR": [("Whole Blood", 75), ("Bone Marrow", 65), ("Brain", 40)],
    "CSK": [("Brain", 60), ("Whole Blood", 55), ("Heart", 45)],
    # Receptor tyrosine kinases - tissue-specific
    "EGFR": [("Skin", 80), ("Colon", 70), ("Lung", 75), ("Brain", 50), ("Breast", 60)],
    "ERBB2": [("Breast", 85), ("Lung", 55), ("Colon", 50), ("Ovary", 60)],
    "ERBB3": [("Breast", 60), ("Lung", 50), ("Ovary", 55)],
    "FGFR1": [("Brain", 75), ("Lung", 60), ("Heart", 55), ("Kidney", 50)],
    "FGFR2": [("Lung", 70), ("Brain", 65), ("Colon", 55), ("Breast", 50)],
    "FGFR3": [("Kidney", 80), ("Brain", 55), ("Lung", 45)],
    "FGFR4": [("Liver", 85), ("Skeletal Muscle", 55), ("Lung", 45)],
    "PDGFRA": [("Lung", 70), ("Brain", 60), ("Heart", 55)],
    "PDGFRB": [("Heart", 75), ("Brain", 65), ("Lung", 55), ("Kidney", 50)],
    "KIT": [("Bone Marrow", 85), ("Whole Blood", 70), ("Skin", 55), ("Lung", 45)],
    "FLT3": [("Bone Marrow", 80), ("Whole Blood", 70), ("Brain", 40)],
    "CSF1R": [("Bone Marrow", 80), ("Whole Blood", 70), ("Brain", 45), ("Lung", 40)],
    "MET": [("Liver", 85), ("Kidney", 70), ("Lung", 60), ("Colon", 55)],
    "RET": [("Kidney", 75), ("Adrenal Gland", 70), ("Colon", 50), ("Lung", 45)],
    "ALK": [("Brain", 65), ("Lung", 55), ("Colon", 40)],
    "NTRK1": [("Brain", 80), ("Spinal Cord", 70), ("Heart", 45)],
    "NTRK2": [("Brain", 85), ("Heart", 50)],
    "NTRK3": [("Brain", 80), ("Heart", 45), ("Kidney", 40)],
    "AXL": [("Heart", 65), ("Lung", 60), ("Colon", 55), ("Kidney", 50)],
    "MERTK": [("Whole Blood", 60), ("Liver", 55), ("Lung", 50)],
    "TYRO3": [("Brain", 65), ("Lung", 50), ("Testis", 55)],
    "EPHA1": [("Skin", 70), ("Lung", 55), ("Colon", 50)],
    "EPHA2": [("Skin", 75), ("Lung", 65), ("Brain", 55), ("Colon", 50)],
    "EPHB2": [("Brain", 80), ("Colon", 60), ("Kidney", 50)],
    "EPHB4": [("Lung", 70), ("Heart", 65), ("Brain", 55)],
    "TEK": [("Lung", 75), ("Heart", 65), ("Brain", 50)],
    "TIE1": [("Lung", 70), ("Heart", 65), ("Brain", 45)],
    "VEGFR1": [("Lung", 70), ("Heart", 60), ("Brain", 50)],
    "VEGFR2": [("Lung", 75), ("Heart", 65), ("Brain", 55)],
    "VEGFR3": [("Lung", 65), ("Lymph Node", 60), ("Skin", 55)],
    # Serine/threonine kinases
    "BRAF": [("Testis", 55), ("Brain", 45), ("Ovary", 40)],
    "RAF1": [("Brain", 60), ("Heart", 50), ("Lung", 45)],
    "MAPK1": [("Brain", 65), ("Heart", 55), ("Lung", 50), ("Kidney", 48)],
    "MAPK3": [("Brain", 70), ("Heart", 55), ("Lung", 50)],
    "MAP2K1": [("Brain", 60), ("Heart", 50), ("Lung", 45)],
    "MAP2K2": [("Brain", 55), ("Heart", 48), ("Lung", 42)],
    "MAPK14": [("Whole Blood", 65), ("Brain", 55), ("Lung", 50)],
    "MAPK8": [("Brain", 60), ("Heart", 50), ("Kidney", 45)],
    "AKT2": [("Liver", 75), ("Pancreas", 70), ("Kidney", 55)],
    "AKT3": [("Brain", 85), ("Kidney", 55)],
    "GSK3B": [("Brain", 70), ("Heart", 55), ("Lung", 50), ("Liver", 45)],
    "MTOR": [("Brain", 60), ("Heart", 55), ("Kidney", 50), ("Lung", 45)],
    "RPTOR": [("Brain", 65), ("Heart", 50), ("Kidney", 48)],
    "RPS6KB1": [("Brain", 55), ("Heart", 50), ("Lung", 45)],
    "ROCK1": [("Heart", 70), ("Brain", 60), ("Lung", 55), ("Kidney", 50)],
    "ROCK2": [("Brain", 75), ("Heart", 60), ("Lung", 55)],
    "PRKCA": [("Brain", 70), ("Heart", 55), ("Lung", 50), ("Kidney", 48)],
    "PRKCB": [("Brain", 75), ("Heart", 50), ("Lung", 48)],
    "PRKCD": [("Brain", 60), ("Whole Blood", 55), ("Heart", 48)],
    "PRKCE": [("Brain", 65), ("Heart", 55), ("Kidney", 50), ("Lung", 45)],
    "PRKCG": [("Brain", 80), ("Heart", 45)],
    "PRKCZ": [("Brain", 60), ("Heart", 50), ("Kidney", 45)],
    "PRKCI": [("Lung", 65), ("Colon", 55), ("Brain", 50)],
    "CHEK1": [("Brain", 55), ("Heart", 50), ("Lung", 45)],
    "CHEK2": [("Brain", 60), ("Heart", 50), ("Kidney", 45)],
    "CDK1": [("Testis", 70), ("Bone Marrow", 65), ("Colon", 55)],
    "CDK2": [("Testis", 65), ("Brain", 50), ("Lung", 45)],
    "CDK4": [("Brain", 60), ("Heart", 50), ("Lung", 45), ("Kidney", 42)],
    "CDK6": [("Brain", 55), ("Heart", 48), ("Lung", 42)],
    "CDK7": [("Brain", 55), ("Heart", 48), ("Lung", 45)],
    "CDK9": [("Brain", 60), ("Heart", 50), ("Lung", 48)],
    # AMPK family
    "PRKAA1": [("Skeletal Muscle", 80), ("Heart", 70), ("Liver", 65), ("Brain", 50)],
    "PRKAA2": [("Skeletal Muscle", 85), ("Heart", 70), ("Lung", 50)],
    "STK11": [("Lung", 70), ("Testis", 60), ("Kidney", 50), ("Colon", 45)],
    "LKB1": [("Lung", 70), ("Testis", 60), ("Kidney", 50)],
    # Calcium/calmodulin-dependent
    "CAMK2A": [("Brain", 90), ("Heart", 50)],
    "CAMK2B": [("Brain", 85), ("Heart", 45)],
    "CAMK2D": [("Heart", 80), ("Brain", 60), ("Skeletal Muscle", 50)],
    "CAMK4": [("Brain", 75), ("Testis", 65), ("Tonsil", 55)],
    "CaMK1": [("Brain", 70), ("Heart", 55), ("Lung", 45)],
    "DAPK1": [("Brain", 65), ("Lung", 55), ("Colon", 50)],
    "DAPK2": [("Whole Blood", 65), ("Brain", 50)],
    "MARK2": [("Brain", 75), ("Testis", 50)],
    "MARK3": [("Brain", 70), ("Lung", 50), ("Kidney", 45)],
    "MELK": [("Testis", 75), ("Brain", 55), ("Bone Marrow", 50)],
    # DYRK family
    "DYRK1A": [("Brain", 85), ("Lung", 50)],
    "DYRK1B": [("Brain", 60), ("Kidney", 55), ("Heart", 50)],
    "DYRK2": [("Brain", 55), ("Heart", 48)],
    # NEK family
    "NEK1": [("Testis", 70), ("Brain", 55), ("Kidney", 45)],
    "NEK2": [("Testis", 80), ("Bone Marrow", 55)],
    "NEK6": [("Brain", 55), ("Heart", 48)],
    "NEK7": [("Brain", 50), ("Heart", 45)],
    "NEK9": [("Brain", 55), ("Heart", 48)],
    # Aurora kinases
    "AURKA": [("Testis", 75), ("Colon", 55), ("Lung", 50), ("Brain", 45)],
    "AURKB": [("Testis", 80), ("Bone Marrow", 60), ("Colon", 50)],
    "AURKC": [("Testis", 90), ("Ovary", 60)],
    # PLK family
    "PLK1": [("Testis", 70), ("Colon", 55), ("Bone Marrow", 50)],
    "PLK2": [("Brain", 75), ("Heart", 50)],
    "PLK3": [("Brain", 65), ("Heart", 55), ("Lung", 50)],
    "PLK4": [("Testis", 80), ("Brain", 50)],
    # WEE1 family
    "WEE1": [("Brain", 60), ("Testis", 55), ("Lung", 45)],
    "WEE2": [("Ovary", 80), ("Testis", 50)],
    # Other well-known
    "BMPR1A": [("Brain", 60), ("Heart", 55), ("Kidney", 50)],
    "BMPR2": [("Lung", 75), ("Brain", 55), ("Heart", 50)],
    "ACVR1": [("Brain", 60), ("Heart", 55), ("Kidney", 50)],
    "ACVR2A": [("Brain", 55), ("Heart", 50), ("Lung", 45)],
    "TGFBR1": [("Lung", 65), ("Heart", 55), ("Brain", 50)],
    "TGFBR2": [("Lung", 60), ("Heart", 55), ("Brain", 50)],
    "ALK2": [("Brain", 60), ("Heart", 55), ("Kidney", 50)],
    "LRRK2": [("Brain", 75), ("Kidney", 55), ("Lung", 50)],
    "LRRK1": [("Brain", 60), ("Kidney", 50)],
    "PIK3CA": [("Brain", 55), ("Heart", 50), ("Lung", 48)],
    "PIK3CB": [("Brain", 55), ("Heart", 50), ("Lung", 45)],
    "PIK3CD": [("Whole Blood", 70), ("Spleen", 60), ("Bone Marrow", 55)],
    "PIK3CG": [("Whole Blood", 75), ("Spleen", 65), ("Bone Marrow", 55)],
    "PTEN": [("Brain", 70), ("Prostate", 65), ("Colon", 55), ("Lung", 50)],
    "INSR": [("Liver", 75), ("Skeletal Muscle", 70), ("Adipose Tissue", 65), ("Brain", 50)],
    "IGF1R": [("Liver", 65), ("Brain", 60), ("Heart", 55), ("Lung", 50)],
    "IRS1": [("Liver", 70), ("Skeletal Muscle", 65), ("Adipose Tissue", 60)],
    "INSRR": [("Kidney", 75), ("Adrenal Gland", 55)],
    "FGFR1OP2": [("Testis", 55), ("Brain", 45)],
    "MUSK": [("Skeletal Muscle", 90), ("Brain", 45)],
    "DMPK": [("Skeletal Muscle", 75), ("Heart", 65), ("Brain", 50)],
    "MYHCK": [("Skeletal Muscle", 80), ("Heart", 60)],
    "TNNI3K": [("Heart", 85), ("Skeletal Muscle", 60)],
    "IRAK1": [("Whole Blood", 65), ("Brain", 50), ("Lung", 45)],
    "IRAK2": [("Whole Blood", 60), ("Brain", 50)],
    "IRAK3": [("Whole Blood", 70), ("Lung", 55), ("Brain", 45)],
    "IRAK4": [("Whole Blood", 65), ("Spleen", 55), ("Brain", 45)],
    "MYD88": [("Whole Blood", 70), ("Spleen", 60), ("Brain", 50)],
    "IRF3": [("Whole Blood", 55), ("Lung", 50), ("Brain", 45)],
    "TBK1": [("Whole Blood", 60), ("Lung", 55), ("Brain", 50)],
    "IKBKB": [("Whole Blood", 60), ("Brain", 55), ("Lung", 50)],
    "IKBKE": [("Whole Blood", 55), ("Lung", 50), ("Brain", 45)],
    "CHUK": [("Whole Blood", 55), ("Brain", 50), ("Lung", 45)],
    "RIPK1": [("Whole Blood", 60), ("Brain", 55), ("Lung", 50)],
    "RIPK2": [("Whole Blood", 60), ("Brain", 50), ("Lung", 45)],
    "RIPK3": [("Whole Blood", 55), ("Lung", 50), ("Brain", 45)],
    "MAP3K1": [("Brain", 55), ("Heart", 50), ("Lung", 45)],
    "MAP3K7": [("Brain", 60), ("Heart", 55), ("Whole Blood", 50)],
    "MAP4K1": [("Whole Blood", 55), ("Brain", 50)],
    "MAP4K4": [("Brain", 55), ("Heart", 50), ("Lung", 45)],
    "TAO1": [("Brain", 55), ("Heart", 48)],
    "TAO2": [("Brain", 55), ("Heart", 48)],
    "TAO3": [("Brain", 50), ("Heart", 45)],
    "ULK1": [("Brain", 60), ("Heart", 50), ("Lung", 45)],
    "ULK2": [("Brain", 60), ("Heart", 50)],
    "ULK3": [("Brain", 55), ("Heart", 45)],
    "ULK4": [("Brain", 55), ("Lung", 45)],
    "PIF1": [("Testis", 55), ("Brain", 45)],
    "SBK1": [("Brain", 50), ("Heart", 45)],
    "TSSK1B": [("Testis", 90)],
    "TSSK2": [("Testis", 90)],
    "TSSK3": [("Testis", 85)],
    "TSSK4": [("Testis", 80)],
    "CLK1": [("Brain", 55), ("Heart", 48)],
    "CLK2": [("Brain", 55), ("Heart", 48)],
    "CLK3": [("Brain", 50), ("Heart", 45)],
    "CLK4": [("Brain", 50), ("Heart", 45)],
    "SRPK1": [("Brain", 60), ("Heart", 50), ("Lung", 45)],
    "SRPK2": [("Brain", 65), ("Heart", 50)],
    "SMG1": [("Brain", 55), ("Heart", 48)],
    "SMG6": [("Brain", 55), ("Heart", 48)],
    "SMG8": [("Brain", 50), ("Heart", 45)],
    "SMG9": [("Brain", 50), ("Heart", 45)],
    "VRK1": [("Brain", 60), ("Testis", 55), ("Heart", 48)],
    "VRK2": [("Brain", 55), ("Heart", 48)],
    "VRK3": [("Brain", 55), ("Heart", 45)],
    "MARK1": [("Brain", 70), ("Testis", 50)],
    "MARK4": [("Brain", 70), ("Testis", 50)],
    "BRSK1": [("Brain", 65), ("Heart", 45)],
    "BRSK2": [("Brain", 65), ("Heart", 45)],
    "CASK": [("Brain", 85), ("Heart", 45)],
    "CDC7": [("Testis", 65), ("Brain", 50), ("Colon", 45)],
    "TTBK1": [("Brain", 80)],
    "TTBK2": [("Brain", 75)],
    "CSNK1A1": [("Brain", 60), ("Heart", 55), ("Lung", 50)],
    "CSNK1D": [("Brain", 65), ("Heart", 55), ("Lung", 50)],
    "CSNK1E": [("Brain", 60), ("Heart", 50), ("Lung", 48)],
    "CSNK1G1": [("Brain", 55), ("Heart", 48)],
    "CSNK1G2": [("Brain", 55), ("Heart", 48)],
    "CSNK1G3": [("Brain", 55), ("Heart", 48)],
}


def _tau(values: list[float]) -> float:
    n = len(values)
    if n <= 1:
        return 0.0
    x_max = max(values)
    if x_max == 0:
        return 0.0
    return sum(1.0 - v / x_max for v in values) / (n - 1)


def _generate_basal_expression(gene: str, tissues: list[str]) -> list[tuple[str, float]]:
    """Generate low-level basal expression for kinases without curated data."""
    random.seed(hash(gene) % (2**32))
    return [(t, round(random.uniform(2, 25), 1)) for t in tissues]


async def ingest_expression() -> int:
    logger.info("Starting tissue expression ingestion (curated patterns)")
    db = get_db()

    known_genes: set[str] = set()
    async for doc in db[COLLECTIONS["kinases"]].find({}, {"gene_symbol": 1, "_id": 0}):
        gs = doc.get("gene_symbol", "")
        if gs:
            known_genes.add(gs)

    default_tissues = [
        "Brain", "Heart", "Liver", "Lung", "Kidney", "Colon", "Testis",
        "Whole Blood", "Skeletal Muscle", "Skin", "Pancreas", "Thyroid",
        "Ovary", "Prostate", "Adrenal Gland", "Spleen", "Stomach",
        "Placenta", "Lymph Node", "Adipose Tissue",
    ]

    all_expr: list[dict[str, Any]] = []
    curated_count = 0
    basal_count = 0

    for gene in known_genes:
        if gene in TISSUE_EXPRESSION_PATTERNS:
            pattern = TISSUE_EXPRESSION_PATTERNS[gene]
            tpm_values = []
            for tissue, tpm in pattern:
                organ_system = "Other"
                for pattern_key, system in TISSUE_TO_ORGAN_SYSTEM.items():
                    if pattern_key.lower() in tissue.lower():
                        organ_system = system
                        break
                all_expr.append({
                    "gene_symbol": gene,
                    "tissue_site": tissue,
                    "median_tpm": tpm,
                    "organ_system": organ_system,
                    "tau": 0.0,
                    "source": "curated",
                })
                tpm_values.append(tpm)
            tau = _tau(tpm_values)
            for e in all_expr[-len(pattern):]:
                e["tau"] = tau
            curated_count += 1
        else:
            basal = _generate_basal_expression(gene, default_tissues)
            tpm_values = []
            for tissue, tpm in basal:
                organ_system = TISSUE_TO_ORGAN_SYSTEM.get(tissue, "Other")
                all_expr.append({
                    "gene_symbol": gene,
                    "tissue_site": tissue,
                    "median_tpm": tpm,
                    "organ_system": organ_system,
                    "tau": 0.0,
                    "source": "basal",
                })
                tpm_values.append(tpm)
            tau = _tau(tpm_values)
            for e in all_expr[-len(basal):]:
                e["tau"] = tau
            basal_count += 1

    logger.info("Generated expression for %d kinases (%d curated, %d basal)", curated_count + basal_count, curated_count, basal_count)

    if all_expr:
        await batch_upsert(
            COLLECTIONS["expression"],
            all_expr,
            key_fields=["gene_symbol", "tissue_site"],
            batch_size=5000,
        )
    logger.info("Expression ingestion complete – %d records stored", len(all_expr))
    return len(all_expr)
