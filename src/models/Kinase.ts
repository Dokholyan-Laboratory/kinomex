import { Schema, model, models } from "mongoose";
import type { IKinase } from "@/lib/types";

const ReferenceSchema = new Schema(
  {
    pubmed_id: { type: String },
    doi: { type: String },
    authors: [{ type: String }],
    title: { type: String, required: true },
    journal: { type: String, required: true },
    year: { type: Number, required: true },
  },
  { _id: false }
);

const BindingAssaySchema = new Schema(
  {
    ligand_id: { type: String, required: true },
    ligand_name: { type: String, required: true },
    chembl_id: { type: String },
    pubchem_cid: { type: Number },
    binding_type: {
      type: String,
      enum: ["IC50", "Ki", "Kd", "EC50"],
      required: true,
    },
    assay_type: {
      type: String,
      enum: ["biochemical", "cell_based", "SPR", "x_ray", "cryo_em"],
      required: true,
    },
    value_nm: { type: Number, required: true },
    relation: { type: String, required: true },
    target_conformation: { type: String },
    reference: { type: ReferenceSchema, required: true },
  },
  { _id: false }
);

const DrugResistanceEffectSchema = new Schema(
  {
    drug_name: { type: String, required: true },
    fold_resistance: { type: Number, required: true },
    mechanism: { type: String, required: true },
  },
  { _id: false }
);

const MutationSchema = new Schema(
  {
    mutation_code: { type: String, required: true },
    position: { type: Number, required: true },
    wildtype_aa: { type: String, required: true },
    mutant_aa: { type: String, required: true },
    structural_domain: { type: String },
    pathogenicity: {
      type: String,
      enum: [
        "pathogenic",
        "likely_pathogenic",
        "variant_of_uncertain_significance",
        "likely_benign",
        "benign",
      ],
      required: true,
    },
    associated_diseases: [{ type: String }],
    organ_systems_affected: [{ type: String }],
    drug_resistance_effects: [DrugResistanceEffectSchema],
    references: [ReferenceSchema],
  },
  { _id: false }
);

const TissueExpressionSchema = new Schema(
  {
    tissue_name: { type: String, required: true },
    organ_system: { type: String, required: true },
    tpm_value: { type: Number, required: true },
    protein_abundance: {
      type: String,
      enum: ["high", "moderate", "low", "undetectable"],
      required: true,
    },
    tau_specificity: { type: Number, required: true },
    data_source: { type: String, required: true },
  },
  { _id: false }
);

const PathwaySchema = new Schema(
  {
    reactome_id: { type: String, required: true },
    pathway_name: { type: String, required: true },
    role: { type: String, required: true },
  },
  { _id: false }
);

const KeyReferenceSchema = new Schema(
  {
    pubmed_id: { type: String, required: true },
    citation_text: { type: String, required: true },
    doi: { type: String },
    relevance_tag: { type: String, required: true },
  },
  { _id: false }
);

const PDISScoreSchema = new Schema(
  {
    overall_score: { type: Number, required: true },
    citation_component: { type: Number, required: true },
    clinical_component: { type: Number, required: true },
    structure_component: { type: Number, required: true },
    patent_component: { type: Number, required: true },
    fda_approval_status: { type: String, required: true },
  },
  { _id: false }
);

const ClassificationSchema = new Schema(
  {
    group: { type: String, required: true },
    family: { type: String, required: true },
    subfamily: { type: String, required: true },
    is_pseudokinase: { type: Boolean, required: true },
  },
  { _id: false }
);

const KinaseSchema = new Schema<IKinase>(
  {
    uniprot_id: { type: String, required: true, unique: true, index: true },
    gene_symbol: { type: String, required: true, index: true },
    full_name: { type: String, required: true },
    ec_number: { type: String },
    classification: { type: ClassificationSchema, required: true },
    pdis_score: { type: PDISScoreSchema, required: true },
    pathways: [PathwaySchema],
    organ_systems_impacted: [{ type: String }],
    diseases_associated: [{ type: String }],
    tissue_expressions: [TissueExpressionSchema],
    mutations: [MutationSchema],
    ligand_assays: [BindingAssaySchema],
    key_references: [KeyReferenceSchema],
  },
  { timestamps: true }
);

KinaseSchema.index({ "classification.group": 1, "pdis_score.overall_score": -1 });
KinaseSchema.index({ diseases_associated: "text", gene_symbol: "text", full_name: "text" });

const Kinase = models.Kinase || model<IKinase>("Kinase", KinaseSchema);

export { Kinase };
export default Kinase;
