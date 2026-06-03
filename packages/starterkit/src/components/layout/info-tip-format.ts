import { cn } from "@/lib/utils";

/** Shared tooltip panel class for TargetLock field UI (InfoTip + field tooltips). */
export const FIELD_TOOLTIP_CLASS = cn(
  "targetlock-tooltip",
  "z-[200] max-w-[17rem] rounded-md border border-[rgba(255,255,255,0.12)]",
  "bg-[#1a2433] px-3 py-2 text-[13px] font-normal leading-[1.45] tracking-normal",
  "text-[#f0f5fa] normal-case shadow-lg",
  "animate-in fade-in-0 zoom-in-95",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
  "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
);

/** Normalize help text: sentence case lead-in and consistent closing punctuation. */
export function formatTooltipText(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  const lead = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (/[.!?…]$/.test(lead)) return lead;
  return `${lead}.`;
}
