import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, TrendingUp, Wallet, Receipt, Megaphone } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-range";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, usePeriodMetrics, fmtRub } from "@/hooks/useFinanceData";
import { GlassCard } from "@/components/dashboard/GlassCard";
import { ExpensesManager } from "./ExpensesManager";
import { MarketingManager } from "./MarketingManager";
import { OpiuReport } from "./OpiuReport";
import { DdsReport } from "./DdsReport";
import { FinanceSettingsCard } from "./FinanceSettingsCard";

type Section = "rnp" | "opiu" | "dds" | "expenses" | "marketing";

interface Props {
  onBack: () => void;
}

export function AdvancedAnalytics({ onBack }: Props) {
  const [section, setSection] = useState<Section>("rnp");
  const [range, setRange] = useState<DateRange | undefined>({
    from: startOfMonth(),
    to: endOfMonth(),
  });

  const titleMap: Record<Section, string> = {
    rnp: "РНП — рука на пульсе",
    opiu: "ОПиУ — отчёт о прибылях и убытках",
    dds: "ДДС — движение денежных средств",
    expenses: "Расходы",
    marketing: "Маркетинг",
  };

  const handleBack = () => {
    if (section !== "rnp") setSection("rnp");
    else onBack();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Назад
        </Button>
        <div className="text-sm text-muted-foreground">
          Расширенная аналитика <span className="mx-1">›</span>
          <span className="text-foreground font-medium">{titleMap[section]}</span>
        </div>
      </div>

      {section === "rnp" && (
        <RnpDashboard range={range} setRange={setRange} onOpen={setSection} />
      )}
      {section === "opiu" && <OpiuReport />}
      {section === "dds" && <DdsReport />}
      {section === "expenses" && <ExpensesManager />}
      {section === "marketing" && <MarketingManager />}
    </div>
  );
}

function RnpDashboard({
  range,
  setRange,
  onOpen,
}: {
  range: DateRange | undefined;
  setRange: (r: DateRange | undefined) => void;
  onOpen: (s: Section) => void;
}) {
  const { metrics, loading, settings, reload } = usePeriodMetrics(range?.from, range?.to);

  const cards = useMemo(() => {
    if (!metrics) return [];
    return [
      { label: "Выручка", value: fmtRub(metrics.revenue), accent: "text-primary" },
      { label: "Себестоимость", value: fmtRub(metrics.cogs), accent: "text-muted-foreground" },
      { label: "Валовая прибыль", value: fmtRub(metrics.grossProfit), sub: `${metrics.grossMarginPct.toFixed(1)}% маржа`, accent: "text-emerald-500" },
      { label: "Прибыль за юнит (марж. %)", value: `${metrics.grossMarginPct.toFixed(1)}%`, accent: "text-emerald-500" },
      { label: "Маркетинг", value: fmtRub(metrics.marketing), accent: "text-muted-foreground" },
      { label: "OPEX (операц.)", value: fmtRub(metrics.opex), accent: "text-muted-foreground" },
      { label: `Налоги (${settings?.tax_rate ?? 6}%)`, value: fmtRub(metrics.taxes), accent: "text-orange-500" },
      {
        label: "Чистая прибыль",
        value: fmtRub(metrics.netProfit),
        sub: `${metrics.netMarginPct.toFixed(1)}% рентабельность`,
        accent: metrics.netProfit >= 0 ? "text-emerald-500" : "text-destructive",
      },
    ];
  }, [metrics, settings]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <DatePickerWithRange date={range} onDateChange={setRange} />
        <FinanceSettingsCard onSaved={reload} />
      </div>

      {loading || !metrics ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Загрузка…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {cards.map((c) => (
            <GlassCard key={c.label}>
              <div className="p-4">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className={`text-xl md:text-2xl font-bold mt-1 ${c.accent}`}>{c.value}</div>
                {c.sub && <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <div className="pt-2">
        <div className="text-sm font-semibold mb-2 text-muted-foreground">Доп. отчёты</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ReportTile icon={<TrendingUp />} label="ОПиУ" desc="Помесячная P&L" onClick={() => onOpen("opiu")} />
          <ReportTile icon={<Wallet />} label="ДДС" desc="Денежный поток" onClick={() => onOpen("dds")} />
          <ReportTile icon={<Receipt />} label="Расходы" desc="Ведение расходов" onClick={() => onOpen("expenses")} />
          <ReportTile icon={<Megaphone />} label="Маркетинг" desc="Каналы и ROI" onClick={() => onOpen("marketing")} />
        </div>
      </div>
    </div>
  );
}

function ReportTile({
  icon, label, desc, onClick,
}: { icon: React.ReactNode; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-2 text-primary">
        <div className="w-5 h-5">{icon}</div>
        <div className="font-semibold text-foreground">{label}</div>
      </div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}
