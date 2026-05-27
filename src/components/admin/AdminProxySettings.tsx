import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Shield, Save, Loader2, Globe, User, KeyRound, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const AdminProxySettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [proxyUsername, setProxyUsername] = useState("");
  const [proxyPassword, setProxyPassword] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_model_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        const d = data as any;
        setProxyEnabled(d.proxy_enabled ?? false);
        setProxyUrl(d.proxy_url ?? "");
        setProxyUsername(d.proxy_username ?? "");
        setProxyPassword(d.proxy_password ?? "");
      }
    } catch (error) {
      console.error('Error loading proxy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('ai_model_settings')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const payload = {
        proxy_enabled: proxyEnabled,
        proxy_url: proxyUrl || null,
        proxy_username: proxyUsername || null,
        proxy_password: proxyPassword || null,
      } as any;

      const { error } = existing
        ? await supabase.from('ai_model_settings').update(payload).eq('id', existing.id)
        : await supabase.from('ai_model_settings').insert(payload);

      if (error) throw error;

      toast({
        title: "Сохранено",
        description: proxyEnabled ? "Прокси включён" : "Прокси выключен",
      });
    } catch (error: any) {
      console.error('Error saving proxy settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки прокси",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "shrink-0 rounded-xl p-2 shadow-sm transition-all",
            proxyEnabled
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
              : "bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-500/20"
          )}>
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base sm:text-lg leading-tight">HTTP Прокси</CardTitle>
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                proxyEnabled
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  proxyEnabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
                )} />
                {proxyEnabled ? "Активен" : "Отключён"}
              </span>
            </div>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Проксирование запросов к внешним AI API
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-2.5 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-400/90 leading-snug">
            Не влияет на Polza AI — запросы через Polza всегда идут напрямую.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
          <div className="min-w-0 flex-1 pr-3">
            <Label htmlFor="proxy-toggle" className="font-medium text-sm cursor-pointer">
              Включить прокси
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Все запросы будут идти через указанный сервер
            </p>
          </div>
          <Switch id="proxy-toggle" checked={proxyEnabled} onCheckedChange={setProxyEnabled} />
        </div>

        <div className={cn(
          "space-y-3 transition-opacity",
          !proxyEnabled && "opacity-50 pointer-events-none"
        )}>
          <div className="space-y-1.5">
            <Label htmlFor="proxy-url" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              URL прокси
            </Label>
            <Input
              id="proxy-url"
              placeholder="http://proxy.example.com:8080"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              disabled={!proxyEnabled}
              className="font-mono text-sm focus-visible:ring-violet-500/40"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proxy-user" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <User className="w-3 h-3" />
                Логин
              </Label>
              <Input
                id="proxy-user"
                placeholder="username"
                value={proxyUsername}
                onChange={(e) => setProxyUsername(e.target.value)}
                disabled={!proxyEnabled}
                className="font-mono text-sm focus-visible:ring-violet-500/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proxy-pass" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <KeyRound className="w-3 h-3" />
                Пароль
              </Label>
              <Input
                id="proxy-pass"
                type="password"
                placeholder="••••••"
                value={proxyPassword}
                onChange={(e) => setProxyPassword(e.target.value)}
                disabled={!proxyEnabled}
                className="font-mono text-sm focus-visible:ring-violet-500/40"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            onClick={saveSettings}
            disabled={saving}
            size="sm"
            className="w-full sm:w-auto bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 shadow-sm shadow-violet-500/25 gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
