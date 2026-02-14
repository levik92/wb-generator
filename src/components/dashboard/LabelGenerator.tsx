import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Download, QrCode, BarChart3, Package, Info } from "lucide-react";
import { toast } from "sonner";
import QRCodeGenerator from 'qrcode';
import UnifiedLabelMaker from './UnifiedLabelMaker';

export default function LabelGenerator() {
  const [activeTab, setActiveTab] = useState("barcode");

  // QR code state
  const [qrText, setQrText] = useState("");
  const [qrSize, setQrSize] = useState([500]);
  const [qrFormat, setQrFormat] = useState("PNG");
  const [qrPreview, setQrPreview] = useState("");

  const generateQR = async () => {
    if (!qrText.trim()) {
      toast("Введите текст для QR-кода");
      return;
    }
    try {
      const qrCode = await QRCodeGenerator.toDataURL(qrText, {
        width: qrSize[0],
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      setQrPreview(qrCode);
      toast("QR-код сгенерирован!");
    } catch (error) {
      console.error('QR generation error:', error);
      toast("Ошибка генерации QR-кода");
    }
  };

  const downloadQR = () => {
    if (!qrPreview) {
      toast("Сначала сгенерируйте QR-код");
      return;
    }
    const link = document.createElement('a');
    link.href = qrPreview;
    link.download = `qr-code-${new Date().toISOString().split('T')[0]}.${qrFormat.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("QR-код скачан!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            Генератор этикеток
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] px-1.5 py-0.5 font-medium rounded-md hover:bg-emerald-500/15 aspect-square flex items-center justify-center">
              Free
            </Badge>
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Создавайте этикетки, штрихкоды и QR-коды</p>
        </div>
      </div>

      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
          Этот раздел <span className="font-semibold">бесплатный навсегда</span> для всех пользователей WBGen. Генерируйте любые типы штрихкодов и QR-кодов для формирования поставок без ограничений.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Mobile Tab Selector */}
        <div className="block sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full bg-card/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="barcode">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span>Этикетки</span>
                </div>
              </SelectItem>
              <SelectItem value="qr">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span>QR-коды</span>
                </div>
              </SelectItem>
              <SelectItem value="wb">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span>Короба WB</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Tab List */}
        <TabsList className="hidden sm:grid w-full grid-cols-3 h-12 bg-card border border-border/50 rounded-xl p-1">
          <TabsTrigger value="barcode" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
            Этикетки
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <QrCode className="h-4 w-4" />
            QR-коды
          </TabsTrigger>
          <TabsTrigger value="wb" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="h-4 w-4" />
            Короба WB
          </TabsTrigger>
        </TabsList>

        <TabsContent value="barcode" className="space-y-4 sm:space-y-6">
          <UnifiedLabelMaker mode="barcode" />
        </TabsContent>

        <TabsContent value="wb" className="space-y-4 sm:space-y-6">
          <UnifiedLabelMaker mode="wb" />
        </TabsContent>

        <TabsContent value="qr" className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-1">Генератор QR-кодов</h3>
              <p className="text-sm text-muted-foreground">Создавайте QR-коды для любых данных</p>
            </div>
            
            <div className="space-y-5">
              <div>
                <Label htmlFor="qr-text">Текст или URL</Label>
                <Textarea
                  id="qr-text"
                  placeholder="Введите текст, URL или любые данные для QR-кода..."
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  className="min-h-20 bg-background/50 border-border/50 focus:border-primary/50"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Размер QR-кода: {qrSize[0]}px</Label>
                  <Slider
                    value={qrSize}
                    onValueChange={setQrSize}
                    max={1000}
                    min={100}
                    step={50}
                    className="mt-3"
                  />
                </div>
                
                <div>
                  <Label>Формат файла</Label>
                  <Select value={qrFormat} onValueChange={setQrFormat}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PNG">PNG</SelectItem>
                      <SelectItem value="JPG">JPG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button onClick={generateQR} className="bg-primary hover:bg-primary/90">
                  <QrCode className="h-4 w-4 mr-2" />
                  Сгенерировать
                </Button>
                
                {qrPreview && (
                  <Button onClick={downloadQR} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Скачать
                  </Button>
                )}
              </div>
              
              {qrPreview && (
                <div className="mt-4 p-6 rounded-xl border border-border/50 bg-background/50">
                  <h3 className="font-medium mb-4 text-sm text-muted-foreground">Превью:</h3>
                  <div className="flex justify-center">
                    <img src={qrPreview} alt="Generated QR Code" className="rounded-lg shadow-lg" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
