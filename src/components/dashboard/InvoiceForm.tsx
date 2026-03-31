import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileDown, Building2, Search } from "lucide-react";
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
  const [lookingUp, setLookingUp] = useState(false);

  const [bankName, setBankName] = useState("");
  const [bik, setBik] = useState("");
  const [checkingAccount, setCheckingAccount] = useState("");
  const [corrAccount, setCorrAccount] = useState("");

  const lookupByInn = useCallback(async (inn: string) => {
    if (!/^\d{10}$|^\d{12}$/.test(inn)) return;
    setLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("lookup-counterparty", {
        body: { inn },
      });
      if (error || !data?.found) return;

      // Fill only empty fields
      setOrgData(prev => ({
        ...prev,
        name: prev.name || data.name || "",
        kpp: prev.kpp || data.kpp || "",
        legal_address: prev.legal_address || data.legalAddress || "",
      }));
      if (!bankName && data.bankName) setBankName(data.bankName);
      if (!bik && data.bik) setBik(data.bik);
      if (!checkingAccount && data.checkingAccount) setCheckingAccount(data.checkingAccount);
      if (!corrAccount && data.corrAccount) setCorrAccount(data.corrAccount);

      toast({ title: "Данные найдены", description: "Реквизиты заполнены автоматически" });
    } catch (e) {
      console.error("INN lookup error:", e);
    } finally {
      setLookingUp(false);
    }
  }, [bankName, bik, checkingAccount, corrAccount]);

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
      const { data, error } = await supabase.functions.invoke("create-tochka-invoice", {
        body: {
          orgData,
          bankDetails: { bankName, bik, checkingAccount, corrAccount },
          packageId: selectedPackage.id,
          packageName: selectedPackage.name,
          packagePrice: selectedPackage.price,
          packageTokens: selectedPackage.tokens,
        },
      });

      if (error) throw error;

      if (data?.tochkaError) {
        toast({ title: "Счёт создан", description: data.message || "Счёт создан, но возникла ошибка при отправке в банк" });
      } else {
        toast({ title: "Счёт сформирован", description: `Счёт ${data.invoiceNumber} создан` });
      }

      onOpenChange(false);
      window.open(`/invoice/${data.invoiceNumber}`, '_blank');
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">ИНН *</Label>
              <div className="flex gap-2">
                <Input
                  value={orgData.inn}
                  onChange={e => setOrgData(prev => ({ ...prev, inn: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                  onBlur={e => lookupByInn(e.target.value)}
                  placeholder="10 или 12 цифр"
                  maxLength={12}
                  className="min-w-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={lookingUp || !/^\d{10}$|^\d{12}$/.test(orgData.inn)}
                  onClick={() => lookupByInn(orgData.inn)}
                  title="Найти по ИНН"
                >
                  {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Название организации *</Label>
              <Input value={orgData.name} onChange={e => setOrgData(prev => ({ ...prev, name: e.target.value }))} placeholder="ООО «Название»" className="min-w-0" />
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
        </div>

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
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
