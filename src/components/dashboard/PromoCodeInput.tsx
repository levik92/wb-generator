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
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-wb-purple" />
          <CardTitle>Промокод</CardTitle>
        </div>
        <CardDescription>Активируйте промокод для получения скидки или токенов</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!validPromo && !instantResult ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="promoCode">Промокод</Label>
              <div className="flex gap-2">
                <Input id="promoCode" placeholder="Введите промокод" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && !validating && promoCode.trim() && validatePromoCode()} className="flex-1" />
                <Button onClick={validatePromoCode} disabled={validating || !promoCode.trim()} className="bg-wb-purple hover:bg-wb-purple-dark">
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Применить"}
                </Button>
              </div>
            </div>
            {error && (
              <Alert className="border-destructive/30 bg-destructive/10 flex items-center [&>svg]:static [&>svg]:translate-y-0 [&>svg]:mr-3 [&>svg]:text-destructive [&>svg~*]:pl-0 [&>svg+div]:translate-y-0">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <AlertDescription className="text-destructive">{error}</AlertDescription>
              </Alert>
            )}
          </>
        ) : instantResult ? (
          <Alert className="border-green-500/30 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Промокод активирован!</strong>
                  <div className="mt-1">{instantResult.message}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearPromo} className="text-green-700 hover:bg-green-800 hover:text-white transition-colors">
                  Ввести другой
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500/30 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Промокод активирован!</strong>
                  <div className="mt-1">
                    {validPromo!.type === 'discount'
                      ? <>Скидка <Badge className="bg-green-600 hover:bg-green-600">{validPromo!.value}%</Badge> будет применена при оплате</>
                      : <>Вы получите <Badge className="bg-green-600 hover:bg-green-600">+{validPromo!.value}</Badge> бонусных токенов после оплаты</>
                    }
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearPromo} className="text-green-700 hover:bg-green-800 hover:text-white transition-colors">
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
