"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";

type KinaseNode = {
  gene_symbol: string;
  group: string;
  family: string;
  pdis_score: number | null;
  full_name: string;
};

interface KinomePhyloTreeProps {
  kinases: KinaseNode[];
  onSelectKinase: (gene: string) => void;
  selectedGroup?: string;
  searchQuery?: string;
}

const GROUP_COLORS: Record<string, string> = {
  AGC: "#38bdf8",
  CAMK: "#a855f7",
  CK1: "#f59e0b",
  CMGC: "#34d399",
  STE: "#f43f5e",
  TK: "#3b82f6",
  TKL: "#f97316",
  Atypical: "#94a3b8",
};

type TreeNode = {
  name: string;
  group?: string;
  pdis_score?: number | null;
  full_name?: string;
  children?: TreeNode[];
};

const KINOME_TREE: TreeNode = {
  name: "Kinome",
  children: [
    {
      name: "AGC",
      group: "AGC",
      children: [
        { name: "PKA", group: "AGC", children: [{ name: "PRKACA", group: "AGC", full_name: "Protein Kinase CAMP-Activated Catalytic Subunit Alpha" }, { name: "PRKACB", group: "AGC", full_name: "Protein Kinase CAMP-Activated Catalytic Subunit Beta" }, { name: "PRKACG", group: "AGC", full_name: "Protein Kinase CAMP-Activated Catalytic Subunit Gamma" }] },
        { name: "PKG", group: "AGC", children: [{ name: "PRKG1", group: "AGC", full_name: "Protein Kinase CGMP-Dependent 1" }, { name: "PRKG2", group: "AGC", full_name: "Protein Kinase CGMP-Dependent 2" }] },
        { name: "AKT", group: "AGC", children: [{ name: "AKT1", group: "AGC", full_name: "AKT Serine/Threonine Kinase 1" }, { name: "AKT2", group: "AGC", full_name: "AKT Serine/Threonine Kinase 2" }, { name: "AKT3", group: "AGC", full_name: "AKT Serine/Threonine Kinase 3" }] },
        { name: "PKC", group: "AGC", children: [{ name: "PRKCA", group: "AGC", full_name: "Protein Kinase C Alpha" }, { name: "PRKCB", group: "AGC", full_name: "Protein Kinase C Beta" }, { name: "PRKCD", group: "AGC", full_name: "Protein Kinase C Delta" }, { name: "PRKCE", group: "AGC", full_name: "Protein Kinase C Epsilon" }, { name: "PRKCG", group: "AGC", full_name: "Protein Kinase C Gamma" }, { name: "PRKCZ", group: "AGC", full_name: "Protein Kinase C Zeta" }] },
        { name: "SGK", group: "AGC", children: [{ name: "SGK1", group: "AGC", full_name: "Serum/Glucocorticoid Regulated Kinase 1" }, { name: "SGK2", group: "AGC", full_name: "Serum/Glucocorticoid Regulated Kinase 2" }, { name: "SGK3", group: "AGC", full_name: "Serum/Glucocorticoid Regulated Kinase 3" }] },
        { name: "ROCK", group: "AGC", children: [{ name: "ROCK1", group: "AGC", full_name: "Rho Associated Coiled-Coil Containing Protein Kinase 1" }, { name: "ROCK2", group: "AGC", full_name: "Rho Associated Coiled-Coil Containing Protein Kinase 2" }] },
        { name: "DMPK", group: "AGC", children: [{ name: "DMPK", group: "AGC", full_name: "Dystrophia Myotonica Protein Kinase" }, { name: "MYLK", group: "AGC", full_name: "Myosin Light Chain Kinase" }, { name: "MYLK2", group: "AGC", full_name: "Myosin Light Chain Kinase 2" }] },
      ],
    },
    {
      name: "CAMK",
      group: "CAMK",
      children: [
        { name: "CaMK1", group: "CAMK", children: [{ name: "CAMK1", group: "CAMK", full_name: "Calcium/Calmodulin Dependent Protein Kinase I" }, { name: "CAMK1D", group: "CAMK", full_name: "Calcium/Calmodulin Dependent Protein Kinase ID" }, { name: "CAMK1G", group: "CAMK", full_name: "Calcium/Calmodulin Dependent Protein Kinase IG" }] },
        { name: "CaMK2", group: "CAMK", children: [{ name: "CAMK2A", group: "CAMK", full_name: "Calcium/Calmodulin Dependent Protein Kinase II Alpha" }, { name: "CAMK2B", group: "CAMK", full_name: "Calcium/Calmodulin Dependent Protein Kinase II Beta" }, { name: "CAMK2D", group: "CAMK", full_name: "Calcium/Calmodulin Dependent Protein Kinase II Delta" }, { name: "CAMK2G", group: "CAMK", full_name: "Calcium/Calmodulin Dependent Protein Kinase II Gamma" }] },
        { name: "CAMKK", group: "CAMK", children: [{ name: "CAMKK1", group: "CAMK", full_name: "Calcium/Calmodulin Dependent Protein Kinase Kinase 1" }, { name: "CAMKK2", group: "CAMK", full_name: "Calcium/Calmodulin Dependent Protein Kinase Kinase 2" }] },
        { name: "MLCK", group: "CAMK", children: [{ name: "MYLK3", group: "CAMK", full_name: "Myosin Light Chain Kinase 3" }, { name: "MYLK4", group: "CAMK", full_name: "Myosin Light Chain Kinase 4" }] },
        { name: "PHK", group: "CAMK", children: [{ name: "PHKG1", group: "CAMK", full_name: "Phosphorylase Kinase Catalytic Subunit Gamma 1" }, { name: "PHKG2", group: "CAMK", full_name: "Phosphorylase Kinase Catalytic Subunit Gamma 2" }] },
        { name: "ZIPK", group: "CAMK", children: [{ name: "DAPK1", group: "CAMK", full_name: "Death Associated Protein Kinase 1" }, { name: "DAPK2", group: "CAMK", full_name: "Death Associated Protein Kinase 2" }, { name: "DAPK3", group: "CAMK", full_name: "Death Associated Protein Kinase 3" }] },
      ],
    },
    {
      name: "CK1",
      group: "CK1",
      children: [
        { name: "CK1", group: "CK1", children: [{ name: "CSNK1A1", group: "CK1", full_name: "Casein Kinase 1 Alpha 1" }, { name: "CSNK1A1L", group: "CK1", full_name: "Casein Kinase 1 Alpha 1 Like" }, { name: "CSNK1D", group: "CK1", full_name: "Casein Kinase 1 Delta" }, { name: "CSNK1E", group: "CK1", full_name: "Casein Kinase 1 Epsilon" }, { name: "CSNK1G1", group: "CK1", full_name: "Casein Kinase 1 Gamma 1" }, { name: "CSNK1G2", group: "CK1", full_name: "Casein Kinase 1 Gamma 2" }, { name: "CSNK1G3", group: "CK1", full_name: "Casein Kinase 1 Gamma 3" }] },
        { name: "VRK", group: "CK1", children: [{ name: "VRK1", group: "CK1", full_name: "Vaccinia Related Kinase 1" }, { name: "VRK2", group: "CK1", full_name: "Vaccinia Related Kinase 2" }, { name: "VRK3", group: "CK1", full_name: "Vaccinia Related Kinase 3" }] },
        { name: "TTBK", group: "CK1", children: [{ name: "TTBK1", group: "CK1", full_name: "Tau Tubulin Kinase 1" }, { name: "TTBK2", group: "CK1", full_name: "Tau Tubulin Kinase 2" }] },
      ],
    },
    {
      name: "CMGC",
      group: "CMGC",
      children: [
        { name: "CDK", group: "CMGC", children: [{ name: "CDK1", group: "CMGC", full_name: "Cyclin Dependent Kinase 1" }, { name: "CDK2", group: "CMGC", full_name: "Cyclin Dependent Kinase 2" }, { name: "CDK3", group: "CMGC", full_name: "Cyclin Dependent Kinase 3" }, { name: "CDK4", group: "CMGC", full_name: "Cyclin Dependent Kinase 4" }, { name: "CDK5", group: "CMGC", full_name: "Cyclin Dependent Kinase 5" }, { name: "CDK6", group: "CMGC", full_name: "Cyclin Dependent Kinase 6" }, { name: "CDK7", group: "CMGC", full_name: "Cyclin Dependent Kinase 7" }, { name: "CDK8", group: "CMGC", full_name: "Cyclin Dependent Kinase 8" }, { name: "CDK9", group: "CMGC", full_name: "Cyclin Dependent Kinase 9" }, { name: "CDK12", group: "CMGC", full_name: "Cyclin Dependent Kinase 12" }, { name: "CDK13", group: "CMGC", full_name: "Cyclin Dependent Kinase 13" }, { name: "CDK14", group: "CMGC", full_name: "Cyclin Dependent Kinase 14" }, { name: "CDK15", group: "CMGC", full_name: "Cyclin Dependent Kinase 15" }, { name: "CDK16", group: "CMGC", full_name: "Cyclin Dependent Kinase 16" }, { name: "CDK17", group: "CMGC", full_name: "Cyclin Dependent Kinase 17" }, { name: "CDK18", group: "CMGC", full_name: "Cyclin Dependent Kinase 18" }, { name: "CDK20", group: "CMGC", full_name: "Cyclin Dependent Kinase 20" }] },
        { name: "MAPK", group: "CMGC", children: [{ name: "MAPK1", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 1 (ERK2)" }, { name: "MAPK3", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 3 (ERK1)" }, { name: "MAPK4", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 4" }, { name: "MAPK6", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 6" }, { name: "MAPK7", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 7" }, { name: "MAPK8", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 8 (JNK1)" }, { name: "MAPK9", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 9 (JNK2)" }, { name: "MAPK10", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 10 (JNK3)" }, { name: "MAPK11", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 11" }, { name: "MAPK12", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 12" }, { name: "MAPK13", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 13" }, { name: "MAPK14", group: "CMGC", full_name: "Mitogen-Activated Protein Kinase 14 (p38alpha)" }] },
        { name: "GSK", group: "CMGC", children: [{ name: "GSK3A", group: "CMGC", full_name: "Glycogen Synthase Kinase 3 Alpha" }, { name: "GSK3B", group: "CMGC", full_name: "Glycogen Synthase Kinase 3 Beta" }] },
        { name: "CLK", group: "CMGC", children: [{ name: "CLK1", group: "CMGC", full_name: "CDC Like Kinase 1" }, { name: "CLK2", group: "CMGC", full_name: "CDC Like Kinase 2" }, { name: "CLK3", group: "CMGC", full_name: "CDC Like Kinase 3" }, { name: "CLK4", group: "CMGC", full_name: "CDC Like Kinase 4" }] },
        { name: "DYRK", group: "CMGC", children: [{ name: "DYRK1A", group: "CMGC", full_name: "Dual Specificity Tyrosine Phosphorylation Regulated Kinase 1A" }, { name: "DYRK1B", group: "CMGC", full_name: "Dual Specificity Tyrosine Phosphorylation Regulated Kinase 1B" }, { name: "DYRK2", group: "CMGC", full_name: "Dual Specificity Tyrosine Phosphorylation Regulated Kinase 2" }, { name: "DYRK3", group: "CMGC", full_name: "Dual Specificity Tyrosine Phosphorylation Regulated Kinase 3" }, { name: "DYRK4", group: "CMGC", full_name: "Dual Specificity Tyrosine Phosphorylation Regulated Kinase 4" }] },
        { name: "SRPK", group: "CMGC", children: [{ name: "SRPK1", group: "CMGC", full_name: "SRSF Protein Kinase 1" }, { name: "SRPK2", group: "CMGC", full_name: "SRSF Protein Kinase 2" }, { name: "SRPK3", group: "CMGC", full_name: "SRSF Protein Kinase 3" }] },
      ],
    },
    {
      name: "STE",
      group: "STE",
      children: [
        { name: "STE20", group: "STE", children: [{ name: "STK3", group: "STE", full_name: "Serine/Threonine Kinase 3 (MST2)" }, { name: "STK4", group: "STE", full_name: "Serine/Threonine Kinase 4 (MST1)" }, { name: "PAK1", group: "STE", full_name: "P21 Activated Kinase 1" }, { name: "PAK2", group: "STE", full_name: "P21 Activated Kinase 2" }, { name: "PAK3", group: "STE", full_name: "P21 Activated Kinase 3" }, { name: "PAK4", group: "STE", full_name: "P21 Activated Kinase 4" }, { name: "PAK5", group: "STE", full_name: "P21 Activated Kinase 5" }, { name: "PAK6", group: "STE", full_name: "P21 Activated Kinase 6" }, { name: "MAP4K1", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase Kinase 1 (HPK1)" }, { name: "MAP4K2", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase Kinase 2 (GCK)" }, { name: "MAP4K3", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase Kinase 3" }, { name: "MAP4K4", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase Kinase 4" }, { name: "MAP4K5", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase Kinase 5" }, { name: "MAP4K6", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase Kinase 6" }, { name: "MAP4K7", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase Kinase 7" }] },
        { name: "STE7", group: "STE", children: [{ name: "MAP2K1", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase 1 (MEK1)" }, { name: "MAP2K2", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase 2 (MEK2)" }, { name: "MAP2K3", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase 3" }, { name: "MAP2K4", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase 4" }, { name: "MAP2K5", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase 5" }, { name: "MAP2K6", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase 6" }, { name: "MAP2K7", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase 7" }] },
        { name: "STE11", group: "STE", children: [{ name: "MAP3K1", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 1 (MAPKKK1)" }, { name: "MAP3K2", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 2" }, { name: "MAP3K3", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 3" }, { name: "MAP3K4", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 4" }, { name: "MAP3K5", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 5 (ASK1)" }, { name: "MAP3K6", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 6" }, { name: "MAP3K7", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 7 (TAK1)" }, { name: "MAP3K8", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 8 (COT)" }, { name: "MAP3K9", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 9" }, { name: "MAP3K10", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 10" }, { name: "MAP3K11", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 11" }, { name: "MAP3K12", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 12" }, { name: "MAP3K13", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 13" }, { name: "MAP3K14", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 14 (NIK)" }, { name: "MAP3K15", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 15" }, { name: "MAP3K16", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 16" }, { name: "MAP3K17", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 17" }, { name: "MAP3K18", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 18" }, { name: "MAP3K19", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 19" }, { name: "MAP3K20", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 20" }, { name: "MAP3K21", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 21" }, { name: "MAP3K23", group: "STE", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 23" }, { name: "ZAK", group: "STE", full_name: "MAP3K20/ZAK" }] },
      ],
    },
    {
      name: "TK",
      group: "TK",
      children: [
        { name: "EGFR", group: "TK", children: [{ name: "EGFR", group: "TK", full_name: "Epidermal Growth Factor Receptor" }, { name: "ERBB2", group: "TK", full_name: "Erb-B2 Receptor Tyrosine Kinase 2 (HER2)" }, { name: "ERBB3", group: "TK", full_name: "Erb-B2 Receptor Tyrosine Kinase 3 (HER3)" }, { name: "ERBB4", group: "TK", full_name: "Erb-B2 Receptor Tyrosine Kinase 4 (HER4)" }] },
        { name: "PDGFR", group: "TK", children: [{ name: "PDGFRA", group: "TK", full_name: "Platelet Derived Growth Factor Receptor Alpha" }, { name: "PDGFRB", group: "TK", full_name: "Platelet Derived Growth Factor Receptor Beta" }] },
        { name: "FGFR", group: "TK", children: [{ name: "FGFR1", group: "TK", full_name: "Fibroblast Growth Factor Receptor 1" }, { name: "FGFR2", group: "TK", full_name: "Fibroblast Growth Factor Receptor 2" }, { name: "FGFR3", group: "TK", full_name: "Fibroblast Growth Factor Receptor 3" }, { name: "FGFR4", group: "TK", full_name: "Fibroblast Growth Factor Receptor 4" }] },
        { name: "VEGFR", group: "TK", children: [{ name: "FLT1", group: "TK", full_name: "Fms Related Receptor Tyrosine Kinase 1 (VEGFR1)" }, { name: "KDR", group: "TK", full_name: "Kinase Insert Domain Receptor (VEGFR2)" }, { name: "FLT3", group: "TK", full_name: "Fms Related Receptor Tyrosine Kinase 3" }, { name: "FLT4", group: "TK", full_name: "Fms Related Receptor Tyrosine Kinase 4 (VEGFR3)" }] },
        { name: "SRC", group: "TK", children: [{ name: "SRC", group: "TK", full_name: "Proto-Oncogene Tyrosine-Protein Kinase Src" }, { name: "YES1", group: "TK", full_name: "YES Proto-Oncogene 1" }, { name: "FYN", group: "TK", full_name: "FYN Proto-Oncogene Src Family Tyrosine Kinase" }, { name: "LYN", group: "TK", full_name: "LYN Proto-Oncogene Src Family Tyrosine Kinase" }, { name: "FGR", group: "TK", full_name: "FGR Proto-Oncogene Src Family Tyrosine Kinase" }, { name: "BLK", group: "TK", full_name: "BLK Proto-Oncogene Src Family Tyrosine Kinase" }, { name: "HCK", group: "TK", full_name: "HCK Proto-Oncogene Src Family Tyrosine Kinase" }, { name: "LCK", group: "TK", full_name: "LCK Proto-Oncogene Src Family Tyrosine Kinase" }] },
        { name: "ABL", group: "TK", children: [{ name: "ABL1", group: "TK", full_name: "ABL Proto-Oncogene 1 Non-Receptor Tyrosine Kinase" }, { name: "ABL2", group: "TK", full_name: "ABL Proto-Oncogene 2 Non-Receptor Tyrosine Kinase" }] },
        { name: "JAK", group: "TK", children: [{ name: "JAK1", group: "TK", full_name: "Janus Kinase 1" }, { name: "JAK2", group: "TK", full_name: "Janus Kinase 2" }, { name: "JAK3", group: "TK", full_name: "Janus Kinase 3" }, { name: "TYK2", group: "TK", full_name: "Tyrosine Kinase 2" }] },
        { name: "RAS", group: "TK", children: [{ name: "HRAS", group: "TK", full_name: "GTPase HRas" }, { name: "KRAS", group: "TK", full_name: "GTPase KRas" }, { name: "NRAS", group: "TK", full_name: "GTPase NRas" }] },
        { name: "IR", group: "TK", children: [{ name: "INSR", group: "TK", full_name: "Insulin Receptor" }, { name: "IGF1R", group: "TK", full_name: "Insulin Like Growth Factor 1 Receptor" }, { name: "INSRR", group: "TK", full_name: "Insulin Receptor Related Receptor" }] },
      ],
    },
    {
      name: "TKL",
      group: "TKL",
      children: [
        { name: "RAF", group: "TKL", children: [{ name: "ARAF", group: "TKL", full_name: "A-Raf Proto-Oncogene Serine/Threonine Kinase" }, { name: "BRAF", group: "TKL", full_name: "B-Raf Proto-Oncogene Serine/Threonine Kinase" }, { name: "RAF1", group: "TKL", full_name: "Raf-1 Proto-Oncogene Serine/Threonine Kinase" }] },
        { name: "MLK", group: "TKL", children: [{ name: "MAP3K12", group: "TKL", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 12 (DLK)" }, { name: "MAP3K13", group: "TKL", full_name: "Mitogen-Activated Protein Kinase Kinase Kinase 13 (LZK)" }] },
        { name: "LRRK", group: "TKL", children: [{ name: "LRRK1", group: "TKL", full_name: "Leucine Rich Repeat Kinase 1" }, { name: "LRRK2", group: "TKL", full_name: "Leucine Rich Repeat Kinase 2" }] },
        { name: "RIPK", group: "TKL", children: [{ name: "RIPK1", group: "TKL", full_name: "Receptor Interacting Serine/Threonine Kinase 1" }, { name: "RIPK2", group: "TKL", full_name: "Receptor Interacting Serine/Threonine Kinase 2" }, { name: "RIPK3", group: "TKL", full_name: "Receptor Interacting Serine/Threonine Kinase 3" }, { name: "RIPK4", group: "TKL", full_name: "Receptor Interacting Serine/Threonine Kinase 4" }, { name: "RIPK5", group: "TKL", full_name: "Receptor Interacting Serine/Threonine Kinase 5" }] },
        { name: "ZAK", group: "TKL", children: [{ name: "ZAK", group: "TKL", full_name: "STE20 Like Kinase MAP3K20" }] },
      ],
    },
    {
      name: "Atypical",
      group: "Atypical",
      children: [
        { name: "ULK", group: "Atypical", children: [{ name: "ULK1", group: "Atypical", full_name: "Unc-51 Like Autophagy Activating Kinase 1" }, { name: "ULK2", group: "Atypical", full_name: "Unc-51 Like Autophagy Activating Kinase 2" }, { name: "ULK3", group: "Atypical", full_name: "Unc-51 Like Kinase 3" }, { name: "ULK4", group: "Atypical", full_name: "Unc-51 Like Kinase 4" }] },
        { name: "PIKK", group: "Atypical", children: [{ name: "ATM", group: "Atypical", full_name: "ATM Serine/Threonine Kinase" }, { name: "ATR", group: "Atypical", full_name: "ATR Serine/Threonine Kinase" }, { name: "DNA-PKCS", group: "Atypical", full_name: "DNA-PK Catalytic Subunit" }, { name: "SMG1", group: "Atypical", full_name: "SMG1 Kinase" }, { name: "SMG6", group: "Atypical", full_name: "SMG6 Nuclease" }, { name: "SMG8", group: "Atypical", full_name: "SMG8" }, { name: "SMG9", group: "Atypical", full_name: "SMG9" }] },
        { name: "PI3K", group: "Atypical", children: [{ name: "PIK3CA", group: "Atypical", full_name: "Phosphatidylinositol-4,5-Bisphosphate 3-Kinase Catalytic Subunit Alpha" }, { name: "PIK3CB", group: "Atypical", full_name: "Phosphatidylinositol-4,5-Bisphosphate 3-Kinase Catalytic Subunit Beta" }, { name: "PIK3CD", group: "Atypical", full_name: "Phosphatidylinositol-4,5-Bisphosphate 3-Kinase Catalytic Subunit Delta" }, { name: "PIK3CG", group: "Atypical", full_name: "Phosphatidylinositol-4,5-Bisphosphate 3-Kinase Catalytic Subunit Gamma" }] },
        { name: "TBK1", group: "Atypical", children: [{ name: "TBK1", group: "Atypical", full_name: "TANK Binding Kinase 1" }, { name: "IKBKE", group: "Atypical", full_name: "Inhibitor Of Nuclear Factor Kappa B Kinase Subunit Epsilon" }] },
      ],
    },
  ],
};

export default function KinomePhyloTree({
  kinases,
  onSelectKinase,
  selectedGroup,
  searchQuery,
}: KinomePhyloTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    data: KinaseNode;
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 800 });

  const kinaseMap = useMemo(() => new Map(kinases.map((k) => [k.gene_symbol, k])), [kinases]);

  const enrichTree = useCallback(
    (node: TreeNode): TreeNode => {
      const enriched = { ...node };
      if (enriched.children) {
        enriched.children = enriched.children.map(enrichTree);
      }
      const k = kinaseMap.get(node.name);
      if (k) {
        enriched.pdis_score = k.pdis_score;
        enriched.full_name = k.full_name;
        enriched.group = k.group;
      }
      return enriched;
    },
    [kinaseMap]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({ width: Math.max(width, 400), height: Math.max(width, 400) });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const radius = Math.min(width, height) / 2 - 60;

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);

    const enrichedTree = enrichTree(KINOME_TREE);
    const root = d3.hierarchy(enrichedTree);
    const treeLayout = d3.tree<TreeNode>().size([2 * Math.PI, radius]);
    treeLayout(root);

    const getColor = (node: { data: TreeNode; parent?: { data: TreeNode } | null }): string => {
      const group = node.data.group || (node.parent?.data.group ?? "Atypical");
      return GROUP_COLORS[group] || "#94a3b8";
    };

    g.selectAll<SVGLineElement, d3.HierarchyPointNode<TreeNode>>(".link")
      .data(root.links())
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", (d) => (d.source.y ?? 0) * Math.cos((d.source.x ?? 0) - Math.PI / 2))
      .attr("y1", (d) => (d.source.y ?? 0) * Math.sin((d.source.x ?? 0) - Math.PI / 2))
      .attr("x2", (d) => (d.target.y ?? 0) * Math.cos((d.target.x ?? 0) - Math.PI / 2))
      .attr("y2", (d) => (d.target.y ?? 0) * Math.sin((d.target.x ?? 0) - Math.PI / 2))
      .attr("stroke", (d) => {
        const group = d.target.data.group || d.target.parent?.data.group;
        return GROUP_COLORS[group || "Atypical"] || "#334155";
      })
      .attr("stroke-opacity", 0.35)
      .attr("stroke-width", 1);

    const leaves = root.leaves();

    const nodeGroup = g
      .selectAll<SVGGElement, d3.HierarchyPointNode<TreeNode>>(".node")
      .data(leaves)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => {
        return `rotate(${((d.x ?? 0) * 180) / Math.PI - 90}) translate(${d.y ?? 0},0)`;
      });

    const scoredLeaves = leaves.filter((d) => d.data.pdis_score !== null && d.data.pdis_score !== undefined);
    const maxPdis = d3.max(scoredLeaves, (d) => d.data.pdis_score as number) || 1;

    nodeGroup
      .append("a")
      .attr("href", (d) => `/kinases/${d.data.name}`)
      .attr("target", "_self")
      .attr("cursor", "pointer")
      .on("mouseenter", (event, d) => {
        const kinase = kinaseMap.get(d.data.name);
        if (kinase) {
          const rect = svgRef.current!.getBoundingClientRect();
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            data: kinase,
          });
        }
      })
      .on("mouseleave", () => setTooltip(null))
      .each(function (d) {
        const link = d3.select(this);
        link
          .append("circle")
          .attr("r", () => {
            const score = d.data.pdis_score;
            return score === null || score === undefined ? 3 : 2 + (score / maxPdis) * 6;
          })
          .attr("fill", () => getColor(d))
          .attr("stroke", () => getColor(d))
          .attr("stroke-width", 1.5)
          .attr("fill-opacity", 0.85);
        link
          .append("text")
          .attr("dy", "0.31em")
          .attr("x", () => ((d.x ?? 0) < Math.PI === true ? 8 : -8))
          .attr("text-anchor", () => ((d.x ?? 0) < Math.PI === true ? "start" : "end"))
          .attr("transform", () => ((d.x ?? 0) >= Math.PI ? "rotate(180)" : null))
          .text(d.data.name)
          .attr("font-size", "7px")
          .attr("fill", "#94a3b8");
      });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      nodeGroup
        .select("a")
        .select("circle")
        .attr("stroke", (d) => {
          if (d.data.name.toLowerCase().includes(q)) return "#ffffff";
          return "#334155";
        })
        .attr("stroke-width", (d) => (d.data.name.toLowerCase().includes(q) ? 3 : 1));

      const match = leaves.find((d) => d.data.name.toLowerCase() === q);
      if (match) {
        const angle = (match.x ?? 0) - Math.PI / 2;
        const px = (match.y ?? 0) * Math.cos(angle);
        const py = (match.y ?? 0) * Math.sin(angle);
        const scale = 3;
        svg.transition().duration(750).call(
          zoomBehavior.transform as never,
          d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-px, -py)
        );
      }
    }

    if (selectedGroup) {
      nodeGroup
        .select("a")
        .select("circle")
        .attr("fill-opacity", (d) => {
          const g = d.data.group || d.parent?.data.group;
          return g === selectedGroup ? 1 : 0.15;
        });
      g.selectAll<SVGLineElement, d3.HierarchyPointLink<TreeNode>>(".link")
        .attr("stroke-opacity", (d) => {
          const target = d.target;
          const g = target.data.group || target.parent?.data.group;
          return g === selectedGroup ? 0.7 : 0.08;
        });
    }
  }, [dimensions, kinases, selectedGroup, searchQuery, enrichTree, kinaseMap, onSelectKinase]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl overflow-hidden"
      style={{ minHeight: 500 }}
    >
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white tracking-wide">
          Kinome Evolutionary Tree
        </h2>
        <div className="flex flex-wrap gap-3 mt-2">
          {Object.entries(GROUP_COLORS).map(([group, color]) => (
            <span key={group} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {group}
            </span>
          ))}
        </div>
      </div>

      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full"
        style={{ maxHeight: 700 }}
      />

      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border border-white/15 bg-[#0b0f19]/90 backdrop-blur-md px-4 py-3 shadow-xl"
          style={{ left: tooltip.x + 16, top: tooltip.y - 10 }}
        >
          <p className="text-sm font-bold text-white">{tooltip.data.gene_symbol}</p>
          <p className="text-xs text-slate-300 mt-0.5">{tooltip.data.full_name}</p>
          <p className="text-xs mt-1">
            <span className="text-slate-400">Group: </span>
            <span style={{ color: GROUP_COLORS[tooltip.data.group] }}>
              {tooltip.data.group}
            </span>
          </p>
          <p className="text-xs">
            <span className="text-slate-400">Family: </span>
            <span className="text-slate-200">{tooltip.data.family}</span>
          </p>
          <p className="text-xs">
            <span className="text-slate-400">PDIS Score: </span>
            <span className="text-emerald-400 font-mono">
              {tooltip.data.pdis_score === null ? "N/A" : tooltip.data.pdis_score.toFixed(2)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
