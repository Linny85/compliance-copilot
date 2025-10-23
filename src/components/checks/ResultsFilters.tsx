import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ControlSelect } from "@/components/controls/ControlSelect";

type Outcome = "pass" | "fail" | "warn";
type RunStatus = "running" | "success" | "failed" | "partial";
type Severity = "low" | "medium" | "high" | "critical";

export interface ResultFilters {
  from?: Date;
  to?: Date;
  severity: Severity[];
  outcome: Outcome[];
  status: RunStatus[];
  control_id?: string;
  q?: string;
}

type Props = {
  filters: ResultFilters;
  onChange: (filters: ResultFilters) => void;
  onReset: () => void;
};

export function ResultsFilters({ filters, onChange, onReset }: Props) {
  const { t } = useTranslation(["checks", "common"]);

  const updateFilter = <K extends keyof ResultFilters>(key: K, value: ResultFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = <K extends keyof Pick<ResultFilters, "severity" | "outcome" | "status">>(
    key: K,
    value: ResultFilters[K] extends Array<infer T> ? T : never
  ) => {
    const current = filters[key] as any[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilter(key, next as any);
  };

  const hasActiveFilters = 
    filters.from || 
    filters.to || 
    filters.severity.length > 0 || 
    filters.outcome.length > 0 || 
    filters.status.length > 0 || 
    filters.control_id || 
    filters.q;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{t("checks:filters.title")}</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-4 w-4 mr-1" />
            {t("checks:filters.reset")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label>{t("checks:filters.dateRange")}</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !filters.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.from ? format(filters.from, "PP") : t("checks:filters.from")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.from}
                  onSelect={(date) => updateFilter("from", date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !filters.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.to ? format(filters.to, "PP") : t("checks:filters.to")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.to}
                  onSelect={(date) => updateFilter("to", date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label>{t("checks:filters.search")}</Label>
          <Input
            placeholder={t("checks:filters.searchPlaceholder")}
            value={filters.q || ""}
            onChange={(e) => updateFilter("q", e.target.value)}
          />
        </div>

        {/* Control */}
        <div className="space-y-2">
          <Label>{t("checks:filters.control")}</Label>
          <ControlSelect
            value={filters.control_id || null}
            onChange={(id) => updateFilter("control_id", id || undefined)}
            placeholder={t("checks:filters.allControls")}
          />
        </div>
      </div>

      {/* Multi-select filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Severity */}
        <div className="space-y-2">
          <Label>{t("checks:filters.severity")}</Label>
          <div className="flex flex-wrap gap-2">
            {(["low", "medium", "high", "critical"] as Severity[]).map((sev) => (
              <Badge
                key={sev}
                variant={filters.severity.includes(sev) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleArrayFilter("severity", sev)}
              >
                {t(`common:severity.${sev}`)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Outcome */}
        <div className="space-y-2">
          <Label>{t("checks:filters.outcome")}</Label>
          <div className="flex flex-wrap gap-2">
            {(["pass", "fail", "warn"] as Outcome[]).map((out) => (
              <Badge
                key={out}
                variant={filters.outcome.includes(out) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleArrayFilter("outcome", out)}
              >
                {t(`checks:outcome.${out}`)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>{t("checks:filters.status")}</Label>
          <div className="flex flex-wrap gap-2">
            {(["running", "success", "failed", "partial"] as RunStatus[]).map((stat) => (
              <Badge
                key={stat}
                variant={filters.status.includes(stat) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleArrayFilter("status", stat)}
              >
                {t(`checks:status.${stat}`)}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
