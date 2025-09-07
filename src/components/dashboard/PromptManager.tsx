import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Pencil, Save, X } from "lucide-react";

interface Prompt {
  id: string;
  prompt_type: string;
  prompt_template: string;
  created_at: string;
  updated_at: string;
}

const PROMPT_TYPES = [
  { 
    id: 'description', 
    name: 'Генерация описаний', 
    description: 'Промт для создания описаний товаров с текстовыми данными' 
  },
  { 
    id: 'cover', 
    name: 'Обложка карточки', 
    description: 'Промт для создания основной обложки товара' 
  },
  { 
    id: 'lifestyle', 
    name: 'Лайфстайл фото', 
    description: 'Промт для создания фото товара в использовании' 
  },
  { 
    id: 'macro', 
    name: 'Макро съемка', 
    description: 'Промт для детальной съемки товара' 
  },
  { 
    id: 'beforeAfter', 
    name: 'До/После', 
    description: 'Промт для сравнительных фото "до и после"' 
  },
  { 
    id: 'bundle', 
    name: 'Комплект товаров', 
    description: 'Промт для фото товара с аксессуарами' 
  },
  { 
    id: 'guarantee', 
    name: 'Гарантия качества', 
    description: 'Промт для фото товара с акцентом на качество' 
  }
];

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

  const getPromptByType = (type: string) => {
    return prompts.find(p => p.prompt_type === type);
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

      <Tabs defaultValue="description" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          {PROMPT_TYPES.map((type) => (
            <TabsTrigger key={type.id} value={type.id} className="text-xs">
              {type.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROMPT_TYPES.map((type) => {
          const prompt = getPromptByType(type.id);
          const isEditing = editingPrompt === prompt?.id;

          return (
            <TabsContent key={type.id} value={type.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{type.name}</CardTitle>
                      <CardDescription>{type.description}</CardDescription>
                    </div>
                    {prompt && !isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(prompt)}
                        className="gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Редактировать
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {prompt ? (
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
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Промт не найден</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}