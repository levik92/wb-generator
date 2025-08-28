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

interface Product {
  barcode: string;
  article: string;
  productName: string;
  supplier: string;
}

interface WBBox {
  boxBarcode: string;
  quantity: number;
  sequenceNumber: string;
  freeField: string;
}

interface Settings {
  barcodeFormat: string;
  labelType: 'A4' | 'Термоэтикетка';
  labelSize: string;
  fontSize: number;
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
  const [products, setProducts] = useState<Product[]>([{
    barcode: "",
    article: "",
    productName: "",
    supplier: ""
  }]);

  const [settings, setSettings] = useState<Settings>({
    barcodeFormat: "CODE128",
    labelType: 'A4',
    labelSize: "58x40",
    fontSize: 12
  });

  const [wbBoxes, setWbBoxes] = useState<WBBox[]>([{
    boxBarcode: "",
    quantity: 1,
    sequenceNumber: "",
    freeField: ""
  }]);

  
  const [qrText, setQrText] = useState("");
  const [qrSize, setQrSize] = useState([100]);
  const [qrFormat, setQrFormat] = useState("PNG");
  const [qrPreview, setQrPreview] = useState("");

  const addProduct = () => {
    setProducts([...products, {
      barcode: "",
      article: "",
      productName: "",
      supplier: ""
    }]);
  };

  const addWBBox = () => {
    setWbBoxes([...wbBoxes, {
      boxBarcode: "",
      quantity: 1,
      sequenceNumber: "",
      freeField: ""
    }]);
  };

  const removeWBBox = (index: number) => {
    if (wbBoxes.length > 1) {
      setWbBoxes(wbBoxes.filter((_, i) => i !== index));
    }
  };

  const updateWBBox = (index: number, field: keyof WBBox, value: string | number) => {
    const updated = wbBoxes.map((box, i) => 
      i === index ? { ...box, [field]: value } : box
    );
    setWbBoxes(updated);
  };

  const clearWBTable = () => {
    setWbBoxes([{
      boxBarcode: "",
      quantity: 1,
      sequenceNumber: "",
      freeField: ""
    }]);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, field: keyof Product, value: string | number) => {
    const updatedProducts = products.map((product, i) => 
      i === index ? { ...product, [field]: value } : product
    );
    setProducts(updatedProducts);
  };

  const clearTable = () => {
    setProducts([{
      barcode: "",
      article: "",
      productName: "",
      supplier: ""
    }]);
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

  const parseLabelSize = (sizeStr: string): [number, number] => {
    const [width, height] = sizeStr.split('x').map(Number);
    return [width || 40, height || 25];
  };

  const generateProductPDF = async () => {
    if (!products || products.length === 0 || !products[0].barcode) {
      toast("Добавьте штрихкод в таблицу");
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
        orientation: isThermal ? 'portrait' : 'portrait',
        unit: 'mm',
        format: isThermal ? [labelW, labelH] : 'a4'
      });

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (i > 0) doc.addPage();

        await placeLabelOnPDF(doc, product, isThermal);
      }

