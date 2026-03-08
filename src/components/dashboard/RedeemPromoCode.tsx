import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Ticket, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const RedeemPromoCode = ({ onRedeemed }: { onRedeemed?: () => void }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('redeem-promocode', {
        body: { code: code.trim() }
      });

      if (error) {
        const errorMsg = data?.error || "Ошибка при активации промокода";
        setResult({ success: false, message: errorMsg });
      } else if (data?.error) {
        setResult({ success: false, message: data.error });
      } else {
        setResult({ success: true, message: data.message || `Начислено ${data.tokens_awarded} токенов` });
        toast({ title: "Промокод активирован!", description: `+${data.tokens_awarded} токенов` });
        setCode("");
        onRedeemed?.();
      }
    } catch {
      setResult({ success: false, message: "Ошибка сети" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Активировать промокод</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Введите промокод"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && !loading && code.trim() && handleRedeem()}
            className="flex-1"
          />
          <Button
            onClick={handleRedeem}
            disabled={loading || !code.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Применить"}
          </Button>
        </div>

        {result && (
          <Alert className={result.success
            ? "border-green-500/30 bg-green-500/10 flex items-center [&>svg]:static [&>svg]:translate-y-0 [&>svg]:mr-3 [&>svg+div]:translate-y-0"
            : "border-destructive/30 bg-destructive/10 flex items-center [&>svg]:static [&>svg]:translate-y-0 [&>svg]:mr-3 [&>svg]:text-destructive [&>svg+div]:translate-y-0 [&>svg~*]:pl-0"
          }>
            {result.success
              ? <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              : <XCircle className="h-4 w-4 flex-shrink-0" />
            }
            <AlertDescription className={result.success ? "text-green-700 dark:text-green-300" : "text-destructive"}>
              {result.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
