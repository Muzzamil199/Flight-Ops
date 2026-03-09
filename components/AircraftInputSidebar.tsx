"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import FilterControls from "./FilterControls";
import {
  AIRCRAFT_PRESETS,
  type AircraftInputs,
  type FlightContext,
  type ActiveWarningFilters,
} from "@/lib/types";

interface Props {
  departureIcao: string;
  onDepartureIcaoChange: (v: string) => void;
  aircraftPreset: string;
  onPresetChange: (preset: string) => void;
  inputs: AircraftInputs;
  onInputsChange: (inputs: AircraftInputs) => void;
  flightContext: FlightContext;
  onFlightContextChange: (ctx: FlightContext) => void;
  rangeNm: number;
  filters: ActiveWarningFilters;
  onFiltersChange: (f: ActiveWarningFilters) => void;
  onFindStops: () => void;
  isEvaluating: boolean;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{children}</span>
  );
}

export default function AircraftInputSidebar({
  departureIcao,
  onDepartureIcaoChange,
  aircraftPreset,
  onPresetChange,
  inputs,
  onInputsChange,
  flightContext,
  onFlightContextChange,
  rangeNm,
  filters,
  onFiltersChange,
  onFindStops,
  isEvaluating,
}: Props) {
  function setField(field: keyof AircraftInputs, value: number) {
    onInputsChange({ ...inputs, [field]: value });
  }

  return (
    <aside className="w-72 h-screen bg-gray-900/95 border-r border-gray-800 flex flex-col overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white tracking-tight">Flight Ops</h1>
        <p className="text-xs text-gray-400 mt-0.5">Business Aviation Intelligence</p>
      </div>

      <div className="px-4 py-3 space-y-4 flex-1">
        {/* Departure Airport */}
        <div className="space-y-1">
          <FieldLabel>Departure Airport</FieldLabel>
          <Input
            value={departureIcao}
            onChange={(e) => onDepartureIcaoChange(e.target.value.toUpperCase())}
            placeholder="ICAO e.g. KTEB"
            maxLength={4}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 h-8 text-sm uppercase"
          />
        </div>

        <Separator className="bg-gray-800" />

        {/* Aircraft Preset */}
        <div className="space-y-1">
          <FieldLabel>Aircraft Type</FieldLabel>
          <Select
            value={aircraftPreset}
            onValueChange={(val: string | null) => {
              if (!val) return;
              onPresetChange(val);
              const preset = AIRCRAFT_PRESETS[val];
              if (preset && val !== "custom") {
                onInputsChange({
                  ...inputs,
                  burnRateLbsPerHr: preset.burnRateLbsPerHr,
                  cruiseSpeedKts: preset.cruiseSpeedKts,
                  fuelLbs: preset.fuelCapLbs,
                });
              }
            }}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-8 text-sm">
              <SelectValue placeholder="Select aircraft" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {Object.entries(AIRCRAFT_PRESETS).map(([key, p]) => (
                <SelectItem key={key} value={key} className="text-white hover:bg-gray-700">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Performance Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <FieldLabel>Fuel (lbs)</FieldLabel>
            <Input
              type="number"
              value={inputs.fuelLbs || ""}
              onChange={(e) => setField("fuelLbs", Number(e.target.value))}
              className="bg-gray-800 border-gray-700 text-white h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Burn (lbs/hr)</FieldLabel>
            <Input
              type="number"
              value={inputs.burnRateLbsPerHr || ""}
              onChange={(e) => setField("burnRateLbsPerHr", Number(e.target.value))}
              className="bg-gray-800 border-gray-700 text-white h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Speed (kts TAS)</FieldLabel>
            <Input
              type="number"
              value={inputs.cruiseSpeedKts || ""}
              onChange={(e) => setField("cruiseSpeedKts", Number(e.target.value))}
              className="bg-gray-800 border-gray-700 text-white h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Wind (kts HW+)</FieldLabel>
            <Input
              type="number"
              value={inputs.windKts}
              onChange={(e) => setField("windKts", Number(e.target.value))}
              className="bg-gray-800 border-gray-700 text-white h-8 text-sm"
            />
          </div>
        </div>

        {/* Range Display */}
        <div className="bg-gray-800/60 rounded px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Est. Range</span>
          <span className="text-lg font-bold text-teal-400">
            {rangeNm > 0 ? `${rangeNm.toLocaleString()} NM` : "—"}
          </span>
        </div>
        <p className="text-[10px] text-gray-600 -mt-2">No reserve applied — maximum theoretical range</p>

        <Separator className="bg-gray-800" />

        {/* Flight Context */}
        <div className="space-y-2">
          <FieldLabel>Flight Settings</FieldLabel>

          <div className="space-y-1">
            <Label className="text-[10px] text-gray-600">Type</Label>
            <Select
              value={flightContext.flightType}
              onValueChange={(v: string | null) =>
                v && onFlightContextChange({ ...flightContext, flightType: v as "REVENUE" | "NON_REVENUE" })
              }
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="NON_REVENUE" className="text-white hover:bg-gray-700 text-xs">Non-Revenue</SelectItem>
                <SelectItem value="REVENUE" className="text-white hover:bg-gray-700 text-xs">Revenue Charter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-gray-600">Category</Label>
            <Select
              value={flightContext.flightCategory}
              onValueChange={(v: string | null) =>
                v && onFlightContextChange({ ...flightContext, flightCategory: v as "INTERNATIONAL" | "DOMESTIC" })
              }
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="DOMESTIC" className="text-white hover:bg-gray-700 text-xs">Domestic</SelectItem>
                <SelectItem value="INTERNATIONAL" className="text-white hover:bg-gray-700 text-xs">International</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-gray-600">Fuel Card</Label>
            <Select
              value={flightContext.fuelCard}
              onValueChange={(v: string | null) =>
                v && onFlightContextChange({ ...flightContext, fuelCard: v as "EVEREST" | "AEG" | "WORLD_FUEL" | "NONE" })
              }
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="NONE" className="text-white hover:bg-gray-700 text-xs">No Card</SelectItem>
                <SelectItem value="EVEREST" className="text-white hover:bg-gray-700 text-xs">Everest (10% off)</SelectItem>
                <SelectItem value="AEG" className="text-white hover:bg-gray-700 text-xs">AEG (7% off)</SelectItem>
                <SelectItem value="WORLD_FUEL" className="text-white hover:bg-gray-700 text-xs">World Fuel (5% off)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-gray-600">Departure Time (UTC)</Label>
            <Input
              type="datetime-local"
              value={flightContext.departureTimeUtc.slice(0, 16)}
              onChange={(e) =>
                onFlightContextChange({
                  ...flightContext,
                  departureTimeUtc: new Date(e.target.value).toISOString(),
                })
              }
              className="bg-gray-800 border-gray-700 text-white h-8 text-xs"
            />
          </div>
        </div>

        {/* Find Stops Button */}
        <Button
          onClick={onFindStops}
          disabled={!departureIcao || departureIcao.length < 3 || rangeNm === 0 || isEvaluating}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium"
        >
          {isEvaluating ? "Evaluating..." : "Find Stops"}
        </Button>

        <Separator className="bg-gray-800" />

        {/* Filter Controls */}
        <div>
          <FieldLabel>Warning Filters</FieldLabel>
          <div className="mt-2">
            <FilterControls filters={filters} onChange={onFiltersChange} />
          </div>
        </div>
      </div>
    </aside>
  );
}
