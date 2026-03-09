"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ActiveWarningFilters } from "@/lib/types";

interface Props {
  filters: ActiveWarningFilters;
  onChange: (filters: ActiveWarningFilters) => void;
}

const WARNING_TYPES = ["ERROR", "WARNING", "INFO"] as const;
const WARNING_CATEGORIES = [
  "CURFEW", "NOISE", "PERMIT", "SLOTS", "PARKING",
  "HANDLING", "SECURITY", "CUSTOMS", "COST", "PPR", "OPERATIONAL",
] as const;

function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export default function FilterControls({ filters, onChange }: Props) {
  return (
    <div className="space-y-3">
      {/* Types */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Warning Type</p>
        <div className="flex gap-3">
          {WARNING_TYPES.map((type) => {
            const checked = filters.types.length === 0 || filters.types.includes(type);
            return (
              <div key={type} className="flex items-center gap-1.5">
                <Checkbox
                  id={`type-${type}`}
                  checked={checked}
                  onCheckedChange={() =>
                    onChange({ ...filters, types: toggle(filters.types, type) })
                  }
                  className="h-3 w-3 border-gray-600"
                />
                <Label
                  htmlFor={`type-${type}`}
                  className={`text-[10px] cursor-pointer ${
                    type === "ERROR"
                      ? "text-red-400"
                      : type === "WARNING"
                      ? "text-amber-400"
                      : "text-blue-400"
                  }`}
                >
                  {type}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Category</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {WARNING_CATEGORIES.map((cat) => {
            const checked = filters.categories.length === 0 || filters.categories.includes(cat);
            return (
              <div key={cat} className="flex items-center gap-1">
                <Checkbox
                  id={`cat-${cat}`}
                  checked={checked}
                  onCheckedChange={() =>
                    onChange({ ...filters, categories: toggle(filters.categories, cat) })
                  }
                  className="h-3 w-3 border-gray-600"
                />
                <Label
                  htmlFor={`cat-${cat}`}
                  className="text-[10px] text-gray-400 cursor-pointer"
                >
                  {cat}
                </Label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
