import type { Types, Document } from "mongoose";

export enum BindingType {
  IC50 = "IC50",
  Ki = "Ki",
  Kd = "Kd",
  EC50 = "EC50",
}

export enum AssayType {
  Biochemical = "biochemical",
  CellBased = "cell_based",
  SPR = "SPR",
  XRay = "x_ray",
  CryoEM = "cryo_em",
}

export enum Pathogenicity {
  Pathogenic = "pathogenic",
  LikelyPathogenic = "likely_pathogenic",
  VariantOfUncertainSignificance = "variant_of_uncertain_significance",
  LikelyBenign = "likely_benign",
  Benign = "benign",
}

export enum ProteinAbundance {
  High = "high",
  Moderate = "moderate",
  Low = "low",
  Undetectable = "undetectable",
}

export interface Reference {
  pubmed_id?: string;
  doi?: string;
  authors: string[];
  title: string;
  journal: string;
  year: number;
}

export interface BindingAssay {
  ligand_id: string;
  ligand_name: string;
  chembl_id?: string;
  pubchem_cid?: number;
  binding_type: BindingType;
  assay_type: AssayType;
  value_nm: number;
  relation: string;
  target_conformation?: string;
  reference: Reference;
}

export interface DrugResistanceEffect {
  drug_name: string;
  fold_resistance: number;
  mechanism: string;
}

export interface Mutation {
  mutation_code: string;
  position: number;
  wildtype_aa: string;
  mutant_aa: string;
  structural_domain?: string;
  pathogenicity: Pathogenicity;
  associated_diseases: string[];
  organ_systems_affected: string[];
  drug_resistance_effects: DrugResistanceEffect[];
  references: KeyReference[];
}

export interface TissueExpression {
  tissue_name: string;
  organ_system: string;
  tpm_value: number;
  protein_abundance: ProteinAbundance;
  tau_specificity: number;
  data_source: string;
}

export interface Pathway {
  reactome_id: string;
  pathway_name: string;
  role: string;
}

export interface KeyReference {
  pubmed_id: string;
  citation_text: string;
  doi?: string;
  relevance_tag: string;
}

export interface PDISScore {
  overall_score: number;
  citation_component: number;
  clinical_component: number;
  structure_component: number;
  compound_diversity_component: number | null;
}

export interface Classification {
  group: string;
  family: string;
  subfamily: string;
  is_pseudokinase: boolean;
}

export interface IKinase extends Document {
  _id: Types.ObjectId;
  uniprot_id: string;
  gene_symbol: string;
  full_name: string;
  ec_number?: string;
  classification: Classification;
  pdis_score: PDISScore | null;
  pathways: Pathway[];
  organ_systems_impacted: string[];
  diseases_associated: string[];
  tissue_expressions: TissueExpression[];
  mutations: Mutation[];
  ligand_assays: BindingAssay[];
  key_references: KeyReference[];
  createdAt: Date;
  updatedAt: Date;
}

export type ParsedUrlQuery = Record<string, string | string[] | undefined>;
