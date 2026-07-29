import { cn } from "@/lib/utils";

type KinaseGroup =
  | "AGC"
  | "CAMK"
  | "CK1"
  | "CMGC"
  | "STE"
  | "TK"
  | "TKL"
  | "Atypical";

interface GroupBadgeProps {
  group: KinaseGroup;
  className?: string;
}

const groupStyles: Record<KinaseGroup, string> = {
  AGC: "bg-kinome-cyan/15 text-kinome-cyan border border-kinome-cyan/20",
  CAMK: "bg-kinome-violet/15 text-kinome-violet border border-kinome-violet/20",
  CK1: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  CMGC: "bg-kinome-emerald/15 text-kinome-emerald border border-kinome-emerald/20",
  STE: "bg-rose-500/15 text-rose-400 border border-rose-500/20",
  TK: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  TKL: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  Atypical: "bg-slate-500/15 text-slate-400 border border-slate-500/20",
};

export default function GroupBadge({ group, className }: GroupBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide",
        groupStyles[group],
        className
      )}
    >
      {group}
    </span>
  );
}

export type { KinaseGroup };
