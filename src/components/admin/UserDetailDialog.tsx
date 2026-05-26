import { useState, useEffect } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Wallet,
  Coins,
  Sparkles,
  Users,
  Info,
  Mail,
  Calendar,
  Activity,
  CircleHelp,
  CreditCard,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionDetailView } from "./TransactionDetailView";

export interface UserDetailsData {
  totalPaid: number;
  tokensSpent: number;
  generationsCount: number;
  referralsCount: number;
  referralsEarnings: number;
  recentGenerations: any[];
  paymentHistory: any[];
  referrals: any[];
  tokenTransactions: any[];
  surveyResponses: { question_key: string; answer: string }[];
  utmSourceName: string | null;
}

export interface UserDetailUser {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  created_at: string;
  is_blocked: boolean;
  last_active_at?: string;
}

interface Props {
  user: UserDetailUser | null;
  details: UserDetailsData | null;
  loading: boolean;
  onClose: () => void;
}

type View =
  | { kind: 'main' }
  | { kind: 'transaction'; tx: any };

const TX_TYPE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  purchase: { label: 'Оплата', variant: 'default' },
  bonus: { label: 'Бонус', variant: 'secondary' },
  generation: { label: 'Генерация', variant: 'outline' },
  referral_bonus: { label: 'Реферал', variant: 'secondary' },
  promocode: { label: 'Промокод', variant: 'secondary' },
  refund: { label: 'Возврат', variant: 'secondary' },
  direct_sql_update: { label: 'Прямой SQL', variant: 'destructive' },
};

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone: 'primary' | 'success' | 'info' | 'warning';
}) {
  const tones: Record<string, string> = {
    primary: 'from-primary/15 to-primary/5 text-primary border-primary/20',
    success: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    info: 'from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20',
    warning: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };
  return (
    <div className={cn(
      'rounded-xl border bg-gradient-to-br p-3 sm:p-4 flex flex-col gap-1.5',
      tones[tone]
    )}>
      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium opacity-80">
        <Icon className="w-3.5 h-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-base sm:text-xl font-semibold tracking-tight text-foreground truncate">
        {value}
      </div>
    </div>
  );
}

