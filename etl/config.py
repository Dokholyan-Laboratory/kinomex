from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class DatabaseConfig:
    uri: str = field(default_factory=lambda: os.getenv("MONGODB_URI", "mongodb://localhost:27017/kinomex"))
    db_name: str = "kinomex"
    max_pool_size: int = 50
    min_pool_size: int = 5
    server_selection_timeout_ms: int = 5_000


# ---------------------------------------------------------------------------
# API URLs
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class APIConfig:
    chembl_url: str = field(default_factory=lambda: os.getenv("CHEMBL_API_URL", "https://www.ebi.ac.uk/chembl/api/data"))
    uniprot_url: str = field(default_factory=lambda: os.getenv("UNIPROT_API_URL", "https://rest.uniprot.org"))
    rcsb_url: str = field(default_factory=lambda: os.getenv("RCSB_API_URL", "https://search.rcsb.org/rcsbsearch/v2/query"))
    gtex_url: str = field(default_factory=lambda: os.getenv("GTEX_API_URL", "https://gtexportal.org/api/v2"))
    ncbi_eutils_url: str = field(default_factory=lambda: os.getenv("NCBI_EUTILS_URL", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"))
    pubmed_api_key: str = field(default_factory=lambda: os.getenv("PUBMED_API_KEY", ""))
    pubchem_url: str = field(default_factory=lambda: os.getenv("PUBCHEM_API_URL", "https://pubchem.ncbi.nlm.nih.gov/rest/pug"))


# ---------------------------------------------------------------------------
# Rate-limits & batching
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class RateLimitConfig:
    # requests per second
    uniprot_rps: int = 3
    pdb_rps: int = 5
    chembl_rps: int = 3
    gtex_rps: int = 2
    ncbi_rps: int = 2

    # batch / page sizes
    uniprot_batch_size: int = 200
    pdb_batch_size: int = 1000
    chembl_batch_size: int = 500
    gtex_batch_size: int = 100
    clinvar_batch_size: int = 200

    # PDB resolution cutoff
    pdb_max_resolution: float = 3.5

    # PDIS weights
    pdis_w_citation: float = 0.30
    pdis_w_clinical: float = 0.30
    pdis_w_structure: float = 0.15
    pdis_w_patent: float = 0.15
    pdis_w_fda: float = 0.10
    pdis_clinical_target: int = 100  # normalisation target for clinical trials


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class LoggingConfig:
    level: str = "INFO"
    fmt: str = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    datefmt: str = "%Y-%m-%d %H:%M:%S"


# ---------------------------------------------------------------------------
# Aggregate config
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Settings:
    db: DatabaseConfig = field(default_factory=DatabaseConfig)
    api: APIConfig = field(default_factory=APIConfig)
    rate: RateLimitConfig = field(default_factory=RateLimitConfig)
    log: LoggingConfig = field(default_factory=LoggingConfig)


settings = Settings()
