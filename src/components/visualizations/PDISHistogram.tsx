"use client";

import { useCallback, useRef } from "react";

export interface PDISBucket {
  min: number;
  max: number;
  count: number;
}

interface PDISHistogramProps {
  buckets: PDISBucket[];
  minPDIS: number;
  maxPDIS: number;
  onChange: (min: number, max: number) => void;
  loading?: boolean;
}

const WIDTH = 620;
const HEIGHT = 150;
const PAD_TOP = 24;
const PAD_RIGHT = 10;
const PAD_BOTTOM = 26;
const PAD_LEFT = 10;

const round2 = (v: number) => Math.round(v * 100) / 100;

export default function PDISHistogram({
  buckets,
  minPDIS,
  maxPDIS,
  onChange,
  loading = false,
}: PDISHistogramProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<"min" | "max" | null>(null);

  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const barW = buckets.length > 0 ? innerW / buckets.length : innerW;
  const maxCount = buckets.reduce((m, b) => Math.max(m, b.count), 0);

  const valueToX = (v: number) => PAD_LEFT + v * innerW;

  const clientToValue = useCallback(
    (clientX: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      const svgX = ((clientX - rect.left) / rect.width) * WIDTH;
      return Math.min(1, Math.max(0, (svgX - PAD_LEFT) / innerW));
    },
    [innerW]
  );

  const startDrag = useCallback((which: "min" | "max") => (e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = which;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const v = round2(clientToValue(e.clientX));
      if (dragRef.current === "min") {
        onChange(Math.min(v, maxPDIS), maxPDIS);
      } else {
        onChange(minPDIS, Math.max(v, minPDIS));
      }
    },
    [clientToValue, onChange, minPDIS, maxPDIS]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const minSel = minPDIS * 100;
  const maxSel = maxPDIS * 100;

  return (
    <div className="bg-slate-900/40 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">PDIS Distribution</span>
        <span className="text-xs font-medium tabular-nums">
          <span className="text-kinome-cyan">{minPDIS.toFixed(2)}</span>
          <span className="text-slate-600 mx-1">–</span>
          <span className="text-kinome-violet">{maxPDIS.toFixed(2)}</span>
        </span>
      </div>

      {loading ? (
        <div className="h-[150px] rounded-xl bg-white/5 animate-shimmer" />
      ) : buckets.length === 0 ? (
        <div className="h-[150px] flex items-center justify-center text-sm text-slate-500 rounded-xl border border-white/10">
          No data for the current filters
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto select-none touch-none"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          <rect
            x={valueToX(minPDIS)}
            y={PAD_TOP}
            width={Math.max(0, valueToX(maxPDIS) - valueToX(minPDIS))}
            height={innerH}
            fill="rgba(56,189,248,0.08)"
          />

          {buckets.map((b, i) => {
            const h = maxCount > 0 ? (b.count / maxCount) * innerH : 0;
            const x = PAD_LEFT + i * barW;
            const inSel = b.max > minSel && b.min < maxSel;
            return (
              <rect
                key={i}
                x={x + 0.5}
                y={PAD_TOP + innerH - Math.max(h, b.count > 0 ? 1 : 0)}
                width={Math.max(1, barW - 1)}
                height={Math.max(h, b.count > 0 ? 1 : 0)}
                rx={1.5}
                fill={inSel ? "rgba(56,189,248,0.75)" : "rgba(148,163,184,0.28)"}
              >
                <title>{`${(b.min / 100).toFixed(2)}–${(b.max / 100).toFixed(2)} PDIS: ${b.count} kinase${b.count !== 1 ? "s" : ""}`}</title>
              </rect>
            );
          })}

          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line
                x1={valueToX(t)}
                y1={PAD_TOP}
                x2={valueToX(t)}
                y2={PAD_TOP + innerH}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
              <text
                x={valueToX(t)}
                y={HEIGHT - 8}
                textAnchor={t === 0 ? "start" : t === 1 ? "end" : "middle"}
                fill="#64748b"
                fontSize={9}
              >
                {t}
              </text>
            </g>
          ))}

          {(
            [
              { which: "min" as const, v: minPDIS, color: "#38bdf8" },
              { which: "max" as const, v: maxPDIS, color: "#a855f7" },
            ]
          ).map(({ which, v, color }) => {
            const x = valueToX(v);
            return (
              <g
                key={which}
                onPointerDown={startDrag(which)}
                style={{ cursor: "ew-resize" }}
              >
                <line
                  x1={x}
                  y1={PAD_TOP}
                  x2={x}
                  y2={PAD_TOP + innerH}
                  stroke={color}
                  strokeWidth={2}
                />
                <rect
                  x={x - 5}
                  y={PAD_TOP - 8}
                  width={10}
                  height={10}
                  rx={2}
                  fill="#0b0f19"
                  stroke={color}
                  strokeWidth={2}
                />
              </g>
            );
          })}
        </svg>
      )}

      <div className="flex justify-between text-[10px] text-slate-600 mt-2 px-0.5 select-none">
        <span>0 — lower interest</span>
        <span>1 — higher interest</span>
      </div>
    </div>
  );
}
