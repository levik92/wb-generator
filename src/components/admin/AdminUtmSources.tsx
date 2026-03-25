import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Copy, Trash2, Link2, Users, CreditCard, MousePointerClick, TrendingDown, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface UtmSource {
  id: string;
  name: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  base_url: string;
  created_at: string;
}

interface UtmStats {
  visits: number;
  registrations: number;
  payments: number;
}

export function AdminUtmSources() {
  const [sources, setSources] = useState<UtmSource[]>([]);
  const [stats, setStats] = useState<Record<string, UtmStats>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form
  const [formName, setFormName] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formMedium, setFormMedium] = useState("");
  const [formCampaign, setFormCampaign] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("https://wbgen.ru");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('utm_sources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (sourcesError) throw sourcesError;
      setSources(sourcesData || []);

      // Fetch stats for each source
      const statsMap: Record<string, UtmStats> = {};
      
      for (const source of (sourcesData || [])) {
        // Visits count
        const { count: visitsCount } = await supabase
          .from('utm_visits')
          .select('id', { count: 'exact', head: true })
          .eq('utm_source_id', source.id);
        
        // Registrations count
        const { count: regsCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('utm_source_id', source.id);
        
        // Payments count - get user_ids from profiles with this utm, then count payments
        const { data: utmProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('utm_source_id', source.id);
        
        let paymentsCount = 0;
        if (utmProfiles && utmProfiles.length > 0) {
          const userIds = utmProfiles.map(p => p.id);
          const { count } = await supabase
            .from('payments')
            .select('id', { count: 'exact', head: true })
            .in('user_id', userIds)
            .eq('status', 'succeeded');
          paymentsCount = count || 0;
        }
        
        statsMap[source.id] = {
          visits: visitsCount || 0,
          registrations: regsCount || 0,
          payments: paymentsCount,
        };
      }
      
      setStats(statsMap);
    } catch (error) {
      console.error('Error fetching UTM data:', error);
      toast.error("Не удалось загрузить данные UTM");
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
      setFormName(""); setFormSource(""); setFormMedium(""); setFormCampaign("");
      setFormBaseUrl("https://wb-gen.lovable.app");
      fetchData();
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
      fetchData();
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Создавайте UTM-ссылки и отслеживайте эффективность каналов
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Добавить источник
        </Button>
      </div>

      {/* Summary stats */}
      {sources.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <div className="p-3 md:p-4 rounded-xl bg-card border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Источников</span>
            </div>
            <p className="text-xl font-bold">{sources.length}</p>
          </div>
          <div className="p-3 md:p-4 rounded-xl bg-card border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <MousePointerClick className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Переходов</span>
            </div>
            <p className="text-xl font-bold">{Object.values(stats).reduce((s, v) => s + v.visits, 0).toLocaleString('ru-RU')}</p>
          </div>
          <div className="p-3 md:p-4 rounded-xl bg-card border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Регистраций</span>
            </div>
            <p className="text-xl font-bold">{Object.values(stats).reduce((s, v) => s + v.registrations, 0).toLocaleString('ru-RU')}</p>
          </div>
          <div className="p-3 md:p-4 rounded-xl bg-card border border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Оплат</span>
            </div>
            <p className="text-xl font-bold">{Object.values(stats).reduce((s, v) => s + v.payments, 0).toLocaleString('ru-RU')}</p>
          </div>
        </motion.div>
      )}

      {/* Sources list */}
      {sources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">Нет UTM-источников</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Создайте первый источник для отслеживания трафика</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sources.map((source, index) => {
            const s = stats[source.id] || { visits: 0, registrations: 0, payments: 0 };
            return (
              <motion.div
                key={source.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex flex-col gap-4">
                      {/* Top row: name + actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyUrl(source)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(buildUtmUrl(source), '_blank')}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(source.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Funnel stats */}
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Переходы</p>
                          <p className="text-lg font-bold text-blue-500">{s.visits}</p>
                        </div>
                        <div className="hidden sm:block p-2.5 rounded-lg bg-muted/30 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">→ Conv.</p>
                          <p className="text-sm font-semibold text-muted-foreground">{getConversion(s.visits, s.registrations)}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Регистрации</p>
                          <p className="text-lg font-bold text-emerald-500">{s.registrations}</p>
                        </div>
                        <div className="hidden sm:block p-2.5 rounded-lg bg-muted/30 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">→ Conv.</p>
                          <p className="text-sm font-semibold text-muted-foreground">{getConversion(s.registrations, s.payments)}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Оплаты</p>
                          <p className="text-lg font-bold text-amber-500">{s.payments}</p>
                        </div>
                      </div>
                      
                      {/* Mobile conversion row */}
                      <div className="flex sm:hidden gap-2">
                        <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
                          <p className="text-[10px] text-muted-foreground">Переход → Рег.</p>
                          <p className="text-xs font-semibold">{getConversion(s.visits, s.registrations)}</p>
                        </div>
                        <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
                          <p className="text-[10px] text-muted-foreground">Рег. → Оплата</p>
                          <p className="text-xs font-semibold">{getConversion(s.registrations, s.payments)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Новый UTM-источник</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Создайте ссылку для отслеживания трафика
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Название *</Label>
              <Input 
                value={formName} 
                onChange={e => setFormName(e.target.value)} 
                placeholder="Telegram канал, VK реклама..." 
              />
            </div>
            <div>
              <Label>utm_source *</Label>
              <Input 
                value={formSource} 
                onChange={e => setFormSource(e.target.value)} 
                placeholder="telegram, vk, google..." 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>utm_medium</Label>
                <Input 
                  value={formMedium} 
                  onChange={e => setFormMedium(e.target.value)} 
                  placeholder="cpc, social, email..." 
                />
              </div>
              <div>
                <Label>utm_campaign</Label>
                <Input 
                  value={formCampaign} 
                  onChange={e => setFormCampaign(e.target.value)} 
                  placeholder="spring_2026..." 
                />
              </div>
            </div>
            <div>
              <Label>Базовый URL</Label>
              <Input 
                value={formBaseUrl} 
                onChange={e => setFormBaseUrl(e.target.value)} 
              />
            </div>

            {/* Preview */}
            {formSource && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
                <p className="text-[10px] text-muted-foreground mb-1">Превью ссылки:</p>
                <p className="text-xs break-all text-foreground/80">
                  {formBaseUrl}?utm_source={formSource}
                  {formMedium ? `&utm_medium=${formMedium}` : ''}
                  {formCampaign ? `&utm_campaign=${formCampaign}` : ''}
                </p>
              </div>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Создать
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
