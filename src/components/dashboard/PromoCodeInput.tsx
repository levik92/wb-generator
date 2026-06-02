import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Gift, CheckCircle, XCircle, Loader2 } from "lucide-react";

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

interface PromoCodeInputProps {
  onPromoApplied: (promoInfo: PromoCodeInfo | null) => void;
}

export const PromoCodeInput = ({ onPromoApplied }: PromoCodeInputProps) => {
  const [promoCode, setPromoCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [validPromo, setValidPromo] = useState<PromoCodeInfo | null>(null);
  const [instantResult, setInstantResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setError("Введите промокод");
      return;
    }
    setValidating(true);
    setError(null);
    setValidPromo(null);
    setInstantResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Необходимо авторизоваться");
        return;
      }

      const { data: promo, error: promoError } = await supabase
        .from('promocodes')
        .select('id, code, type, value, max_uses, current_uses, valid_until, is_active')
        .eq('code', promoCode.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (promoError) throw promoError;
      if (!promo) {
        setError("Промокод не найден или неактивен");
        return;
      }

      if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        setError("Промокод истек");
        return;
      }

      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        setError("Достигнут лимит использований промокода");
        return;
      }

      // Handle tokens_instant — redeem immediately via edge function
      if (promo.type === 'tokens_instant') {
        const { data, error: redeemError } = await supabase.functions.invoke('redeem-promocode', {
          body: { code: promoCode.trim() }
        });

        if (redeemError) {
          const errorMsg = data?.error || "Ошибка при активации промокода";
          setError(errorMsg);
        } else if (data?.error) {
          setError(data.error);
        } else {
          setInstantResult({ success: true, message: `Начислено +${data.tokens_awarded} токенов на баланс` });
          toast({ title: "Промокод активирован!", description: `+${data.tokens_awarded} токенов` });
          setPromoCode("");
        }
        return;
      }

      // For discount/tokens types — apply to checkout
      const promoInfo: PromoCodeInfo = {
        id: promo.id,
        code: promo.code,
        type: promo.type as PromoCodeInfo['type'],
        value: promo.value,
        max_uses: promo.max_uses,
        current_uses: promo.current_uses,
        valid_until: promo.valid_until,
        is_active: promo.is_active
      };

      setValidPromo(promoInfo);
      onPromoApplied(promoInfo);
      toast({
        title: "Промокод применен!",
        description: promoInfo.type === 'discount'
          ? `Скидка ${promoInfo.value}% будет применена при оплате`
          : `Вы получите +${promoInfo.value} бонусных токенов после оплаты`
      });
    } catch (error: any) {
      console.error('Error validating promo code:', error);
      setError("Ошибка при проверке промокода");
    } finally {
      setValidating(false);
    }
  };

  const clearPromo = () => {
    setValidPromo(null);
    setPromoCode("");
    setError(null);
    setInstantResult(null);
    onPromoApplied(null);
  };

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card rounded-2xl">
      <div className="pointer-events-none absolute -top-16 -right-12 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl" />
      <CardHeader className="relative pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30 shrink-0">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg">Промокод</CardTitle>
            <CardDescription className="text-xs mt-0.5">Активируйте промокод для скидки или токенов</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {!validPromo && !instantResult ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="promoCode" className="text-xs font-medium text-muted-foreground">Промокод</Label>
              <div className="flex gap-2">
                <Input
                  id="promoCode"
                  placeholder="ВВЕДИТЕ ПРОМОКОД"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && !validating && promoCode.trim() && validatePromoCode()}
                  className="flex-1 h-11 rounded-xl border-border/60 bg-background/60 focus-visible:ring-violet-500/40 focus-visible:border-violet-500/50 tracking-wider font-medium"
                />
                <Button
                  onClick={validatePromoCode}
                  disabled={validating || !promoCode.trim()}
                  className="h-11 rounded-xl px-5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-500/20"
                >
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Применить"}
                </Button>
              </div>
            </div>
            {error && (
              <Alert className="border-destructive/30 bg-destructive/10 rounded-xl flex items-center [&>svg]:static [&>svg]:translate-y-0 [&>svg]:mr-3 [&>svg]:text-destructive [&>svg~*]:pl-0 [&>svg+div]:translate-y-0">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <AlertDescription className="text-destructive">{error}</AlertDescription>
              </Alert>
            )}
          </>
        ) : instantResult ? (
          <Alert className="border-emerald-500/30 bg-emerald-500/10 rounded-xl">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-emerald-700 dark:text-emerald-300">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <strong>Промокод активирован!</strong>
                  <div className="mt-1 text-sm">{instantResult.message}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearPromo} className="text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors rounded-lg">
                  Ввести другой
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-emerald-500/30 bg-emerald-500/10 rounded-xl">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-emerald-700 dark:text-emerald-300">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <strong>Промокод активирован!</strong>
                  <div className="mt-1 text-sm">
                    {validPromo!.type === 'discount'
                      ? <>Скидка <Badge className="bg-emerald-600 hover:bg-emerald-600">{validPromo!.value}%</Badge> будет применена при оплате</>
                      : <>Вы получите <Badge className="bg-emerald-600 hover:bg-emerald-600">+{validPromo!.value}</Badge> бонусных токенов после оплаты</>
                    }
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearPromo} className="text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors rounded-lg">
                  Отменить
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