      const filename = `label_${isThermal ? settings.labelSize + 'mm' : 'A4'}_${(products[0].article || 'sku').replace(/[^a-z0-9_-]/gi, '')}.pdf`;
      doc.save(filename);
      toast("PDF файл успешно создан!");
    } catch (e: any) {
      console.error('PDF generation error:', e);
      toast('Не удалось сформировать PDF: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Получить наклейки';
      }
    }
  };

  const placeLabelOnPDF = async (doc: any, product: Product, isThermal: boolean) => {
    const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
    const margin = isThermal ? 3 : 12;
    let x = margin, y = margin;
    const innerW = page.w - margin * 2;

    // Product name with proper font encoding
    if (product.productName?.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isThermal ? 10.5 : 16);
      const nameLines = doc.splitTextToSize(product.productName, innerW);
      doc.text(nameLines, x, y + (isThermal ? 4 : 6));
      y += (isThermal ? 5 : 8) * nameLines.length + (isThermal ? 1.5 : 2);
    }

    // Article number
    if (product.article?.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isThermal ? 9 : 12);
      doc.text('Артикул: ' + product.article, x, y + (isThermal ? 3 : 4));
      y += (isThermal ? 6 : 8);
    }

    // Generate and add barcode
    if (product.barcode?.trim()) {
      const barURL = await makeBarcode(product.barcode, isThermal ? 4 : 3, isThermal ? 22 : 28, isThermal);
      const barH = isThermal ? 20 : 30;
      const textOffset = isThermal ? 4 : 6;
      doc.addImage(barURL, 'PNG', x, y, innerW, barH + textOffset, undefined, 'FAST');
      y += barH + textOffset + (isThermal ? 1.5 : 2);
      
      doc.setFontSize(isThermal ? 8.2 : 10);
      doc.text('ШК: ' + product.barcode + ' · Code‑128', x, y + (isThermal ? 2.5 : 3));
    }
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

  const generateWBBoxPDF = async () => {
    if (!wbBoxes || wbBoxes.length === 0 || !wbBoxes[0].boxBarcode) {
      toast("Добавьте штрихкод короба в таблицу");
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
        orientation: isThermal ? 'portrait' : 'portrait',
        unit: 'mm',
        format: isThermal ? [labelW, labelH] : 'a4'
      });

      for (let i = 0; i < wbBoxes.length; i++) {
        const box = wbBoxes[i];
        if (i > 0) doc.addPage();

        await placeWBBoxLabelOnPDF(doc, box, isThermal);
      }

      const filename = `wb_labels_${isThermal ? settings.labelSize + 'mm' : 'A4'}_${(wbBoxes[0].sequenceNumber || 'box').replace(/[^a-z0-9_-]/gi, '')}.pdf`;
      doc.save(filename);
      toast("PDF файл с этикетками коробов успешно создан!");
    } catch (e: any) {
      console.error('WB PDF generation error:', e);
      toast('Не удалось сформировать PDF: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Получить этикетки коробов';
      }
    }
  };

  const placeWBBoxLabelOnPDF = async (doc: any, box: WBBox, isThermal: boolean) => {
    const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
    const margin = isThermal ? 3 : 12;
    let x = margin, y = margin;
    const innerW = page.w - margin * 2;

    // Sequence number with proper font encoding
    if (box.sequenceNumber?.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isThermal ? 10.5 : 16);
      doc.text(box.sequenceNumber, x, y + (isThermal ? 4 : 6));
      y += (isThermal ? 6 : 8);
    }

    // Free field
    if (box.freeField?.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isThermal ? 9 : 12);
      const fieldLines = doc.splitTextToSize(box.freeField, innerW);
      doc.text(fieldLines, x, y + (isThermal ? 3 : 4));
      y += (isThermal ? 5 : 7) * fieldLines.length + (isThermal ? 1 : 2);
    }

    // Quantity
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isThermal ? 9 : 12);
    doc.text('Количество: ' + box.quantity, x, y + (isThermal ? 3 : 4));
    y += (isThermal ? 6 : 8);

    // Generate and add barcode for WB boxes
    if (box.boxBarcode?.trim()) {
      const barURL = await makeBarcode(box.boxBarcode, isThermal ? 4 : 3, isThermal ? 22 : 28, isThermal);
      const barH = isThermal ? 20 : 30;
      const textOffset = isThermal ? 4 : 6;
      doc.addImage(barURL, 'PNG', x, y, innerW, barH + textOffset, undefined, 'FAST');
      y += barH + textOffset + (isThermal ? 1.5 : 2);
      
      doc.setFontSize(isThermal ? 8.2 : 10);
      doc.text('ШК: ' + box.boxBarcode + ' · Code‑128', x, y + (isThermal ? 2.5 : 3));
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
          {/* Data Input Section */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={clearTable}
                    className="text-red-500 hover:text-red-600 hover:border-red-500 border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Очистить таблицу
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-w-full">
                <div className="min-w-max">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="sm:hidden">Товары</TableHead>
                        <TableHead className="min-w-[70px] w-full sm:min-w-[80px] hidden sm:table-cell">Артикул</TableHead>
                        <TableHead className="min-w-[100px] w-full sm:min-w-[120px]">Название товара*</TableHead>
                        <TableHead className="min-w-[90px] w-full sm:min-w-[100px] hidden sm:table-cell">Наименование продавца</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {products.map((product, index) => (
                      <TableRow key={index}>
                        {/* Mobile: Show fields vertically */}
                        <TableCell className="sm:hidden p-2">
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Штрихкод*</Label>
                              <Input
                                value={product.barcode}
                                onChange={(e) => updateProduct(index, 'barcode', e.target.value)}
                                className="w-full mt-1"
                                placeholder="Введите штрихкод"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Название товара*</Label>
                              <Input
                                value={product.productName}
                                onChange={(e) => updateProduct(index, 'productName', e.target.value)}
                                className="w-full mt-1"
                                placeholder="Введите название товара"
                              />
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Desktop: Show all fields */}
                        <TableCell className="hidden sm:table-cell">
                          <Input
                            value={product.barcode}
                            onChange={(e) => updateProduct(index, 'barcode', e.target.value)}
                            className="w-full min-w-0"
                          />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Input
                            value={product.article}
                            onChange={(e) => updateProduct(index, 'article', e.target.value)}
                            className="w-full min-w-0"
                          />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Input
                            value={product.productName}
                            onChange={(e) => updateProduct(index, 'productName', e.target.value)}
                            className="w-full min-w-0"
                          />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Input
                            value={product.supplier}
                            onChange={(e) => updateProduct(index, 'supplier', e.target.value)}
                            className="w-full min-w-0"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
              </div>
              <div className="p-4 border-t">
                <Button onClick={addProduct} variant="outline" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить строку
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings Section - Below table */}
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
                  Получить наклейки
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
          {/* WB Boxes Data Input Section */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={clearWBTable}
                    className="text-red-500 hover:text-red-600 hover:border-red-500 border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Очистить таблицу
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-w-full">
                <div className="min-w-max">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="sm:hidden">Короба</TableHead>
                        <TableHead className="min-w-[70px] w-full sm:min-w-[80px] hidden sm:table-cell">Количество*</TableHead>
                        <TableHead className="min-w-[90px] w-full sm:min-w-[100px] hidden sm:table-cell">Порядковый номер</TableHead>
                        <TableHead className="min-w-[100px] w-full sm:min-w-[120px] hidden sm:table-cell">Свободное поле</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {wbBoxes.map((box, index) => (
                      <TableRow key={index}>
                        {/* Mobile: Show only barcode and quantity vertically */}
                        <TableCell className="sm:hidden p-2">
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">ШК короба*</Label>
                              <Input
                                value={box.boxBarcode}
                                onChange={(e) => updateWBBox(index, 'boxBarcode', e.target.value)}
                                className="w-full mt-1"
                                placeholder="Введите штрихкод короба"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Количество*</Label>
                              <Input
                                value={box.quantity}
                                onChange={(e) => updateWBBox(index, 'quantity', parseInt(e.target.value) || 1)}
                                type="number"
                                className="w-full mt-1"
                                min="1"
                              />
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Desktop: Show all fields */}
                        <TableCell className="hidden sm:table-cell">
                          <Input
                            value={box.boxBarcode}
                            onChange={(e) => updateWBBox(index, 'boxBarcode', e.target.value)}
                            className="w-full min-w-0"
                            placeholder="Штрихкод короба"
                          />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Input
                            value={box.quantity}
                            onChange={(e) => updateWBBox(index, 'quantity', parseInt(e.target.value) || 1)}
                            type="number"
                            className="w-full min-w-0"
                            min="1"
                          />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Input
                            value={box.sequenceNumber}
                            onChange={(e) => updateWBBox(index, 'sequenceNumber', e.target.value)}
                            className="w-full min-w-0"
                            placeholder="№1, №2, etc."
                          />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Input
                            value={box.freeField}
                            onChange={(e) => updateWBBox(index, 'freeField', e.target.value)}
                            className="w-full min-w-0"
                            placeholder="Дополнительная информация"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWBBox(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
              </div>
              <div className="p-4 border-t">
                <Button onClick={addWBBox} variant="outline" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить короб
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* WB Settings Section */}
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
                  onClick={() => generateWBBoxPDF()} 
                  className="bg-wb-purple hover:bg-wb-purple-dark text-white px-8 py-2 w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Получить этикетки коробов
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}