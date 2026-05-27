import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, ImageIcon, Check, Zap, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageResolution = '1K' | '2K';

interface ModelSettings {
  id: string;
  active_model: string;
  image_resolution: ImageResolution;
  updated_at: string;
}

export function AdminImageSettings() {
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [resolution, setResolution] = useState<ImageResolution>('2K');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings(data as ModelSettings);
        setResolution((data.image_resolution as ImageResolution) || '2K');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_model_settings')
        .update({
          image_resolution: resolution,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({ title: "Успешно", description: "Настройки разрешения сохранены" });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
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

  const isDirty = resolution !== settings?.image_resolution;

  const options: { value: ImageResolution; title: string; dims: string; desc: string; icon: typeof Zap; recommended?: boolean }[] = [
    { value: '1K', title: '1K', dims: '1024×1536', desc: 'Быстрее генерация, меньше размер файла (~1 МБ)', icon: Zap },
    { value: '2K', title: '2K', dims: '2048×3072', desc: 'Высокое качество, больше размер файла (~2 МБ)', icon: Sparkles, recommended: true },
  ];

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-3">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-2 shadow-sm shadow-violet-500/25">
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg leading-tight">Настройки генерации изображений</CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Управление качеством и разрешением генерируемых изображений
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
        <div>
          <Label className="text-xs sm:text-sm font-medium mb-2.5 block text-muted-foreground">
            Разрешение изображений
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {options.map((opt) => {
              const selected = resolution === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setResolution(opt.value)}
                  className={cn(
                    "group relative text-left rounded-xl border p-3 sm:p-3.5 transition-all",
                    "hover:border-violet-500/40 hover:bg-violet-500/[0.03]",
                    selected
                      ? "border-violet-500/60 bg-gradient-to-br from-violet-500/[0.08] to-purple-500/[0.05] shadow-sm shadow-violet-500/10"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      "shrink-0 rounded-lg p-1.5 transition-colors",
                      selected
                        ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                        : "bg-muted text-muted-foreground group-hover:text-violet-500"
                    )}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm">{opt.title}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">{opt.dims}</span>
                        {opt.recommended && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-violet-500/10 text-violet-600 dark:text-violet-400 border-0">
                            Рекомендуется
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-snug">
                        {opt.desc}
                      </p>
                    </div>
                    <div className={cn(
                      "shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                      selected
                        ? "border-violet-500 bg-violet-500"
                        : "border-border"
                    )}>
                      {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>Стоимость API одинакова для обоих разрешений</span>
          </p>
          <Button
            onClick={handleSave}
            disabled={saving || !isDirty}
            size="sm"
            className={cn(
              "w-full sm:w-auto transition-all",
              isDirty && "bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 shadow-sm shadow-violet-500/25"
            )}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Сохранить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
