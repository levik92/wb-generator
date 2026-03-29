import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, FileDown, Building2 } from "lucide-react";
import type { PaymentPackage } from "@/hooks/usePaymentPackages";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";

interface OrgData {
  name: string;
  inn: string;
  kpp: string;
  ogrn: string;
  legal_address: string;
  director_name: string;
}

interface InvoiceFormProps {
  selectedPackage: PaymentPackage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InvoiceForm({ selectedPackage, open, onOpenChange }: InvoiceFormProps) {
  const [orgData, setOrgData] = useState<OrgData>({
    name: "", inn: "", kpp: "", ogrn: "", legal_address: "", director_name: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreateInvoice = async () => {
    if (!orgData.name || !orgData.inn) {
      toast({ title: "Ошибка", description: "Заполните название и ИНН организации", variant: "destructive" });
      return;
    }
    if (!agreedToTerms) {
      toast({ title: "Ошибка", description: "Необходимо согласиться с публичной офертой", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: orgRecord, error: orgError } = await supabase
        .from('organization_details')
        .upsert({
          user_id: session.user.id,
          inn: orgData.inn,
          name: orgData.name,
          kpp: orgData.kpp || null,
          ogrn: orgData.ogrn || null,
          legal_address: orgData.legal_address || null,
          director_name: orgData.director_name || null,
          bank_name: bankName || null,
          bik: bik || null,
          checking_account: checkingAccount || null,
          correspondent_account: corrAccount || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (orgError) throw orgError;

      const { data: seqData, error: seqError } = await (supabase.rpc as any)('nextval_invoice_number');
      let invoiceNum = '1001';
      if (!seqError && seqData) {
        invoiceNum = String(seqData);
      } else {
        invoiceNum = `${Date.now().toString().slice(-6)}`;
      }

      const invoiceNumber = `WBG-${invoiceNum}`;
      const paymentPurpose = `Оплата за пополнение тарифа "${selectedPackage.name}" в сервисе WBGen. Без НДС.`;

      const { error: invError } = await supabase
        .from('invoice_payments')
        .insert({
          user_id: session.user.id,
          organization_id: orgRecord.id,
          package_id: selectedPackage.id,
          package_name: selectedPackage.name,
          amount: selectedPackage.price,
          tokens_amount: selectedPackage.tokens,
          invoice_number: invoiceNumber,
          payment_purpose: paymentPurpose,
          status: 'invoice_issued',
        });

      if (invError) throw invError;

      toast({ title: "Счёт сформирован", description: `Счёт ${invoiceNumber} создан` });
      onOpenChange(false);

      // Open invoice in new tab
      window.open(`/invoice/${invoiceNumber}`, '_blank');
    } catch (error) {
      console.error("Create invoice error:", error);
      toast({ title: "Ошибка", description: "Не удалось создать счёт", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="!max-w-[calc(100vw-2rem)] sm:!max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Счёт для юр. лица
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {selectedPackage.name} — {selectedPackage.price}₽ ({selectedPackage.tokens} токенов)
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          {/* INN Lookup */}
          <div className="space-y-2">
            <Label>ИНН организации</Label>
            <div className="flex gap-2">
              <Input
                value={inn}
                onChange={e => setInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="10 или 12 цифр"
                maxLength={12}
                className="min-w-0"
              />
              <Button onClick={handleInnLookup} disabled={lookingUp} size="sm" className="shrink-0 gap-1.5">
                {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Найти
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Данные организации будут заполнены автоматически</p>
          </div>

          {orgFound !== null && (
            <>
              {orgFound === false && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs text-destructive">Не удалось найти организацию. Заполните данные вручную.</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs">Название организации *</Label>
                  <Input value={orgData.name} onChange={e => setOrgData(prev => ({ ...prev, name: e.target.value }))} placeholder="ООО «Название»" className="min-w-0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ИНН *</Label>
                  <Input value={orgData.inn} onChange={e => setOrgData(prev => ({ ...prev, inn: e.target.value }))} className="min-w-0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">КПП</Label>
                  <Input value={orgData.kpp} onChange={e => setOrgData(prev => ({ ...prev, kpp: e.target.value }))} className="min-w-0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ОГРН</Label>
                  <Input value={orgData.ogrn} onChange={e => setOrgData(prev => ({ ...prev, ogrn: e.target.value }))} className="min-w-0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Руководитель</Label>
                  <Input value={orgData.director_name} onChange={e => setOrgData(prev => ({ ...prev, director_name: e.target.value }))} className="min-w-0" />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs">Юридический адрес</Label>
                  <Input value={orgData.legal_address} onChange={e => setOrgData(prev => ({ ...prev, legal_address: e.target.value }))} className="min-w-0" />
                </div>
              </div>

              {/* Bank details */}
              <div className="pt-2 border-t space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground">Банковские реквизиты</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Банк</Label>
                    <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Название банка" className="min-w-0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">БИК</Label>
                    <Input value={bik} onChange={e => setBik(e.target.value)} className="min-w-0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Р/с</Label>
                    <Input value={checkingAccount} onChange={e => setCheckingAccount(e.target.value)} className="min-w-0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">К/с</Label>
                    <Input value={corrAccount} onChange={e => setCorrAccount(e.target.value)} className="min-w-0" />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox id="invoice-terms" checked={agreedToTerms} onCheckedChange={c => setAgreedToTerms(c === true)} />
                <label htmlFor="invoice-terms" className="text-xs leading-relaxed cursor-pointer">
                  Я согласен с условиями{" "}
                  <a href="/terms" target="_blank" className="text-primary underline">публичной оферты</a>
                </label>
              </div>
            </>
          )}
        </div>

        {orgFound !== null && (
          <ResponsiveDialogFooter>
            <Button
              onClick={handleCreateInvoice}
              disabled={creating || !orgData.name || !orgData.inn || !agreedToTerms}
              className="w-full gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Сформировать счёт
            </Button>
          </ResponsiveDialogFooter>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
