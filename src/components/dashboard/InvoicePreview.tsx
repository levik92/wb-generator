import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface InvoicePreviewProps {
  invoiceNumber: string;
  invoiceDate: string;
  buyerOrg: {
    name: string;
    inn: string;
    kpp: string;
    ogrn: string;
    legal_address: string;
    director_name: string;
  };
  buyerBank: {
    bankName: string;
    bik: string;
    checkingAccount: string;
    corrAccount: string;
  };
  packageName: string;
  amount: number;
  tokens: number;
  onBack: () => void;
}

// Our company details
const SELLER = {
  name: 'ООО «АЛЬТАИР»',
  inn: '9724238597',
  kpp: '772401001',
  bank: 'ООО "Банк Точка"',
  rs: '40702810120000295325',
  bik: '044525104',
  ks: '30101810745374525104',
};

export function InvoicePreview({ invoiceNumber, invoiceDate, buyerOrg, buyerBank, packageName, amount, tokens, onBack }: InvoicePreviewProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);

  const formattedDate = new Date(invoiceDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const paymentPurpose = `Оплата за пополнение тарифа "${packageName}" в сервисе WBGen. Без НДС.`;

  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const w = 210;
    let y = 15;
    const ml = 15;
    const mr = w - 15;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Bank header
    doc.setDrawColor(0);
    doc.rect(ml, y, mr - ml, 30);
    doc.line(ml + 90, y, ml + 90, y + 30);
    doc.line(ml, y + 15, mr, y + 15);

    doc.text(`${SELLER.bank}`, ml + 2, y + 5);
    doc.setFontSize(7);
    doc.text('Банк получателя', ml + 2, y + 14);

    doc.setFontSize(9);
    doc.text(`БИК ${SELLER.bik}`, ml + 92, y + 5);
    doc.text(`К/с ${SELLER.ks}`, ml + 92, y + 11);

    doc.text(`ИНН ${SELLER.inn}  КПП ${SELLER.kpp}`, ml + 2, y + 21);
    doc.text(`Р/с ${SELLER.rs}`, ml + 92, y + 21);

    doc.setFontSize(7);
    doc.text('Получатель', ml + 2, y + 29);
    doc.setFontSize(9);
    doc.text(SELLER.name, ml + 25, y + 29);

    y += 38;

    // Invoice title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Счёт на оплату ${invoiceNumber}`, ml, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`от ${formattedDate}`, ml, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(ml, y, mr, y);
    y += 8;

    // Seller / Buyer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Поставщик:', ml, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${SELLER.name}, ИНН ${SELLER.inn}, КПП ${SELLER.kpp}`, ml + 28, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Покупатель:', ml, y);
    doc.setFont('helvetica', 'normal');
    const buyerLine = `${buyerOrg.name}, ИНН ${buyerOrg.inn}${buyerOrg.kpp ? `, КПП ${buyerOrg.kpp}` : ''}${buyerOrg.legal_address ? `, ${buyerOrg.legal_address}` : ''}`;
    doc.text(buyerLine, ml + 28, y, { maxWidth: mr - ml - 30 });
    y += 12;

    // Table
    const colX = [ml, ml + 10, ml + 90, ml + 108, ml + 128, ml + 155];
    doc.setFillColor(240, 240, 240);
    doc.rect(ml, y, mr - ml, 8, 'F');
    doc.rect(ml, y, mr - ml, 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('№', colX[0] + 2, y + 5.5);
    doc.text('Наименование', colX[1] + 2, y + 5.5);
    doc.text('Кол-во', colX[2] + 2, y + 5.5);
    doc.text('Ед.', colX[3] + 2, y + 5.5);
    doc.text('Цена', colX[4] + 2, y + 5.5);
    doc.text('Сумма', colX[5] + 2, y + 5.5);

    // Draw vertical lines for header
    colX.forEach(x => doc.line(x, y, x, y + 8));
    doc.line(mr, y, mr, y + 8);

    y += 8;

    // Row
    const rowH = 8;
    doc.rect(ml, y, mr - ml, rowH);
    colX.forEach(x => doc.line(x, y, x, y + rowH));
    doc.line(mr, y, mr, y + rowH);

    doc.setFont('helvetica', 'normal');
    doc.text('1', colX[0] + 3, y + 5.5);
    doc.text(`Пополнение тарифа "${packageName}" (${tokens} токенов)`, colX[1] + 2, y + 5.5, { maxWidth: 78 });
    doc.text('1', colX[2] + 4, y + 5.5);
    doc.text('шт.', colX[3] + 2, y + 5.5);
    doc.text(`${amount.toFixed(2)}`, colX[4] + 2, y + 5.5);
    doc.text(`${amount.toFixed(2)}`, colX[5] + 2, y + 5.5);

    y += rowH + 5;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Итого: ${amount.toFixed(2)} руб.`, mr, y, { align: 'right' });
    y += 6;
    doc.text(`Без налога (НДС)`, mr, y, { align: 'right' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Всего наименований 1, на сумму ${amount.toFixed(2)} руб.`, ml, y);
    y += 10;

    // Purpose
    doc.setFont('helvetica', 'bold');
    doc.text('Назначение платежа:', ml, y);
    doc.setFont('helvetica', 'normal');
    doc.text(paymentPurpose, ml, y + 5, { maxWidth: mr - ml });

    y += 20;
    doc.setLineWidth(0.3);
    doc.line(ml, y, mr, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Руководитель', ml, y);
    doc.line(ml + 50, y + 1, ml + 120, y + 1);
    y += 12;
    doc.text('Главный бухгалтер', ml, y);
    doc.line(ml + 50, y + 1, ml + 120, y + 1);

    doc.save(`Счёт_${invoiceNumber}.pdf`);
  };

  const handleConfirmPayment = async () => {
    setConfirming(true);
    try {
      const { error } = await supabase
        .from('invoice_payments')
        .update({ status: 'awaiting_confirmation', updated_at: new Date().toISOString() })
        .eq('invoice_number', invoiceNumber);

      if (error) throw error;
      toast({ title: "Статус обновлён", description: "Ваш платёж ожидает подтверждения администратором" });
    } catch (error) {
      console.error("Confirm payment error:", error);
      toast({ title: "Ошибка", description: "Не удалось обновить статус", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Назад к тарифам
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
            <Download className="w-4 h-4" /> Скачать PDF
          </Button>
          <Button onClick={handleConfirmPayment} disabled={confirming} className="gap-2">
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Я оплатил
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-border/50" ref={invoiceRef}>
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Bank header */}
          <div className="border rounded-lg p-4 text-xs space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-muted-foreground mb-1">Банк получателя</div>
                <div className="font-medium">{SELLER.bank}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">БИК</div>
                <div className="font-mono">{SELLER.bik}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <div className="text-muted-foreground mb-1">Получатель</div>
                <div className="font-medium">{SELLER.name}</div>
                <div className="text-muted-foreground">ИНН {SELLER.inn} КПП {SELLER.kpp}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Р/с</div>
                <div className="font-mono">{SELLER.rs}</div>
                <div className="text-muted-foreground mt-1">К/с</div>
                <div className="font-mono">{SELLER.ks}</div>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold">Счёт на оплату {invoiceNumber}</h2>
            <p className="text-sm text-muted-foreground">от {formattedDate}</p>
          </div>

          {/* Seller & Buyer */}
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-semibold">Поставщик: </span>
              <span>{SELLER.name}, ИНН {SELLER.inn}, КПП {SELLER.kpp}</span>
            </div>
            <div>
              <span className="font-semibold">Покупатель: </span>
              <span>{buyerOrg.name}, ИНН {buyerOrg.inn}{buyerOrg.kpp ? `, КПП ${buyerOrg.kpp}` : ''}{buyerOrg.legal_address ? `, ${buyerOrg.legal_address}` : ''}</span>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-xs">№</th>
                  <th className="px-3 py-2 text-left font-medium text-xs">Наименование</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">Кол-во</th>
                  <th className="px-3 py-2 text-center font-medium text-xs">Ед.</th>
                  <th className="px-3 py-2 text-right font-medium text-xs">Цена</th>
                  <th className="px-3 py-2 text-right font-medium text-xs">Сумма</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2">1</td>
                  <td className="px-3 py-2">Пополнение тарифа &quot;{packageName}&quot; ({tokens} токенов)</td>
                  <td className="px-3 py-2 text-center">1</td>
                  <td className="px-3 py-2 text-center">шт.</td>
                  <td className="px-3 py-2 text-right">{amount.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium">{amount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="text-right space-y-1">
            <p className="text-lg font-bold">Итого: {amount.toFixed(2)} руб.</p>
            <p className="text-sm text-muted-foreground">Без налога (НДС)</p>
          </div>

          <p className="text-sm">Всего наименований 1, на сумму <strong>{amount.toFixed(2)} руб.</strong></p>

          <div className="pt-4 border-t">
            <p className="text-sm"><strong>Назначение платежа:</strong> {paymentPurpose}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