export function UserDetailDialog({ user, details, loading, onClose }: Props) {
  const [view, setView] = useState<View>({ kind: 'main' });
  const [tab, setTab] = useState<string>('overview');

  // Reset internal navigation when dialog (re)opens with a different user
  useEffect(() => {
    if (user) {
      setView({ kind: 'main' });
      setTab('overview');
    }
  }, [user?.id]);

  const open = !!user;
  const isTxView = view.kind === 'transaction';

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:!max-w-4xl lg:!max-w-5xl p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border/60">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-start gap-3">
            {isTxView ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 shrink-0 -ml-1"
                onClick={() => setView({ kind: 'main' })}
                aria-label="Назад"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-sm font-semibold uppercase">
                {(user?.full_name || user?.email || '?').charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm sm:text-base font-semibold truncate">
                {isTxView
                  ? 'Подробности операции'
                  : (user?.full_name || 'Пользователь')}
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground truncate flex items-center gap-1.5">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 max-h-[calc(85dvh-80px)] sm:max-h-[calc(90vh-90px)] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
            </div>
          ) : !details ? null : isTxView ? (
            <div className="animate-fade-in">
              <TransactionDetailView transaction={view.tx} />
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <StatCard icon={Wallet} label="Всего оплачено" value={`${details.totalPaid}₽`} tone="success" />
                <StatCard icon={Coins} label="Потрачено токенов" value={details.tokensSpent} tone="info" />
                <StatCard icon={Sparkles} label="Генераций" value={details.generationsCount} tone="primary" />
                <StatCard icon={Users} label="Рефералов" value={details.referralsCount} tone="warning" />
              </div>

              {/* Meta row */}
              <div className="grid sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2 flex items-center gap-2 min-w-0">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground">Источник:</span>
                  <Badge variant="secondary" className="text-[10px] truncate">
                    {details.utmSourceName || 'Прямой заход'}
                  </Badge>
                </div>
                <div className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground">Регистрация:</span>
                  <span className="text-xs font-medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—'}
                  </span>
                </div>
                <div className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2 flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground">Баланс:</span>
                  <span className="text-xs font-medium">{user?.tokens_balance ?? 0}</span>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted/60">
                  <TabsTrigger value="overview" className="text-[11px] sm:text-xs gap-1.5 py-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Опрос</span>
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="text-[11px] sm:text-xs gap-1.5 py-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Платежи</span>
                  </TabsTrigger>
                  <TabsTrigger value="tokens" className="text-[11px] sm:text-xs gap-1.5 py-1.5">
                    <Coins className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Токены</span>
                  </TabsTrigger>
                  <TabsTrigger value="referrals" className="text-[11px] sm:text-xs gap-1.5 py-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Рефералы</span>
                  </TabsTrigger>
                </TabsList>

                {/* Survey */}
                <TabsContent value="overview" className="mt-4 space-y-2 animate-fade-in">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CircleHelp className="w-4 h-4 text-muted-foreground" /> Результаты опроса
                  </h3>
                  {details.surveyResponses.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(() => {
                        const labels: Record<string, string> = {
                          who_are_you: 'Кто вы?',
                          monthly_volume: 'Объём в месяц',
                          acquisition_channel: 'Откуда узнали?',
                        };
                        const order = ['who_are_you', 'monthly_volume', 'acquisition_channel'];
                        return order.map((key) => {
                          const resp = details.surveyResponses.find((r) => r.question_key === key);
                          if (!resp) return null;
                          return (
                            <div key={key} className="bg-muted/40 border border-border/40 rounded-lg p-3 space-y-1.5">
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {labels[key] || key}
                              </div>
                              <div className="text-sm font-medium">{resp.answer}</div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="bg-muted/30 border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                      Опрос не пройден
                    </div>
                  )}
                </TabsContent>

                {/* Payments */}
                <TabsContent value="payments" className="mt-4 animate-fade-in">
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <div className="max-h-[420px] overflow-auto">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                            <TableRow>
                              <TableHead className="min-w-[100px]">Дата</TableHead>
                              <TableHead className="min-w-[80px]">Сумма</TableHead>
                              <TableHead className="min-w-[80px]">Токены</TableHead>
                              <TableHead className="min-w-[90px]">Статус</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {details.paymentHistory.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-6">
                                  Нет платежей
                                </TableCell>
                              </TableRow>
                            ) : details.paymentHistory.map((p: any) => (
                              <TableRow key={p.id}>
                                <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString('ru-RU')}</TableCell>
                                <TableCell className="text-xs font-medium">{p.amount}₽</TableCell>
                                <TableCell className="text-xs">{p.tokens_amount}</TableCell>
                                <TableCell>
                                  <Badge variant={p.status === 'succeeded' ? 'default' : 'secondary'} className="text-[10px]">
                                    {p.status === 'succeeded' ? 'Оплачен' : p.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Token transactions */}
                <TabsContent value="tokens" className="mt-4 animate-fade-in">
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <div className="max-h-[480px] overflow-auto">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                            <TableRow>
                              <TableHead className="min-w-[110px]">Дата</TableHead>
                              <TableHead className="min-w-[70px]">Кол-во</TableHead>
                              <TableHead className="min-w-[100px]">Тип</TableHead>
                              <TableHead className="min-w-[150px]">Описание</TableHead>
                              <TableHead className="min-w-[90px] text-right">Детали</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {details.tokenTransactions.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground text-xs py-6">
                                  Нет транзакций
                                </TableCell>
                              </TableRow>
                            ) : details.tokenTransactions.map((tx: any) => {
                              const typeInfo = TX_TYPE_LABELS[tx.transaction_type] || { label: tx.transaction_type, variant: 'outline' as const };
                              const hasDetails = tx.transaction_type === 'generation';
                              const ageDays = (Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60 * 60 * 24);
                              const detailsAvailable = hasDetails && ageDays <= 30;
                              return (
                                <TableRow key={tx.id} className="hover:bg-muted/40">
                                  <TableCell className="text-xs">
                                    {new Date(tx.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </TableCell>
                                  <TableCell className={cn(
                                    'text-xs font-semibold',
                                    tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                  )}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={typeInfo.variant} className="text-[10px]">
                                      {typeInfo.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                                    {tx.description || '—'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {detailsAvailable ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 gap-1 text-xs"
                                        onClick={() => setView({ kind: 'transaction', tx })}
                                      >
                                        <Info className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Открыть</span>
                                      </Button>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Referrals */}
                <TabsContent value="referrals" className="mt-4 animate-fade-in">
                  {details.referrals.length === 0 ? (
                    <div className="bg-muted/30 border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                      Нет рефералов
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/60 overflow-hidden">
                      <div className="max-h-[420px] overflow-auto">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                              <TableRow>
                                <TableHead className="min-w-[180px]">Email</TableHead>
                                <TableHead className="min-w-[100px]">Дата</TableHead>
                                <TableHead className="min-w-[90px]">Статус</TableHead>
                                <TableHead className="min-w-[80px]">Токенов</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {details.referrals.map((ref: any) => (
                                <TableRow key={ref.id}>
                                  <TableCell className="text-xs truncate max-w-[220px]">{ref.referred?.email || 'Unknown'}</TableCell>
                                  <TableCell className="text-xs">{new Date(ref.created_at).toLocaleDateString('ru-RU')}</TableCell>
                                  <TableCell>
                                    <Badge variant={ref.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                                      {ref.status === 'completed' ? 'Завершён' : 'Ожидание'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs">{ref.tokens_awarded || 0}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
