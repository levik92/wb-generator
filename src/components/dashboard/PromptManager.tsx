import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "@/hooks/use-toast";
import { Pencil, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Prompt {
  id: string;
  prompt_type: string;
  prompt_template: string;
  created_at: string;
  updated_at: string;
}

const getPromptDisplayName = (type: string): { name: string; description: string; category: string } => {
  const promptNames: Record<string, { name: string; description: string; category: string }> = {
    'description': { 
      name: 'Описание товара', 
      description: 'Промт для генерации описаний товаров с текстовыми данными',
      category: 'Описание'
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
  return promptNames[type] || { name: type, description: 'Неизвестный тип промта', category: 'Неизвестно' };
};

export function PromptManager() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('prompt_type');

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить промты",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt.id);
    setEditValue(prompt.prompt_template);
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
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ 
          prompt_template: editValue.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', promptId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Промт обновлен",
      });

      setEditingPrompt(null);
      setEditValue('');
      await loadPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить промт",
        variant: "destructive",
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
      const { error } = await supabase
        .from('ai_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Промт удален",
      });

      await loadPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить промт",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Загрузка промтов...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Управление промтами</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Редактирование промтов для генерации описаний и карточек товаров
          </p>
        </div>
      </div>

      <div className="space-y-3 md:space-y-4">
        {/* Sort prompts: description first, then image prompts */}
        {[...prompts]
          .sort((a, b) => {
            const order = ['description', 'cover', 'features', 'macro', 'beforeAfter', 'bundle', 'guarantee', 'lifestyle'];
            return order.indexOf(a.prompt_type) - order.indexOf(b.prompt_type);
          })
          .map((prompt) => {
            const { name, description, category } = getPromptDisplayName(prompt.prompt_type);
            const isEditing = editingPrompt === prompt.id;

            return (
              <Card key={prompt.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <CardTitle className="text-base lg:text-lg break-words">{name}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm break-words">{description}</CardDescription>
                      </div>
                    </div>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => startEdit(prompt)}
                        className="gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        <span>Редактировать</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {isEditing ? (
                    <>
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[250px] lg:min-h-[300px] font-mono text-sm resize-none"
                        placeholder="Введите промт..."
                      />
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={() => savePrompt(prompt.id)}
                          disabled={saving}
                          className="gap-2 flex-1 sm:flex-none"
                        >
                          <Save className="h-4 w-4" />
                          {saving ? "Сохранение..." : "Сохранить"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={cancelEdit}
                          disabled={saving}
                          className="gap-2 flex-1 sm:flex-none"
                        >
                          <X className="h-4 w-4" />
                          Отмена
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-muted p-3 lg:p-4 rounded-lg overflow-x-auto">
                      <pre className="whitespace-pre-wrap text-xs lg:text-sm text-muted-foreground break-words">
                        {prompt.prompt_template}
                      </pre>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Последнее обновление: {new Date(prompt.updated_at).toLocaleString('ru-RU')}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}