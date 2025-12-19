import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Coins, Clock, Download, Sparkles, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface SubscriptionStatusProps {
  onUpgrade?: () => void;
}

export function SubscriptionStatus({ onUpgrade }: SubscriptionStatusProps) {
  const { data: subscription, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const getStatusConfig = () => {
    switch (subscription.status) {
      case 'subscribed':
        return {
          icon: Crown,
          badge: 'Подписка активна',
          badgeVariant: 'default' as const,
          gradient: 'from-primary/10 via-primary/5 to-transparent',
          iconColor: 'text-primary',
          title: subscription.package_name || 'Подписка'
        };
      case 'legacy':
        return {
          icon: Coins,
          badge: 'Токены',
          badgeVariant: 'secondary' as const,
          gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
          iconColor: 'text-amber-500',
          title: 'Баланс токенов'
        };
      case 'trial':
        return {
          icon: Sparkles,
          badge: 'Пробный период',
          badgeVariant: 'outline' as const,
          gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
          iconColor: 'text-blue-500',
          title: 'Пробный доступ'
        };
      default:
        return {
          icon: Coins,
          badge: 'Нет подписки',
          badgeVariant: 'outline' as const,
          gradient: 'from-muted/50 to-transparent',
          iconColor: 'text-muted-foreground',
          title: 'Нет активной подписки'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Card className={`bg-gradient-to-br ${config.gradient} border-border/50 overflow-hidden relative`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <CardContent className="p-4 sm:p-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl bg-background/80 shadow-sm ${config.iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">{config.title}</h3>
                <Badge variant={config.badgeVariant} className="text-xs">
                  {config.badge}
                </Badge>
              </div>

              {subscription.status === 'subscribed' && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{subscription.tokens_balance}</span>
                    <span className="text-muted-foreground">токенов осталось</span>
                  </div>
                  {subscription.expires_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Действует до {format(new Date(subscription.expires_at), 'd MMMM yyyy', { locale: ru })}
                      </span>
                    </div>
                  )}
                  {subscription.can_download && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Download className="h-4 w-4" />
                      <span>Скачивание без водяного знака</span>
                    </div>
                  )}
                </div>
              )}

              {subscription.status === 'legacy' && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-2xl">{subscription.tokens_balance}</span>
                    <span className="text-muted-foreground">токенов</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ваши токены сохранены. Используйте их или перейдите на подписку.
                  </p>
                </div>
              )}

              {subscription.status === 'trial' && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Фото:</span>
                      <span className="font-medium">{subscription.trial_photos_remaining}/3</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Описания:</span>
                      <span className="font-medium">{subscription.trial_descriptions_remaining}/3</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1.5 rounded-md">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Скачивание с водяным знаком</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(subscription.status === 'trial' || subscription.status === 'legacy') && onUpgrade && (
            <Button 
              onClick={onUpgrade}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg w-full sm:w-auto"
            >
              <Crown className="h-4 w-4 mr-2" />
              {subscription.status === 'trial' ? 'Оформить подписку' : 'Перейти на подписку'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
