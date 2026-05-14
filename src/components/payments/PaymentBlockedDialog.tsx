import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MessageCircle, RefreshCw } from "lucide-react";

interface PaymentBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "blocked" | "failed" | "cancelled";
}

export function PaymentBlockedDialog({ open, onOpenChange, reason = "blocked" }: PaymentBlockedDialogProps) {
  const isBlocked = reason === "blocked";
  const isCancelled = reason === "cancelled";

  const title = isBlocked
    ? "Не удалось открыть платёжный виджет"
    : isCancelled
      ? "Платёж не завершён"
      : "Платёж не прошёл";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center space-y-2 pt-2">
            {isBlocked ? (
              <>
                <p>
                  Похоже, ваш браузер, антивирус (например, Kaspersky) или расширение (AdBlock, uBlock)
                  блокирует домен <code className="text-xs bg-muted px-1 py-0.5 rounded">widget.cloudpayments.ru</code>.
                </p>
                <p className="text-sm">Что можно сделать:</p>
                <ul className="text-sm text-left list-disc pl-5 space-y-1">
                  <li>Отключите блокировщик рекламы и обновите страницу</li>
                  <li>Попробуйте другой браузер (Chrome, Safari)</li>
                  <li>Оплатите по счёту на юр. лицо</li>
                  <li>Напишите в поддержку — мы поможем</li>
                </ul>
              </>
            ) : isCancelled ? (
              <p>Окно оплаты было закрыто. Если возникли сложности — попробуйте ещё раз или напишите в поддержку.</p>
            ) : (
              <p>Платёж не прошёл. Попробуйте другую карту или напишите в поддержку.</p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          {isBlocked && (
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Обновить страницу
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              window.dispatchEvent(new CustomEvent("open-support-widget"));
            }}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Написать в поддержку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
