import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, Download, QrCode, BarChart3, Package, Settings } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCodeGenerator from 'qrcode';

interface LabelState {
  data: string;
  name: string;
  sku: string;
  copies: number;
}

interface WBState {
  data: string;
  quantity: number;
  sequenceNumber: string;
  freeField: string;
}

interface Settings {
  labelType: 'A4' | 'Термоэтикетка';
  labelSize: string;
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
  const previewRef = useRef<HTMLImageElement>(null);
  
  // Label state
  const [labelState, setLabelState] = useState<LabelState>({
    data: "",
    name: "",
    sku: "",
    copies: 1
  });

  // WB Box state  
  const [wbState, setWbState] = useState<WBState>({
    data: "",
    quantity: 1,
    sequenceNumber: "",
    freeField: ""
  });

  const [settings, setSettings] = useState<Settings>({
    labelType: 'A4',
    labelSize: "58x40"
  });
  
  const [qrText, setQrText] = useState("");
  const [qrSize, setQrSize] = useState([100]);
  const [qrFormat, setQrFormat] = useState("PNG");
  const [qrPreview, setQrPreview] = useState("");

  // Render preview
  const renderPreview = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const isThermal = settings.labelType === 'Термоэтикетка';
    const [labelW, labelH] = isThermal ? parseLabelSize(settings.labelSize) : [210, 297];
    
    // Set canvas size
    const scale = isThermal ? 2 : 1;
    canvas.width = labelW * scale;
    canvas.height = labelH * scale;
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw label content based on active tab
    if (activeTab === 'barcode') {
      drawProductLabel(ctx, labelState, isThermal, scale);
    } else if (activeTab === 'wb') {
      drawWBLabel(ctx, wbState, isThermal, scale);
    }
    
