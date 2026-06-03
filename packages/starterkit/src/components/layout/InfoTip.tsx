"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FIELD_TOOLTIP_CLASS, formatTooltipText } from "./info-tip-format";

export function InfoTip({ tip }: { tip: string }) {
  const text = formatTooltipText(tip);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="info-tip inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full border border-current/25 bg-transparent p-0 text-[10px] font-bold leading-none opacity-75 transition-opacity hover:opacity-100"
          aria-label={`More information: ${text}`}
        >
          i
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className={FIELD_TOOLTIP_CLASS}>
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
