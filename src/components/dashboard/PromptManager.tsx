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
      name: 'Свойства и преимущества', 
      description: 'Промт для карточки с описанием ключевых свойств и преимуществ товара',
      category: 'Изображение'
    },
    'macro': { 
      name: 'Макро с составом или характеристиками', 
      description: 'Промт для детальной съемки с указанием состава, характеристик или материалов товара',
      category: 'Изображение'
    },
    'usage': { 
      name: 'Товар в использовании + руководство', 
      description: 'Промт для демонстрации товара в процессе использования с инструкциями и рекомендациями',
      category: 'Изображение'
    },
    'comparison': { 
      name: 'Сравнение с другими товарами', 
      description: 'Промт для карточки сравнения данного товара с аналогами или конкурентами',
      category: 'Изображение'
    },
    'clean': { 
      name: 'Фото товара без инфографики', 
      description: 'Промт для чистого фото товара без дополнительных графических элементов и текста',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Загрузка промтов...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Управление промтами</h2>
          <p className="text-muted-foreground mt-1">
            Редактирование промтов для генерации описаний и карточек товаров
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Sort prompts: description first, then image prompts */}
        {[...prompts]
          .sort((a, b) => {
            const order = ['description', 'cover', 'features', 'macro', 'usage', 'comparison', 'clean'];
            return order.indexOf(a.prompt_type) - order.indexOf(b.prompt_type);
          })
          .map((prompt) => {
            const { name, description, category } = getPromptDisplayName(prompt.prompt_type);
            const isEditing = editingPrompt === prompt.id;

            return (
              <Card key={prompt.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{name}</CardTitle>
                          <Badge variant="secondary">
                            {category}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm">{description}</CardDescription>
                      </div>
                    </div>
                    {!isEditing && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startEdit(prompt)}
                        className="gap-2 bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                        Редактировать
                      </Button>
                    )}
                  </div>
                </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isEditing ? (
                    <>
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[300px] font-mono text-sm"
                        placeholder="Введите промт..."
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => savePrompt(prompt.id)}
                          disabled={saving}
                          className="gap-2"
                        >
                          <Save className="h-4 w-4" />
                          {saving ? "Сохранение..." : "Сохранить"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={cancelEdit}
                          disabled={saving}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          Отмена
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
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