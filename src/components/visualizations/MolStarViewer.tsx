"use client";

type MutationHighlight = {
  position: number;
  residue: string;
  color: string;
};

type LigandInfo = {
  name: string;
  bindingType: string;
};

interface MolStarViewerProps {
  pdbId?: string;
  geneSymbol: string;
  mutations?: MutationHighlight[];
  ligands?: LigandInfo[];
}

export default function MolStarViewer({
  pdbId,
  geneSymbol,
  mutations = [],
  ligands = [],
}: MolStarViewerProps) {
  const alphafoldUrl = `https://alphafold.ebi.ac.uk/entry/${geneSymbol}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white tracking-wide">
          3D Molecular Structure
        </h2>
        <p className="text-xs text-slate-400 mt-1">{geneSymbol}</p>
      </div>

      <div className="flex flex-col lg:flex-row" style={{ minHeight: 480 }}>
        <div className="relative flex-1 bg-[#060a12] min-h-[400px]">
          {pdbId ? (
            <iframe
              src={`https://www.rcsb.org/3d-view/${pdbId}`}
              title={`3D structure of ${pdbId}`}
              className="w-full h-full border-0"
              style={{ minHeight: 460 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
              </div>
              <p className="text-sm text-slate-400 mb-1">
                No PDB structure available
              </p>
              <p className="text-xs text-slate-500 mb-4">
                View predicted structure on AlphaFold instead
              </p>
              <a
                href={alphafoldUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/30 transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                View on AlphaFold
              </a>
            </div>
          )}

          <div className="absolute top-3 right-3 flex gap-2">
            {pdbId && (
              <a
                href={`https://www.rcsb.org/structure/${pdbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs text-slate-300 hover:bg-white/20 transition-colors backdrop-blur-md"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                RCSB
              </a>
            )}
            <a
              href={alphafoldUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs text-slate-300 hover:bg-white/20 transition-colors backdrop-blur-md"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              AlphaFold
            </a>
          </div>
        </div>

        <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-white/10 p-4 flex flex-col gap-4 overflow-y-auto max-h-[500px]">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Mutations
            </h3>
            {mutations.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No mutations highlighted</p>
            ) : (
              <div className="space-y-1.5">
                {mutations.map((mut, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 border border-white/5"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: mut.color }}
                    />
                    <span className="text-xs text-slate-200 font-mono">
                      {mut.residue}
                    </span>
                    <span className="text-xs text-slate-500">
                      pos. {mut.position}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Ligands
            </h3>
            {ligands.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No ligand data</p>
            ) : (
              <div className="space-y-1.5">
                {ligands.map((lig, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2 bg-white/5 border border-white/5"
                  >
                    <p className="text-xs text-emerald-400 font-semibold">
                      {lig.name}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {lig.bindingType}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pdbId && (
            <div className="mt-auto pt-2 border-t border-white/5">
              <p className="text-[10px] text-slate-500">
                PDB:{" "}
                <span className="text-slate-400 font-mono">{pdbId.toUpperCase()}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
