"use client";

import Link from "next/link";
import GlassCard from "./GlassCard";
import GroupBadge, { type KinaseGroup } from "./GroupBadge";
import PDISBadge from "./PDISBadge";

interface Kinase {
  gene_symbol: string;
  full_name: string;
  classification: string;
  pdis_score: number | null;
  organ_systems_impacted: string[];
  diseases_associated: string[];
}

interface KinaseCardProps {
  kinase: Kinase;
}

export default function KinaseCard({ kinase }: KinaseCardProps) {
  const topOrgans = kinase.organ_systems_impacted?.slice(0, 3) ?? [];

  return (
    <Link href={`/kinases/${kinase.gene_symbol}`} className="block">
      <GlassCard hoverable glowColor="cyan" className="h-full">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-white tracking-tight truncate">
                {kinase.gene_symbol}
              </h3>
              <GroupBadge group={kinase.classification as KinaseGroup} />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-3 line-clamp-2">
              {kinase.full_name}
            </p>
            <div className="space-y-1.5">
              {topOrgans.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {topOrgans.map((organ) => (
                    <span
                      key={organ}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-slate-300 border border-white/5"
                    >
                      {organ}
                    </span>
                  ))}
                  {kinase.organ_systems_impacted.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-slate-500 border border-white/5">
                      +{kinase.organ_systems_impacted.length - 3}
                    </span>
                  )}
                </div>
              )}
              {kinase.diseases_associated.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {kinase.diseases_associated.slice(0, 3).map((disease) => (
                    <span
                      key={disease}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/10"
                    >
                      {disease}
                    </span>
                  ))}
                  {kinase.diseases_associated.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-slate-500 border border-white/5">
                      +{kinase.diseases_associated.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <PDISBadge score={kinase.pdis_score} size="md" />
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
