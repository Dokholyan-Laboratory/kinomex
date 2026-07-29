"use client";

import { useEffect, useRef } from "react";

export default function BiomedicalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.min(w / 1920, h / 1080);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // ── Base gradient ──────────────────────────────────────────────
    const base = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.7);
    base.addColorStop(0, "#050812");
    base.addColorStop(0.3, "#080c1a");
    base.addColorStop(0.6, "#0a1025");
    base.addColorStop(1, "#0d1530");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    // ── Vignette ───────────────────────────────────────────────────
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.1, w * 0.5, h * 0.5, w * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // ── Helper: hexagon ────────────────────────────────────────────
    function hex(cx: number, cy: number, r: number) {
      ctx!.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.closePath();
    }

    // ── Hexagonal lattice fragments (corners) ──────────────────────
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 0.5;
    const hx = 26 * scale;
    const hy = hx * Math.sqrt(3) / 2;
    const hexClusters = [
      [w * 0.06, h * 0.12], [w * 0.94, h * 0.88],
      [w * 0.1, h * 0.78], [w * 0.9, h * 0.18],
    ];
    for (const [cx, cy] of hexClusters) {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (dr === 0 && dc === 0) continue;
          const x = cx + dc * hx * 1.5 + (dr % 2) * hx * 0.75;
          const y = cy + dr * hy;
          hex(x, y, hx * 0.55);
          ctx!.stroke();
        }
      }
    }
    ctx.restore();

    // ── Radial orbital diagrams ────────────────────────────────────
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 0.5;
    for (const [ox, oy] of [[w * 0.12, h * 0.18], [w * 0.88, h * 0.82]]) {
      for (let ri = 1; ri <= 3; ri++) {
        const r = ri * 32 * scale;
        ctx.beginPath();
        ctx.ellipse(ox, oy, r, r * 0.55, ri * 0.25, 0.2, Math.PI * 1.3);
        ctx.stroke();
      }
    }
    ctx.restore();

    // ── Dotted trajectories ────────────────────────────────────────
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 12]);
    for (const [sx, sy, cpx, cpy, ex, ey] of [
      [w * 0.04, h * 0.5, w * 0.15, h * 0.25, w * 0.28, h * 0.32],
      [w * 0.96, h * 0.5, w * 0.85, h * 0.75, w * 0.72, h * 0.68],
    ]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cpx, cpy, ex, ey);
      ctx.stroke();
    }
    ctx.restore();

    // ── Protein-ribbon shapes ──────────────────────────────────────
    ctx.save();
    for (const [color, pts] of [
      ["#38bdf8", [[w * 0.86, h * 0.1], [w * 0.78, h * 0.17], [w * 0.82, h * 0.24], [w * 0.74, h * 0.31], [w * 0.77, h * 0.38]]],
      ["#a855f7", [[w * 0.14, h * 0.9], [w * 0.22, h * 0.83], [w * 0.18, h * 0.76], [w * 0.26, h * 0.69], [w * 0.23, h * 0.62]]],
    ] as const) {
      ctx.globalAlpha = 0.07;
      ctx.strokeStyle = color;
      ctx.lineWidth = 7 * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const mx = (pts[i - 1][0] + pts[i][0]) / 2;
        const my = (pts[i - 1][1] + pts[i][1]) / 2;
        ctx.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], mx, my);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const mx = (pts[i - 1][0] + pts[i][0]) / 2;
        const my = (pts[i - 1][1] + pts[i][1]) / 2;
        ctx.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], mx, my);
      }
      ctx.stroke();
    }
    ctx.restore();

    // ── Molecular node-and-bond networks ───────────────────────────
    function molCluster(cx: number, cy: number, n: number, radius: number, color: string) {
      const nodes: [number, number][] = [[cx, cy]];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = radius * (0.3 + Math.random() * 0.7);
        nodes.push([cx + d * Math.cos(a), cy + d * Math.sin(a)]);
      }
      ctx!.globalAlpha = 0.06;
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i][0] - nodes[j][0];
          const dy = nodes[i][1] - nodes[j][1];
          if (Math.sqrt(dx * dx + dy * dy) < radius * 1.1) {
            ctx!.beginPath();
            ctx!.moveTo(nodes[i][0], nodes[i][1]);
            ctx!.lineTo(nodes[j][0], nodes[j][1]);
            ctx!.stroke();
          }
        }
      }
      ctx!.globalAlpha = 0.1;
      for (const [nx, ny] of nodes) {
        ctx!.beginPath();
        ctx!.arc(nx, ny, 1.8 * scale, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.fill();
      }
    }
    molCluster(w * 0.1, h * 0.18, 8, 42 * scale, "#38bdf8");
    molCluster(w * 0.9, h * 0.82, 7, 38 * scale, "#38bdf8");
    molCluster(w * 0.86, h * 0.12, 6, 32 * scale, "#a855f7");
    molCluster(w * 0.14, h * 0.84, 6, 35 * scale, "#a855f7");

    // ── Glowing nodes with bloom ──────────────────────────────────
    ctx.save();
    for (const [nx, ny, r, color] of [
      [w * 0.06, h * 0.26, 1.8, "38,189,248"],
      [w * 0.16, h * 0.1, 1.4, "38,189,248"],
      [w * 0.92, h * 0.72, 2.0, "38,189,248"],
      [w * 0.8, h * 0.9, 1.5, "168,85,247"],
      [w * 0.9, h * 0.08, 1.2, "168,85,247"],
      [w * 0.12, h * 0.76, 1.8, "168,85,247"],
    ] as [number, number, number, string][]) {
      const bloom = ctx!.createRadialGradient(nx, ny, 0, nx, ny, r * 14 * scale);
      bloom.addColorStop(0, `rgba(${color}, 0.12)`);
      bloom.addColorStop(1, `rgba(${color}, 0)`);
      ctx!.fillStyle = bloom;
      ctx!.fillRect(nx - r * 14 * scale, ny - r * 14 * scale, r * 28 * scale, r * 28 * scale);
      ctx!.globalAlpha = 0.25;
      ctx!.beginPath();
      ctx!.arc(nx, ny, r * scale, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${color}, 0.7)`;
      ctx!.fill();
      ctx!.globalAlpha = 0.08;
      ctx!.beginPath();
      ctx!.arc(nx, ny, r * 3.5 * scale, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${color}, 0.4)`;
      ctx!.fill();
    }
    ctx.restore();

    // ── Faint structural arcs (bottom) ────────────────────────────
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const r = 50 * scale + i * 30 * scale;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.98, r, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    }
    ctx.restore();

    // ── Cinematic film grain ──────────────────────────────────────
    const grainPixels = Math.max(w, h) / 3;
    const gc = document.createElement("canvas");
    gc.width = grainPixels;
    gc.height = grainPixels;
    const gx = gc.getContext("2d")!;
    const id = gx.createImageData(grainPixels, grainPixels);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 60;
      id.data[i] = v;
      id.data[i + 1] = v;
      id.data[i + 2] = v;
      id.data[i + 3] = 8;
    }
    gx.putImageData(id, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (let x = 0; x < w; x += grainPixels) {
      for (let y = 0; y < h; y += grainPixels) {
        ctx.drawImage(gc, x, y, grainPixels, grainPixels);
      }
    }
    ctx.restore();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, mixBlendMode: "screen" }}
    />
  );
}
