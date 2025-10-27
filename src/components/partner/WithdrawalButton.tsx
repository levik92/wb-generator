import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WithdrawalButtonProps {
  balance: number;
  partnerId: string;
  hasBankDetails: boolean;
  onSuccess: () => void;
}

export const WithdrawalButton = ({
  balance,
  partnerId,
  hasBankDetails,
  onSuccess
}: WithdrawalButtonProps) => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const minWithdrawal = 5000;
  const canWithdraw = balance >= minWithdrawal;

  const handleWithdraw = async () => {
    if (!hasBankDetails) {
      toast({
        title: "Заполните реквизиты",
        description: "Пожалуйста, заполните банковские реквизиты ниже",
        variant: "destructive"
      });
      return;
    }

    setShowDialog(true);
  };

  const confirmWithdrawal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-partner-withdrawal", {
        body: { amount: balance }
      });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: data.message || "Запрос на вывод принят"
      });
      
      setShowDialog(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating withdrawal:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать запрос на вывод",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {!canWithdraw && (
          <p className="text-xs text-muted-foreground order-2 sm:order-1">
            Минимальная сумма для вывода: {minWithdrawal.toLocaleString()} ₽
          </p>
        )}
        <Button
          onClick={handleWithdraw}
          disabled={!canWithdraw || loading}
          size="sm"
          className="order-1 sm:order-2 sm:ml-auto"
        >
          Вывести средства
        </Button>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите вывод средств</AlertDialogTitle>
            <AlertDialogDescription>
              Вы запрашиваете вывод {balance.toLocaleString()} ₽. 
              Деньги будут отправлены на ваш расчетный счет в течение 10 рабочих дней.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWithdrawal} disabled={loading}>
              {loading ? "Обработка..." : "Подтвердить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
