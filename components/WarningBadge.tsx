"use client";

import { Badge } from "@/components/ui/badge";
import type { WarningRecord } from "@/lib/types";

interface Props {
  warning: WarningRecord;
  isTriggered: boolean;
}

const TYPE_CONFIG = {
  ERROR:   { border: "border-l-red-500",   badge: "destructive" as const,  dot: "bg-red-500"   },
  WARNING: { border: "border-l-amber-400", badge: "secondary"  as const,  dot: "bg-amber-400" },
  INFO:    { border: "border-l-blue-400",  badge: "outline"    as const,  dot: "bg-blue-400"  },
};

export default function WarningBadge({ warning, isTriggered }: Props) {
  const cfg = TYPE_CONFIG[warning.type] ?? TYPE_CONFIG.INFO;

  return (
    <div
      className={`
        border-l-2 pl-3 py-2 rounded-sm bg-gray-800/50
        ${cfg.border}
        ${!isTriggered ? "opacity-35" : ""}
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        <Badge variant={cfg.badge} className="text-[10px] px-1.5 py-0 h-4">
          {warning.type}
        </Badge>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
          {warning.category}
        </span>
        {!isTriggered && (
          <span className="text-[10px] text-gray-600 ml-auto">not triggered</span>
        )}
      </div>

      <p className="text-xs text-gray-300 leading-relaxed">{warning.clarification}</p>

      {(warning.costMin || warning.costMax) && isTriggered && (
        <p className="text-[10px] text-amber-400/80 mt-1">
          {warning.costType ? `${warning.costType}: ` : ""}
          {warning.costMin && warning.costMax
            ? `${warning.costCurrency} ${warning.costMin.toLocaleString()}–${warning.costMax.toLocaleString()}`
            : warning.costMin
            ? `from ${warning.costCurrency} ${warning.costMin.toLocaleString()}`
            : `up to ${warning.costCurrency} ${warning.costMax!.toLocaleString()}`}
        </p>
      )}

      {warning.leadTimeDays > 0 && isTriggered && (
        <p className="text-[10px] text-gray-500 mt-0.5">
          Lead time: {warning.leadTimeDays} day{warning.leadTimeDays !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
