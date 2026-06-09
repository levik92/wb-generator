import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, MessageCircle, AlertCircle, HelpCircle, Building2, ShieldCheck, CreditCard, MoreHorizontal, Wallet, LifeBuoy, Sparkles } from "lucide-react";
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
                const tk = data.tokens || finalTokens;
                setTimeout(() => {
                  window.location.href = `/payment/thanks?amount=${finalAmount}&tokens=${tk}`;
                }, 600);
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
  return <div className="space-y-5 sm:space-y-6">
      <div className="px-1">
        <h2 className="text-2xl sm:text-3xl font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Тарифные планы</h2>
        <p className="text-sm text-muted-foreground">
          Выберите подходящий пакет токенов
        </p>
      </div>

      {/* 100% money-back guarantee */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-card p-4 sm:p-5">
        <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />

        <div className="relative flex gap-3 items-start">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                100% гарантия возврата средств
              </h3>
              <Badge className="h-5 px-2 text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 hover:bg-emerald-500/20">
                2 дня
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Если результат не понравится — в течение 2 дней с момента оплаты вернём всю сумму. Действует на тарифы «Пробный», «Стартовый» и «Базовый». Для возврата — напишите в поддержку.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {packages.map((plan) => {
        const isPopular = plan.is_popular;
        const isTrial = plan.is_trial;
        const isTrialUsed = isTrial && trialPurchased;
        const pricePerToken = plan.price / plan.tokens;
        const photoCount = Math.floor(plan.tokens / photoPrice);
        const descCount = Math.floor(plan.tokens / descriptionPrice);
        return <Card
              key={plan.id}
              className={`relative rounded-2xl overflow-hidden bg-card transition-all duration-300 hover:shadow-lg ${
                isPopular
                  ? "border-violet-500/50 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 hover:border-violet-500/70"
                  : "border-border/60 hover:border-violet-500/30 hover:shadow-violet-500/5"
              } ${isTrialUsed ? "opacity-60" : ""}`}
            >
              {isPopular && (
                <>
                  <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-violet-500/15 blur-3xl" />
                  <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[10px] font-semibold px-3 py-1 rounded-bl-xl shadow-md shadow-violet-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      ПОПУЛЯРНЫЙ
                    </div>
                  </div>
                </>
              )}
              <CardHeader className="pb-4 relative">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isTrial && (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <Badge variant="secondary" className="w-fit rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 gap-1 shrink-0">
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
                <div className={`text-3xl lg:text-4xl font-bold mt-2 ${isPopular ? "bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent" : ""}`}>
                  {appliedPromo?.type === 'discount' ? `${Math.round(plan.price * (1 - appliedPromo.value / 100))}₽` : `${plan.price}₽`}
                  {appliedPromo?.type === 'discount' && <span className="text-base text-muted-foreground line-through ml-2 font-normal">
                      {plan.price}₽
                    </span>}
                </div>
                <CardDescription className="text-sm font-medium text-foreground/80">
                  {appliedPromo?.type === 'tokens' ? `${plan.tokens + appliedPromo.value} токенов (+${appliedPromo.value} бонусных)` : `${plan.tokens} токенов`}
                </CardDescription>
                <div className="text-xs text-muted-foreground mt-1">
                  <strong className="text-foreground">{pricePerToken.toFixed(2)}₽</strong> за токен
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="bg-violet-500/10 border border-violet-500/15 text-violet-700 dark:text-violet-300 text-xs font-medium px-2.5 py-1.5 rounded-lg">
                    1 описание = {(pricePerToken * descriptionPrice).toFixed(2)}₽
                  </div>
                  <div className="bg-violet-500/10 border border-violet-500/15 text-violet-700 dark:text-violet-300 text-xs font-medium px-2.5 py-1.5 rounded-lg">
                    1 фото = {(pricePerToken * photoPrice).toFixed(2)}₽
                  </div>
                  <div className="bg-violet-500/10 border border-violet-500/15 text-violet-700 dark:text-violet-300 text-xs font-medium px-2.5 py-1.5 rounded-lg">
                    1 видео = {(pricePerToken * videoPrice).toFixed(2)}₽
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 relative">
                <div className="space-y-2 mb-4">
                  {[
                    `${photoCount} фото карточек`,
                    `${descCount} описаний`,
                    `${Math.floor(plan.tokens / videoPrice)} видеообложек`,
                    "Поддержка в чате",
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-violet-600 dark:text-violet-300" strokeWidth={3} />
                      </div>
                      <span className="text-xs text-foreground/80">{feat}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className={`w-full h-10 rounded-lg font-medium ${
                    isPopular
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-500/30"
                      : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
                  }`}
                  onClick={() => handlePayment(plan.name, plan.price, plan.tokens)}
                  disabled={loading === plan.name || !!isTrialUsed}
                >
                  {isTrialUsed ? "Уже использован" : loading === plan.name ? "Создание..." : "Пополнить баланс"}
                </Button>
                {!isTrialUsed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 h-9 rounded-lg gap-2 text-xs border-border/60 text-muted-foreground hover:bg-violet-500/5 hover:text-violet-700 dark:hover:text-violet-300 hover:border-violet-500/40"
                    onClick={() => setAltMethodPackage(plan)}
                    disabled={loading === plan.name}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    Ещё способы
                  </Button>
                )}
              </CardContent>
            </Card>;
      })}
      </div>

      {/* Individual tariff block */}
      <Card className="relative overflow-hidden border-border/60 bg-card rounded-2xl">
        <div className="pointer-events-none absolute -top-16 -right-12 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl" />
        <CardContent className="py-6 px-5 sm:px-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold mb-1">
                  Индивидуальный тариф
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Нужен большой объём токенов или особые условия сотрудничества? Подберём оптимальное решение для вашего бизнеса.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="px-2 py-1 text-[11px] bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 rounded-md">
                    Персональные условия
                  </span>
                  <span className="px-2 py-1 text-[11px] bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 rounded-md">
                    Приоритетная поддержка
                  </span>
                </div>
              </div>
            </div>

            <Button
              className="h-11 rounded-xl px-5 w-full sm:w-auto gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-500/20 shrink-0"
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