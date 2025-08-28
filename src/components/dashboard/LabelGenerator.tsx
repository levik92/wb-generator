import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Download, QrCode, BarChart3, Package, Settings } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCodeGenerator from 'qrcode';

// Types based on the provided HTML/JS code
interface LabelState {
  data: string;
  name: string;
  sku: string;
  format: 'A4' | '58x40';
  copies: number;
}

interface WBState {
  data: string;
  quantity: number;
  sequenceNumber: string;
  freeField: string;
  format: 'A4' | '58x40';
}

const labelSizes = [
  "38x21.2",
  "43x25", 
  "48.5x25.4",
  "52x28.5",
  "52x34",
  "52.5x29.7",
  "52.5x35",
  "58x40",
  "70x37",
  "64x33.4",
  "64.6x33.8",
  "64.6x34.8",
  "66.7x46",
  "70x42",
  "70x42.3",
  "70x49.5",
  "105x48"
];

export default function LabelGenerator() {
  const [activeTab, setActiveTab] = useState("barcode");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Label state based on provided code
  const [labelState, setLabelState] = useState<LabelState>({
    data: "123123123",
    name: "Бордюр садовый",
    sku: "MNG-58x40-001",
    format: 'A4',
    copies: 1
  });

  // WB Box state
  const [wbState, setWbState] = useState<WBState>({
    data: "",
    quantity: 1,
    sequenceNumber: "",
    freeField: "",
    format: 'A4'
  });
  
  // QR code state
  const [qrText, setQrText] = useState("");
  const [qrSize, setQrSize] = useState([100]);
  const [qrFormat, setQrFormat] = useState("PNG");
  const [qrPreview, setQrPreview] = useState("");

  // Utility functions from the provided code
  const mmToPx = (mm: number, dpi: number = 300) => (mm / 25.4) * dpi;
  
  const dims = (format: 'A4' | '58x40') => 
    format === '58x40' 
      ? { wmm: 58, hmm: 40, title: '58×40 мм' }
      : { wmm: 210, hmm: 297, title: 'A4' };

  // Text wrapping function from provided code
  const drawWrap = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number = 1) => {
    const words = (text || '-').toString().split(/\s+/);
    let line = '', lines = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        lines++;
        if (lines >= Math.max(1, maxLines) - 1) {
          line = words.slice(i).join(' ');
          break;
        }
        line = words[i];
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, y);
    return y + lineHeight;
  };

  // Render preview function adapted from provided code
  const renderPreview = () => {
    if (!canvasRef.current) return;
    
    const currentState = activeTab === 'barcode' ? labelState : wbState;
    if (!currentState.data) return;
    
    const { wmm, hmm } = dims(currentState.format);
    
    const dpi = 300;
    const W = Math.round(mmToPx(wmm, dpi));
    const H = Math.round(mmToPx(hmm, dpi));
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = W;
    canvas.height = H;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000000';

    const margin = Math.round(mmToPx(currentState.format === '58x40' ? 3 : 12, dpi));
    const innerW = W - margin * 2;
    let x = margin, y = margin;

    if (activeTab === 'barcode') {
      // Product label rendering
      // Title
      const titlePx = currentState.format === '58x40' ? 42 : 66;
      ctx.font = `700 ${titlePx}px Inter, Arial`;
      y = drawWrap(ctx, labelState.name || '-', x, y, innerW, Math.round(titlePx * 1.2), currentState.format === '58x40' ? 2 : 3);

      // Article
      const skuPx = currentState.format === '58x40' ? 32 : 46;
      ctx.font = `500 ${skuPx}px Inter, Arial`;
      ctx.fillText('Артикул: ' + (labelState.sku || '-'), x, y);
      y += Math.round(skuPx * 1.2);
    } else {
      // WB Box label rendering
      // Sequence number
      if (wbState.sequenceNumber?.trim()) {
        const titlePx = currentState.format === '58x40' ? 42 : 66;
        ctx.font = `700 ${titlePx}px Inter, Arial`;
        ctx.fillText(wbState.sequenceNumber, x, y);
        y += Math.round(titlePx * 1.2);
      }

      // Free field
      if (wbState.freeField?.trim()) {
        const fieldPx = currentState.format === '58x40' ? 32 : 46;
        ctx.font = `500 ${fieldPx}px Inter, Arial`;
        y = drawWrap(ctx, wbState.freeField, x, y, innerW, Math.round(fieldPx * 1.2), currentState.format === '58x40' ? 2 : 3);
      }

      // Quantity
      const skuPx = currentState.format === '58x40' ? 32 : 46;
      ctx.font = `500 ${skuPx}px Inter, Arial`;
      ctx.fillText('Количество: ' + wbState.quantity, x, y);
      y += Math.round(skuPx * 1.2);
    }

    // Barcode rendering
    const barsMM = currentState.format === '58x40' ? 20 : 30;
    const barsCanvas = document.createElement('canvas');
    
    try {
      JsBarcode(barsCanvas, currentState.data, {
        format: 'code128',
        displayValue: true,
        font: 'Inter, Arial',
        textPosition: 'bottom',
        fontSize: currentState.format === '58x40' ? 36 : 46,
        textMargin: currentState.format === '58x40' ? 24 : 32,
        margin: 0,
        width: currentState.format === '58x40' ? 4 : 5,
        height: Math.round(mmToPx(barsMM, dpi))
      });

      const scale = (innerW / barsCanvas.width);
      const bw = Math.floor(barsCanvas.width * scale);
      const bh = Math.floor(barsCanvas.height * scale);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(barsCanvas, x, y, bw, bh);
      y += bh + Math.round((currentState.format === '58x40' ? 42 : 66) * 0.35);

      // Tech line
      const infoPx = currentState.format === '58x40' ? 28 : 34;
      ctx.font = `400 ${infoPx}px Inter, Arial`;
      ctx.fillText('ШК: ' + currentState.data + ' · Code‑128', x, y);
    } catch (error) {
      console.warn('Barcode generation failed:', error);
      // Fallback: just show placeholder
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x, y, innerW, Math.round(mmToPx(barsMM, dpi)));
      ctx.fillStyle = '#000000';
      ctx.fillText('ШК: ' + currentState.data + ' · Code‑128', x, y + Math.round(mmToPx(barsMM, dpi)) + 20);
    }

    // Scale canvas to fit preview area
    const box = canvas.parentElement;
    if (box) {
      const pad = 16;
      const boxRect = box.getBoundingClientRect();
      const availW = Math.max(100, boxRect.width - pad * 2);
      const availH = Math.max(100, boxRect.height - pad * 2);
      const fit = Math.min(availW / W, availH / H, 1);
      canvas.style.transform = `scale(${fit})`;
      canvas.style.transformOrigin = 'top left';
      canvas.style.display = 'block';
      canvas.style.background = '#fff';
      canvas.style.border = '1px dashed #dcd6fb';
    }
  };

  // Barcode generation function from provided code
  const makeBar = (data: string, barWidthPx: number, fontSizePx: number, isThermal: boolean): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, data, {
          format: 'code128',
          displayValue: true,
          font: 'helvetica',
          textPosition: 'bottom',
          fontSize: fontSizePx,
          textMargin: isThermal ? 8 : 10,
          margin: 0,
          width: barWidthPx,
          height: isThermal ? 220 : 260
        });
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    });
  };

  // Place same label function from provided code
  const placeSameLabel = async (doc: any, isThermal: boolean) => {
    const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
    const margin = isThermal ? 3 : 12;
    let x = margin, y = margin;
    const innerW = page.w - margin * 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isThermal ? 10.5 : 16);
    const nameLines = doc.splitTextToSize(labelState.name || '-', innerW);
    doc.text(nameLines, x, y + (isThermal ? 4 : 6));
    y += (isThermal ? 5 : 8) * nameLines.length + (isThermal ? 1.5 : 2);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isThermal ? 9 : 12);
    doc.text('Артикул: ' + (labelState.sku || '-'), x, y + (isThermal ? 3 : 4));
    y += (isThermal ? 6 : 8);
    
    const url = await makeBar(labelState.data, isThermal ? 4 : 3, isThermal ? 22 : 28, isThermal);
    const barH = isThermal ? 20 : 30;
    const textOffset = isThermal ? 4 : 6;
    doc.addImage(url, 'PNG', x, y, innerW, barH + textOffset, undefined, 'FAST');
    y += barH + textOffset + (isThermal ? 1.5 : 2);
    
    doc.setFontSize(isThermal ? 8.2 : 10);
    doc.text('ШК: ' + labelState.data + ' · Code‑128', x, y + (isThermal ? 2.5 : 3));
  };

  // PDF generation function adapted from provided code
  const downloadPDF = async (format: 'A4' | '58x40', isWB: boolean = false) => {
    const currentState = isWB ? wbState : labelState;
    if (!currentState.data) {
      toast('Введите данные для штрих‑кода');
      return;
    }

    const btn = document.activeElement as HTMLButtonElement;
    const isThermal = format === '58x40';
    
    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Генерируется…';
      }
      
      const doc = new jsPDF({
        unit: 'mm',
        format: isThermal ? [58, 40] : 'a4',
        compress: true
      });

      const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
      const margin = isThermal ? 3 : 12;
      let x = margin, y = margin;
      const innerW = page.w - margin * 2;

      if (isWB) {
        // WB Box PDF generation
        if (wbState.sequenceNumber?.trim()) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(isThermal ? 10.5 : 16);
          doc.text(wbState.sequenceNumber, x, y + (isThermal ? 4 : 6));
          y += (isThermal ? 6 : 8);
        }

        if (wbState.freeField?.trim()) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(isThermal ? 9 : 12);
          const fieldLines = doc.splitTextToSize(wbState.freeField, innerW);
          doc.text(fieldLines, x, y + (isThermal ? 3 : 4));
          y += (isThermal ? 5 : 7) * fieldLines.length + (isThermal ? 1 : 2);
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isThermal ? 9 : 12);
        doc.text('Количество: ' + wbState.quantity, x, y + (isThermal ? 3 : 4));
        y += (isThermal ? 6 : 8);
      } else {
        // Product label PDF generation
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isThermal ? 10.5 : 16);
        const nameLines = doc.splitTextToSize(labelState.name || '-', innerW);
        doc.text(nameLines, x, y + (isThermal ? 4 : 6));
        y += (isThermal ? 5 : 8) * nameLines.length + (isThermal ? 1.5 : 2);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isThermal ? 9 : 12);
        doc.text('Артикул: ' + (labelState.sku || '-'), x, y + (isThermal ? 3 : 4));
        y += (isThermal ? 6 : 8);
      }

      // Add barcode
      const barURL = await makeBar(currentState.data, isThermal ? 4 : 3, isThermal ? 22 : 28, isThermal);
      const barH = isThermal ? 20 : 30;
      const textOffset = isThermal ? 4 : 6;
      doc.addImage(barURL, 'PNG', x, y, innerW, barH + textOffset, undefined, 'FAST');
      y += barH + textOffset + (isThermal ? 1.5 : 2);
      
      doc.setFontSize(isThermal ? 8.2 : 10);
      doc.text('ШК: ' + currentState.data + ' · Code‑128', x, y + (isThermal ? 2.5 : 3));

      // Add copies for A4 product labels
      if (!isThermal && !isWB) {
        const copies = Math.max(1, Math.min(12, labelState.copies || 1));
        for (let i = 1; i < copies; i++) {
          doc.addPage('a4');
          await placeSameLabel(doc, isThermal);
        }
      }

      const filename = `${isWB ? 'wb_' : ''}label_${isThermal ? '58x40mm' : 'A4'}_${((isWB ? wbState.sequenceNumber : labelState.sku) || 'sku').replace(/[^a-z0-9_-]/gi, '')}.pdf`;
      doc.save(filename);
      toast("PDF файл успешно создан!");
    } catch (e: any) {
      toast('Не удалось сформировать PDF: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Скачать PDF';
      }
    }
  };

  // QR code functions
  const generateQR = async () => {
    if (!qrText.trim()) {
      toast("Введите текст для QR-кода");
      return;
    }
    
    try {
      const qrCode = await QRCodeGenerator.toDataURL(qrText, {
        width: qrSize[0],
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
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

  // Update preview when state changes
  useEffect(() => {
    renderPreview();
  }, [labelState, wbState, activeTab]);

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Генератор этикеток</h1>
          <p className="text-muted-foreground mt-1">Создавайте профессиональные этикетки, штрихкоды и QR-коды для ваших товаров</p>
        </div>
        <div className="bg-green-100 border border-green-300 rounded-lg p-3 max-w-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500 text-white px-2 py-1 text-xs">БЕСПЛАТНО</Badge>
            <span className="text-green-700 text-sm font-medium">3 месяца для новых пользователей</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        {/* Mobile Tab Selector */}
        <div className="block sm:hidden mb-4">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full border-2 border-purple-500 bg-purple-50 hover:bg-purple-100 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-purple-200 shadow-lg">
              <SelectItem value="barcode" className="hover:bg-purple-50">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Этикетки</span>
                </div>
              </SelectItem>
              <SelectItem value="qr" className="hover:bg-purple-50">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">QR-коды</span>
                </div>
              </SelectItem>
              <SelectItem value="wb" className="hover:bg-purple-50">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Короба WB</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Tab List */}
        <TabsList className="hidden sm:grid w-full grid-cols-3 h-10">
          <TabsTrigger value="barcode" className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4" />
            Этикетки
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex items-center gap-2 text-sm">
            <QrCode className="h-4 w-4" />
            QR-коды
          </TabsTrigger>
          <TabsTrigger value="wb" className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" />
            Короба WB
          </TabsTrigger>
        </TabsList>

        <TabsContent value="barcode" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Fields */}
            <Card>
              <CardContent className="space-y-4 bg-muted/30 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="barcode">ШК (данные для Code‑128)*</Label>
                    <Input
                      id="barcode"
                      value={labelState.data}
                      onChange={(e) => setLabelState(prev => ({ ...prev, data: e.target.value.trim() }))}
                      placeholder="Например: 123123123"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="productName">Наименование</Label>
                    <Input
                      id="productName"
                      value={labelState.name}
                      onChange={(e) => setLabelState(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Название товара"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="article">Артикул</Label>
                    <Input
                      id="article"
                      value={labelState.sku}
                      onChange={(e) => setLabelState(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="SKU / Артикул"
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Формат печати</Label>
                      <Select 
                        value={labelState.format} 
                        onValueChange={(value: 'A4' | '58x40') => setLabelState(prev => ({ ...prev, format: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4 (лист)</SelectItem>
                          <SelectItem value="58x40">Термоэтикетка 58×40 мм</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="copies">Копий (A4)</Label>
                      <Input
                        id="copies"
                        type="number"
                        min="1"
                        max="12"
                        value={labelState.copies}
                        onChange={(e) => setLabelState(prev => ({ ...prev, copies: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) }))}
                        className="w-full"
                        disabled={labelState.format === '58x40'}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={renderPreview}
                      variant="outline"
                      className="flex-1"
                    >
                      Предпросмотр
                    </Button>
                    <Button 
                      onClick={() => downloadPDF(labelState.format)} 
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Скачать PDF
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Для термопринтера выбирайте 58×40 мм и печатайте без масштабирования (Actual size).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Preview Area */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Превью макета</CardTitle>
                  <span className="text-sm text-muted-foreground">{dims(labelState.format).title}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="border border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/10"
                  style={{ height: '80vh', overflow: 'hidden', padding: '16px' }}
                >
                  <canvas 
                    ref={canvasRef}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="qr" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Генератор QR-кодов</CardTitle>
              <CardDescription>Создайте QR-код для любого текста или ссылки</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 bg-muted/30 rounded-lg p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Текст для QR-кода</Label>
                    <Textarea
                      value={qrText}
                      onChange={(e) => setQrText(e.target.value)}
                      placeholder="Введите текст, ссылку или любую информацию..."
                      rows={4}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Размер QR-кода (px)</Label>
                    <div className="px-3">
                      <Slider
                        value={qrSize}
                        onValueChange={setQrSize}
                        max={300}
                        min={100}
                        step={10}
                        className="w-full"
                      />
                      <div className="text-center text-sm text-muted-foreground mt-1">
                        {qrSize[0]}px
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Формат файла</Label>
                    <Select value={qrFormat} onValueChange={setQrFormat}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PNG">PNG</SelectItem>
                        <SelectItem value="JPG">JPG</SelectItem>
                        <SelectItem value="SVG">SVG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={generateQR} 
                      className="bg-wb-purple hover:bg-wb-purple-dark flex-1"
                      disabled={!qrText.trim()}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Сгенерировать
                    </Button>
                    <Button 
                      onClick={downloadQR} 
                      variant="outline" 
                      disabled={!qrPreview}
                      className="flex-1 hover:bg-accent hover:text-accent-foreground"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Скачать
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Превью QR-кода</Label>
                  <div className="border border-dashed border-muted-foreground/25 rounded-lg p-8 flex items-center justify-center min-h-[200px] bg-muted/10">
                    {qrPreview ? (
                      <img 
                        src={qrPreview} 
                        alt="QR Code" 
                        className="max-w-full h-auto"
                        style={{ width: qrSize[0], height: qrSize[0] }}
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <QrCode className="h-12 w-12 mx-auto mb-2" />
                        <p>QR-код появится здесь</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wb" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Fields */}
            <Card>
              <CardContent className="space-y-4 bg-muted/30 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wbBarcode">ШК короба*</Label>
                    <Input
                      id="wbBarcode"
                      value={wbState.data}
                      onChange={(e) => setWbState(prev => ({ ...prev, data: e.target.value.trim() }))}
                      placeholder="Введите штрихкод короба"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Количество*</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={wbState.quantity}
                      onChange={(e) => setWbState(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sequenceNumber">Порядковый номер</Label>
                    <Input
                      id="sequenceNumber"
                      value={wbState.sequenceNumber}
                      onChange={(e) => setWbState(prev => ({ ...prev, sequenceNumber: e.target.value }))}
                      placeholder="№1, №2, etc."
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="freeField">Свободное поле</Label>
                    <Input
                      id="freeField"
                      value={wbState.freeField}
                      onChange={(e) => setWbState(prev => ({ ...prev, freeField: e.target.value }))}
                      placeholder="Дополнительная информация"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Формат печати</Label>
                    <Select 
                      value={wbState.format} 
                      onValueChange={(value: 'A4' | '58x40') => setWbState(prev => ({ ...prev, format: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4 (лист)</SelectItem>
                        <SelectItem value="58x40">Термоэтикетка 58×40 мм</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={renderPreview}
                      variant="outline"
                      className="flex-1"
                    >
                      Предпросмотр
                    </Button>
                    <Button 
                      onClick={() => downloadPDF(wbState.format, true)} 
                      className="bg-wb-purple hover:bg-wb-purple-dark text-white flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Скачать PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Area */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Превью этикетки короба</CardTitle>
                  <span className="text-sm text-muted-foreground">{dims(wbState.format).title}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="border border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/10"
                  style={{ height: '80vh', overflow: 'hidden', padding: '16px' }}
                >
                  <canvas 
                    ref={canvasRef}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}