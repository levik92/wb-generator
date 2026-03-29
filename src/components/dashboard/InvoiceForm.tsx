import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, ArrowLeft, FileDown, Building2 } from "lucide-react";
import type { PaymentPackage } from "@/hooks/usePaymentPackages";
import { InvoicePreview } from "./InvoicePreview";

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
  onBack: () => void;
}

export default function InvoiceForm({ selectedPackage, onBack }: InvoiceFormProps) {
  const [inn, setInn] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [orgData, setOrgData] = useState<OrgData>({
    name: "", inn: "", kpp: "", ogrn: "", legal_address: "", director_name: "",
  });
  const [orgFound, setOrgFound] = useState<boolean | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<{
    invoiceNumber: string;
    invoiceDate: string;
    orgData: OrgData;
    packageName: string;
    amount: number;
    tokens: number;
  } | null>(null);

  // Bank details for buyer
  const [bankName, setBankName] = useState("");
  const [bik, setBik] = useState("");
  const [checkingAccount, setCheckingAccount] = useState("");
  const [corrAccount, setCorrAccount] = useState("");

  const handleInnLookup = async () => {
    if (!inn || !/^\d{10,12}$/.test(inn.trim())) {
      toast({ title: "Ошибка", description: "Введите корректный ИНН (10 или 12 цифр)", variant: "destructive" });
      return;
    }

    setLookingUp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('lookup-inn', {
        body: { inn: inn.trim() },
      });

      if (error || data?.error === 'not_found') {
        setOrgFound(false);
        setOrgData(prev => ({ ...prev, inn: inn.trim() }));
        toast({ title: "Не удалось найти", description: "Введите данные организации вручную" });
      } else {
        setOrgFound(true);
        setOrgData({
          name: data.name || "",
          inn: data.inn || inn.trim(),
          kpp: data.kpp || "",
          ogrn: data.ogrn || "",
          legal_address: data.legal_address || "",
          director_name: data.director_name || "",
        });
        toast({ title: "Организация найдена", description: data.name });
      }
    } catch (error) {
      console.error("INN lookup error:", error);
      setOrgFound(false);
      setOrgData(prev => ({ ...prev, inn: inn.trim() }));
      toast({ title: "Не удалось найти", description: "Введите данные вручную" });
    } finally {
      setLookingUp(false);
    }
  };

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

      // Save org details
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

      // Get next invoice number
      const { data: seqData, error: seqError } = await supabase.rpc('nextval_invoice_number');
      let invoiceNum = '1001';
      if (!seqError && seqData) {
        invoiceNum = String(seqData);
      } else {
        // Fallback: use timestamp-based number
        invoiceNum = `WB-${Date.now().toString().slice(-6)}`;
      }

      const invoiceNumber = `WB-${invoiceNum}`;
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

      setCreatedInvoice({
        invoiceNumber,
        invoiceDate: new Date().toISOString(),
        orgData,
        packageName: selectedPackage.name,
        amount: selectedPackage.price,
        tokens: selectedPackage.tokens,
      });

      toast({ title: "Счёт сформирован", description: `Счёт ${invoiceNumber} создан` });
    } catch (error) {
      console.error("Create invoice error:", error);
      toast({ title: "Ошибка", description: "Не удалось создать счёт", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (createdInvoice) {
    return (
      <InvoicePreview
        invoiceNumber={createdInvoice.invoiceNumber}
        invoiceDate={createdInvoice.invoiceDate}
        buyerOrg={createdInvoice.orgData}
        buyerBank={{ bankName, bik, checkingAccount, corrAccount }}
        packageName={createdInvoice.packageName}
        amount={createdInvoice.amount}
        tokens={createdInvoice.tokens}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
        <ArrowLeft className="w-4 h-4" /> Назад к тарифам
      </Button>

      <Card className="border-border/50 rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary" />
            <div>
              <CardTitle>Выставление счёта для юр. лица</CardTitle>
              <CardDescription>Тариф: {selectedPackage.name} — {selectedPackage.price}₽ ({selectedPackage.tokens} токенов)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* INN Lookup */}
          <div className="space-y-2">
            <Label>ИНН организации</Label>
            <div className="flex gap-2">
              <Input
                value={inn}
                onChange={e => setInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="Введите ИНН (10 или 12 цифр)"
                maxLength={12}
              />
              <Button onClick={handleInnLookup} disabled={lookingUp} className="shrink-0 gap-2">
                {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Найти
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Данные организации будут определены автоматически по ИНН</p>
          </div>

          {orgFound !== null && (
            <>
              {orgFound === false && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">Не удалось найти организацию. Заполните данные вручную.</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Название организации *</Label>
                  <Input value={orgData.name} onChange={e => setOrgData(prev => ({ ...prev, name: e.target.value }))} placeholder="ООО «Название»" />
                </div>
                <div className="space-y-2">
                  <Label>ИНН *</Label>
                  <Input value={orgData.inn} onChange={e => setOrgData(prev => ({ ...prev, inn: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>КПП</Label>
                  <Input value={orgData.kpp} onChange={e => setOrgData(prev => ({ ...prev, kpp: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>ОГРН</Label>
                  <Input value={orgData.ogrn} onChange={e => setOrgData(prev => ({ ...prev, ogrn: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Руководитель</Label>
                  <Input value={orgData.director_name} onChange={e => setOrgData(prev => ({ ...prev, director_name: e.target.value }))} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Юридический адрес</Label>
                  <Input value={orgData.legal_address} onChange={e => setOrgData(prev => ({ ...prev, legal_address: e.target.value }))} />
                </div>
              </div>

              {/* Bank details */}
              <div className="pt-2 border-t">
                <h4 className="text-sm font-medium mb-3">Банковские реквизиты покупателя</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Банк</Label>
                    <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Название банка" />
                  </div>
                  <div className="space-y-2">
                    <Label>БИК</Label>
                    <Input value={bik} onChange={e => setBik(e.target.value)} placeholder="БИК" />
                  </div>
                  <div className="space-y-2">
                    <Label>Р/с</Label>
                    <Input value={checkingAccount} onChange={e => setCheckingAccount(e.target.value)} placeholder="Расчётный счёт" />
                  </div>
                  <div className="space-y-2">
                    <Label>К/с</Label>
                    <Input value={corrAccount} onChange={e => setCorrAccount(e.target.value)} placeholder="Корр. счёт" />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={c => setAgreedToTerms(c === true)} />
                <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  Я согласен с условиями{" "}
                  <a href="/terms" target="_blank" className="text-primary underline">публичной оферты</a>
                </label>
              </div>

              <Button
                onClick={handleCreateInvoice}
                disabled={creating || !orgData.name || !orgData.inn || !agreedToTerms}
                className="w-full gap-2"
                size="lg"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Сформировать счёт
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
