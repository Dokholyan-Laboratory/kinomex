"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";

type TissueExpression = {
  tissue_name: string;
  organ_system: string;
  tpm_value: number;
  protein_abundance: string;
  tau_specificity: number;
};

interface KinaseBodyMapProps {
  tissueExpressions: TissueExpression[];
  onTissueClick: (tissue: string) => void;
  activeTissue?: string;
}

interface OrganRegion {
  name: string;
  path: string;
  cx: number;
  cy: number;
  labelX: number;
  labelY: number;
  labelSide: "left" | "right";
}

const ORGAN_PATHS: OrganRegion[] = [
  {
    name: "Brain",
    path: "M 200 55 C 170 30 155 55 160 75 C 150 50 130 60 140 85 C 125 70 120 95 140 100 C 260 95 280 70 265 100 C 285 95 278 70 260 85 C 275 60 255 50 245 75 C 250 55 235 30 200 55 Z",
    cx: 200, cy: 68, labelX: 310, labelY: 55, labelSide: "right",
  },
  {
    name: "Lungs",
    path: "M 165 120 C 140 115 120 140 115 170 C 110 200 120 225 145 228 C 155 229 165 220 170 210 L 175 155 Z M 235 120 C 260 115 280 140 285 170 C 290 200 280 225 255 228 C 245 229 235 220 230 210 L 225 155 Z",
    cx: 200, cy: 170, labelX: 70, labelY: 145, labelSide: "left",
  },
  {
    name: "Heart",
    path: "M 192 150 C 185 140 175 142 175 152 C 175 162 185 172 192 180 C 199 172 209 162 209 152 C 209 142 199 140 192 150 Z",
    cx: 192, cy: 160, labelX: 310, labelY: 155, labelSide: "right",
  },
  {
    name: "Liver",
    path: "M 155 210 C 140 205 125 215 125 232 C 125 250 145 260 170 255 C 180 253 185 245 185 238 L 185 215 Z",
    cx: 155, cy: 233, labelX: 70, labelY: 215, labelSide: "left",
  },
  {
    name: "Stomach",
    path: "M 195 215 C 195 208 205 205 215 208 C 230 212 240 225 238 242 C 236 255 220 260 208 255 C 195 250 190 235 195 215 Z",
    cx: 217, cy: 233, labelX: 310, labelY: 225, labelSide: "right",
  },
  {
    name: "Kidneys",
    path: "M 145 265 C 135 262 130 272 132 285 C 134 298 145 302 152 296 C 158 290 155 275 145 265 Z M 255 265 C 265 262 270 272 268 285 C 266 298 255 302 248 296 C 242 290 245 275 255 265 Z",
    cx: 200, cy: 280, labelX: 70, labelY: 280, labelSide: "left",
  },
  {
    name: "Pancreas",
    path: "M 165 305 C 155 300 145 305 145 315 C 145 322 155 328 170 325 C 185 322 210 325 225 322 C 235 320 245 325 245 330 C 245 338 235 340 220 338 C 200 335 180 335 165 338 C 155 340 148 335 148 330 C 148 325 158 308 165 305 Z",
    cx: 200, cy: 318, labelX: 310, labelY: 310, labelSide: "right",
  },
  {
    name: "Intestines",
    path: "M 155 345 C 135 342 115 360 120 385 C 125 405 150 418 175 415 C 190 413 200 405 200 400 C 200 405 210 413 225 415 C 250 418 275 405 280 385 C 285 360 265 342 245 345 C 230 347 215 345 200 348 C 185 345 170 347 155 345 Z",
    cx: 200, cy: 380, labelX: 70, labelY: 380, labelSide: "left",
  },
  {
    name: "Bone Marrow",
    path: "M 185 425 L 185 470 C 185 475 190 480 200 480 C 210 480 215 475 215 470 L 215 425 Z",
    cx: 200, cy: 452, labelX: 310, labelY: 452, labelSide: "right",
  },
  {
    name: "Muscle",
    path: "M 175 485 L 155 580 C 152 590 158 595 165 593 L 195 585 Z M 225 485 L 245 580 C 248 590 242 595 235 593 L 205 585 Z",
    cx: 200, cy: 540, labelX: 70, labelY: 545, labelSide: "left",
  },
  {
    name: "Skin",
    path: "M 100 80 C 90 80 85 100 85 140 C 85 250 88 350 90 420 C 91 460 92 520 95 590 C 96 605 100 610 108 608 C 115 606 118 595 120 580 L 125 490 M 300 80 C 310 80 315 100 315 140 C 315 250 312 350 310 420 C 309 460 308 520 305 590 C 304 605 300 610 292 608 C 285 606 282 595 280 580 L 275 490",
    cx: 95, cy: 350, labelX: 50, labelY: 615, labelSide: "left",
  },
];

const BODY_OUTLINE = `
  M 200 20
  C 175 8 155 18 148 40
  C 140 25 125 32 122 55
  C 115 40 100 55 95 80
  C 85 80 78 110 78 150
  C 78 220 80 300 82 380
  C 83 430 85 500 88 570
  C 90 595 95 615 110 620
  C 120 623 128 612 132 595
  C 135 570 140 530 145 500
  L 155 590
  C 157 610 165 618 175 615
  C 185 612 192 598 195 585
  L 200 540
  L 205 585
  C 208 598 215 612 225 615
  C 235 618 243 610 245 590
  L 255 500
  C 260 530 265 570 268 595
  C 272 612 280 623 290 620
  C 305 615 310 595 312 570
  C 315 500 317 430 318 380
  C 320 300 322 220 322 150
  C 322 110 315 80 305 80
  C 300 55 285 40 278 55
  C 275 32 260 25 252 40
  C 245 18 225 8 200 20 Z
`;

