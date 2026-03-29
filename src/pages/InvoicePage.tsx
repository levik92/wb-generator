import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Loader2, CheckCircle2, XCircle, Clock, MessageCircle, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SELLER = {
  name: 'ООО «АЛЬТАИР»',
  inn: '9724238597',
  kpp: '772401001',
  bank: 'ООО "Банк Точка"',
  rs: '40702810120000295325',
  bik: '044525104',
  ks: '30101810745374525104',
};

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  amount: number;
  tokens_amount: number;
  package_name: string;
  payment_purpose: string;
  status: string;
  organization_id: string;
}

interface OrgData {
  name: string;
  inn: string;
  kpp: string | null;
  ogrn: string | null;
  legal_address: string | null;
  director_name: string | null;
  bank_name: string | null;
  bik: string | null;
  checking_account: string | null;
  correspondent_account: string | null;
}

export default function InvoicePage() {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [invoiceNumber]);

  const loadInvoice = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: inv, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_number', invoiceNumber)
        .eq('user_id', session.user.id)
        .single();

      if (error || !inv) {
        toast({ title: "Счёт не найден", variant: "destructive" });
        return;
      }

      setInvoice(inv);

      const { data: orgData } = await supabase
        .from('organization_details')
        .select('*')
        .eq('id', inv.organization_id)
        .single();

      if (orgData) setOrg(orgData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!invoice) return;
    setConfirming(true);
    try {
      const { error } = await supabase
        .from('invoice_payments')
        .update({ status: 'awaiting_confirmation', updated_at: new Date().toISOString() })
        .eq('invoice_number', invoice.invoice_number);

      if (error) throw error;
      setInvoice(prev => prev ? { ...prev, status: 'awaiting_confirmation' } : null);
      toast({ title: "Статус обновлён", description: "Ваш платёж ожидает подтверждения" });
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice || !org) return;
    const [{ default: jsPDF }, { ARIAL_REGULAR_BASE64, ARIAL_BOLD_BASE64 }] = await Promise.all([
      import('jspdf'),
      import('@/lib/arialFont'),
    ]);
    const doc = new jsPDF('p', 'mm', 'a4');

    // Register Arial (Liberation Sans) font for Cyrillic support
    doc.addFileToVFS('Arial-Regular.ttf', ARIAL_REGULAR_BASE64);
    doc.addFileToVFS('Arial-Bold.ttf', ARIAL_BOLD_BASE64);
    doc.addFont('Arial-Regular.ttf', 'Arial', 'normal');
    doc.addFont('Arial-Bold.ttf', 'Arial', 'bold');
    doc.setFont('Arial', 'normal');

    const w = 210;
    let y = 15;
    const ml = 15;
    const mr = w - 15;
    const formattedDate = new Date(invoice.invoice_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.setFontSize(9);
    doc.setFont('Arial', 'normal');
    doc.setLineWidth(0.15);

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
    doc.setFontSize(14);
    doc.setFont('Arial', 'bold');
    doc.text(`Счёт на оплату ${invoice.invoice_number}`, ml, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('Arial', 'normal');
    doc.text(`от ${formattedDate}`, ml, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(ml, y, mr, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('Arial', 'bold');
    doc.text('Поставщик:', ml, y);
    doc.setFont('Arial', 'normal');
    doc.text(`${SELLER.name}, ИНН ${SELLER.inn}, КПП ${SELLER.kpp}`, ml + 28, y);
    y += 7;

    doc.setFont('Arial', 'bold');
    doc.text('Покупатель:', ml, y);
    doc.setFont('Arial', 'normal');
    const buyerLine = `${org.name}, ИНН ${org.inn}${org.kpp ? `, КПП ${org.kpp}` : ''}${org.legal_address ? `, ${org.legal_address}` : ''}`;
    doc.text(buyerLine, ml + 28, y, { maxWidth: mr - ml - 30 });
    y += 12;

    doc.setLineWidth(0.15);
    const colX = [ml, ml + 10, ml + 90, ml + 108, ml + 128, ml + 155];
    doc.setFillColor(240, 240, 240);
    doc.rect(ml, y, mr - ml, 8, 'F');
    doc.rect(ml, y, mr - ml, 8);
    doc.setFontSize(8);
    doc.setFont('Arial', 'bold');
    doc.text('№', colX[0] + 2, y + 5.5);
    doc.text('Наименование', colX[1] + 2, y + 5.5);
    doc.text('Кол-во', colX[2] + 2, y + 5.5);
    doc.text('Ед.', colX[3] + 2, y + 5.5);
    doc.text('Цена', colX[4] + 2, y + 5.5);
    doc.text('Сумма', colX[5] + 2, y + 5.5);
    colX.forEach(x => doc.line(x, y, x, y + 8));
    doc.line(mr, y, mr, y + 8);
    y += 8;

    const rowH = 8;
    doc.rect(ml, y, mr - ml, rowH);
    colX.forEach(x => doc.line(x, y, x, y + rowH));
    doc.line(mr, y, mr, y + rowH);
    doc.setFont('Arial', 'normal');
    doc.text('1', colX[0] + 3, y + 5.5);
    doc.text(`Пополнение тарифа "${invoice.package_name}" (${invoice.tokens_amount} токенов)`, colX[1] + 2, y + 5.5, { maxWidth: 78 });
    doc.text('1', colX[2] + 4, y + 5.5);
    doc.text('шт.', colX[3] + 2, y + 5.5);
    doc.text(`${invoice.amount.toFixed(2)}`, colX[4] + 2, y + 5.5);
    doc.text(`${invoice.amount.toFixed(2)}`, colX[5] + 2, y + 5.5);
    y += rowH + 5;

    doc.setFont('Arial', 'bold');
    doc.setFontSize(10);
    doc.text(`Итого: ${invoice.amount.toFixed(2)} руб.`, mr, y, { align: 'right' });
    y += 6;
    doc.text(`Без налога (НДС)`, mr, y, { align: 'right' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont('Arial', 'normal');
    doc.text(`Всего наименований 1, на сумму ${invoice.amount.toFixed(2)} руб.`, ml, y);
    y += 10;

    doc.setFont('Arial', 'bold');
    doc.text('Назначение платежа:', ml, y);
    doc.setFont('Arial', 'normal');
    doc.text(invoice.payment_purpose, ml, y + 5, { maxWidth: mr - ml });
    y += 20;
    doc.setLineWidth(0.15);
    doc.line(ml, y, mr, y);
    y += 8;

    // Contract terms section
    doc.setFontSize(11);
    doc.setFont('Arial', 'bold');
    doc.text(`Основные условия настоящего счёта-договора ${invoice.invoice_number} от ${formattedDate}.`, ml, y, { maxWidth: mr - ml });
    y += 8;

    doc.setFontSize(8);
    doc.setFont('Arial', 'normal');
    const terms = [
      '1. Предметом настоящего Счёта-договора является оказание услуги (далее - "услуга").',
      '2. Оплата настоящего Счёта-договора означает согласие Заказчика с условиями оплаты и выполнения услуги.',
      '3. Настоящий Счёт-договор действителен в течение 5 (пяти) банковских дней от даты его составления включительно. При отсутствии оплаты в указанный срок настоящий Счёт-договор признается недействительным.',
      '4. Оплата Счёта-договора третьими лицами (сторонами), а также неполная (частичная) оплата Счёта-договора не допускается.',
      '5. Исполнитель вправе не начинать выполнение услуги до зачисления оплаты на расчетный счёт.',
      '6. Подписание Заказчиком или его уполномоченным представителем акта выполнения услуги означает согласие Заказчика с полнотой и надлежащим качеством оказанной услуги.',
    ];

    terms.forEach(term => {
      const lines = doc.splitTextToSize(term, mr - ml);
      doc.text(lines, ml, y);
      y += lines.length * 4 + 2;
    });

      y += 4;

    // Руководитель (no duplicate supplier block)
    doc.setFont('Arial', 'bold');
    doc.text('Руководитель', ml, y);
    doc.setLineWidth(0.1);
    doc.line(ml + 50, y + 1, ml + 120, y + 1);

    doc.save(`Счёт_${invoice.invoice_number}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Счёт не найден</p>
      </div>
    );
  }

  const formattedDate = new Date(invoice.invoice_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const amount = Number(invoice.amount);

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    invoice_issued: { label: "Выставлен", variant: "secondary", icon: <Clock className="w-4 h-4" /> },
    awaiting_confirmation: { label: "На проверке", variant: "outline", icon: <Clock className="w-4 h-4" /> },
    paid: { label: "Начислено", variant: "default", icon: <CheckCircle2 className="w-4 h-4" /> },
    rejected: { label: "Отклонён", variant: "destructive", icon: <XCircle className="w-4 h-4" /> },
  };

  const status = statusConfig[invoice.status] || statusConfig.invoice_issued;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Status + Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Badge variant={status.variant} className="gap-1.5 text-sm px-3 py-1.5">
            {status.icon}
            {status.label}
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
              <Download className="w-4 h-4" /> Скачать PDF
            </Button>
            {invoice.status === 'invoice_issued' && (
              <Button onClick={handleConfirmPayment} disabled={confirming} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Я оплатил
              </Button>
            )}
          </div>
        </div>

        {/* Rejected message */}
        {invoice.status === 'rejected' && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm text-destructive font-medium">Оплата по данному счёту не подтверждена. Пожалуйста, оплатите счёт.</p>
            <p className="text-sm text-muted-foreground">Если вы считаете, что это ошибка, напишите в поддержку.</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open('/dashboard?tab=support', '_blank')}
            >
              <MessageCircle className="w-4 h-4" /> Онлайн-чат поддержки
            </Button>
          </div>
        )}

        {/* Invoice card */}
        <Card className="rounded-2xl border-border/50">
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
              <h2 className="text-xl font-bold">Счёт на оплату {invoice.invoice_number}</h2>
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
                <span>{org.name}, ИНН {org.inn}{org.kpp ? `, КПП ${org.kpp}` : ''}{org.legal_address ? `, ${org.legal_address}` : ''}</span>
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
                    <td className="px-3 py-2">Пополнение тарифа &quot;{invoice.package_name}&quot; ({invoice.tokens_amount} токенов)</td>
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
              <p className="text-sm"><strong>Назначение платежа:</strong> {invoice.payment_purpose}</p>
            </div>

            {/* Contract terms */}
            <div className="pt-4 border-t space-y-2">
              <p className="text-sm">Основные условия настоящего счёта-договора {invoice.invoice_number} от {formattedDate}.</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-none pl-0">
                <li>1. Предметом настоящего Счёта-договора является оказание услуги (далее - &quot;услуга&quot;).</li>
                <li>2. Оплата настоящего Счёта-договора означает согласие Заказчика с условиями оплаты и выполнения услуги.</li>
                <li>3. Настоящий Счёт-договор действителен в течение 5 (пяти) банковских дней от даты его составления включительно. При отсутствии оплаты в указанный срок настоящий Счёт-договор признается недействительным.</li>
                <li>4. Оплата Счёта-договора третьими лицами (сторонами), а также неполная (частичная) оплата Счёта-договора не допускается.</li>
                <li>5. Исполнитель вправе не начинать выполнение услуги до зачисления оплаты на расчетный счёт.</li>
                <li>6. Подписание Заказчиком или его уполномоченным представителем акта выполнения услуги означает согласие Заказчика с полнотой и надлежащим качеством оказанной услуги.</li>
              </ol>
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">Поставщик: {SELLER.name}, ИНН {SELLER.inn}, КПП {SELLER.kpp}</p>
              </div>
              <div className="pt-2">
                <p className="text-sm">Руководитель ____________________</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info note */}
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 flex gap-3">
          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Начисление баланса при оплате по счёту происходит в течение <strong className="text-foreground">24 часов</strong>.</p>
            <p>Для ускорения начисления баланса, после оплаты нажмите «Я оплатил» (это не обязательно). В любом случае после оплаты вам начислят токены в течение суток.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
