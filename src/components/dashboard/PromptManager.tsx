import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Pencil, Save, X, ChevronDown, ChevronRight, Image as ImageIcon, Video, Wrench, Sparkles, Zap, Cpu, Check, Settings2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdminImageSettings } from "@/components/admin/AdminImageSettings";
import { AdminProxySettings } from "@/components/admin/AdminProxySettings";
import { cn } from "@/lib/utils";
interface Prompt {
  id: string;
  prompt_type: string;
  prompt_template: string;
  model_type: string;
  created_at: string;
  updated_at: string;
}
interface ModelSettings {
  id: string;
  active_model: 'openai' | 'google';
  api_provider?: 'direct' | 'polza';
}
const getPromptDisplayName = (type: string): {
  name: string;
  description: string;
  category: string;
} => {
  const promptNames: Record<string, {
    name: string;
    description: string;
    category: string;
  }> = {
    'description': {
      name: 'Описание товара',
      description: 'Промт для генерации описаний товаров с текстовыми данными',
      category: 'Описание'
    },
    'edit': {
      name: 'Редактирование карточки',
      description: 'Редактирование карточки товара',
      category: 'Изображение'
    },
    'edit-card': {
      name: 'Редактирование карточки',
      description: 'Редактирование карточки товара',
      category: 'Изображение'
    },
    'cover': {
      name: 'Главная карточка',
      description: 'Промт для главного фото товара с описанием ключевых преимуществ для повышения CTR',
      category: 'Изображение'
    },
    'features': {
      name: 'Свойства',
      description: 'Промт для фото с описанием товара',
      category: 'Изображение'
    },
    'macro': {
      name: 'Макро с составом или характеристиками',
      description: 'Промт для детальной съемки с указанием состава, характеристик или материалов товара',
      category: 'Изображение'
    },
    'beforeAfter': {
      name: 'Товар в использовании',
      description: 'Промт для демонстрации товара в процессе использования',
      category: 'Изображение'
    },
    'bundle': {
      name: 'Сравнение с конкурентом',
      description: 'Промт для карточки сравнения данного товара с конкурентами',
      category: 'Изображение'
    },
    'guarantee': {
      name: 'Фото без инфографики',
      description: 'Промт для чистого фото товара без дополнительных графических элементов и текста',
      category: 'Изображение'
    },
    'lifestyle': {
      name: 'Свойства и преимущества',
      description: 'Промт для фото с описанием свойств и преимуществ товара',
      category: 'Изображение'
    },
    'mainEdit': {
      name: 'Редактирование основная',
      description: 'Промт для профессиональной обработки фото: улучшение фона, освещения и цветокоррекции',
      category: 'Изображение'
    },
    'identify-product': {
      name: 'Определение товара',
      description: 'Промт для автоматического определения наименования товара по фотографии (Gemini Flash Lite)',
      category: 'Технический'
    },
    'support_ai': {
      name: 'AI Поддержка',
      description: 'Промт для виртуального ассистента поддержки на сайте',
      category: 'Технический'
    },
    'inn_lookup': {
      name: 'Поиск организации по ИНН',
      description: 'Промт для поиска данных организации по ИНН через Gemini',
      category: 'Технический'
    },
    'style-analysis': {
      name: 'Стиль',
      description: 'Задание стиля карточке',
      category: 'Технический'
    }
  };
  return promptNames[type] || {
    name: type,
    description: 'Редактирование карточки товара',
    category: 'Изображение'
  };
};
export function PromptManager() {
  const queryClient = useQueryClient();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<'openai' | 'google'>('openai');
  const [savingModel, setSavingModel] = useState(false);
  const [activeTab, setActiveTab] = useState<'openai' | 'google'>('openai');
  const [seedingGemini, setSeedingGemini] = useState(false);
  const [openPrompts, setOpenPrompts] = useState<Set<string>>(new Set());
  const [editingVideoPrompt, setEditingVideoPrompt] = useState<string | null>(null);
  const [videoEditValue, setVideoEditValue] = useState('');
  const [savingVideoPrompt, setSavingVideoPrompt] = useState(false);
  const [editingTechPrompt, setEditingTechPrompt] = useState<string | null>(null);
  const [techEditValue, setTechEditValue] = useState('');
  const [savingTechPrompt, setSavingTechPrompt] = useState(false);
  const [apiProvider, setApiProvider] = useState<'direct' | 'polza'>('direct');
  const [savingProvider, setSavingProvider] = useState(false);
  const [videoApiProvider, setVideoApiProvider] = useState<'direct' | 'polza'>('direct');
  const [savingVideoProvider, setSavingVideoProvider] = useState(false);
  useEffect(() => {
    loadPrompts();
    loadActiveModel();
  }, []);
  const loadPrompts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('ai_prompts').select('*').order('prompt_type');
      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить промты",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadActiveModel = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('ai_model_settings').select('active_model, api_provider, video_api_provider').order('updated_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (error) throw error;
      if (data?.active_model) {
        setActiveModel(data.active_model as 'openai' | 'google');
        setActiveTab(data.active_model as 'openai' | 'google');
      }
      if ((data as any)?.api_provider) {
        setApiProvider((data as any).api_provider as 'direct' | 'polza');
      }
      if ((data as any)?.video_api_provider) {
        setVideoApiProvider((data as any).video_api_provider as 'direct' | 'polza');
      }
    } catch (error) {
      console.error('Error loading active model:', error);
    }
  };
  const seedGeminiPrompts = async () => {
    try {
      setSeedingGemini(true);
      const basePrompts = prompts.filter(p => !p.model_type || p.model_type === 'openai');
      if (basePrompts.length === 0) {
        toast({
          title: 'Нет промтов OpenAI',
          description: 'Сначала настройте промты для OpenAI, затем можно скопировать их для Gemini.',
          variant: 'destructive'
        });
        setSeedingGemini(false);
        return;
      }

      // Проверяем, какие промты уже существуют для Gemini
      const existingGeminiPrompts = prompts.filter(p => p.model_type === 'google');
      const existingTypes = new Set(existingGeminiPrompts.map(p => p.prompt_type));

      // Фильтруем только те промты, которых ещё нет для Gemini
      const insertData = basePrompts.filter(p => !existingTypes.has(p.prompt_type)).map(p => ({
        prompt_type: p.prompt_type,
        prompt_template: p.prompt_template,
        model_type: 'google'
      }));
      if (insertData.length === 0) {
        toast({
          title: 'Промты уже существуют',
          description: 'Все промты для Gemini уже созданы.'
        });
        setSeedingGemini(false);
        return;
      }
      const {
        data,
        error
      } = await supabase.from('ai_prompts').insert(insertData).select('*');
      if (error) {
        console.error('Insert error details:', error);
        throw error;
      }
      await loadPrompts();
      toast({
        title: 'Промты созданы',
        description: `Для Gemini создано ${insertData.length} промтов. Теперь вы можете их редактировать.`
      });
    } catch (error: any) {
      console.error('Error seeding Gemini prompts:', error);
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось создать промты для Gemini. Проверьте консоль для деталей.',
        variant: 'destructive'
      });
    } finally {
      setSeedingGemini(false);
    }
  };
  const saveActiveModel = async (model: 'openai' | 'google') => {
    setSavingModel(true);
    try {
      const {
        data: existing
      } = await supabase.from('ai_model_settings').select('id').order('updated_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (existing) {
        const {
          error
        } = await supabase.from('ai_model_settings').update({
          active_model: model
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const {
          error
        } = await supabase.from('ai_model_settings').insert({
          active_model: model
        });
        if (error) throw error;
      }
      setActiveModel(model);
      setActiveTab(model);
      queryClient.invalidateQueries({
        queryKey: ['active-ai-model']
      });
      toast({
        title: "Успешно",
        description: `Активная модель изменена на ${model === 'openai' ? 'OpenAI' : 'Gemini (Nanabanana Pro)'}`
      });
    } catch (error) {
      console.error('Error saving active model:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки модели",
        variant: "destructive"
      });
    } finally {
      setSavingModel(false);
    }
  };
  const saveApiProvider = async (provider: 'direct' | 'polza') => {
    setSavingProvider(true);
    try {
      const { data: existing } = await supabase.from('ai_model_settings').select('id').order('updated_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('ai_model_settings').update({ api_provider: provider } as any).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_model_settings').insert({ api_provider: provider } as any);
        if (error) throw error;
      }
      setApiProvider(provider);
      queryClient.invalidateQueries({
        queryKey: ['active-ai-model']
      });
      toast({
        title: "Успешно",
        description: `Провайдер изменён на ${provider === 'direct' ? 'Прямое подключение' : 'Польза AI'}`
      });
    } catch (error) {
      console.error('Error saving provider:', error);
      toast({ title: "Ошибка", description: "Не удалось сохранить провайдера", variant: "destructive" });
    } finally {
      setSavingProvider(false);
    }
  };
  const saveVideoApiProvider = async (provider: 'direct' | 'polza') => {
    setSavingVideoProvider(true);
    try {
      const { data: existing } = await supabase.from('ai_model_settings').select('id').order('updated_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('ai_model_settings').update({ video_api_provider: provider } as any).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_model_settings').insert({ video_api_provider: provider } as any);
        if (error) throw error;
      }
      setVideoApiProvider(provider);
      queryClient.invalidateQueries({
        queryKey: ['active-ai-model']
      });
      toast({
        title: "Успешно",
        description: `Провайдер видео изменён на ${provider === 'direct' ? 'Прямое подключение (Kling)' : 'Польза AI'}`
      });
    } catch (error) {
      console.error('Error saving video provider:', error);
      toast({ title: "Ошибка", description: "Не удалось сохранить провайдера видео", variant: "destructive" });
    } finally {
      setSavingVideoProvider(false);
    }
  };
  const togglePrompt = (promptId: string) => {
    setOpenPrompts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(promptId)) {
        newSet.delete(promptId);
      } else {
        newSet.add(promptId);
      }
      return newSet;
    });
  };
  const startEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt.id);
    setEditValue(prompt.prompt_template);
    // Auto-open prompt when editing
    setOpenPrompts(prev => new Set(prev).add(prompt.id));
  };
  const cancelEdit = () => {
    setEditingPrompt(null);
    setEditValue('');
  };
  const savePrompt = async (promptId: string) => {
    if (!editValue.trim()) {
      toast({
        title: "Ошибка",
        description: "Промт не может быть пустым",
        variant: "destructive"
      });
      return;
    }
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from('ai_prompts').update({
        prompt_template: editValue.trim(),
        updated_at: new Date().toISOString()
      }).eq('id', promptId);
      if (error) throw error;
      toast({
        title: "Успешно",
        description: "Промт обновлен"
      });
      setEditingPrompt(null);
      setEditValue('');
      await loadPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить промт",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const deletePrompt = async (promptId: string, promptType: string) => {
    const confirmDelete = window.confirm(`Вы уверены, что хотите удалить промт "${getPromptDisplayName(promptType).name}"?`);
    if (!confirmDelete) return;
    setDeleting(promptId);
    try {
      const {
        error
      } = await supabase.from('ai_prompts').delete().eq('id', promptId);
      if (error) throw error;
      toast({
        title: "Успешно",
        description: "Промт удален"
      });
      await loadPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить промт",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center p-8">
        <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
      </div>;
  }
  const renderPrompts = (modelType: 'openai' | 'google') => {
    const filteredPrompts = prompts.filter(p => p.model_type === modelType);
    if (filteredPrompts.length === 0 && modelType === 'google') {
      return <Card>
          <CardContent className="py-8 text-center text-muted-foreground space-y-4">
            <div>
              <p>Нет промтов для модели Gemini</p>
              <p className="text-sm mt-2">Вы можете скопировать текущие промты OpenAI и настроить их под Gemini.</p>
            </div>
            <Button onClick={seedGeminiPrompts} disabled={seedingGemini} className="mt-2">
              {seedingGemini ? 'Создание промтов...' : 'Создать промты Gemini на основе OpenAI'}
            </Button>
          </CardContent>
        </Card>;
    }
    if (filteredPrompts.length === 0) {
      return <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Нет промтов для модели {modelType === 'openai' ? 'OpenAI' : 'Gemini'}</p>
            <p className="text-sm mt-2">Промты будут добавлены автоматически при первой генерации</p>
          </CardContent>
        </Card>;
    }
    const categoryStyle = (cat: string) => {
      if (cat === 'Описание') return { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-500' };
      if (cat === 'Технический') return { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20', dot: 'bg-purple-500' };
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' };
    };
    return <div className="space-y-2.5">
        {[...filteredPrompts].sort((a, b) => {
        const order = ['description', 'edit-card', 'cover', 'features', 'macro', 'beforeAfter', 'bundle', 'guarantee', 'lifestyle', 'mainEdit'];
        return order.indexOf(a.prompt_type) - order.indexOf(b.prompt_type);
      }).map(prompt => {
        const { name, description, category } = getPromptDisplayName(prompt.prompt_type);
        const isEditing = editingPrompt === prompt.id;
        const isOpen = openPrompts.has(prompt.id);
        const cs = categoryStyle(category);
        return <Collapsible key={prompt.id} open={isOpen} onOpenChange={() => togglePrompt(prompt.id)}>
                <Card className={cn(
                  "overflow-hidden bg-card border-border/60 transition-all",
                  isOpen && "border-primary/30 shadow-sm",
                  isEditing && "border-primary/50 ring-1 ring-primary/20"
                )}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full text-left p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", cs.bg)}>
                          <Sparkles className={cn("h-4 w-4", cs.text)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm sm:text-base truncate">{name}</h4>
                            <Badge variant="outline" className={cn("text-[10px] font-medium", cs.bg, cs.text, cs.border)}>
                              {category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); startEdit(prompt); }}
                            className="h-8 w-8"
                            title="Редактировать"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <div className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 border-t border-border/40">
                      <div className="space-y-3 pt-3">
                        {isEditing ? <>
                            <Textarea value={editValue} onChange={e => setEditValue(e.target.value)} className="min-h-[260px] lg:min-h-[320px] font-mono text-xs sm:text-sm resize-y bg-background" placeholder="Введите промт..." />
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button onClick={() => savePrompt(prompt.id)} disabled={saving} className="gap-2 flex-1 sm:flex-none">
                                <Save className="h-4 w-4" />
                                {saving ? "Сохранение…" : "Сохранить"}
                              </Button>
                              <Button variant="outline" onClick={cancelEdit} disabled={saving} className="gap-2 flex-1 sm:flex-none">
                                <X className="h-4 w-4" />Отмена
                              </Button>
                            </div>
                          </> : <div className="rounded-lg bg-muted/50 border border-border/40 p-3 sm:p-4 max-h-[320px] overflow-auto">
                            <pre className="whitespace-pre-wrap text-[11px] sm:text-xs text-muted-foreground break-words font-mono leading-relaxed">
                              {prompt.prompt_template}
                            </pre>
                          </div>}
                        <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Обновлено: {new Date(prompt.updated_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>;
      })}
      </div>;
  };
  const videoPrompts = prompts.filter(p => p.model_type === 'kling');

  const saveVideoPrompt = async (promptId: string) => {
    if (!videoEditValue.trim()) return;
    setSavingVideoPrompt(true);
    try {
      const { error } = await supabase.from('ai_prompts').update({
        prompt_template: videoEditValue.trim(),
        updated_at: new Date().toISOString()
      }).eq('id', promptId);
      if (error) throw error;
      toast({ title: "Успешно", description: "Промт обновлен" });
      setEditingVideoPrompt(null);
      await loadPrompts();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось сохранить", variant: "destructive" });
    } finally {
      setSavingVideoPrompt(false);
    }
  };

  const technicalPrompts = prompts.filter(p => p.model_type === 'technical' || p.model_type === 'support');

  const saveTechPrompt = async (promptId: string) => {
    if (!techEditValue.trim()) return;
    setSavingTechPrompt(true);
    try {
      const { error } = await supabase.from('ai_prompts').update({
        prompt_template: techEditValue.trim(),
        updated_at: new Date().toISOString()
      }).eq('id', promptId);
      if (error) throw error;
      toast({ title: "Успешно", description: "Промт обновлен" });
      setEditingTechPrompt(null);
      await loadPrompts();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось сохранить", variant: "destructive" });
    } finally {
      setSavingTechPrompt(false);
    }
  };

  // Helper: selectable option card (provider/model picker)
  const OptionCard = ({
    selected, onClick, disabled, icon, title, description, accent = 'primary',
  }: {
    selected: boolean; onClick: () => void; disabled?: boolean;
    icon: React.ReactNode; title: string; description: string;
    accent?: 'primary' | 'emerald' | 'blue' | 'purple';
  }) => {
    const accentMap = {
      primary: { ring: 'ring-primary/40 border-primary/40', bg: 'bg-primary/[0.04]', dot: 'text-primary', iconBg: 'bg-primary/10' },
      emerald: { ring: 'ring-emerald-500/40 border-emerald-500/40', bg: 'bg-emerald-500/[0.04]', dot: 'text-emerald-500', iconBg: 'bg-emerald-500/10' },
      blue: { ring: 'ring-blue-500/40 border-blue-500/40', bg: 'bg-blue-500/[0.04]', dot: 'text-blue-500', iconBg: 'bg-blue-500/10' },
      purple: { ring: 'ring-purple-500/40 border-purple-500/40', bg: 'bg-purple-500/[0.04]', dot: 'text-purple-500', iconBg: 'bg-purple-500/10' },
    }[accent];
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative w-full text-left rounded-xl border bg-card p-4 transition-all",
          "hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          selected ? cn("ring-1", accentMap.ring, accentMap.bg) : "border-border/60 hover:bg-muted/30",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", accentMap.iconBg)}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm sm:text-base">{title}</span>
              {selected && (
                <Badge variant="secondary" className={cn("text-[10px] gap-1 border", accentMap.bg, accentMap.dot)}>
                  <Check className="h-2.5 w-2.5" />Активен
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          </div>
          <div className={cn(
            "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
            selected ? cn("bg-current", accentMap.dot, "border-transparent") : "border-border"
          )}>
            {selected && <Check className="h-3 w-3 text-background" strokeWidth={3} />}
          </div>
        </div>
      </button>
    );
  };

  const PageHeader = ({ icon, title, description, tone = 'primary' }: {
    icon: React.ReactNode; title: string; description: string;
    tone?: 'primary' | 'blue' | 'purple';
  }) => {
    const toneMap = {
      primary: 'from-primary/10 via-primary/5',
      blue: 'from-blue-500/10 via-blue-500/5',
      purple: 'from-purple-500/10 via-purple-500/5',
    }[tone];
    const iconBg = {
      primary: 'bg-primary/15 text-primary',
      blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    }[tone];
    return (
      <div className={cn(
        "rounded-2xl border border-border/50 p-4 sm:p-5 bg-gradient-to-br to-transparent",
        toneMap
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold leading-tight">{title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </div>
    );
  };

  const SectionLabel = ({ icon, children, count }: { icon: React.ReactNode; children: React.ReactNode; count?: number }) => (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-muted-foreground">{icon}</span>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>
      {count !== undefined && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );

  const SavingIndicator = ({ show, label = "Сохранение настроек…" }: { show: boolean; label?: string }) => show ? (
    <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
      <div className="w-3.5 h-3.5 rounded-full border-[2px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
      {label}
    </div>
  ) : null;

  return <div className="space-y-5 md:space-y-6 overflow-x-hidden">
      {/* Top-level tabs: Images / Video / Technical */}
      <Tabs defaultValue="images" className="space-y-5">
        <TabsList className="inline-flex h-auto w-full sm:w-auto p-1 bg-muted/60 rounded-xl gap-1">
          <TabsTrigger value="images" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Изображения</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
            <Video className="h-3.5 w-3.5" />
            <span>Видео</span>
          </TabsTrigger>
          <TabsTrigger value="technical" className="gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
            <Wrench className="h-3.5 w-3.5" />
            <span>Технические</span>
          </TabsTrigger>
        </TabsList>

        {/* ====================== IMAGES ====================== */}
        <TabsContent value="images" className="space-y-5 md:space-y-6 mt-0">
          <PageHeader
            icon={<ImageIcon className="h-5 w-5" />}
            title="Управление промтами и моделями"
            description="Переключение между моделями генерации и редактирование промтов"
          />

          {/* Provider + Model picker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">API провайдер</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Способ подключения к AI моделям
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <OptionCard
                  selected={apiProvider === 'direct'}
                  onClick={() => apiProvider !== 'direct' && saveApiProvider('direct')}
                  disabled={savingProvider}
                  icon={<Zap className="h-4 w-4 text-primary" />}
                  title="Прямое подключение"
                  description="Прямые вызовы к Google Gemini и Kling AI через официальные API"
                />
                <OptionCard
                  selected={apiProvider === 'polza'}
                  onClick={() => apiProvider !== 'polza' && saveApiProvider('polza')}
                  disabled={savingProvider}
                  icon={<Sparkles className="h-4 w-4 text-purple-500" />}
                  title="Польза AI (Polza)"
                  description="Единый API-провайдер для всех моделей через polza.ai"
                  accent="purple"
                />
                <SavingIndicator show={savingProvider} />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Активная модель</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Модель применяется ко всем новым генерациям
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <OptionCard
                  selected={activeModel === 'openai'}
                  onClick={() => activeModel !== 'openai' && saveActiveModel('openai')}
                  disabled={savingModel}
                  icon={<Sparkles className="h-4 w-4 text-emerald-500" />}
                  title="OpenAI (GPT)"
                  description="Версия 2.0 — модель gpt-image-1 для генерации изображений"
                  accent="emerald"
                />
                <OptionCard
                  selected={activeModel === 'google'}
                  onClick={() => activeModel !== 'google' && saveActiveModel('google')}
                  disabled={savingModel}
                  icon={<Sparkles className="h-4 w-4 text-blue-500" />}
                  title="Nanabanana Pro (Gemini)"
                  description="gemini-3.1-pro для описаний и gemini-3-pro-image для изображений"
                  accent="blue"
                />
                <SavingIndicator show={savingModel} />
              </CardContent>
            </Card>
          </div>

          {/* Prompts section */}
          <div>
            <SectionLabel icon={<Sparkles className="h-3.5 w-3.5" />}>Промты по моделям</SectionLabel>
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'openai' | 'google')} className="space-y-4">
              <TabsList className="inline-flex h-auto p-1 bg-muted/60 rounded-xl gap-1">
                <TabsTrigger value="openai" className="gap-2 px-4 py-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
                  OpenAI
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {prompts.filter(p => p.model_type === 'openai').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="google" className="gap-2 px-4 py-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
                  Gemini
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {prompts.filter(p => p.model_type === 'google').length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="openai" className="mt-0">{renderPrompts('openai')}</TabsContent>
              <TabsContent value="google" className="mt-0">{renderPrompts('google')}</TabsContent>
            </Tabs>
          </div>

          {/* Image settings + proxy */}
          <div className="space-y-4">
            <SectionLabel icon={<Settings2 className="h-3.5 w-3.5" />}>Дополнительные настройки</SectionLabel>
            <AdminImageSettings />
            <AdminProxySettings />
          </div>
        </TabsContent>

        {/* ====================== VIDEO ====================== */}
        <TabsContent value="video" className="space-y-5 md:space-y-6 mt-0">
          <PageHeader
            icon={<Video className="h-5 w-5" />}
            title="Видеогенерация"
            description="Настройки модели и промта для генерации видеообложек"
            tone="blue"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-base">API провайдер видео</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Можно использовать другой провайдер, чем для изображений
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <OptionCard
                  selected={videoApiProvider === 'direct'}
                  onClick={() => videoApiProvider !== 'direct' && saveVideoApiProvider('direct')}
                  disabled={savingVideoProvider}
                  icon={<Zap className="h-4 w-4 text-blue-500" />}
                  title="Прямое подключение (Kling)"
                  description="Прямые вызовы к Kling AI. Формат 3:4, модель kling-v2-6"
                  accent="blue"
                />
                <OptionCard
                  selected={videoApiProvider === 'polza'}
                  onClick={() => videoApiProvider !== 'polza' && saveVideoApiProvider('polza')}
                  disabled={savingVideoProvider}
                  icon={<Sparkles className="h-4 w-4 text-purple-500" />}
                  title="Польза AI (Polza)"
                  description="Видеогенерация через Polza AI. Модель kling/v3, формат 9:16"
                  accent="purple"
                />
                <SavingIndicator show={savingVideoProvider} />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-base">Модель видеогенерации</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Текущая модель зависит от выбранного провайдера
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                      <Video className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm sm:text-base">
                          {videoApiProvider === 'polza' ? 'Kling 3.0 (через Polza)' : 'Kling AI v2.6 (Direct)'}
                        </span>
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-500/[0.04] text-blue-500 border border-blue-500/40">
                          <Check className="h-2.5 w-2.5" />Активна
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {videoApiProvider === 'polza'
                          ? 'Image-to-video, 5 секунд, формат 9:16, режим std'
                          : 'Image-to-video, 5 секунд, формат 3:4, режим std'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <SectionLabel icon={<Sparkles className="h-3.5 w-3.5" />}>Промт для видеообложек</SectionLabel>
            <Card className="border-border/50">
              <CardContent className="p-4 sm:p-5">
                {videoPrompts.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-6 text-center">Промт для видео не найден</p>
                ) : (
                  videoPrompts.map(vp => (
                    <div key={vp.id} className="space-y-3">
                      {editingVideoPrompt === vp.id ? (
                        <>
                          <Textarea
                            value={videoEditValue}
                            onChange={e => setVideoEditValue(e.target.value)}
                            className="min-h-[220px] font-mono text-xs sm:text-sm bg-background resize-y"
                          />
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button onClick={() => saveVideoPrompt(vp.id)} disabled={savingVideoPrompt} className="gap-2 flex-1 sm:flex-none">
                              <Save className="h-4 w-4" />
                              {savingVideoPrompt ? "Сохранение…" : "Сохранить"}
                            </Button>
                            <Button variant="outline" onClick={() => setEditingVideoPrompt(null)} className="gap-2 flex-1 sm:flex-none">
                              <X className="h-4 w-4" />Отмена
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-lg bg-muted/50 border border-border/40 p-3 sm:p-4 max-h-[320px] overflow-auto">
                            <pre className="whitespace-pre-wrap text-[11px] sm:text-xs text-muted-foreground font-mono leading-relaxed">{vp.prompt_template}</pre>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Обновлено: {new Date(vp.updated_at).toLocaleString('ru-RU')}
                            </span>
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setEditingVideoPrompt(vp.id); setVideoEditValue(vp.prompt_template); }}>
                              <Pencil className="h-3.5 w-3.5" />Редактировать
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====================== TECHNICAL ====================== */}
        <TabsContent value="technical" className="space-y-5 md:space-y-6 mt-0">
          <PageHeader
            icon={<Wrench className="h-5 w-5" />}
            title="Технические промты"
            description="Системные промты для вспомогательных функций платформы"
            tone="purple"
          />

          {technicalPrompts.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                Технические промты не найдены
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {technicalPrompts.map(tp => {
                const { name, description } = getPromptDisplayName(tp.prompt_type);
                const isEditing = editingTechPrompt === tp.id;
                return (
                  <Card key={tp.id} className={cn(
                    "border-border/60 transition-all",
                    isEditing && "border-primary/50 ring-1 ring-primary/20"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                          <Wrench className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base">{name}</CardTitle>
                          <CardDescription className="text-xs mt-1">{description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {isEditing ? (
                          <>
                            <Textarea
                              value={techEditValue}
                              onChange={e => setTechEditValue(e.target.value)}
                              className="min-h-[220px] font-mono text-xs sm:text-sm bg-background resize-y"
                            />
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button onClick={() => saveTechPrompt(tp.id)} disabled={savingTechPrompt} className="gap-2 flex-1 sm:flex-none">
                                <Save className="h-4 w-4" />
                                {savingTechPrompt ? "Сохранение…" : "Сохранить"}
                              </Button>
                              <Button variant="outline" onClick={() => setEditingTechPrompt(null)} className="gap-2 flex-1 sm:flex-none">
                                <X className="h-4 w-4" />Отмена
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="rounded-lg bg-muted/50 border border-border/40 p-3 sm:p-4 max-h-[280px] overflow-auto">
                              <pre className="whitespace-pre-wrap text-[11px] sm:text-xs text-muted-foreground font-mono leading-relaxed">{tp.prompt_template}</pre>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Обновлено: {new Date(tp.updated_at).toLocaleString('ru-RU')}
                              </span>
                              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setEditingTechPrompt(tp.id); setTechEditValue(tp.prompt_template); }}>
                                <Pencil className="h-3.5 w-3.5" />Редактировать
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>;
}
