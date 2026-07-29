"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";

type TissueBarData = {
  tissue: string;
  tpm: number;
  organ_system: string;
};

interface TissueBarChartProps {
  data: TissueBarData[];
  width?: number;
  height?: number;
}

const SYSTEM_COLORS: Record<string, string> = {
  "Nervous": "#38bdf8",
  "Respiratory": "#a855f7",
  "Cardiovascular": "#f43f5e",
  "Digestive": "#34d399",
  "Urinary": "#f59e0b",
  "Endocrine": "#f97316",
  "Musculoskeletal": "#3b82f6",
  "Integumentary": "#94a3b8",
  "Immune": "#e879f9",
  "Hematopoietic": "#fb7185",
};

export default function TissueBarChart({
  data,
  width = 600,
  height,
}: TissueBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<{ x: number; y: number; data: TissueBarData } | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    data: TissueBarData;
  } | null>(null);

  const sortedData = useMemo(
    () => [...data].sort((a, b) => b.tpm - a.tpm),
    [data]
  );

  const dynamicHeight = useMemo(
    () => height ?? Math.max(sortedData.length * 28 + 40, 200),
    [height, sortedData.length]
  );

  const maxTpm = useMemo(
    () => Math.max(...sortedData.map((d) => d.tpm), 1),
    [sortedData]
  );

  const colorScale = useMemo(
    () =>
      d3
        .scaleSequentialLog<string>()
        .domain([0.1, maxTpm])
        .interpolator(d3.interpolateRgbBasis(["#1e293b", "#0e7490", "#38bdf8"])),
    [maxTpm]
  );

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 10, right: 60, bottom: 10, left: 130 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = dynamicHeight - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${dynamicHeight}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLog()
      .domain([0.1, maxTpm])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleBand()
      .domain(sortedData.map((d) => d.tissue))
      .range([0, innerHeight])
      .padding(0.3);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format(".1f")))
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll<SVGGElement, unknown>(".tick line")
          .attr("stroke", "#1e293b")
      )
      .call((g) =>
        g.selectAll<SVGTextElement, unknown>(".tick text").attr("fill", "#475569").attr("font-size", "9px")
      );

    g.selectAll<SVGRectElement, TissueBarData>("rect.bar")
      .data(sortedData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.tissue)!)
      .attr("height", yScale.bandwidth())
      .attr("rx", 3)
      .attr("fill", (d) => colorScale(Math.max(d.tpm, 0.1)))
      .attr("opacity", 0)
      .attr("cursor", "pointer")
      .on("mouseenter", (event, d) => {
        const rect = svgRef.current!.getBoundingClientRect();
        const pos = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          data: d,
        };
        tooltipRef.current = pos;
        setTooltip(pos);
      })
      .on("mousemove", (event) => {
        const rect = svgRef.current!.getBoundingClientRect();
        const pos = tooltipRef.current
          ? { ...tooltipRef.current, x: event.clientX - rect.left, y: event.clientY - rect.top }
          : null;
        tooltipRef.current = pos;
        setTooltip(pos);
      })
      .on("mouseleave", () => {
        tooltipRef.current = null;
        setTooltip(null);
      })
      .transition()
      .duration(700)
      .delay((_d, i) => i * 35)
      .attr("width", (d) => xScale(Math.max(d.tpm, 0.1)))
      .attr("opacity", 1);

    g.selectAll<SVGTextElement, TissueBarData>("text.label")
      .data(sortedData)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", -8)
      .attr("y", (d) => yScale(d.tissue)! + yScale.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .text((d) => d.tissue)
      .attr("font-size", "10px")
      .attr("fill", "#cbd5e1")
      .attr("opacity", 0)
      .transition()
      .duration(400)
      .delay((_d, i) => i * 35)
      .attr("opacity", 1);

    g.selectAll<SVGTextElement, TissueBarData>("text.value")
      .data(sortedData)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", (d) => xScale(Math.max(d.tpm, 0.1)) + 6)
      .attr("y", (d) => yScale(d.tissue)! + yScale.bandwidth() / 2)
      .attr("dominant-baseline", "middle")
      .text((d) => d.tpm.toFixed(1))
      .attr("font-size", "9px")
      .attr("fill", "#94a3b8")
      .attr("font-family", "monospace")
      .attr("opacity", 0)
      .transition()
      .duration(400)
      .delay((_d, i) => i * 35 + 200)
      .attr("opacity", 1);

    g.selectAll<SVGTextElement, TissueBarData>("text.system")
      .data(sortedData)
      .enter()
      .append("text")
      .attr("class", "system")
      .attr("x", (d) => xScale(Math.max(d.tpm, 0.1)) + 42)
      .attr("y", (d) => yScale(d.tissue)! + yScale.bandwidth() / 2)
      .attr("dominant-baseline", "middle")
      .text((d) => d.organ_system)
      .attr("font-size", "8px")
      .attr("fill", (d) => SYSTEM_COLORS[d.organ_system] || "#475569")
      .attr("opacity", 0)
      .transition()
      .duration(400)
      .delay((_d, i) => i * 35 + 300)
      .attr("opacity", 0.7);
  }, [sortedData, width, dynamicHeight, maxTpm, colorScale]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-sm font-semibold text-slate-300 tracking-wide">
          Tissue Expression (TPM)
        </h2>
      </div>

      <div className="p-4 relative">
        <svg ref={svgRef} className="w-full" />

        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 rounded-xl border border-white/15 bg-[#0b0f19]/90 backdrop-blur-md px-4 py-3 shadow-xl"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          >
            <p className="text-sm font-bold text-white">{tooltip.data.tissue}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {tooltip.data.organ_system}
            </p>
            <p className="text-xs mt-1">
              <span className="text-slate-400">TPM: </span>
              <span className="text-cyan-400 font-mono font-bold">
                {tooltip.data.tpm.toFixed(2)}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
