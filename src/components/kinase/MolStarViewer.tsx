"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    molstar?: any;
  }
}

interface MolStarViewerProps {
  pdbId?: string | null;
  alphafoldId?: string | null;
  className?: string;
}

export default function MolStarViewer({ pdbId, alphafoldId, className = "" }: MolStarViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const initViewer = useCallback(async () => {
    if (!containerRef.current) return;

    setLoading(true);
    setLoadError(null);

    try {
      // Load MolStar from CDN
      if (!window.molstar) {
        await new Promise<void>((resolve, reject) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.css";
          document.head.appendChild(link);

          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load MolStar script"));
          document.body.appendChild(script);
        });
      }

      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }

      const viewer = await window.molstar!.Viewer.create(containerRef.current!, {
        layoutIsExpanded: false,
        layoutShowControls: true,
        layoutShowRemoteState: false,
        layoutShowSequence: true,
        layoutShowLog: false,
        layoutShowLeftPanel: true,
        viewportShowExpand: false,
        viewportShowSelectionMode: false,
        viewportShowAnimation: false,
        pdbProvider: "rcsb",
        emdbProvider: "rcsb",
      });

      viewerRef.current = viewer;

      // Load structure separately so init errors and load errors are distinct
      try {
        if (pdbId) {
          await viewer.loadPdb(pdbId);
        } else if (alphafoldId) {
          await viewer.loadAlphaFoldDb(alphafoldId);
        }
      } catch (loadErr) {
        console.error("MolStar structure load error:", loadErr);
        setLoadError(String(loadErr));
      }
    } catch (err) {
      console.error("MolStar init error:", err);
      setLoadError(String(err));
    } finally {
      setLoading(false);
    }
  }, [pdbId, alphafoldId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!cancelled) await initViewer();
    }

    run();

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, [initViewer]);

  return (
    <div className={`relative ${className}`}>
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
        className={`w-full h-full min-h-[400px] rounded-xl overflow-hidden ${loading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        style={{ position: "relative", background: "#000" }}
      />
    </div>
  );
}
