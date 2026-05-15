import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <ResponsiveDialogTitle className="text-center">{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-center pt-2">
            {isBlocked
              ? "Похоже, ваш браузер, антивирус или расширение блокирует платёжный виджет."
              : isCancelled
                ? "Окно оплаты было закрыто. Если возникли сложности — попробуйте ещё раз или напишите в поддержку."
                : "Платёж не прошёл. Попробуйте другую карту или напишите в поддержку."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {isBlocked && (
          <div className="px-1 text-sm text-muted-foreground space-y-2">
            <p>Что можно сделать:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Отключите блокировщик рекламы и обновите страницу</li>
              <li>Попробуйте другой браузер (Chrome, Safari)</li>
              <li>Оплатите по счёту на юр. лицо</li>
              <li>Напишите в поддержку — мы поможем</li>
            </ul>
          </div>
        )}

        <ResponsiveDialogFooter className="flex-col sm:flex-col gap-2">
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
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
