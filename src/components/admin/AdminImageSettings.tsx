import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Save, ImageIcon } from "lucide-react";

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

      toast({
        title: "Успешно",
        description: "Настройки разрешения сохранены",
      });
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg sm:text-xl">Настройки генерации изображений</CardTitle>
        </div>
        <CardDescription className="text-xs sm:text-sm mt-1">
          Управление качеством и разрешением генерируемых изображений (Google Gemini)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 sm:pt-0">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Разрешение изображений</Label>
            <RadioGroup
              value={resolution}
              onValueChange={(value) => setResolution(value as ImageResolution)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="1K" id="resolution-1k" className="mt-0.5" />
                <Label htmlFor="resolution-1k" className="flex flex-col cursor-pointer">
                  <span className="font-medium">1K (1024×1536)</span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    Быстрее генерация, меньше размер файла (~1 МБ)
                  </span>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="2K" id="resolution-2k" className="mt-0.5" />
                <Label htmlFor="resolution-2k" className="flex flex-col cursor-pointer">
                  <span className="font-medium">2K (2048×3072)</span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    Высокое качество, больше размер файла (~2 МБ). Рекомендуется.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              * Стоимость API одинакова для обоих разрешений
            </p>
            <Button 
              onClick={handleSave} 
              disabled={saving || resolution === settings?.image_resolution}
              size="sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Сохранить
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
