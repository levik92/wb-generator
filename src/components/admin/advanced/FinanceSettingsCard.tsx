import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings, FinanceSettings } from "@/hooks/useFinanceData";
import { toast } from "@/hooks/use-toast";

export function FinanceSettingsCard({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<FinanceSettings | null>(null);
  const [taxRate, setTaxRate] = useState("6");
  const [paymentFeeRate, setPaymentFeeRate] = useState("3");
  const [startingCash, setStartingCash] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchSettings().then((r) => {
      setS(r);
      if (r) {
        setTaxRate(String(r.tax_rate));
        setPaymentFeeRate(String(r.payment_fee_rate ?? 3));
        setStartingCash(String(r.starting_cash));
      }
    });
  }, [open]);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase
      .from("finance_settings")
      .update({
        tax_rate: Number(taxRate) || 0,
        payment_fee_rate: Number(paymentFeeRate) || 0,
        starting_cash: Number(startingCash) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    setSaving(false);
    if (error) {
      toast({ title: "Ошибка", description: "Не удалось сохранить настройки", variant: "destructive" });
      return;
    }
    toast({ title: "Сохранено" });
    setOpen(false);
    onSaved?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SettingsIcon className="w-4 h-4" /> <span className="hidden sm:inline">Фин. настройки</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3">
        <div>
          <Label className="text-xs">Комиссия платёжных систем, % от выручки</Label>
          <Input type="number" step="0.01" value={paymentFeeRate} onChange={(e) => setPaymentFeeRate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Налог, % от выручки после комиссии</Label>
          <Input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Стартовый остаток (для ДДС), ₽</Label>
          <Input type="number" step="0.01" value={startingCash} onChange={(e) => setStartingCash(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving || !s} className="w-full">
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
