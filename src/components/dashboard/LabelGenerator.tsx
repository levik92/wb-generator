import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, QrCode, BarChart3, Package, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import QRCodeGenerator from "qrcode";
import UnifiedLabelMaker from "./UnifiedLabelMaker";

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
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      setQrPreview(qrCode);
      toast("QR-код сгенерирован!");
    } catch (error) {
      console.error("QR generation error:", error);
      toast("Ошибка генерации QR-кода");
    }
  };

  const downloadQR = () => {
    if (!qrPreview) {
      toast("Сначала сгенерируйте QR-код");
      return;
    }
    const link = document.createElement("a");
    link.href = qrPreview;
    link.download = `qr-code-${new Date().toISOString().split("T")[0]}.${qrFormat.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("QR-код скачан!");
  };

  const tabs = [
    { value: "barcode", label: "Этикетки", icon: BarChart3 },
    { value: "qr", label: "QR-коды", icon: QrCode },
    { value: "wb", label: "Короба WB", icon: Package },
  ];

  return (
    <div className="space-y-5">
      {/* Free notice — violet, slim, matches GenerateCards hint */}
      <div className="relative overflow-hidden rounded-xl border border-violet-500/25 bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-200">
              Бесплатно навсегда
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Любые штрихкоды и QR-коды для поставок — без лимитов и оплаты.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        {/* Mobile selector */}
        <div className="block sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-11 rounded-md bg-card border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map(({ value, label, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-violet-500" />
                    <span>{label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop segmented tabs */}
        <TabsList className="hidden sm:grid w-full grid-cols-3 h-11 bg-muted/40 border border-border/60 rounded-xl p-1">
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-200"
            >
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="barcode" className="space-y-4 sm:space-y-6 mt-0">
          <UnifiedLabelMaker mode="barcode" />
        </TabsContent>

        <TabsContent value="wb" className="space-y-4 sm:space-y-6 mt-0">
          <UnifiedLabelMaker mode="wb" />
        </TabsContent>

        <TabsContent value="qr" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Form */}
            <Card className="relative overflow-hidden border-violet-500/20 bg-card rounded-2xl">
              <CardHeader>
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 flex items-center justify-center">
                    <QrCode className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg">Генератор QR-кодов</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      Создавайте QR-коды для любых данных
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="qr-text" className="text-sm font-semibold">Текст или URL</Label>
                  <Textarea
                    id="qr-text"
                    placeholder="Введите текст, URL или любые данные для QR-кода..."
                    value={qrText}
                    onChange={(e) => setQrText(e.target.value)}
                    className="min-h-24 rounded-md bg-background border-border/60 focus-visible:ring-violet-500/40 focus-visible:border-violet-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-semibold">Размер</Label>
                      <span className="text-xs text-muted-foreground font-medium tabular-nums">
                        {qrSize[0]} px
                      </span>
                    </div>
                    <Slider value={qrSize} onValueChange={setQrSize} max={1000} min={100} step={50} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Формат</Label>
                    <Select value={qrFormat} onValueChange={setQrFormat}>
                      <SelectTrigger className="h-10 rounded-md bg-background border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PNG">PNG</SelectItem>
                        <SelectItem value="JPG">JPG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Button
                    onClick={generateQR}
                    className="rounded-md bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm shadow-violet-500/20"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Сгенерировать
                  </Button>
                  {qrPreview && (
                    <Button
                      onClick={downloadQR}
                      variant="outline"
                      className="rounded-md border-border/60 hover:bg-violet-500/10 hover:text-violet-700 hover:border-violet-500/40"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Скачать
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="relative overflow-hidden border-violet-500/20 bg-card rounded-2xl">
              <CardHeader>
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg">Превью</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      {qrPreview ? "Готово — можно скачать" : "Результат появится здесь"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 min-h-[280px] flex items-center justify-center">
                  {qrPreview ? (
                    <img
                      src={qrPreview}
                      alt="QR код"
                      className="max-w-full max-h-[320px] rounded-lg shadow-md bg-white p-2"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground text-sm">
                      <QrCode className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      Заполните поле и нажмите «Сгенерировать»
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
