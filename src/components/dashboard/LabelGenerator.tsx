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
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, Download, QrCode, BarChart3, Package, Settings } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCodeGenerator from 'qrcode';

interface ProductRow {
  id: string;
  barcode: string;
  article: string;
  color: string;
  size: string;
  productName: string;
  sellerName: string;
  quantity: number;
}

interface BoxRow {
  id: string;
  barcode: string;
  quantity: number;
  freeField: string;
  boxNumber: string;
}

export default function LabelGenerator() {
  const [activeTab, setActiveTab] = useState("product-labels");
  
  // Product labels state
  const [rows, setRows] = useState<ProductRow[]>([
    {
      id: "1",
      barcode: "",
      article: "",
      color: "",
      size: "",
      productName: "",
      sellerName: "",
      quantity: 1
    }
  ]);

  // Box labels state
  const [boxRows, setBoxRows] = useState<BoxRow[]>([
    {
      id: "1",
      barcode: "",
      quantity: 1,
      freeField: "",
      boxNumber: ""
    }
  ]);

  // QR code state
  const [qrText, setQrText] = useState("");
  const [qrSize, setQrSize] = useState([100]);
  const [qrFormat, setQrFormat] = useState("PNG");
  const [qrPreview, setQrPreview] = useState("");

  // Settings
  const [sameSellerName, setSameSellerName] = useState(false);
  const [globalSellerName, setGlobalSellerName] = useState("");
  const [barcodeFormat, setBarcodeFormat] = useState("CODE-128");
  const [barcodeType, setBarcodeType] = useState("A4");
  const [labelSize, setLabelSize] = useState("40x25");
  const [fontSize, setFontSize] = useState("12");
  
  // Box settings
  const [boxLabelSize, setBoxLabelSize] = useState("52x34");
  const [boxFontSize, setBoxFontSize] = useState("11");
  const [orderNumber, setOrderNumber] = useState(false);
  const [cutLines, setCutLines] = useState(false);

  // Product functions
  const addRow = () => {
    const newRow: ProductRow = {
      id: Date.now().toString(),
      barcode: "",
      article: "",
      color: "",
      size: "",
      productName: "",
      sellerName: sameSellerName ? globalSellerName : "",
      quantity: 1
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof ProductRow, value: string | number) => {
    setRows(rows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const clearTable = () => {
    setRows([{
      id: "1",
      barcode: "",
      article: "",
      color: "",
      size: "",
      productName: "",
      sellerName: "",
      quantity: 1
    }]);
  };

  // Box functions
  const addBoxRow = () => {
    const newRow: BoxRow = {
      id: Date.now().toString(),
      barcode: "",
      quantity: 1,
      freeField: "",
      boxNumber: ""
    };
    setBoxRows([...boxRows, newRow]);
  };

  const removeBoxRow = (id: string) => {
    if (boxRows.length > 1) {
      setBoxRows(boxRows.filter(row => row.id !== id));
    }
  };

  const updateBoxRow = (id: string, field: keyof BoxRow, value: string | number) => {
    setBoxRows(boxRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const clearBoxTable = () => {
    setBoxRows([{
      id: "1",
      barcode: "",
      quantity: 1,
      freeField: "",
      boxNumber: ""
    }]);
  };

  const generateProductPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Set up page based on label size and format
      let pageFormat = 'a4';
      let pageOrientation: 'portrait' | 'landscape' = 'portrait';
      
      if (barcodeType === 'thermal') {
        pageFormat = 'a6';
      }
      
      doc.setPage(1);
      
      let yPosition = 20;
      let labelCount = 0;
      
      rows.forEach((row, index) => {
        if (row.barcode && row.productName) {
          // Generate barcode for each row
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, row.barcode, {
            format: barcodeFormat as any,
            width: 2,
            height: 50,
            displayValue: true,
            fontSize: parseInt(fontSize),
            textMargin: 2
          });
          
          // Add barcode to PDF
          const barcodeImg = canvas.toDataURL('image/png');
          
          for (let i = 0; i < row.quantity; i++) {
            // Add product info
            doc.setFontSize(parseInt(fontSize));
            doc.text(`${row.productName}`, 20, yPosition);
            doc.text(`Артикул: ${row.article}`, 20, yPosition + 8);
            doc.text(`Цвет: ${row.color}, Размер: ${row.size}`, 20, yPosition + 16);
            doc.text(`Продавец: ${row.sellerName}`, 20, yPosition + 24);
            
            // Add barcode image
            doc.addImage(barcodeImg, 'PNG', 20, yPosition + 30, 80, 20);
            
            yPosition += 80;
            labelCount++;
            
            // Add new page if needed
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 20;
            }
          }
        }
      });
      
      if (labelCount === 0) {
        toast.error("Нет данных для генерации PDF");
        return;
      }
      
      doc.save(`product-labels-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(`PDF создан с ${labelCount} этикетками!`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("Ошибка создания PDF");
    }
  };

  const generateBoxPDF = () => {
    try {
      const doc = new jsPDF();
      
      let yPosition = 20;
      let labelCount = 0;
      
      boxRows.forEach((row, index) => {
        if (row.barcode) {
          // Generate barcode for each box
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, row.barcode, {
            format: barcodeFormat as any,
            width: 2,
            height: 50,
            displayValue: true,
            fontSize: parseInt(boxFontSize),
            textMargin: 2
          });
          
          const barcodeImg = canvas.toDataURL('image/png');
          
          for (let i = 0; i < row.quantity; i++) {
            // Add box info
            doc.setFontSize(parseInt(boxFontSize));
            doc.text(`Короб #${row.boxNumber}`, 20, yPosition);
            doc.text(`Количество: ${row.quantity}`, 20, yPosition + 8);
            if (row.freeField) {
              doc.text(`${row.freeField}`, 20, yPosition + 16);
            }
            
            // Add barcode image
            doc.addImage(barcodeImg, 'PNG', 20, yPosition + 30, 80, 20);
            
            if (cutLines) {
              // Add cut lines
              doc.setLineWidth(0.1);
              doc.line(10, yPosition - 5, 200, yPosition - 5);
            }
            
            yPosition += 80;
            labelCount++;
            
            // Add new page if needed
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 20;
            }
          }
        }
      });
      
      if (labelCount === 0) {
        toast.error("Нет данных для генерации PDF");
        return;
      }
      
      doc.save(`box-labels-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(`PDF создан с ${labelCount} этикетками коробов!`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("Ошибка создания PDF");
    }
  };

  const generateQR = async () => {
    if (!qrText.trim()) {
      toast.error("Введите текст для QR-кода");
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
      toast.success("QR-код сгенерирован!");
    } catch (error) {
      console.error('QR generation error:', error);
      toast.error("Ошибка генерации QR-кода");
    }
  };

  const downloadQR = () => {
    if (!qrPreview) {
      toast.error("Сначала сгенерируйте QR-код");
      return;
    }
    
    const link = document.createElement('a');
    link.href = qrPreview;
    link.download = `qr-code-${new Date().toISOString().split('T')[0]}.${qrFormat.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR-код скачан!");
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Генератор этикеток</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Создавайте профессиональные этикетки, штрихкоды и QR-коды для ваших товаров
          </p>
        </div>
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 w-fit">
          <QrCode className="w-3 h-3 mr-1" />
          FREE
        </Badge>
      </div>

      {/* Free Service Notice */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-green-500 hover:bg-green-500 text-white">
              БЕСПЛАТНО
            </Badge>
            <span className="text-sm text-green-800">
              Сервис генерации этикеток бесплатный для новых пользователей
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-12 sm:h-10">
          <TabsTrigger value="product-labels" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Этикетки</span>
          </TabsTrigger>
          <TabsTrigger value="qr-codes" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <QrCode className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>QR коды</span>
          </TabsTrigger>
          <TabsTrigger value="box-labels" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Package className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Короба WB</span>
          </TabsTrigger>
        </TabsList>

        {/* Product Labels Tab */}
        <TabsContent value="product-labels" className="space-y-4 sm:space-y-6">
          {/* Description */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-800">
                <strong>Сервис генерации этикеток штрихкодов (баркодов)</strong> — это онлайн генератор этикеток и штрихкодов. 
                Он создан для того, чтобы упростить генерацию этикеток на товар, штрихкодов (баркодов) и наклеек на дополнительную упаковку.
              </p>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                Настройки этикеток
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Формат штрихкода</Label>
                  <Select value={barcodeFormat} onValueChange={setBarcodeFormat}>
                    <SelectTrigger className="border-2 border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CODE-128">CODE-128</SelectItem>
                      <SelectItem value="EAN13">EAN-13</SelectItem>
                      <SelectItem value="EAN8">EAN-8</SelectItem>
                      <SelectItem value="UPC">UPC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Тип печати</Label>
                  <Select value={barcodeType} onValueChange={setBarcodeType}>
                    <SelectTrigger className="border-2 border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="thermal">Термопринтер</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="labelSize">Размер наклейки</Label>
                  <Select value={labelSize} onValueChange={setLabelSize}>
                    <SelectTrigger className="border-2 border-border/60">
                      <SelectValue placeholder="Выберите размер" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="40x25">40x25 мм</SelectItem>
                      <SelectItem value="58x40">58x40 мм</SelectItem>
                      <SelectItem value="58x30">58x30 мм</SelectItem>
                      <SelectItem value="43x25">43x25 мм</SelectItem>
                      <SelectItem value="100x100">100x100 мм</SelectItem>
                      <SelectItem value="100x70">100x70 мм</SelectItem>
                      <SelectItem value="70x42">70x42 мм</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Размер шрифта (px)</Label>
                  <Input 
                    type="number" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(e.target.value)}
                    placeholder="12"
                    min="8"
                    max="20"
                    className="border-2 border-border/60"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border">
                  <Checkbox 
                    id="sameSellerName" 
                    checked={sameSellerName}
                    onCheckedChange={(checked) => setSameSellerName(checked === true)}
                  />
                  <label htmlFor="sameSellerName" className="text-sm">
                    Одинаковое название поставщика на всех наклейках
                  </label>
                </div>

                {sameSellerName && (
                  <Input
                    placeholder="Название поставщика"
                    value={globalSellerName}
                    onChange={(e) => setGlobalSellerName(e.target.value)}
                    className="border-2 border-border/60"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <Button 
              variant="outline" 
              onClick={clearTable}
              className="text-red-600 border-red-200 bg-red-50/50 hover:bg-red-100 hover:border-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Очистить таблицу
            </Button>
          </div>

          {/* Product Table */}
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <div className="min-w-[800px]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium text-sm">Штрихкод*</th>
                      <th className="text-left p-2 font-medium text-sm">Артикул</th>
                      <th className="text-left p-2 font-medium text-sm">Цвет</th>
                      <th className="text-left p-2 font-medium text-sm">Размер</th>
                      <th className="text-left p-2 font-medium text-sm">Название товара*</th>
                      <th className="text-left p-2 font-medium text-sm">Продавец</th>
                      <th className="text-left p-2 font-medium text-sm">Кол-во*</th>
                      <th className="text-left p-2 font-medium text-sm"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="p-2">
                          <Input
                            placeholder="Штрихкод"
                            value={row.barcode}
                            onChange={(e) => updateRow(row.id, 'barcode', e.target.value)}
                            className="min-w-[120px] text-sm border-2 border-border/60"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Артикул"
                            value={row.article}
                            onChange={(e) => updateRow(row.id, 'article', e.target.value)}
                            className="min-w-[100px] text-sm border-2 border-border/60"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Цвет"
                            value={row.color}
                            onChange={(e) => updateRow(row.id, 'color', e.target.value)}
                            className="min-w-[80px] text-sm border-2 border-border/60"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Размер"
                            value={row.size}
                            onChange={(e) => updateRow(row.id, 'size', e.target.value)}
                            className="min-w-[80px] text-sm border-2 border-border/60"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Название товара"
                            value={row.productName}
                            onChange={(e) => updateRow(row.id, 'productName', e.target.value)}
                            className="min-w-[150px] text-sm border-2 border-border/60"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Продавец"
                            value={sameSellerName ? globalSellerName : row.sellerName}
                            onChange={(e) => updateRow(row.id, 'sellerName', e.target.value)}
                            disabled={sameSellerName}
                            className="min-w-[150px] text-sm border-2 border-border/60"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            placeholder="1"
                            value={row.quantity}
                            onChange={(e) => updateRow(row.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="min-w-[80px] text-sm border-2 border-border/60"
                            min="1"
                          />
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={addRow} className="bg-blue-500 text-white hover:bg-blue-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить строку
                </Button>
                <Button 
                  onClick={generateProductPDF} 
                  className="bg-wb-purple hover:bg-wb-purple-dark"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Скачать этикетки
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR Codes Tab */}
        <TabsContent value="qr-codes" className="space-y-4 sm:space-y-6">
          {/* Description */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-800">
                <strong>Универсальный генератор QR-кода</strong> — Закодируйте любой текст, ссылку и информацию с помощью универсального генератора QR-кода. 
                Помогите клиентам быстро найти вашу страницу в интернете. Достаточно отсканировать QR-код и вся зашитая в QR-код информация уже у клиента.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Input Section */}
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="qr-text">Введите информацию (ссылку) для QR кода</Label>
                      <Textarea
                        id="qr-text"
                        placeholder="Введите информацию для QR кода..."
                        value={qrText}
                        onChange={(e) => setQrText(e.target.value)}
                        className="min-h-[120px] mt-2 border-2 border-border/60"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Размер</Label>
                        <Slider
                          value={qrSize}
                          onValueChange={setQrSize}
                          max={300}
                          min={50}
                          step={10}
                          className="w-full"
                        />
                        <div className="text-center text-sm text-muted-foreground">
                          {qrSize[0]}px
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Формат</Label>
                        <Select value={qrFormat} onValueChange={setQrFormat}>
                          <SelectTrigger className="border-2 border-border/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PNG">PNG</SelectItem>
                            <SelectItem value="JPG">JPG</SelectItem>
                            <SelectItem value="SVG">SVG</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Section */}
            <div>
              <Card>
                <CardContent className="pt-6">
                  <div className="aspect-square bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    {qrPreview ? (
                      <img src={qrPreview} alt="QR Code Preview" className="max-w-full max-h-full" />
                    ) : qrText ? (
                      <div className="text-center">
                        <QrCode className="h-16 w-16 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Нажмите "Сгенерировать QR"</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <QrCode className="h-16 w-16 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">Введите данные для превью</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={generateQR} 
              className="bg-wb-purple hover:bg-wb-purple-dark flex-1"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Сгенерировать QR
            </Button>
            
            {qrPreview && (
              <Button 
                onClick={downloadQR} 
                variant="outline"
                className="flex-1 border-2 border-border/60 hover:bg-accent"
              >
                <Download className="w-4 h-4 mr-2" />
                Скачать QR
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Box Labels Tab */}
        <TabsContent value="box-labels" className="space-y-4 sm:space-y-6">
          {/* Description */}
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <p className="text-sm text-purple-800">
                <strong>Универсальная форма для штрихкода CODE128</strong> — это онлайн генератор штрихкодов. 
                Он создан для того, чтобы упростить генерацию штрихкодов (баркодов) и наклеек на транспортную упаковку Wildberries формата WB_1234567890.
              </p>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                Настройки коробов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Размер наклейки</Label>
                  <Select value={boxLabelSize} onValueChange={setBoxLabelSize}>
                    <SelectTrigger className="border-2 border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="52x34">52x34 мм</SelectItem>
                      <SelectItem value="40x25">40x25 мм</SelectItem>
                      <SelectItem value="58x40">58x40 мм</SelectItem>
                      <SelectItem value="100x100">100x100 мм</SelectItem>
                      <SelectItem value="100x70">100x70 мм</SelectItem>
                      <SelectItem value="70x42">70x42 мм</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Размер шрифта (px)</Label>
                  <Input 
                    type="number" 
                    value={boxFontSize} 
                    onChange={(e) => setBoxFontSize(e.target.value)}
                    placeholder="11"
                    min="8"
                    max="20"
                    className="border-2 border-border/60"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border">
                  <Checkbox 
                    id="orderNumber" 
                    checked={orderNumber}
                    onCheckedChange={(checked) => setOrderNumber(checked === true)}
                  />
                  <label htmlFor="orderNumber" className="text-sm">
                    Номер заказа на наклейке
                  </label>
                </div>
                
                <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border">
                  <Checkbox 
                    id="cutLines" 
                    checked={cutLines}
                    onCheckedChange={(checked) => setCutLines(checked === true)}
                  />
                  <label htmlFor="cutLines" className="text-sm">
                    Линии отреза
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <Button 
              variant="outline" 
              onClick={clearBoxTable}
              className="text-red-600 border-red-200 bg-red-50/50 hover:bg-red-100 hover:border-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Очистить таблицу
            </Button>
          </div>

          {/* Box Table */}
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <div className="min-w-[600px]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium text-sm">Штрихкод*</th>
                      <th className="text-left p-2 font-medium text-sm">Количество</th>
                      <th className="text-left p-2 font-medium text-sm">Свободное поле</th>
                      <th className="text-left p-2 font-medium text-sm">Номер коробки</th>
                      <th className="text-left p-2 font-medium text-sm"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {boxRows.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="p-2">
                          <Input
                            placeholder="Штрихкод"
                            value={row.barcode}
                            onChange={(e) => updateBoxRow(row.id, 'barcode', e.target.value)}
                            className="min-w-[150px] text-sm border-2 border-border/60"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            placeholder="1"
                            value={row.quantity}
                            onChange={(e) => updateBoxRow(row.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="min-w-[100px] text-sm border-2 border-border/60"
                            min="1"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Свободное поле"
                            value={row.freeField}
                            onChange={(e) => updateBoxRow(row.id, 'freeField', e.target.value)}
                            className="min-w-[120px] text-sm border-2 border-border/60"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="1"
                            value={row.boxNumber}
                            onChange={(e) => updateBoxRow(row.id, 'boxNumber', e.target.value)}
                            className="min-w-[120px] text-sm border-2 border-border/60"
                          />
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBoxRow(row.id)}
                            disabled={boxRows.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={addBoxRow} className="bg-blue-500 text-white hover:bg-blue-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить строку
                </Button>
                <Button 
                  onClick={generateBoxPDF} 
                  className="bg-wb-purple hover:bg-wb-purple-dark"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Скачать этикетки коробов
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}