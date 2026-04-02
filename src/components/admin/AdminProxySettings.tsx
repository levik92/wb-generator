import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Shield, Save } from "lucide-react";

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
        ? await supabase
            .from('ai_model_settings')
            .update(payload)
            .eq('id', existing.id)
        : await supabase
            .from('ai_model_settings')
            .insert(payload);

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
      <Card>
        <CardContent className="py-6 flex justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">HTTP Прокси</CardTitle>
        </div>
        <CardDescription>
          Проксирование запросов к внешним AI API (Google Gemini и др.).
          <span className="block mt-1 text-xs font-medium text-amber-500">
            Не влияет на Polza AI — запросы через Polza всегда идут напрямую.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="proxy-toggle" className="font-medium">
            Включить прокси
          </Label>
          <Switch
            id="proxy-toggle"
            checked={proxyEnabled}
            onCheckedChange={setProxyEnabled}
          />
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="proxy-url">URL прокси</Label>
            <Input
              id="proxy-url"
              placeholder="http://proxy.example.com:8080"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              disabled={!proxyEnabled}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proxy-user">Логин</Label>
              <Input
                id="proxy-user"
                placeholder="username"
                value={proxyUsername}
                onChange={(e) => setProxyUsername(e.target.value)}
                disabled={!proxyEnabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proxy-pass">Пароль</Label>
              <Input
                id="proxy-pass"
                type="password"
                placeholder="••••••"
                value={proxyPassword}
                onChange={(e) => setProxyPassword(e.target.value)}
                disabled={!proxyEnabled}
              />
            </div>
          </div>
        </div>

        <Button onClick={saveSettings} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
      </CardContent>
    </Card>
  );
};
