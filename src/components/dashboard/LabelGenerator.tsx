import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, Download, QrCode, BarChart3, Package, Settings, FileText } from "lucide-react";
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

  const parseLabelSize = (sizeStr: string): [number, number] => {
    const [width, height] = sizeStr.split('x').map(Number);
    return [width || 40, height || 25];
  };

  const generateProductPDF = async () => {
    if (products.length === 0) {
      toast("Добавьте товары в таблицу");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: settings.labelType === 'A4' ? 'portrait' : 'landscape',
        unit: 'mm',
        format: settings.labelType === 'A4' ? 'a4' : parseLabelSize(settings.labelSize)
      });

      // Calculate label dimensions based on settings
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      let labelsPerRow, labelsPerColumn, labelWidth, labelHeight;
      
      if (settings.labelType === 'A4') {
        // For A4, calculate based on label size
        const [width, height] = parseLabelSize(settings.labelSize);
        labelsPerRow = Math.floor(pageWidth / width);
        labelsPerColumn = Math.floor(pageHeight / height);
        labelWidth = width;
        labelHeight = height;
      } else {
        // For thermal labels, use full page
        labelsPerRow = 1;
        labelsPerColumn = 1;
        labelWidth = pageWidth;
        labelHeight = pageHeight;
      }

      let currentPage = 0;
      
      for (let index = 0; index < products.length; index++) {
        const product = products[index];
        const labelIndex = index % (labelsPerRow * labelsPerColumn);
        const row = Math.floor(labelIndex / labelsPerRow);
        const col = labelIndex % labelsPerRow;
        
        if (labelIndex === 0 && index > 0) {
          doc.addPage();
          currentPage++;
        }

        const x = col * labelWidth + 5;
        const y = row * labelHeight + 5;

        let currentY = y + 8;
        
        // Add supplier name (only if filled)
        if (product.supplier.trim()) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(product.supplier, x + 2, currentY);
          currentY += 7;
        }
        
        // Add product name (only if filled)
        if (product.productName.trim()) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const splitName = doc.splitTextToSize(product.productName, labelWidth - 10);
          doc.text(splitName, x + 2, currentY);
          currentY += splitName.length * 5 + 2;
        }
        
        // Add article (only if filled)
        if (product.article.trim()) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(`Артикул: ${product.article}`, x + 2, currentY);
          currentY += 6;
        }

        // Generate barcode using JsBarcode
        if (product.barcode) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 100;
            
            JsBarcode(canvas, product.barcode, {
              format: "CODE128",
              width: Math.max(1, Math.floor((labelWidth - 10) / product.barcode.length * 0.8)),
              height: Math.min(40, labelHeight - currentY + y - 10),
              displayValue: true,
              fontSize: 10,
              fontOptions: "",
              font: "Arial, sans-serif",
              textAlign: "center",
              textPosition: "bottom",
              textMargin: 2,
              margin: 2,
              background: "#ffffff",
              lineColor: "#000000"
            });
            
            const barcodeDataURL = canvas.toDataURL('image/png');
            const barcodeHeight = Math.min(20, labelHeight - currentY + y - 5);
            doc.addImage(barcodeDataURL, 'PNG', x + 2, currentY + 2, labelWidth - 10, barcodeHeight);
          } catch (error) {
            console.error('Barcode generation error:', error);
            // Fallback: add text instead of barcode
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(`Штрихкод: ${product.barcode}`, x + 2, currentY + 2);
          }
        }
      }

      doc.save('labels.pdf');
      toast("PDF файл успешно создан!");
    } catch (error) {
      console.error('PDF generation error:', error);
      toast("Ошибка при создании PDF файла");
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
    if (wbBoxes.length === 0 || !wbBoxes[0].boxBarcode) {
      toast("Добавьте штрихкоды коробов в таблицу");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: settings.labelType === 'A4' ? 'portrait' : 'landscape',
        unit: 'mm',
        format: settings.labelType === 'A4' ? 'a4' : parseLabelSize(settings.labelSize)
      });

      // Calculate label dimensions based on settings
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      let labelsPerRow, labelsPerColumn, labelWidth, labelHeight;
      
      if (settings.labelType === 'A4') {
        // For A4, calculate based on label size
        const [width, height] = parseLabelSize(settings.labelSize);
        labelsPerRow = Math.floor(pageWidth / width);
        labelsPerColumn = Math.floor(pageHeight / height);
        labelWidth = width;
        labelHeight = height;
      } else {
        // For thermal labels, use full page
        labelsPerRow = 1;
        labelsPerColumn = 1;
        labelWidth = pageWidth;
        labelHeight = pageHeight;
      }

      let currentPage = 0;

      for (let index = 0; index < wbBoxes.length; index++) {
        const box = wbBoxes[index];
        const labelIndex = index % (labelsPerRow * labelsPerColumn);
        const row = Math.floor(labelIndex / labelsPerRow);
        const col = labelIndex % labelsPerRow;
        
        if (labelIndex === 0 && index > 0) {
          doc.addPage();
          currentPage++;
        }

        const x = col * labelWidth + 5;
        const y = row * labelHeight + 5;

        let currentY = y + 8;
        
        // Add sequence number (only if filled)
        if (box.sequenceNumber.trim()) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(box.sequenceNumber, x + 2, currentY);
          currentY += 7;
        }
        
        // Add free field (only if filled)
        if (box.freeField.trim()) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const splitField = doc.splitTextToSize(box.freeField, labelWidth - 10);
          doc.text(splitField, x + 2, currentY);
          currentY += splitField.length * 5 + 2;
        }
        
        // Add quantity
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Количество: ${box.quantity}`, x + 2, currentY);
        currentY += 6;

        // Generate barcode using JsBarcode
        if (box.boxBarcode) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 100;
            
            JsBarcode(canvas, box.boxBarcode, {
              format: "CODE128",
              width: Math.max(1, Math.floor((labelWidth - 10) / box.boxBarcode.length * 0.8)),
              height: Math.min(40, labelHeight - currentY + y - 10),
              displayValue: true,
              fontSize: 10,
              fontOptions: "",
              font: "Arial, sans-serif",
              textAlign: "center",
              textPosition: "bottom",
              textMargin: 2,
              margin: 2,
              background: "#ffffff",
              lineColor: "#000000"
            });
            
            const barcodeDataURL = canvas.toDataURL('image/png');
            const barcodeHeight = Math.min(20, labelHeight - currentY + y - 5);
            doc.addImage(barcodeDataURL, 'PNG', x + 2, currentY + 2, labelWidth - 10, barcodeHeight);
          } catch (error) {
            console.error('Barcode generation error:', error);
            // Fallback: add text instead of barcode
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(`Штрихкод: ${box.boxBarcode}`, x + 2, currentY + 2);
          }
        }
      }

      doc.save('wb-box-labels.pdf');
      toast("PDF файл с этикетками коробов успешно создан!");
    } catch (error) {
      console.error('PDF generation error:', error);
      toast("Ошибка при создании PDF файла");
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
              <div className="flex items-center justify-between w-full">
                <SelectValue />
                <div className="flex items-center">
                  <span className="text-purple-600 mr-1">▼</span>
                </div>
              </div>
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
                        <TableHead className="min-w-[100px] w-full sm:min-w-[120px]">Штрихкод*</TableHead>
                        <TableHead className="min-w-[80px] w-full sm:min-w-[100px]">Артикул</TableHead>
                        <TableHead className="min-w-[120px] w-full sm:min-w-[150px]">Название товара*</TableHead>
                        <TableHead className="min-w-[100px] w-full sm:min-w-[120px]">Наименование продавца</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {products.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={product.barcode}
                            onChange={(e) => updateProduct(index, 'barcode', e.target.value)}
                            className="w-full min-w-0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={product.article}
                            onChange={(e) => updateProduct(index, 'article', e.target.value)}
                            className="w-full min-w-0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={product.productName}
                            onChange={(e) => updateProduct(index, 'productName', e.target.value)}
                            className="w-full min-w-0"
                          />
                        </TableCell>
                        <TableCell>
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
            <CardContent className="space-y-6">
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
            <CardContent className="space-y-6">
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
                        <TableHead className="min-w-[120px] w-full sm:min-w-[150px]">ШК короба*</TableHead>
                        <TableHead className="min-w-[80px] w-full sm:min-w-[100px]">Количество*</TableHead>
                        <TableHead className="min-w-[100px] w-full sm:min-w-[120px]">Порядковый номер</TableHead>
                        <TableHead className="min-w-[120px] w-full sm:min-w-[150px]">Свободное поле</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {wbBoxes.map((box, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={box.boxBarcode}
                            onChange={(e) => updateWBBox(index, 'boxBarcode', e.target.value)}
                            className="w-full min-w-0"
                            placeholder="Штрихкод короба"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={box.quantity}
                            onChange={(e) => updateWBBox(index, 'quantity', parseInt(e.target.value) || 1)}
                            type="number"
                            className="w-full min-w-0"
                            min="1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={box.sequenceNumber}
                            onChange={(e) => updateWBBox(index, 'sequenceNumber', e.target.value)}
                            className="w-full min-w-0"
                            placeholder="№1, №2, etc."
                          />
                        </TableCell>
                        <TableCell>
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
            <CardContent className="space-y-6">
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