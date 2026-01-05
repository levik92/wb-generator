import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Pencil, Save, X, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
    }
  };
  return promptNames[type] || {
    name: type,
    description: 'Редактирование карточки товара',
    category: 'Изображение'
  };
};
export function PromptManager() {
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
      } = await supabase.from('ai_model_settings').select('active_model').order('updated_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (error) throw error;
      if (data?.active_model) {
        setActiveModel(data.active_model as 'openai' | 'google');
        setActiveTab(data.active_model as 'openai' | 'google');
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
      // Update the settings table (should only have one row)
      const {
        data: existing
      } = await supabase.from('ai_model_settings').select('id').limit(1).single();
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Загрузка промтов...</span>
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
    return <div className="space-y-3 md:space-y-4">
        {[...filteredPrompts].sort((a, b) => {
        const order = ['description', 'edit-card', 'cover', 'features', 'macro', 'beforeAfter', 'bundle', 'guarantee', 'lifestyle'];
        return order.indexOf(a.prompt_type) - order.indexOf(b.prompt_type);
      }).map(prompt => {
        const {
          name,
          description,
          category
        } = getPromptDisplayName(prompt.prompt_type);
        const isEditing = editingPrompt === prompt.id;
        return <Collapsible key={prompt.id} open={openPrompts.has(prompt.id)} onOpenChange={() => togglePrompt(prompt.id)}>
                <Card className="overflow-hidden bg-zinc-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-1 text-left">
                        {openPrompts.has(prompt.id) ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base lg:text-lg break-words">{name}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {category}
                            </Badge>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(prompt)} className="shrink-0 h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription className="text-sm break-words ml-6 my-[16px] mt-0 pb-[16px] mb-0">{description}</CardDescription>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {isEditing ? <>
                            <Textarea value={editValue} onChange={e => setEditValue(e.target.value)} className="min-h-[250px] lg:min-h-[300px] font-mono text-sm resize-none" placeholder="Введите промт..." />
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button onClick={() => savePrompt(prompt.id)} disabled={saving} className="gap-2 flex-1 sm:flex-none">
                                <Save className="h-4 w-4" />
                                {saving ? "Сохранение..." : "Сохранить"}
                              </Button>
                              <Button variant="outline" onClick={cancelEdit} disabled={saving} className="gap-2 flex-1 sm:flex-none">
                                <X className="h-4 w-4" />
                                Отмена
                              </Button>
                            </div>
                          </> : <div className="bg-muted p-3 lg:p-4 rounded-lg overflow-x-auto">
                            <pre className="whitespace-pre-wrap text-xs lg:text-sm text-muted-foreground break-words">
                              {prompt.prompt_template}
                            </pre>
                          </div>}
                        <div className="text-xs text-muted-foreground">
                          Последнее обновление: {new Date(prompt.updated_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>;
      })}
      </div>;
  };
  return <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Управление промтами и моделями</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Переключение между моделями генерации и редактирование промтов
          </p>
        </div>

        {/* Model Selection */}
        <Card className="bg-zinc-50">
          <CardHeader>
            <CardTitle className="text-lg">Активная модель генерации</CardTitle>
            <CardDescription>
              Выберите модель для генерации описаний и изображений. Изменение применяется ко всем новым генерациям.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={activeModel} onValueChange={value => saveActiveModel(value as 'openai' | 'google')} disabled={savingModel} className="space-y-3">
              <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/10 transition-colors">
                <RadioGroupItem value="openai" id="openai" />
                <Label htmlFor="openai" className="flex-1 cursor-pointer">
                  <div className="font-semibold mb-[6px]">OpenAI (GPT)</div>
                  <div className="text-xs text-muted-foreground">
                    Версия 2.0 - использует модель gpt-image-1 для генерации изображений
                  </div>
                </Label>
                {activeModel === 'openai' && <Badge variant="default">Активна</Badge>}
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/10 transition-colors">
                <RadioGroupItem value="google" id="google" />
                <Label htmlFor="google" className="flex-1 cursor-pointer">
                  <div className="font-semibold mb-[6px]">Nanabanana Pro (Gemini)</div>
                  <div className="text-xs text-muted-foreground">
                    Использует gemini-3-pro для описаний и gemini-3-pro-image для изображений
                  </div>
                </Label>
                {activeModel === 'google' && <Badge variant="default">Активна</Badge>}
              </div>
            </RadioGroup>
            {savingModel && <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Сохранение настроек...
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Prompts Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'openai' | 'google')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="openai" className="gap-2">
            OpenAI
            <Badge variant="secondary" className="text-xs">
              {prompts.filter(p => p.model_type === 'openai').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="google" className="gap-2">
            Gemini
            <Badge variant="secondary" className="text-xs">
              {prompts.filter(p => p.model_type === 'google').length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="openai" className="mt-6">
          {renderPrompts('openai')}
        </TabsContent>

        <TabsContent value="google" className="mt-6">
          {renderPrompts('google')}
        </TabsContent>
      </Tabs>
    </div>;
}