import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Copy, Trash2, Link2, Users, CreditCard, MousePointerClick, Loader2, ExternalLink, Pin, PinOff, CopyPlus, Wallet, EyeOff, Eye, Tag, Megaphone, Target, Globe, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { publicSiteUrl } from "@/config/runtime";
import { UtmPaymentsDialog } from "./UtmPaymentsDialog";

interface UtmSource {
  id: string;
  name: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  base_url: string;
  created_at: string;
  is_pinned: boolean;
}

interface UtmStats {
  visits: number;
  registrations: number;
  payments: number;
  revenue: number;
}

const PAGE_SIZE = 20;
const HIDDEN_STORAGE_KEY = "admin_utm_hidden_ids";

const loadHiddenIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(HIDDEN_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const saveHiddenIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
};

export function AdminUtmSources() {
  const [sources, setSources] = useState<UtmSource[]>([]);
  const [stats, setStats] = useState<Record<string, UtmStats>>({});
  const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => loadHiddenIds());
  const [showHidden, setShowHidden] = useState(false);
  const [paymentsDialog, setPaymentsDialog] = useState<{ id: string; name: string } | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // Form
  const [formName, setFormName] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formMedium, setFormMedium] = useState("");
  const [formCampaign, setFormCampaign] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState(publicSiteUrl);

  const resetForm = () => {
    setFormName("");
    setFormSource("");
    setFormMedium("");
    setFormCampaign("");
    setFormBaseUrl(publicSiteUrl);
  };

  const fetchStatsForOne = async (source: UtmSource): Promise<UtmStats> => {
    // Visits and registrations: exact counts via head requests
    const [visitsRes, regsRes] = await Promise.all([
      supabase
        .from('utm_visits')
        .select('id', { count: 'exact', head: true })
        .eq('utm_source_id', source.id),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('utm_source_id', source.id),
    ]);

    // Fetch ALL attributed profile ids (paginate to bypass 1000-row Supabase limit)
    const PROFILE_PAGE = 1000;
    const userIds: string[] = [];
    const expected = regsRes.count ?? null;
    for (let offset = 0; ; offset += PROFILE_PAGE) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('utm_source_id', source.id)
        .order('id', { ascending: true })
        .range(offset, offset + PROFILE_PAGE - 1);
      if (error) {
        console.error('UTM profile ids fetch error:', error);
        break;
      }
      const chunk = (data || []).map((p: any) => p.id);
      userIds.push(...chunk);
      if (chunk.length < PROFILE_PAGE) break;
      if (expected !== null && userIds.length >= expected) break;
    }

    let paymentsCount = 0;
    let revenue = 0;
    if (userIds.length > 0) {
      const CHUNK = 100;
      const PAY_PAGE = 1000;
      for (let i = 0; i < userIds.length; i += CHUNK) {
        const chunk = userIds.slice(i, i + CHUNK);
        // Paginate payments per chunk in case > 1000 rows
        for (let payOffset = 0; ; payOffset += PAY_PAGE) {
          const { data: paid, error: payErr } = await supabase
            .from('payments')
            .select('amount')
            .in('user_id', chunk)
            .eq('status', 'succeeded')
            .order('created_at', { ascending: false })
            .range(payOffset, payOffset + PAY_PAGE - 1);
          if (payErr) {
            console.error('UTM payments fetch error:', payErr);
            break;
          }
          const rows = paid || [];
          paymentsCount += rows.length;
          revenue += rows.reduce((sum, p: any) => sum + Number(p.amount || 0), 0);
          if (rows.length < PAY_PAGE) break;
        }
      }
    }

    return {
      visits: visitsRes.count || 0,
      registrations: regsRes.count || 0,
      payments: paymentsCount,
      revenue,
    };
  };

  /**
   * Stream stats per source: marks each as loading, then fills as it resolves.
   * Returns the final aggregated map (for callers that need it).
   */
  const streamStatsFor = async (items: UtmSource[]): Promise<Record<string, UtmStats>> => {
    if (items.length === 0) return {};
    // Mark all as loading
    setStatsLoading(prev => {
      const next = { ...prev };
      for (const it of items) next[it.id] = true;
      return next;
    });

    const results: Record<string, UtmStats> = {};
    await Promise.all(
      items.map(async (source) => {
        try {
          const s = await fetchStatsForOne(source);
          results[source.id] = s;
          // Update progressively as each one resolves
          setStats(prev => ({ ...prev, [source.id]: s }));
        } catch (e) {
          console.error('UTM stats fetch error:', e);
          results[source.id] = { visits: 0, registrations: 0, payments: 0, revenue: 0 };
          setStats(prev => ({ ...prev, [source.id]: results[source.id] }));
        } finally {
          setStatsLoading(prev => ({ ...prev, [source.id]: false }));
        }
      })
    );
    return results;
  };

  const fetchPage = useCallback(async (offset: number) => {
    const { data, error } = await supabase
      .from('utm_sources')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    
    if (error) throw error;
    return (data || []) as UtmSource[];
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchPage(0);
      setSources(page);
      setHasMore(page.length === PAGE_SIZE);
      // Show cards immediately; stats stream in with per-card spinners
      setLoading(false);
      streamStatsFor(page);
    } catch (e) {
      console.error(e);
      toast.error("Не удалось загрузить данные UTM");
      setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(sources.length);
      if (page.length === 0) {
        setHasMore(false);
      } else {
        setSources(prev => [...prev, ...page]);
        setHasMore(page.length === PAGE_SIZE);
        streamStatsFor(page);
      }
    } catch (e) {
      console.error(e);
      toast.error("Ошибка подгрузки");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, sources.length, loadingMore, hasMore, loading]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loading, sources.length]);

  const refresh = async () => {
    // Reload from start, preserving page count
    const targetCount = Math.max(sources.length, PAGE_SIZE);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('utm_sources')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(0, targetCount - 1);
      if (error) throw error;
      const items = (data || []) as UtmSource[];
      setSources(items);
      setHasMore(items.length === targetCount);
      streamStatsFor(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formSource.trim()) {
      toast.error("Введите название и источник");
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('utm_sources').insert({
        name: formName.trim(),
        utm_source: formSource.trim(),
        utm_medium: formMedium.trim(),
        utm_campaign: formCampaign.trim(),
        base_url: formBaseUrl.trim(),
      });
      if (error) throw error;
      toast.success("UTM-источник создан");
      setDialogOpen(false);
      resetForm();
      refresh();
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот UTM-источник? Все данные о визитах будут удалены.")) return;
    try {
      const { error } = await supabase.from('utm_sources').delete().eq('id', id);
      if (error) throw error;
      toast.success("Источник удалён");
      setSources(prev => prev.filter(s => s.id !== id));
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const handleHide = (id: string) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveHiddenIds(next);
      return next;
    });
    toast.success("Источник скрыт со страницы");
  };

  const handleUnhide = (id: string) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      saveHiddenIds(next);
      return next;
    });
  };

  const handleUnhideAll = () => {
    setHiddenIds(new Set());
    saveHiddenIds(new Set());
    toast.success("Скрытые источники показаны");
  };

  const handleDuplicate = (source: UtmSource) => {
    setFormName(source.name + " (копия)");
    setFormSource(source.utm_source);
    setFormMedium(source.utm_medium || "");
    setFormCampaign(source.utm_campaign || "");
    setFormBaseUrl(source.base_url || publicSiteUrl);
    setDialogOpen(true);
  };

  const handleTogglePin = async (source: UtmSource) => {
    const next = !source.is_pinned;
    // Optimistic
    setSources(prev => {
      const updated = prev.map(s => s.id === source.id ? { ...s, is_pinned: next } : s);
      // Re-sort: pinned first, then by created_at DESC
      return [...updated].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });
    try {
      const { error } = await supabase
        .from('utm_sources')
        .update({ is_pinned: next })
        .eq('id', source.id);
      if (error) throw error;
      toast.success(next ? "Закреплено" : "Откреплено");
    } catch (e: any) {
      toast.error("Ошибка: " + e.message);
      // Rollback
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, is_pinned: !next } : s));
    }
  };

  const buildUtmUrl = (source: UtmSource) => {
    const params = new URLSearchParams();
    if (source.utm_source) params.set('utm_source', source.utm_source);
    if (source.utm_medium) params.set('utm_medium', source.utm_medium);
    if (source.utm_campaign) params.set('utm_campaign', source.utm_campaign);
    return `${source.base_url}?${params.toString()}`;
  };

  const copyUrl = (source: UtmSource) => {
    navigator.clipboard.writeText(buildUtmUrl(source));
    toast.success("Ссылка скопирована");
  };

  const getConversion = (from: number, to: number) => {
    if (from === 0) return '—';
    return ((to / from) * 100).toFixed(1) + '%';
  };

  const formatRub = (val: number) => `${Math.round(val).toLocaleString('ru-RU')} ₽`;

  if (loading && sources.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const visibleSources = showHidden ? sources : sources.filter(s => !hiddenIds.has(s.id));
  const hiddenCount = sources.reduce((n, s) => n + (hiddenIds.has(s.id) ? 1 : 0), 0);
  const visibleStats = Object.entries(stats).filter(([id]) => showHidden || !hiddenIds.has(id)).map(([, v]) => v);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Создавайте UTM-ссылки и отслеживайте эффективность каналов
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hiddenCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHidden(v => !v)}
              className="gap-2"
              title={showHidden ? "Спрятать скрытые" : "Показать скрытые"}
            >
              {showHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showHidden ? "Скрыть" : `Скрытые (${hiddenCount})`}
            </Button>
          )}
          {hiddenCount > 0 && showHidden && (
            <Button variant="ghost" size="sm" onClick={handleUnhideAll}>
              Сбросить
            </Button>
          )}
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Добавить источник
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      {visibleSources.length > 0 && (() => {
        const anyLoading = Object.values(statsLoading).some(Boolean);
        const sumVisits = visibleStats.reduce((s, v) => s + v.visits, 0);
        const sumRegs = visibleStats.reduce((s, v) => s + v.registrations, 0);
        const sumPay = visibleStats.reduce((s, v) => s + v.payments, 0);
        const sumRevenue = visibleStats.reduce((s, v) => s + (v.revenue || 0), 0);
        const summaryNum = (val: number) => anyLoading
          ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          : <p className="text-xl font-bold">{val.toLocaleString('ru-RU')}</p>;
        const summaryRub = (val: number) => anyLoading
          ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          : <p className="text-xl font-bold">{formatRub(val)}</p>;
        return (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        >
          <div className="p-3 md:p-4 rounded-xl bg-card border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Источников</span>
            </div>
            <p className="text-xl font-bold">{visibleSources.length}</p>
          </div>
          <div className="p-3 md:p-4 rounded-xl bg-card border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <MousePointerClick className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Переходов</span>
            </div>
            {summaryNum(sumVisits)}
          </div>
          <div className="p-3 md:p-4 rounded-xl bg-card border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Регистраций</span>
            </div>
            {summaryNum(sumRegs)}
          </div>
          <div className="p-3 md:p-4 rounded-xl bg-card border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Оплат</span>
            </div>
            {summaryNum(sumPay)}
          </div>
          <div className="p-3 md:p-4 rounded-xl bg-card border border-border/30 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">Сумма оплат</span>
            </div>
            {summaryRub(sumRevenue)}
          </div>
        </motion.div>
        );
      })()}

      {/* Sources list */}
      {visibleSources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">
              {sources.length === 0 ? "Нет UTM-источников" : "Все источники скрыты"}
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              {sources.length === 0 ? "Создайте первый источник для отслеживания трафика" : "Нажмите «Скрытые», чтобы их показать"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleSources.map((source, index) => {
            const s = stats[source.id] || { visits: 0, registrations: 0, payments: 0, revenue: 0 };
            const isStatLoading = !!statsLoading[source.id];
            const renderNum = (val: number, color: string) => isStatLoading
              ? <Loader2 className={cn("w-4 h-4 mx-auto animate-spin", color)} />
              : <p className={cn("text-lg font-bold", color)}>{val}</p>;
            const renderConv = (from: number, to: number) => isStatLoading
              ? <Loader2 className="w-3 h-3 mx-auto animate-spin text-muted-foreground" />
              : <p className="text-sm font-semibold text-muted-foreground">{getConversion(from, to)}</p>;
            return (
              <motion.div
                key={source.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
              >
                <Card className={cn(
                  "overflow-hidden transition-colors",
                  source.is_pinned && "border-amber-500/40 bg-card shadow-sm"
                )}>

                  <CardContent className="p-4 md:p-5">
                    <div className="flex flex-col gap-4">
                      {/* Top row: name + actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {source.is_pinned && (
                              <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
                                <Pin className="w-2.5 h-2.5 mr-1" />
                                Закреплено
                              </Badge>
                            )}
                            <h3 className="font-semibold text-sm md:text-base">{source.name}</h3>
                            <Badge variant="secondary" className="text-[10px]">
                              {source.utm_source}
                            </Badge>
                            {source.utm_medium && (
                              <Badge variant="outline" className="text-[10px]">
                                {source.utm_medium}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-xs text-muted-foreground truncate max-w-[280px] md:max-w-none">
                              {buildUtmUrl(source)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8", source.is_pinned && "text-amber-500 hover:bg-orange-500 hover:text-white")}
                            onClick={() => handleTogglePin(source)}
                            title={source.is_pinned ? "Открепить" : "Закрепить наверх"}
                          >
                            {source.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(source)} title="Дублировать">
                            <CopyPlus className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyUrl(source)} title="Копировать ссылку">
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(buildUtmUrl(source), '_blank')} title="Открыть">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          {hiddenIds.has(source.id) ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUnhide(source.id)} title="Показать">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleHide(source.id)} title="Скрыть со страницы">
                              <EyeOff className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(source.id)} title="Удалить">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Funnel stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 md:gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Переходы</p>
                          {renderNum(s.visits, "text-blue-500")}
                        </div>
                        <div className="hidden sm:block p-2.5 rounded-lg bg-muted/30 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">→ Conv.</p>
                          {renderConv(s.visits, s.registrations)}
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Регистрации</p>
                          {renderNum(s.registrations, "text-emerald-500")}
                        </div>
                        <div className="hidden sm:block p-2.5 rounded-lg bg-muted/30 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">→ Conv.</p>
                          {renderConv(s.registrations, s.payments)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentsDialog({ id: source.id, name: source.name })}
                          className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center hover:bg-amber-500/10 transition-colors cursor-pointer"
                          title="Посмотреть оплаты по источнику"
                        >
                          <p className="text-[10px] text-muted-foreground mb-0.5">Оплаты</p>
                          {renderNum(s.payments, "text-amber-500")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentsDialog({ id: source.id, name: source.name })}
                          className="p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/10 text-center col-span-2 sm:col-span-1 hover:bg-violet-500/10 transition-colors cursor-pointer"
                          title="Посмотреть оплаты по источнику"
                        >
                          <p className="text-[10px] text-muted-foreground mb-0.5">Сумма оплат</p>
                          {isStatLoading
                            ? <Loader2 className="w-4 h-4 mx-auto animate-spin text-violet-500" />
                            : <p className="text-base font-bold text-violet-500">{formatRub(s.revenue)}</p>}
                        </button>
                      </div>
                      
                      {/* Mobile conversion row */}
                      <div className="flex sm:hidden gap-2">
                        <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
                          <p className="text-[10px] text-muted-foreground">Переход → Рег.</p>
                          {isStatLoading ? <Loader2 className="w-3 h-3 mx-auto animate-spin text-muted-foreground" /> : <p className="text-xs font-semibold">{getConversion(s.visits, s.registrations)}</p>}
                        </div>
                        <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
                          <p className="text-[10px] text-muted-foreground">Рег. → Оплата</p>
                          {isStatLoading ? <Loader2 className="w-3 h-3 mx-auto animate-spin text-muted-foreground" /> : <p className="text-xs font-semibold">{getConversion(s.registrations, s.payments)}</p>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* Sentinel + load more indicator */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              {loadingMore ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-xs text-muted-foreground/60">Прокрутите для загрузки</span>
              )}
            </div>
          )}
          {!hasMore && sources.length >= PAGE_SIZE && (
            <p className="text-center text-xs text-muted-foreground/60 py-4">Все источники загружены</p>
          )}
        </div>
      )}

      {/* Create/Duplicate Dialog */}
      <ResponsiveDialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader className="pb-2">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/25 shrink-0">
                <Link2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <ResponsiveDialogTitle className="text-lg">Новый UTM-источник</ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="text-xs mt-1">
                  Создайте ссылку для отслеживания трафика
                </ResponsiveDialogDescription>
              </div>
            </div>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="utm-name" className="text-xs font-medium flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-violet-500" />
                Название <span className="text-destructive">*</span>
              </Label>
              <Input
                id="utm-name"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Telegram канал, VK реклама..."
                className="focus-visible:ring-violet-500/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="utm-source" className="text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                utm_source <span className="text-destructive">*</span>
              </Label>
              <Input
                id="utm-source"
                value={formSource}
                onChange={e => setFormSource(e.target.value)}
                placeholder="telegram, vk, google..."
                className="focus-visible:ring-violet-500/40 font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="utm-medium" className="text-xs font-medium flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-violet-500" />
                  utm_medium
                </Label>
                <Input
                  id="utm-medium"
                  value={formMedium}
                  onChange={e => setFormMedium(e.target.value)}
                  placeholder="cpc, social, email..."
                  className="focus-visible:ring-violet-500/40 font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="utm-campaign" className="text-xs font-medium flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-violet-500" />
                  utm_campaign
                </Label>
                <Input
                  id="utm-campaign"
                  value={formCampaign}
                  onChange={e => setFormCampaign(e.target.value)}
                  placeholder="spring_2026..."
                  className="focus-visible:ring-violet-500/40 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="utm-baseurl" className="text-xs font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-violet-500" />
                Базовый URL
              </Label>
              <Input
                id="utm-baseurl"
                value={formBaseUrl}
                onChange={e => setFormBaseUrl(e.target.value)}
                className="focus-visible:ring-violet-500/40 font-mono text-sm"
              />
            </div>

            {/* Preview */}
            {formSource && (
              <div className="relative overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-transparent p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wide flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Превью ссылки
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${formBaseUrl}?utm_source=${formSource}${formMedium ? `&utm_medium=${formMedium}` : ''}${formCampaign ? `&utm_campaign=${formCampaign}` : ''}`;
                      navigator.clipboard.writeText(url);
                      toast({ title: "Скопировано", description: "Ссылка в буфере обмена" });
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Копировать
                  </button>
                </div>
                <p className="text-xs break-all text-foreground/90 font-mono leading-relaxed">
                  {formBaseUrl}
                  <span className="text-violet-600 dark:text-violet-400">?utm_source=</span>{formSource}
                  {formMedium && <><span className="text-violet-600 dark:text-violet-400">&utm_medium=</span>{formMedium}</>}
                  {formCampaign && <><span className="text-violet-600 dark:text-violet-400">&utm_campaign=</span>{formCampaign}</>}
                </p>
              </div>
            )}
          </div>

          <ResponsiveDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="sm:w-auto">
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="sm:w-auto bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-sm shadow-violet-500/25 border-0"
            >
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Создать
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>


      <UtmPaymentsDialog
        open={!!paymentsDialog}
        onOpenChange={(v) => !v && setPaymentsDialog(null)}
        utmSourceId={paymentsDialog?.id || null}
        sourceName={paymentsDialog?.name || ""}
      />
    </div>
  );
}
