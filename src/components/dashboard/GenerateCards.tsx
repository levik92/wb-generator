import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image, Download, AlertCircle, Zap } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

interface GenerateCardsProps {
  profile: Profile;
  onTokensUpdate: () => void;
}

const CARD_STAGES = [
  { name: "Hero изображение", description: "Главное фото товара" },
  { name: "Usage", description: "Товар в использовании" },
  { name: "Инфографика", description: "Характеристики и преимущества" },
  { name: "Сравнение", description: "Сравнение с конкурентами" },
  { name: "Детали", description: "Детальные фото и особенности" },
  { name: "Финал", description: "Призыв к действию" }
];

export const GenerateCards = ({ profile, onTokensUpdate }: GenerateCardsProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    if (uploadedFiles.length > 10) {
      toast({
        title: "Слишком много файлов",
        description: "Максимум 10 изображений за раз",
        variant: "destructive",
      });
      return;
    }
    setFiles(uploadedFiles);
  };

  const canGenerate = () => {
    return files.length > 0 && description.trim() && profile.tokens_balance >= 6 && profile.wb_connected;
  };

  const getGuardMessage = () => {
    if (files.length === 0) return "Загрузите хотя бы одно изображение";
    if (!description.trim()) return "Добавьте описание товара";
    if (profile.tokens_balance < 6) return "Недостаточно токенов (нужно 6)";
    if (!profile.wb_connected) return "Подключите Wildberries в настройках";
    return null;
  };

  const simulateGeneration = async () => {
    setGenerating(true);
    setProgress(0);
    setCurrentStage(0);
    setGeneratedImages([]);

    // Simulate generation process
    for (let i = 0; i < CARD_STAGES.length; i++) {
      setCurrentStage(i);
      setProgress((i / CARD_STAGES.length) * 100);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add a placeholder image for each stage
      setGeneratedImages(prev => [...prev, `https://via.placeholder.com/960x1280?text=Stage+${i + 1}`]);
      
      setProgress(((i + 1) / CARD_STAGES.length) * 100);
    }

    toast({
      title: "Карточки сгенерированы!",
      description: "6 карточек готовы к скачиванию",
    });
    
    setGenerating(false);
    onTokensUpdate();
  };

  const downloadAll = () => {
    toast({
      title: "Скачивание начато",
      description: "Все изображения будут скачаны в ZIP архиве",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Генерация карточек</h2>
        <p className="text-muted-foreground">
          Создайте 6 профессиональных карточек товаров 960×1280 пикселей
        </p>
      </div>

      {/* Token Cost */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          Стоимость генерации: <strong>6 токенов</strong> за комплект из 6 карточек
        </AlertDescription>
      </Alert>

      {/* Guard Messages */}
      {!canGenerate() && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getGuardMessage()}</AlertDescription>
        </Alert>
      )}

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Загрузка изображений</CardTitle>
          <CardDescription>
            Загрузите до 10 фотографий товара на белом фоне
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Нажмите для загрузки</span> или перетащите файлы
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG до 10MB каждый</p>
                </div>
                <Input
                  type="file"
                  className="hidden input-bordered"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {files.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <Badge className="absolute -top-2 -right-2 bg-wb-purple">
                      {index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Description */}
      <Card>
        <CardHeader>
          <CardTitle>Описание товара</CardTitle>
          <CardDescription>
            Опишите товар, его преимущества и пожелания по дизайну карточек
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="description">Описание и пожелания</Label>
            <Textarea
              id="description"
              placeholder="Опишите ваш товар: основные характеристики, преимущества, целевую аудиторию. Добавьте пожелания по стилю карточек, цветовой гамме, акцентам..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="input-bordered"
            />
            <p className="text-xs text-muted-foreground">
              Чем подробнее описание, тем лучше будут карточки
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Generation Process */}
      {generating && (
        <Card>
          <CardHeader>
            <CardTitle>Генерация в процессе...</CardTitle>
            <CardDescription>
              Этап {currentStage + 1} из {CARD_STAGES.length}: {CARD_STAGES[currentStage]?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {CARD_STAGES[currentStage]?.description}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Results */}
      {generatedImages.length > 0 && !generating && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Готовые карточки</CardTitle>
                <CardDescription>
                  {generatedImages.length} карточек готовы к скачиванию
                </CardDescription>
              </div>
              <Button onClick={downloadAll} className="bg-wb-purple hover:bg-wb-purple-dark">
                <Download className="w-4 h-4 mr-2" />
                Скачать все
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {generatedImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Generated card ${index + 1}`}
                    className="w-full aspect-[3/4] object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Button size="sm" variant="secondary">
                      <Download className="w-4 h-4 mr-2" />
                      Скачать
                    </Button>
                  </div>
                  <Badge className="absolute top-2 left-2 bg-wb-purple">
                    {CARD_STAGES[index]?.name}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={simulateGeneration}
            disabled={!canGenerate() || generating}
            className="w-full bg-wb-purple hover:bg-wb-purple-dark"
            size="lg"
          >
            {generating ? (
              "Генерирую карточки..."
            ) : (
              <>
                <Image className="w-5 h-5 mr-2" />
                Сгенерировать карточки (6 токенов)
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};