export default function KinaseBodyMap({
  tissueExpressions,
  onTissueClick,
  activeTissue,
}: KinaseBodyMapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    data: TissueExpression;
  } | null>(null);

  const expressionMap = useMemo(
    () => new Map(tissueExpressions.map((t) => [t.tissue_name, t])),
    [tissueExpressions]
  );

  const maxTpm = useMemo(
    () => Math.max(...tissueExpressions.map((t) => t.tpm_value), 1),
    [tissueExpressions]
  );

  const colorScale = useMemo(
    () =>
      d3
        .scaleSequentialLog()
        .domain([0.1, maxTpm])
        .interpolator(d3.interpolateRgbBasis(["#1e293b", "#0e7490", "#38bdf8"])),
    [maxTpm]
  );

  const barChartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!barChartRef.current) return;
    const svg = d3.select(barChartRef.current);
    svg.selectAll("*").remove();

    const data = [...tissueExpressions].sort((a, b) => b.tpm_value - a.tpm_value);
    const margin = { top: 10, right: 50, bottom: 10, left: 110 };
    const barHeight = 22;
    const width = 360;
    const height = data.length * barHeight + margin.top + margin.bottom;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const xScale = d3
      .scaleLog()
      .domain([0.1, maxTpm])
      .range([0, width - margin.left - margin.right]);

    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.tissue_name))
      .range([margin.top, height - margin.bottom])
      .padding(0.3);

    const g = svg.append("g").attr("transform", `translate(${margin.left},0)`);

    g.selectAll<SVGRectElement, TissueExpression>("rect.bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.tissue_name)!)
      .attr("height", yScale.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => colorScale(d.tpm_value))
      .attr("opacity", 0)
      .transition()
      .duration(800)
      .delay((_d, i) => i * 40)
      .attr("width", (d) => xScale(Math.max(d.tpm_value, 0.1)))
      .attr("opacity", 1);

    g.selectAll<SVGTextElement, TissueExpression>("text.label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", -6)
      .attr("y", (d) => yScale(d.tissue_name)! + yScale.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .text((d) => d.tissue_name)
      .attr("font-size", "10px")
      .attr("fill", "#cbd5e1");

    g.selectAll<SVGTextElement, TissueExpression>("text.value")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", (d) => xScale(Math.max(d.tpm_value, 0.1)) + 4)
      .attr("y", (d) => yScale(d.tissue_name)! + yScale.bandwidth() / 2)
      .attr("dominant-baseline", "middle")
      .text((d) => d.tpm_value.toFixed(1))
      .attr("font-size", "9px")
      .attr("fill", "#94a3b8")
      .attr("font-family", "monospace");
  }, [tissueExpressions, maxTpm, colorScale]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white tracking-wide">
          Tissue Expression Distribution
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="relative flex-shrink-0 p-4 flex justify-center">
          <svg viewBox="70 10 260 620" width="280" className="max-h-[560px]">
            <defs>
              <filter id="bodyGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="activeGlow">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              d={BODY_OUTLINE}
              fill="none"
              stroke="#1e293b"
              strokeWidth="2"
              opacity="0.6"
            />

            {ORGAN_PATHS.map((organ) => {
              const expr = expressionMap.get(organ.name);
              const fill = expr ? colorScale(expr.tpm_value) : "#1e293b";
              const isActive = activeTissue === organ.name;

              return (
                <g key={organ.name}>
                  <path
                    d={organ.path}
                    fill={fill}
                    stroke={isActive ? "#38bdf8" : "#334155"}
                    strokeWidth={isActive ? 2 : 1}
                    filter={isActive ? "url(#activeGlow)" : undefined}
                    className="cursor-pointer transition-all duration-200"
                    style={{ opacity: activeTissue && !isActive ? 0.35 : 0.85 }}
                    onMouseEnter={(e) => {
                      if (expr) {
                        setTooltip({
                          x: e.clientX,
                          y: e.clientY,
                          data: expr,
                        });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (tooltip) {
                        setTooltip((prev) =>
                          prev ? { ...prev, x: e.clientX, y: e.clientY } : null
                        );
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => onTissueClick(organ.name)}
                  />
                  <line
                    x1={organ.cx}
                    y1={organ.cy}
                    x2={organ.labelX}
                    y2={organ.labelY}
                    stroke="#334155"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={organ.labelX}
                    y={organ.labelY}
                    textAnchor={organ.labelSide === "left" ? "end" : "start"}
                    dominantBaseline="middle"
                    fontSize="10"
                    fill={isActive ? "#38bdf8" : "#64748b"}
                    fontWeight={isActive ? 600 : 400}
                    className="cursor-pointer select-none"
                    onClick={() => onTissueClick(organ.name)}
                  >
                    {organ.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex-1 border-t lg:border-t-0 lg:border-l border-white/10 p-4">
          <svg ref={barChartRef} className="w-full" />
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-xl border border-white/15 bg-[#0b0f19]/90 backdrop-blur-md px-4 py-3 shadow-xl max-w-xs"
          style={{ left: tooltip.x + 16, top: tooltip.y - 10 }}
        >
          <p className="text-sm font-bold text-white">{tooltip.data.tissue_name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {tooltip.data.organ_system}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-xs">
              <span className="text-slate-400">TPM: </span>
              <span className="text-cyan-400 font-mono font-bold">
                {tooltip.data.tpm_value.toFixed(2)}
              </span>
            </p>
            <p className="text-xs">
              <span className="text-slate-400">IHC: </span>
              <span className="text-slate-200">{tooltip.data.protein_abundance}</span>
            </p>
            <p className="text-xs">
              <span className="text-slate-400">Tau: </span>
              <span className="text-violet-400 font-mono">
                {tooltip.data.tau_specificity.toFixed(3)}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
