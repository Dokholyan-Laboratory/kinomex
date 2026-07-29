from __future__ import annotations

import asyncio
import logging
import re
from typing import Any

import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import settings
from ..database import COLLECTIONS, batch_upsert, get_db

logger = logging.getLogger(__name__)

MUTATION_PATTERN = re.compile(r"^([A-Z])(\d+)([A-Z*])$")

# Well-known kinase mutations (curated from ClinVar, COSMIC, literature)
KNOWN_KINASE_MUTATIONS: dict[str, list[dict[str, str | bool | int]]] = {
    "ABL1": [
        {"code": "T315I", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Imatinib resistance in CML", "pmid": "16959637"},
        {"code": "E255K", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "Imatinib resistance", "pmid": "17023468"},
        {"code": "Y253H", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "Imatinib resistance", "pmid": "17023468"},
    ],
    "EGFR": [
        {"code": "L858R", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "18505580"},
        {"code": "T790M", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Osimertinib resistance", "pmid": "24383709"},
        {"code": "C797S", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Third-gen TKI resistance", "pmid": "25610870"},
        {"code": "deletion_19", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "18505580"},
        {"code": "G719X", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "21175301"},
        {"code": "S768I", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "21175301"},
        {"code": "E709X", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "23982364"},
    ],
    "BRAF": [
        {"code": "V600E", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "21950750"},
        {"code": "V600K", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "21950750"},
        {"code": "V600D", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "21950750"},
        {"code": "G469A", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "15326445"},
        {"code": "K601E", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "15640802"},
    ],
    "KRAS": [
        {"code": "G12C", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "31597726"},
        {"code": "G12D", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "31597726"},
        {"code": "G12V", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "31597726"},
        {"code": "Q61H", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "21326456"},
    ],
    "PIK3CA": [
        {"code": "H1047R", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "22182059"},
        {"code": "E545K", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "17533134"},
        {"code": "E542K", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "17533134"},
        {"code": "D549N", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "18451718"},
        {"code": "N345K", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "18451718"},
        {"code": "C420R", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "18451718"},
    ],
    "ALK": [
        {"code": "G1202R", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Lorlatinib resistance in NSCLC", "pmid": "28211429"},
        {"code": "L1196M", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Crizotinib resistance", "pmid": "22675496"},
        {"code": "C1156Y", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "Crizotinib resistance", "pmid": "23011138"},
        {"code": "G1269A", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Alectinib resistance", "pmid": "25249531"},
        {"code": "I1171T", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "Ceritinib resistance", "pmid": "28097279"},
    ],
    "MET": [
        {"code": "D1246N", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Crizotinib resistance in NSCLC", "pmid": "22526780"},
        {"code": "D1246H", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "MET inhibitor resistance", "pmid": "22526780"},
        {"code": "D1228H", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Savolitinib resistance", "pmid": "30569965"},
        {"code": "F1200I", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "Type II inhibitor resistance", "pmid": "22526780"},
    ],
    "FGFR2": [
        {"code": "V564F", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Erdafitinib resistance", "pmid": "30974189"},
        {"code": "N549K", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Erdafitinib resistance", "pmid": "30974189"},
        {"code": "K660M", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "30974189"},
    ],
    "FGFR3": [
        {"code": "V559M", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Erdafitinib resistance", "pmid": "30974189"},
        {"code": "Y373C", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "30974189"},
    ],
    "ERBB2": [
        {"code": "L755S", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Lapatinib resistance", "pmid": "21676740"},
        {"code": "T862A", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Neratinib resistance", "pmid": "22422664"},
        {"code": "G309E", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "21676740"},
    ],
    "KIT": [
        {"code": "D816V", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Imatinib resistance", "pmid": "12810708"},
        {"code": "V560G", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "11173076"},
        {"code": "T670I", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Imatinib resistance", "pmid": "12714891"},
    ],
    "FLT3": [
        {"code": "D835Y", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "Midostaurin resistance", "pmid": "15070744"},
        {"code": "D835H", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "Midostaurin resistance", "pmid": "15070744"},
        {"code": "I836T", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "15070744"},
        {"code": "ITD", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "Gilteritinib resistance", "pmid": "27492416"},
    ],
    "PDGFRA": [
        {"code": "T674I", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Imatinib resistance in DFSP", "pmid": "15677390"},
        {"code": "D842V", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "15677390"},
    ],
    "RET": [
        {"code": "V804M", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Vandetanib resistance", "pmid": "23401066"},
        {"code": "V804L", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Cabozantinib resistance", "pmid": "23401066"},
        {"code": "Y806C", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "23401066"},
        {"code": "G918R", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "Type II inhibitor resistance", "pmid": "23401066"},
    ],
    "MAPK1": [
        {"code": "K45E", "pathogenicity": "Uncertain Significance", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "T101S", "pathogenicity": "Uncertain Significance", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "MAPK3": [
        {"code": "T207A", "pathogenicity": "Uncertain Significance", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "JAK2": [
        {"code": "V617F", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "16884026"},
        {"code": "K539L", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "22143365"},
        {"code": "R683G", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "16884026"},
    ],
    "JAK3": [
        {"code": "A572V", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "Ruxolitinib response", "pmid": "22584630"},
        {"code": "A573T", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "22584630"},
    ],
    "PTEN": [
        {"code": "R130*", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "15326445"},
        {"code": "R233*", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "15326445"},
        {"code": "G129R", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "15326445"},
        {"code": "H123Y", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "15326445"},
    ],
    "RB1": [
        {"code": "C706S", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "R661W", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "TP53": [
        {"code": "R175H", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "R248W", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "R273H", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "G245S", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "CDK4": [
        {"code": "R24C", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "11116145"},
        {"code": "R24H", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "11116145"},
        {"code": "K22Q", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "11116145"},
    ],
    "CDK6": [
        {"code": "E112K", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "27094092"},
    ],
    "MTOR": [
        {"code": "S2215Y", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "Sirolimus resistance", "pmid": "20639490"},
        {"code": "N2033S", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "20639490"},
    ],
    "AKT1": [
        {"code": "E17K", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "24346052"},
    ],
    "AKT2": [
        {"code": "E17K", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "24346052"},
        {"code": "C77F", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": "24346052"},
    ],
    "APC": [
        {"code": "R1450*", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "FBXW7": [
        {"code": "R465C", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "R465H", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "R505C", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "NOTCH1": [
        {"code": "W24Cfs*", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "R1598C", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "ATM": [
        {"code": "V1567F", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "C1123Y", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "CHEK2": [
        {"code": "S193*", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "I157T", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "TSC2": [
        {"code": "R905*", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "LRRK2": [
        {"code": "G2019S", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "IRAK1": [
        {"code": "E559K", "pathogenicity": "Uncertain Significance", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "FGFR1": [
        {"code": "N546K", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "K656E", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "FGFR4": [
        {"code": "V550E", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Ponatinib resistance", "pmid": ""},
        {"code": "N535K", "pathogenicity": "Pathogenic", "is_gatekeeper": True, "drug_resistance": "Erdafitinib resistance", "pmid": ""},
    ],
    "RAF1": [
        {"code": "S259A", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "MAP2K1": [
        {"code": "K57N", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
        {"code": "D67N", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "MAP2K2": [
        {"code": "F57S", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "EPHA2": [
        {"code": "G890S", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "EPHB4": [
        {"code": "A749T", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "MUSK": [
        {"code": "R218W", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "DMPK": [
        {"code": "CTG", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
    "INSR": [
        {"code": "L979H", "pathogenicity": "Pathogenic", "is_gatekeeper": False, "drug_resistance": "", "pmid": ""},
    ],
}


def _parse_mutation_code(code: str) -> dict[str, Any]:
    m = MUTATION_PATTERN.match(code)
    if not m:
        return {"wildtype_aa": "", "position": 0, "mutant_aa": code}
    return {
        "wildtype_aa": m.group(1),
        "position": int(m.group(2)),
        "mutant_aa": m.group(3),
    }


async def ingest_variants() -> int:
    """Ingest curated known kinase mutations."""
    logger.info("Starting ClinVar variant ingestion (curated + NCBI)")

    all_variants: list[dict[str, Any]] = []

    db = get_db()

    # 1) Insert all curated known mutations
    known_genes: set[str] = set()
    async for doc in db[COLLECTIONS["kinases"]].find({}, {"gene_symbol": 1, "_id": 0}):
        gs = doc.get("gene_symbol", "")
        if gs:
            known_genes.add(gs)

    curated_count = 0
    for gene, mutations in KNOWN_KINASE_MUTATIONS.items():
        if gene not in known_genes:
            continue
        for mut in mutations:
            code = mut["code"]
            parsed = _parse_mutation_code(code)
            pathogenicity = mut.get("pathogenicity", "Uncertain Significance")
            all_variants.append({
                "gene_symbol": gene,
                "mutation_code": code,
                "wildtype_aa": parsed["wildtype_aa"],
                "position": parsed["position"],
                "mutant_aa": parsed["mutant_aa"],
                "pathogenicity": pathogenicity,
                "source_title": f"Curated kinase mutation {gene} {code}",
                "pubmed_id": str(mut.get("pmid", "")),
                "doi": "",
                "is_gatekeeper": mut.get("is_gatekeeper", False),
                "drug_resistance_context": str(mut.get("drug_resistance", "")),
                "omim_id": "",
                "source": "curated",
            })
            curated_count += 1

    logger.info("Inserted %d curated known mutations", curated_count)

    # 2) Batch NCBI ClinVar queries for all kinases (not just top 22)
    sem = asyncio.Semaphore(settings.rate.ncbi_rps)
    ncbi_count = 0

    async with aiohttp.ClientSession() as session:
        for gene in sorted(known_genes):
            if not gene:
                continue
            term = f"({gene}[Gene]) AND (missense[All Fields])"
            try:
                async with sem:
                    await asyncio.sleep(1 / settings.rate.ncbi_rps)
                    async with session.get(
                        f"{settings.api.ncbi_eutils_url}/esearch.fcgi",
                        params={"db": "clinvar", "term": term, "retmax": 200, "retmode": "json"},
                        timeout=aiohttp.ClientTimeout(total=15),
                    ) as resp:
                        resp.raise_for_status()
                        data = await resp.json()
                ids = data.get("esearchresult", {}).get("idlist", [])
                if not ids:
                    continue

                # Fetch summaries in batches
                for i in range(0, len(ids), 50):
                    batch = ids[i:i+50]
                    try:
                        async with sem:
                            await asyncio.sleep(1 / settings.rate.ncbi_rps)
                            async with session.get(
                                f"{settings.api.ncbi_eutils_url}/esummary.fcgi",
                                params={"db": "clinvar", "id": ",".join(batch), "retmode": "json"},
                                timeout=aiohttp.ClientTimeout(total=15),
                            ) as resp:
                                resp.raise_for_status()
                                sdata = await resp.json()
                        result = sdata.get("result", {})
                        for uid in batch:
                            rec = result.get(uid, {})
                            if not isinstance(rec, dict):
                                continue
                            title = rec.get("title", "")
                            protein_change = rec.get("protein_change", "")
                            m_match = re.search(r"\(p\.([A-Z][a-z]{0,2})(\d+)([A-Za-z*][a-z]*)\)", title)
                            if not m_match and protein_change:
                                pc_first = protein_change.split(",")[0].strip()
                                pc_match = re.match(r"([A-Z*])(\d+)([A-Z*])$", pc_first)
                                if pc_match:
                                    m_match = pc_match
                            if m_match:
                                wt = m_match.group(1)
                                pos = m_match.group(2)
                                mut = m_match.group(3)
                                code = f"{wt}{pos}{mut}"
                                existing_codes = {v["mutation_code"] for v in all_variants if v["gene_symbol"] == gene}
                                if code in existing_codes:
                                    continue
                                parsed = _parse_mutation_code(code)
                                clin_sig = rec.get("clinical_significance", {}).get("description", "Pathogenic")
                                all_variants.append({
                                    "gene_symbol": gene,
                                    "mutation_code": code,
                                    "wildtype_aa": parsed["wildtype_aa"],
                                    "position": parsed["position"],
                                    "mutant_aa": parsed["mutant_aa"],
                                    "pathogenicity": clin_sig,
                                    "source_title": title[:500],
                                    "pubmed_id": uid,
                                    "doi": "",
                                    "is_gatekeeper": False,
                                    "drug_resistance_context": "",
                                    "omim_id": "",
                                    "source": "clinvar",
                                })
                                ncbi_count += 1
                    except Exception as exc:
                        logger.debug("ClinVar summary batch failed: %s", exc)
                        continue
                if ncbi_count % 100 == 0:
                    logger.info("ClinVar progress: %d variants found so far", ncbi_count)
            except Exception as exc:
                logger.debug("ClinVar search failed for %s: %s", gene, exc)
                continue

    logger.info("Fetched %d NCBI ClinVar mutations", ncbi_count)

    if all_variants:
        await batch_upsert(
            COLLECTIONS["variants"],
            all_variants,
            key_fields=["gene_symbol", "mutation_code"],
            batch_size=500,
        )
    logger.info("Variant ingestion complete – %d records stored", len(all_variants))
    return len(all_variants)
