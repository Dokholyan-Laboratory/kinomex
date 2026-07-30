"use client";

import { useEffect, useRef, useState } from "react";

const DOMAIN_COLORS = [
  "#38bdf8", "#34d399", "#a855f7", "#f59e0b", "#f472b6",
  "#22d3ee", "#fb923c", "#818cf8", "#2dd4bf", "#e879f9",
];

interface DomainBoundary {
  name: string;
  start: number;
  end: number;
}

interface NGLViewerProps {
  pdbId?: string | null;
  alphafoldId?: string | null;
  domains?: DomainBoundary[];
  className?: string;
}

export default function NGLViewer({ pdbId, alphafoldId, domains = [], className = "" }: NGLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!containerRef.current || cancelled) return;

      setLoading(true);
      setLoadError(null);

      try {
        const NGL = await import("ngl");
        if (cancelled) return;

        if (stageRef.current) {
          stageRef.current.dispose();
          stageRef.current = null;
        }

        const stage = new NGL.Stage(containerRef.current!, {
          quality: "high",
          impostor: true,
        });
        stageRef.current = stage;

        const observer = new ResizeObserver(() => stage.handleResize());
        observer.observe(containerRef.current!);

        let url: string;
        if (pdbId) {
          url = `rcsb://${pdbId}`;
        } else if (alphafoldId) {
          const resp = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${alphafoldId}`);
          const data = await resp.json();
          url = data[0]?.cifUrl;
          if (!url) throw new Error("AlphaFold structure not available");
        } else {
          setLoading(false);
          return;
        }

        const result = await stage.loadFile(url, { defaultRepresentation: false });
        if (cancelled || !result) {
          setLoading(false);
          return;
        }

        if (domains.length > 0) {
          // Base: thin outline for residues not in any domain
          result.addRepresentation("backbone", {
            color: "#1e293b",
            linewidth: 1,
          });

          // One cartoon per domain with distinct color
          domains.forEach((d, i) => {
            const color = DOMAIN_COLORS[i % DOMAIN_COLORS.length];
            const sele = `${d.start}-${d.end}`;
            result.addRepresentation("cartoon", {
              sele,
              color,
              name: d.name,
            });
          });
        } else if (pdbId) {
          result.addRepresentation("cartoon", { color: "spectrum" });
          result.addRepresentation("ball+stick", {
            sele: "hetero and not water",
            color: "element",
          });
        } else {
          result.addRepresentation("cartoon", { color: "plasma" });
        }

        result.autoView();
      } catch (err) {
        if (!cancelled) {
          console.error("NGL error:", err);
          setLoadError(String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      if (stageRef.current) {
        stageRef.current.dispose();
        stageRef.current = null;
      }
    };
  }, [pdbId, alphafoldId, domains]);

  return (
    <div className={`relative h-full ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black rounded-xl">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border-2 border-white/5 border-t-kinome-cyan/60 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading molecular viewer...</p>
          </div>
        </div>
      )}
      {loadError && (
        <div className="absolute bottom-3 left-3 right-3 z-10 px-3 py-2 bg-red-900/80 border border-red-500/30 rounded-lg text-xs text-red-300">
          {loadError}
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full rounded-xl overflow-hidden"
        style={{ position: "absolute", inset: 0, background: "#000" }}
      />
    </div>
  );
}