    // Update preview image
    const imageUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (previewRef.current) {
      previewRef.current.removeAttribute('width');
      previewRef.current.removeAttribute('height');  
      previewRef.current.src = imageUrl;
    }
  };

  const drawProductLabel = (ctx: CanvasRenderingContext2D, state: LabelState, isThermal: boolean, scale: number) => {
    const margin = isThermal ? 3 * scale : 12 * scale;
    let x = margin, y = margin;
    const innerW = ctx.canvas.width - margin * 2;

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Product name
    if (state.name?.trim()) {
      ctx.font = `bold ${(isThermal ? 10.5 : 16) * scale}px Arial`;
      const nameLines = wrapText(ctx, state.name, innerW);
      for (let i = 0; i < nameLines.length; i++) {
        ctx.fillText(nameLines[i], x, y);
        y += (isThermal ? 5 : 8) * scale;
      }
      y += (isThermal ? 1.5 : 2) * scale;
    }

    // Article/SKU  
    if (state.sku?.trim()) {
      ctx.font = `${(isThermal ? 9 : 12) * scale}px Arial`;
      ctx.fillText('Артикул: ' + state.sku, x, y);
      y += (isThermal ? 6 : 8) * scale;
    }

    // Barcode placeholder
    if (state.data?.trim()) {
      const barH = (isThermal ? 20 : 30) * scale;
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x, y, innerW, barH);
      ctx.fillStyle = '#000000';
      ctx.font = `${(isThermal ? 8.2 : 10) * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('ШК: ' + state.data + ' · Code‑128', ctx.canvas.width / 2, y + barH + (isThermal ? 2.5 : 3) * scale);
      ctx.textAlign = 'left';
    }
  };

  const drawWBLabel = (ctx: CanvasRenderingContext2D, state: WBState, isThermal: boolean, scale: number) => {
    const margin = isThermal ? 3 * scale : 12 * scale;
    let x = margin, y = margin;
    const innerW = ctx.canvas.width - margin * 2;

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Sequence number
    if (state.sequenceNumber?.trim()) {
      ctx.font = `bold ${(isThermal ? 10.5 : 16) * scale}px Arial`;
      ctx.fillText(state.sequenceNumber, x, y);
      y += (isThermal ? 6 : 8) * scale;
    }

    // Free field
    if (state.freeField?.trim()) {
      ctx.font = `${(isThermal ? 9 : 12) * scale}px Arial`;
      const fieldLines = wrapText(ctx, state.freeField, innerW);
      for (let i = 0; i < fieldLines.length; i++) {
        ctx.fillText(fieldLines[i], x, y);
        y += (isThermal ? 5 : 7) * scale;
      }
      y += (isThermal ? 1 : 2) * scale;
    }

    // Quantity
    ctx.font = `${(isThermal ? 9 : 12) * scale}px Arial`;
    ctx.fillText('Количество: ' + state.quantity, x, y);
    y += (isThermal ? 6 : 8) * scale;

    // Barcode placeholder
    if (state.data?.trim()) {
      const barH = (isThermal ? 20 : 30) * scale;
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x, y, innerW, barH);
      ctx.fillStyle = '#000000';
      ctx.font = `${(isThermal ? 8.2 : 10) * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('ШК: ' + state.data + ' · Code‑128', ctx.canvas.width / 2, y + barH + (isThermal ? 2.5 : 3) * scale);
      ctx.textAlign = 'left';
    }
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Helper functions
  const parseLabelSize = (sizeStr: string): [number, number] => {
    const [width, height] = sizeStr.split('x').map(Number);
    return [width || 40, height || 25];
  };

  // Generate barcode using JsBarcode (proper CODE128)  
  const makeBarcode = (data: string, barWidthPx: number, fontSizePx: number, isThermal: boolean): Promise<string> => {
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

  const generateProductPDF = async () => {
    if (!labelState.data?.trim()) {
      toast("Введите штрихкод");
      return;
    }

    const btn = document.activeElement as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Генерация...';
    }

    try {
      const isThermal = settings.labelType === 'Термоэтикетка';
      const [labelW, labelH] = isThermal ? parseLabelSize(settings.labelSize) : [210, 297];

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isThermal ? [labelW, labelH] : 'a4'
      });

      if (!isThermal) {
        const copies = Math.max(1, Math.min(12, labelState.copies || 1));
        for (let i = 0; i < copies; i++) {
          if (i > 0) doc.addPage('a4');
          await placeLabelOnPDF(doc, labelState, isThermal);
        }
      } else {
        await placeLabelOnPDF(doc, labelState, isThermal);
      }

      const filename = `label_${isThermal ? settings.labelSize + 'mm' : 'A4'}_${(labelState.sku || 'sku').replace(/[^a-z0-9_-]/gi, '')}.pdf`;
      doc.save(filename);
      toast("PDF файл успешно создан!");
    } catch (e: any) {
      console.error('PDF generation error:', e);
      toast('Не удалось сформировать PDF: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Скачать PDF';
      }
    }
  };

  const placeLabelOnPDF = async (doc: any, state: LabelState, isThermal: boolean) => {
    const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
    const margin = isThermal ? 3 : 12;
    let x = margin, y = margin;
    const innerW = page.w - margin * 2;

    // Product name with proper font encoding
    if (state.name?.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isThermal ? 10.5 : 16);
      const nameLines = doc.splitTextToSize(state.name, innerW);
      doc.text(nameLines, x, y + (isThermal ? 4 : 6));
      y += (isThermal ? 5 : 8) * nameLines.length + (isThermal ? 1.5 : 2);
    }

    // Article number
    if (state.sku?.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isThermal ? 9 : 12);
      doc.text('Артикул: ' + state.sku, x, y + (isThermal ? 3 : 4));
      y += (isThermal ? 6 : 8);
    }

    // Generate and add barcode
    if (state.data?.trim()) {
      const barURL = await makeBarcode(state.data, isThermal ? 4 : 3, isThermal ? 22 : 28, isThermal);
      const barH = isThermal ? 20 : 30;
      const textOffset = isThermal ? 4 : 6;
      doc.addImage(barURL, 'PNG', x, y, innerW, barH + textOffset, undefined, 'FAST');
      y += barH + textOffset + (isThermal ? 1.5 : 2);
      
      doc.setFontSize(isThermal ? 8.2 : 10);
      doc.text('ШК: ' + state.data + ' · Code‑128', x, y + (isThermal ? 2.5 : 3));
    }
  };

  const generateWBBoxPDF = async () => {
    if (!wbState.data?.trim()) {
      toast("Введите штрихкод короба");
      return;
    }

    const btn = document.activeElement as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Генерация...';
    }

    try {
      const isThermal = settings.labelType === 'Термоэтикетка';
      const [labelW, labelH] = isThermal ? parseLabelSize(settings.labelSize) : [210, 297];

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isThermal ? [labelW, labelH] : 'a4'
      });

      await placeWBBoxLabelOnPDF(doc, wbState, isThermal);

      const filename = `wb_label_${isThermal ? settings.labelSize + 'mm' : 'A4'}_${(wbState.sequenceNumber || 'box').replace(/[^a-z0-9_-]/gi, '')}.pdf`;
      doc.save(filename);
      toast("PDF файл с этикеткой короба успешно создан!");
    } catch (e: any) {
      console.error('WB PDF generation error:', e);
      toast('Не удалось сформировать PDF: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Скачать PDF';
      }
    }
  };

  const placeWBBoxLabelOnPDF = async (doc: any, state: WBState, isThermal: boolean) => {
    const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
    const margin = isThermal ? 3 : 12;
    let x = margin, y = margin;
    const innerW = page.w - margin * 2;

    // Sequence number with proper font encoding
    if (state.sequenceNumber?.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isThermal ? 10.5 : 16);
      doc.text(state.sequenceNumber, x, y + (isThermal ? 4 : 6));
      y += (isThermal ? 6 : 8);
    }

    // Free field
    if (state.freeField?.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isThermal ? 9 : 12);
      const fieldLines = doc.splitTextToSize(state.freeField, innerW);
      doc.text(fieldLines, x, y + (isThermal ? 3 : 4));
      y += (isThermal ? 5 : 7) * fieldLines.length + (isThermal ? 1 : 2);
    }

    // Quantity
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isThermal ? 9 : 12);
    doc.text('Количество: ' + state.quantity, x, y + (isThermal ? 3 : 4));
    y += (isThermal ? 6 : 8);

    // Generate and add barcode for WB boxes
    if (state.data?.trim()) {
      const barURL = await makeBarcode(state.data, isThermal ? 4 : 3, isThermal ? 22 : 28, isThermal);
      const barH = isThermal ? 20 : 30;
      const textOffset = isThermal ? 4 : 6;
      doc.addImage(barURL, 'PNG', x, y, innerW, barH + textOffset, undefined, 'FAST');
      y += barH + textOffset + (isThermal ? 1.5 : 2);
      
      doc.setFontSize(isThermal ? 8.2 : 10);
      doc.text('ШК: ' + state.data + ' · Code‑128', x, y + (isThermal ? 2.5 : 3));
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
                    <Label htmlFor="barcode">Штрихкод*</Label>
                    <Input
                      id="barcode"
                      value={labelState.data}
                      onChange={(e) => setLabelState(prev => ({ ...prev, data: e.target.value }))}
                      placeholder="Введите штрихкод"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="productName">Название товара</Label>
                    <Input
                      id="productName"
                      value={labelState.name}
                      onChange={(e) => setLabelState(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Введите название товара"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="article">Артикул</Label>
                    <Input
                      id="article"
                      value={labelState.sku}
                      onChange={(e) => setLabelState(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="Введите артикул"
                      className="w-full"
                    />
                  </div>

                  {settings.labelType === 'A4' && (
                    <div className="space-y-2">
                      <Label htmlFor="copies">Количество копий (для A4)</Label>
                      <Input
                        id="copies"
                        type="number"
                        min="1"
                        max="12"
                        value={labelState.copies}
                        onChange={(e) => setLabelState(prev => ({ ...prev, copies: parseInt(e.target.value) || 1 }))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview Area */}
            <Card>
              <CardHeader>
                <CardTitle>Превью этикетки</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="border border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/10"
                  style={{ height: '80vh', overflow: 'hidden', padding: '10px' }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <canvas 
                      ref={canvasRef} 
                      className="hidden"
                    />
                    <img 
                      ref={previewRef}
                      id="previewImg"
                      alt="Превью этикетки"
                      style={{
                        background: '#fff',
                        border: '1px dashed #dcd6fb',
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Section */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Основные настройки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 bg-muted/30 rounded-lg p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label>Тип печати</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="a4" 
                        name="labelType" 
                        value="A4" 
                        checked={settings.labelType === 'A4'}
                        onChange={(e) => setSettings(prev => ({ ...prev, labelType: e.target.value as 'A4' | 'Термоэтикетка' }))}
                      />
                      <Label htmlFor="a4">A4</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="thermal" 
                        name="labelType" 
                        value="Термоэтикетка" 
                        checked={settings.labelType === 'Термоэтикетка'}
                        onChange={(e) => setSettings(prev => ({ ...prev, labelType: e.target.value as 'A4' | 'Термоэтикетка' }))}
                      />
                      <Label htmlFor="thermal">Термоэтикетка</Label>
                    </div>
                  </div>
                </div>
                
                {settings.labelType === 'Термоэтикетка' && (
                  <div className="space-y-2">
                    <Label>Размер термоэтикетки (мм, ШхВ)</Label>
                    <Select value={settings.labelSize} onValueChange={(value) => setSettings(prev => ({ ...prev, labelSize: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {labelSizes.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={generateProductPDF} 
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Скачать PDF
                </Button>
              </div>
            </CardContent>
          </Card>
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
                       <SelectTrigger className="w-full border-2 border-input">
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
                      onChange={(e) => setWbState(prev => ({ ...prev, data: e.target.value }))}
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
                </div>
              </CardContent>
            </Card>

            {/* Preview Area */}
            <Card>
              <CardHeader>
                <CardTitle>Превью этикетки короба</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="border border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/10"
                  style={{ height: '80vh', overflow: 'hidden', padding: '10px' }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <canvas 
                      ref={canvasRef} 
                      className="hidden"
                    />
                    <img 
                      ref={previewRef}
                      id="previewImg"
                      alt="Превью этикетки короба"
                      style={{
                        background: '#fff',
                        border: '1px dashed #dcd6fb',
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Section */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Настройки коробов WB</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 bg-muted/30 rounded-lg p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label>Тип печати</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="wb-a4" 
                        name="wbLabelType" 
                        value="A4" 
                        checked={settings.labelType === 'A4'}
                        onChange={(e) => setSettings(prev => ({ ...prev, labelType: e.target.value as 'A4' | 'Термоэтикетка' }))}
                      />
                      <Label htmlFor="wb-a4">A4</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="wb-thermal" 
                        name="wbLabelType" 
                        value="Термоэтикетка" 
                        checked={settings.labelType === 'Термоэтикетка'}
                        onChange={(e) => setSettings(prev => ({ ...prev, labelType: e.target.value as 'A4' | 'Термоэтикетка' }))}
                      />
                      <Label htmlFor="wb-thermal">Термоэтикетка</Label>
                    </div>
                  </div>
                </div>
                
                {settings.labelType === 'Термоэтикетка' && (
                  <div className="space-y-2">
                    <Label>Размер термоэтикетки (мм, ШхВ)</Label>
                    <Select value={settings.labelSize} onValueChange={(value) => setSettings(prev => ({ ...prev, labelSize: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {labelSizes.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={generateWBBoxPDF} 
                  className="bg-wb-purple hover:bg-wb-purple-dark text-white px-8 py-2 w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Скачать PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}