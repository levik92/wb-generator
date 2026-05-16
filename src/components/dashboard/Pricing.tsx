import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, MessageCircle, AlertCircle, HelpCircle, Building2, ShieldCheck, CreditCard, MoreHorizontal, Wallet, LifeBuoy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePaymentPackages } from "@/hooks/usePaymentPackages";
import { useGenerationPricing } from "@/hooks/useGenerationPricing";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PaymentBlockedDialog } from "@/components/payments/PaymentBlockedDialog";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
const InvoiceForm = lazy(() => import("@/components/dashboard/InvoiceForm"));

interface PromoCodeInfo {
  id: string;
  code: string;
  type: 'discount' | 'tokens' | 'tokens_instant';
  value: number;
  max_uses: number | null;
  current_uses: number;
  valid_until: string | null;
  is_active: boolean;
}
interface PricingProps {
  appliedPromo?: PromoCodeInfo | null;
}
export default function Pricing({
  appliedPromo
}: PricingProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [, setSearchParams] = useSearchParams();
  const isPaymentInProgress = useRef(false);
  const [invoicePackage, setInvoicePackage] = useState<any | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [blockedDialog, setBlockedDialog] = useState<{ open: boolean; reason: "blocked" | "failed" | "cancelled" }>({ open: false, reason: "blocked" });
  const [altMethodPackage, setAltMethodPackage] = useState<any | null>(null);
  const {
    data: packages,
    isLoading: packagesLoading
  } = usePaymentPackages();
  const {
    data: generationPrices,
    isLoading: pricesLoading
  } = useGenerationPricing();

  // Check if user has already purchased a trial package
  const { data: trialPurchased } = useQuery({
    queryKey: ['trial-purchased'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
      const { data, error } = await supabase
        .from('payments')
        .select('id, package_name')
        .eq('user_id', session.user.id)
        .eq('status', 'succeeded')
        .limit(1000);
      if (error || !data) return false;
      // Get trial package names
      const { data: trialPackages } = await supabase
        .from('payment_packages')
        .select('name')
        .eq('is_trial', true);
      if (!trialPackages) return false;
      const trialNames = trialPackages.map(p => p.name);
      return data.some(p => trialNames.includes(p.package_name));
    },
  });

  // Get pricing for calculations
  const photoPrice = generationPrices?.find(p => p.price_type === 'photo_generation')?.tokens_cost || 1;
  const descriptionPrice = generationPrices?.find(p => p.price_type === 'description_generation')?.tokens_cost || 2;
  const videoPrice = generationPrices?.find(p => p.price_type === 'video_generation')?.tokens_cost || 10;
  const handlePayment = async (packageName: string, amount: number, tokens: number, providerOverride?: 'yookassa' | 'cloudpayments') => {
    if (isPaymentInProgress.current) return;
    isPaymentInProgress.current = true;
    try {
      setLoading(packageName);
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Ошибка",
          description: "Необходимо войти в систему",
          variant: "destructive"
        });
        setLoading(null);
        return;
      }

      // Pre-check CloudPayments widget only when CP is the chosen path.
      // For YooKassa override we redirect via URL — no widget needed.
      let cpProbe: any = null;
      if (providerOverride !== 'yookassa') {
        const waitForCp = async () => {
          for (let i = 0; i < 80; i++) {
            const lib = (window as any).cp;
            if (lib?.CloudPayments) return lib;
            await new Promise(r => setTimeout(r, 100));
          }
          return null;
        };
        cpProbe = await waitForCp();
        if (!cpProbe?.CloudPayments) {
          setBlockedDialog({ open: true, reason: "blocked" });
          setLoading(null);
          isPaymentInProgress.current = false;
          return;
        }
      }
      // Calculate final amount and tokens with promo
      let finalAmount = amount;
      let finalTokens = tokens;
      if (appliedPromo) {
        if (appliedPromo.type === 'discount') {
          finalAmount = Math.round(amount * (1 - appliedPromo.value / 100));
        } else if (appliedPromo.type === 'tokens') {
          finalTokens = tokens + appliedPromo.value;
        }
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('create-payment', {
        body: {
          packageName,
          amount: finalAmount,
          tokens: finalTokens,
          promoCode: appliedPromo?.code,
          provider: providerOverride,
        }
      });
      if (error) {
        console.error('Payment creation error:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать платеж",
          variant: "destructive"
        });
        setLoading(null);
        return;
      }

      if (data.provider === 'cloudpayments') {
        const cpLib = cpProbe;

        const params = data.intentParams;
        console.log('[CloudPayments] Starting payment');

        if (!params?.publicTerminalId || !params?.amount || !params?.currency || !params?.paymentSchema) {
          toast({
            title: "Ошибка",
            description: "Не удалось подготовить платёж. Попробуйте ещё раз.",
            variant: "destructive",
          });
          setLoading(null);
          isPaymentInProgress.current = false;
          return;
        }

        try {
          const widget = new cpLib.CloudPayments();

          widget.oncomplete = (result: any) => {
            console.log('[CloudPayments] oncomplete:', result);
          };

          const finishLoading = () => {
            setLoading(null);
            isPaymentInProgress.current = false;
          };

          widget
            .start(params, {
              onSuccess: () => {
                toast({
                  title: "Оплата прошла успешно!",
                  description: `Начислено ${data.tokens || finalTokens} токенов`,
                });
                setTimeout(() => { window.location.href = '/dashboard?payment=success'; }, 600);
              },
              onFail: (reason: any) => {
                console.warn('[CloudPayments] onFail:', reason);
                setBlockedDialog({ open: true, reason: "failed" });
                finishLoading();
              },
              onComplete: (result: any) => {
                console.log('[CloudPayments] onComplete:', result);
              },
            })
            .then((widgetResult: any) => {
              console.log('[CloudPayments] start result:', widgetResult);
              const success = !!(widgetResult?.success || widgetResult?.status === 'success' || widgetResult?.type === 'payment');
              if (success) return;
              const reason: string = widgetResult?.message || widgetResult?.reason || '';
              const isCanceled =
                widgetResult?.canceled ||
                widgetResult?.status === 'cancelled' ||
                widgetResult?.type === 'cancel' ||
                /cancel|отмен/i.test(reason);
              setBlockedDialog({ open: true, reason: isCanceled ? "cancelled" : "failed" });
              finishLoading();
            })
            .catch((err: any) => {
              console.error('[CloudPayments] start() error:', err);
              const reason = String(err?.message || err || '');
              const isCanceled = /cancel|отмен|close/i.test(reason);
              setBlockedDialog({ open: true, reason: isCanceled ? "cancelled" : "failed" });
              finishLoading();
            });
        } catch (widgetError) {
          console.error('[CloudPayments] Widget error:', widgetError);
          toast({
            title: "Ошибка",
            description: "Не удалось открыть окно оплаты. Попробуйте обновить страницу.",
            variant: "destructive"
          });
          setLoading(null);
          isPaymentInProgress.current = false;
        }
        return;
      }

      // YooKassa flow - redirect to payment URL
      if (data.payment_url) {
        window.location.href = data.payment_url;
        return;
      }

      setLoading(null);
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при создании платежа",
        variant: "destructive"
      });
      setLoading(null);
    } finally {
      isPaymentInProgress.current = false;
    }
  };
  if (packagesLoading || pricesLoading) {
    return <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  if (!packages || packages.length === 0) {
    return <div className="text-center py-12">
        <p className="text-muted-foreground">Тарифные планы временно недоступны</p>
      </div>;
  }

  const openInvoiceDialog = (pkg: any) => {
    setInvoicePackage(pkg);
    setInvoiceDialogOpen(true);
  };
  return <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Тарифные планы</h2>
        <p className="text-muted-foreground">
          Выберите подходящий пакет токенов
        </p>
      </div>

      {/* 100% money-back guarantee — compact liquid glass info block */}
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl p-6 sm:p-4">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex gap-3 items-start">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/80 to-emerald-600/80 backdrop-blur flex items-center justify-center shadow-sm shadow-emerald-500/20 border border-emerald-400/20">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                100% гарантия возврата средств
              </h3>
              <Badge className="h-5 px-1.5 text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 hover:bg-emerald-500/20">
                2 дня
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Если результат не понравится — в течение 2 дней с момента оплаты вернём всю сумму. Действует на тарифы «Пробный», «Стартовый» и «Базовый». Для возврата — напишите в поддержку.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {packages.map((plan) => {
        const isPopular = plan.is_popular;
        const isTrial = plan.is_trial;
        const isTrialUsed = isTrial && trialPurchased;
        const pricePerToken = plan.price / plan.tokens;
        const photoCount = Math.floor(plan.tokens / photoPrice);
        const descCount = Math.floor(plan.tokens / descriptionPrice);
        return <Card key={plan.id} className={`${isPopular ? "border-primary relative" : ""} ${isTrialUsed ? "opacity-60" : ""}`}>
              <CardHeader className="pb-4">
                {isPopular && <Badge className="w-fit mb-2 rounded-sm border-4">Популярный</Badge>}
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isTrial && (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <Badge variant="secondary" className="w-fit rounded-sm bg-muted text-muted-foreground border border-border gap-1 shrink-0">
                            Триал
                            <HelpCircle className="w-3 h-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[160px] text-xs font-normal text-foreground/70 !bg-card !border-border shadow-lg !opacity-100">
                          <p>Этот тариф можно приобрести только один раз</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="text-2xl lg:text-3xl font-bold">
                  {appliedPromo?.type === 'discount' ? `${Math.round(plan.price * (1 - appliedPromo.value / 100))}₽` : `${plan.price}₽`}
                  {appliedPromo?.type === 'discount' && <span className="text-base text-muted-foreground line-through ml-2">
                      {plan.price}₽
                    </span>}
                </div>
                <CardDescription className="text-sm">
                  {appliedPromo?.type === 'tokens' ? `${plan.tokens + appliedPromo.value} токенов (+${appliedPromo.value} бонусных)` : `${plan.tokens} токенов`}
                </CardDescription>
                <div className="text-xs text-muted-foreground mt-1">
                  <strong>{pricePerToken.toFixed(2)}₽</strong> за токен
                </div>
                <div className="mt-2 space-y-1">
                  <div className="bg-primary/10 text-primary text-xs font-medium px-2 py-1.5 rounded-md">
                    1 описание = {(pricePerToken * descriptionPrice).toFixed(2)}₽
                  </div>
                  <div className="bg-primary/10 text-primary text-xs font-medium px-2 py-1.5 rounded-md">
                    1 фото = {(pricePerToken * photoPrice).toFixed(2)}₽
                  </div>
                  <div className="bg-primary/10 text-primary text-xs font-medium px-2 py-1.5 rounded-md">
                    1 видео = {(pricePerToken * videoPrice).toFixed(2)}₽
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-xs">{photoCount} фото карточек</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-xs">{descCount} описаний</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-xs">{Math.floor(plan.tokens / videoPrice)} видеообложек</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span className="text-xs">Поддержка в чате</span>
                  </div>
                </div>
                <Button className="w-full" size="sm" onClick={() => handlePayment(plan.name, plan.price, plan.tokens)} disabled={loading === plan.name || !!isTrialUsed}>
                  {isTrialUsed ? "Уже использован" : loading === plan.name ? "Создание..." : "Пополнить баланс"}
                </Button>
                {!isTrialUsed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 gap-2 text-xs border-border/60 text-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/40"
                    onClick={() => setAltMethodPackage(plan)}
                    disabled={loading === plan.name}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    Другой метод
                  </Button>
                )}
              </CardContent>
            </Card>;
      })}
      </div>

      {/* Individual tariff block - subtle design */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-6 px-6">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Индивидуальный тариф
              </h3>
              <p className="text-sm text-muted-foreground">
                Нужен большой объём токенов или особые условия сотрудничества? 
                Свяжитесь с нами — подберём оптимальное решение для вашего бизнеса.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-md">
                  Персональные условия
                </span>
                <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-md">
                  Приоритетная поддержка
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full sm:w-auto gap-2"
              onClick={() => window.open('https://t.me/wbgen_support', '_blank')}
            >
              <MessageCircle className="h-4 w-4" />
              Связаться с нами
            </Button>
          </div>
        </CardContent>
      </Card>
      {invoicePackage && (
        <Suspense fallback={null}>
          <InvoiceForm
            selectedPackage={invoicePackage}
            open={invoiceDialogOpen}
            onOpenChange={(open) => {
              setInvoiceDialogOpen(open);
              if (!open) setInvoicePackage(null);
            }}
          />
        </Suspense>
      )}
      <PaymentBlockedDialog
        open={blockedDialog.open}
        onOpenChange={(open) => setBlockedDialog((s) => ({ ...s, open }))}
        reason={blockedDialog.reason}
      />

      <ResponsiveDialog
        open={!!altMethodPackage}
        onOpenChange={(open) => { if (!open) setAltMethodPackage(null); }}
      >
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <ResponsiveDialogTitle>Другие способы пополнения</ResponsiveDialogTitle>
            </div>
            <ResponsiveDialogDescription>
              Если основной способ оплаты не работает или вам удобнее другой — выберите один из вариантов ниже. При любых сложностях напишите в поддержку, поможем.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {altMethodPackage && (
            <div className="space-y-2 px-1 sm:px-0">
              <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 flex items-center justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{altMethodPackage.name}</div>
                  <div className="text-xs text-muted-foreground">{altMethodPackage.tokens} токенов</div>
                </div>
                <div className="text-sm font-semibold shrink-0">{altMethodPackage.price}₽</div>
              </div>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3 border-border/60 bg-card text-foreground hover:bg-primary/5 hover:text-foreground hover:border-primary/40 [&_.subtitle]:hover:text-muted-foreground"
                disabled={loading === altMethodPackage.name}
                onClick={() => {
                  const pkg = altMethodPackage;
                  setAltMethodPackage(null);
                  handlePayment(pkg.name, pkg.price, pkg.tokens, 'yookassa');
                }}
              >
                <CreditCard className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-foreground">Через ЮKassa</div>
                  <div className="subtitle text-xs text-muted-foreground">Карты Visa, MasterCard, МИР, СБП</div>
                </div>
              </Button>

              {altMethodPackage.invoice_enabled && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 border-border/60 bg-card text-foreground hover:bg-primary/5 hover:text-foreground hover:border-primary/40"
                  onClick={() => {
                    const pkg = altMethodPackage;
                    setAltMethodPackage(null);
                    openInvoiceDialog(pkg);
                  }}
                >
                  <Building2 className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-foreground">Счёт для организации</div>
                    <div className="text-xs text-muted-foreground">Безналичная оплата для юр. лиц и ИП</div>
                  </div>
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 mt-1 bg-transparent text-foreground hover:bg-muted/40 hover:text-foreground"
                onClick={() => {
                  setAltMethodPackage(null);
                  setSearchParams({ tab: 'support' });
                }}
              >
                <LifeBuoy className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-foreground">Поддержка</div>
                  <div className="text-xs text-muted-foreground">Поможем с оплатой в онлайн-чате</div>
                </div>
              </Button>
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>;
}