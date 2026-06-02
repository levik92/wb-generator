import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

type Mode = "month" | "year" | "all";

interface Props {
  date: DateRange | undefined;
  onDateChange: (r: DateRange | undefined) => void;
  defaultMode?: Mode;
}

export function PeriodSelector({ onDateChange, defaultMode = "month" }: Props) {
  const now = new Date();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth());

  const firstYear = 2024;
  const years: number[] = [];
  for (let y = now.getFullYear() + 1; y >= firstYear; y--) years.push(y);

  const apply = (m: Mode, y: number, mo: number) => {
    if (m === "all") {
      onDateChange({
        from: new Date(2020, 0, 1),
        to: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      });
    } else if (m === "year") {
      onDateChange({
        from: new Date(y, 0, 1),
        to: new Date(y, 11, 31, 23, 59, 59),
      });
    } else {
      onDateChange({
        from: new Date(y, mo, 1),
        to: new Date(y, mo + 1, 0, 23, 59, 59),
      });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex rounded-lg border border-border/60 bg-card p-0.5">
        {(["month", "year", "all"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); apply(m, year, month); }}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "month" ? "Месяц" : m === "year" ? "Год" : "Всё время"}
          </button>
        ))}
      </div>

      {mode === "month" && (
        <Select
          value={String(month)}
          onValueChange={(v) => { const mo = Number(v); setMonth(mo); apply(mode, year, mo); }}
        >
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((nm, i) => (
              <SelectItem key={i} value={String(i)}>{nm}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {mode !== "all" && (
        <Select
          value={String(year)}
          onValueChange={(v) => { const y = Number(v); setYear(y); apply(mode, y, month); }}
        >
          <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
