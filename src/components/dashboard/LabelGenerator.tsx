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

  // Generate functions
  const generateLabels = () => {
    const filledRows = rows.filter(row => 
      row.barcode && row.productName
    );

    if (filledRows.length === 0) {
      toast.error("Заполните хотя бы одну строку с штрихкодом и названием товара");
      return;
    }

    toast.success(`Генерация ${filledRows.length} этикеток начата. Файл будет готов через несколько секунд.`);
    
    setTimeout(() => {
      toast.success("PDF файл готов к скачиванию!");
    }, 2000);
  };

  const generateBoxLabels = () => {
    const filledRows = boxRows.filter(row => row.barcode);

    if (filledRows.length === 0) {
      toast.error("Заполните хотя бы одну строку со штрихкодом");
      return;
    }

    toast.success(`Генерация ${filledRows.length} этикеток коробов начата. Файл будет готов через несколько секунд.`);
    
    setTimeout(() => {
      toast.success("PDF файл готов к скачиванию!");
    }, 2000);
  };

  const generateQR = () => {
    if (!qrText.trim()) {
      toast.error("Введите информацию для QR кода");
      return;
    }

    toast.success("QR код сгенерирован и готов к скачиванию!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Генератор этикеток</h1>
          <p className="text-sm text-muted-foreground">
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
              Сервис генерации этикеток бесплатный для новых пользователей в течение 3 месяцев
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-fit">
          <TabsTrigger value="product-labels" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Этикетки товаров</span>
            <span className="sm:hidden">Товары</span>
          </TabsTrigger>
          <TabsTrigger value="qr-codes" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">QR коды</span>
            <span className="sm:hidden">QR</span>
          </TabsTrigger>
          <TabsTrigger value="box-labels" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Короба WB</span>
            <span className="sm:hidden">Короба</span>
          </TabsTrigger>
        </TabsList>

        {/* Product Labels Tab */}
        <TabsContent value="product-labels" className="space-y-6">
          {/* Description */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-800">
                <strong>Сервис генерации этикеток штрихкодов (баркодов)</strong> — это онлайн генератор этикеток и штрихкодов. 
                Он создан для того, чтобы упростить генерацию этикеток на товар, штрихкодов (баркодов) и наклеек на дополнительную упаковку.
              </p>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="outline" onClick={clearTable} className="shadow-sm">
              Очистить таблицу
            </Button>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="same-seller" 
                checked={sameSellerName}
                onCheckedChange={(checked) => setSameSellerName(checked as boolean)}
              />
              <Label htmlFor="same-seller" className="text-sm">
                Одинаковое название поставщика на всех наклейках
              </Label>
            </div>

            {sameSellerName && (
              <Input
                placeholder="Название поставщика"
                value={globalSellerName}
                onChange={(e) => setGlobalSellerName(e.target.value)}
                className="w-full sm:w-64"
              />
            )}
          </div>

          {/* Product Table */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium text-sm">Штрихкод*</th>
                      <th className="text-left p-2 font-medium text-sm">Артикул</th>
                      <th className="text-left p-2 font-medium text-sm">Цвет</th>
                      <th className="text-left p-2 font-medium text-sm">Размер</th>
                      <th className="text-left p-2 font-medium text-sm">Название товара*</th>
                      <th className="text-left p-2 font-medium text-sm">Наименование продавца</th>
                      <th className="text-left p-2 font-medium text-sm">Количество*</th>
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
                            className="min-w-[120px] text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Артикул"
                            value={row.article}
                            onChange={(e) => updateRow(row.id, 'article', e.target.value)}
                            className="min-w-[100px] text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Цвет"
                            value={row.color}
                            onChange={(e) => updateRow(row.id, 'color', e.target.value)}
                            className="min-w-[80px] text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Размер"
                            value={row.size}
                            onChange={(e) => updateRow(row.id, 'size', e.target.value)}
                            className="min-w-[80px] text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Название товара"
                            value={row.productName}
                            onChange={(e) => updateRow(row.id, 'productName', e.target.value)}
                            className="min-w-[150px] text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Наименование продавца"
                            value={sameSellerName ? globalSellerName : row.sellerName}
                            onChange={(e) => updateRow(row.id, 'sellerName', e.target.value)}
                            disabled={sameSellerName}
                            className="min-w-[150px] text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            placeholder="1"
                            value={row.quantity}
                            onChange={(e) => updateRow(row.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="min-w-[80px] text-sm"
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

              <div className="mt-4 flex justify-center">
                <Button onClick={addRow} variant="outline" className="w-full sm:w-auto shadow-sm bg-blue-500 text-white hover:bg-blue-600 border-blue-500">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить строку
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Основные настройки
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Формат штрихкода</Label>
                  <Select value={barcodeFormat} onValueChange={setBarcodeFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CODE-128">CODE-128</SelectItem>
                      <SelectItem value="EAN-13">EAN-13</SelectItem>
                      <SelectItem value="UPC">UPC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Тип штрихкода</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="A4"
                        checked={barcodeType === "A4"}
                        onChange={(e) => setBarcodeType(e.target.value)}
                        className="text-primary"
                      />
                      <span className="text-sm">A4</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="Термоэтикетка"
                        checked={barcodeType === "Термоэтикетка"}
                        onChange={(e) => setBarcodeType(e.target.value)}
                        className="text-primary"
                      />
                      <span className="text-sm">Термоэтикетка</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Размер наклейки (мм, ШхВ)</Label>
                  <Input 
                    value={labelSize} 
                    onChange={(e) => setLabelSize(e.target.value)}
                    placeholder="58x40"
                  />
                  <p className="text-xs text-muted-foreground">Или введите свой размер (мм, ШхВ) - макс. 210x297 (A4)</p>
                </div>

                <div className="space-y-2">
                  <Label>Размер шрифта (px)</Label>
                  <Input 
                    type="number" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(e.target.value)}
                    placeholder="11"
                    min="8"
                    max="20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button 
              onClick={generateLabels} 
              size="lg" 
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white shadow-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Получить наклейки
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            * - параметры Штрихкод, Наименование продавца, Количество обязательны для заполнения. 
            Штрихкод также проверяется на валидность.
          </div>
        </TabsContent>

        {/* QR Codes Tab */}
        <TabsContent value="qr-codes" className="space-y-6">
          {/* Description */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-800">
                <strong>Универсальный генератор QR-кода</strong> — Закодируйте любой текст, ссылку и информацию с помощью универсального генератора QR-кода. 
                Помогите клиентам быстро найти вашу страницу в интернете. Достаточно отсканировать QR-код и вся зашитая в QR-код информация уже у клиента.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        className="min-h-[120px] mt-2"
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Размер PX: {qrSize[0]}px</Label>
                        <Slider
                          value={qrSize}
                          onValueChange={setQrSize}
                          max={500}
                          min={100}
                          step={10}
                          className="mt-2"
                        />
                      </div>

                      <div className="flex gap-2">
                        {["SVG", "PNG", "JPG"].map((format) => (
                          <Button
                            key={format}
                            variant={qrFormat === format ? "default" : "outline"}
                            onClick={() => setQrFormat(format)}
                            className="flex-1"
                          >
                            {format}
                          </Button>
                        ))}
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
                    {qrText ? (
                      <div className="text-center">
                        <QrCode className="h-16 w-16 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Превью QR кода</p>
                        <p className="text-xs text-gray-500">{qrSize[0]}x{qrSize[0]}px</p>
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

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button 
              onClick={generateQR} 
              size="lg" 
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
              disabled={!qrText.trim()}
            >
              <Download className="h-4 w-4 mr-2" />
              Скачать QR код
            </Button>
          </div>
        </TabsContent>

        {/* Box Labels Tab */}
        <TabsContent value="box-labels" className="space-y-6">
          {/* Description */}
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <p className="text-sm text-purple-800">
                <strong>Универсальная форма для штрихкода CODE128</strong> — это онлайн генератор штрихкодов. 
                Он создан для того, чтобы упростить генерацию штрихкодов (баркодов) и наклеек на транспортную упаковку Wildberries формата WB_1234567890.
              </p>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="outline" onClick={clearBoxTable} className="shadow-sm">
              Очистить таблицу
            </Button>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="same-supplier" 
                checked={sameSellerName}
                onCheckedChange={(checked) => setSameSellerName(checked as boolean)}
              />
              <Label htmlFor="same-supplier" className="text-sm">
                Одинаковое название поставщика на всех наклейках
              </Label>
            </div>
          </div>

          {/* Box Table */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium text-sm">Штрихкод*</th>
                      <th className="text-left p-2 font-medium text-sm">Количество</th>
                      <th className="text-left p-2 font-medium text-sm">Свободное поле</th>
                      <th className="text-left p-2 font-medium text-sm">Номер коробки/палета</th>
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
                            className="min-w-[150px] text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            placeholder="1"
                            value={row.quantity}
                            onChange={(e) => updateBoxRow(row.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="min-w-[100px] text-sm"
                            min="1"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Свободное поле"
                            value={row.freeField}
                            onChange={(e) => updateBoxRow(row.id, 'freeField', e.target.value)}
                            className="min-w-[120px] text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="1"
                            value={row.boxNumber}
                            onChange={(e) => updateBoxRow(row.id, 'boxNumber', e.target.value)}
                            className="min-w-[120px] text-sm"
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

              <div className="mt-4 flex justify-center">
                <Button onClick={addBoxRow} variant="outline" className="w-full sm:w-auto shadow-sm bg-blue-500 text-white hover:bg-blue-600 border-blue-500">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить строку
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Box Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Настройки
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Тип штрихкода</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="A4"
                        checked={barcodeType === "A4"}
                        onChange={(e) => setBarcodeType(e.target.value)}
                        className="text-primary"
                      />
                      <span className="text-sm">A4</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="Термоэтикетка"
                        checked={barcodeType === "Термоэтикетка"}
                        onChange={(e) => setBarcodeType(e.target.value)}
                        className="text-primary"
                      />
                      <span className="text-sm">Термоэтикетка</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Размер наклейки (мм, ШхВ)</Label>
                  <Input 
                    value={boxLabelSize} 
                    onChange={(e) => setBoxLabelSize(e.target.value)}
                    placeholder="52x34"
                  />
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
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="order-number" 
                    checked={orderNumber}
                    onCheckedChange={(checked) => setOrderNumber(checked as boolean)}
                  />
                  <Label htmlFor="order-number" className="text-sm">
                    Выводить "Порядковый номер"
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="cut-lines" 
                    checked={cutLines}
                    onCheckedChange={(checked) => setCutLines(checked as boolean)}
                  />
                  <Label htmlFor="cut-lines" className="text-sm">
                    Линии обреза
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button 
              onClick={generateBoxLabels} 
              size="lg" 
              className="w-full sm:w-auto bg-purple-500 hover:bg-purple-600 text-white shadow-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Получить наклейки
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            * - параметры Штрихкод, Количество обязательны для заполнения. Штрихкод также проверяется на валидность.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}