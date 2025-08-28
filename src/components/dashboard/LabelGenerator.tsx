import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Download, QrCode, BarChart3 } from "lucide-react";
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

export default function LabelGenerator() {
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

  const [sameSellerName, setSameSellerName] = useState(false);
  const [globalSellerName, setGlobalSellerName] = useState("");
  const [barcodeFormat, setBarcodeFormat] = useState("CODE-128");
  const [barcodeType, setBarcodeType] = useState("A4");
  const [labelSize, setLabelSize] = useState("40x25");
  const [fontSize, setFontSize] = useState("12");

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

  const generateLabels = () => {
    const filledRows = rows.filter(row => 
      row.barcode && row.productName
    );

    if (filledRows.length === 0) {
      toast.error("Заполните хотя бы одну строку с штрихкодом и названием товара");
      return;
    }

    // Simulate PDF generation
    toast.success(`Генерация ${filledRows.length} этикеток начата. Файл будет готов через несколько секунд.`);
    
    setTimeout(() => {
      toast.success("PDF файл готов к скачиванию!");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Генератор этикеток</h1>
          <p className="text-sm text-muted-foreground">
            Создавайте профессиональные этикетки и штрихкоды для ваших товаров
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
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500 hover:bg-green-500 text-white">
              БЕСПЛАТНО
            </Badge>
            <span className="text-sm text-green-800">
              Сервис генерации этикеток бесплатный для новых пользователей в течение 3 месяцев
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Generator Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-200 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-sm">Этикетки товаров</span>
            </div>
            <p className="text-xs text-muted-foreground">Генерация этикеток для товаров</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-sm">QR коды</span>
            </div>
            <p className="text-xs text-muted-foreground">Универсальный генератор QR</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-sm">Штрихкоды коробов</span>
            </div>
            <p className="text-xs text-muted-foreground">Генератор ШК коробов WB</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-sm">Переработка</span>
            </div>
            <p className="text-xs text-muted-foreground">Этикетки без баркода</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <Button variant="outline" onClick={clearTable}>
          Очистить таблицу
        </Button>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="same-seller" 
            checked={sameSellerName}
            onCheckedChange={(checked) => setSameSellerName(checked as boolean)}
          />
          <Label htmlFor="same-seller" className="text-sm">
            Одинаковое название поставщика на всех этикетках
          </Label>
        </div>

        {sameSellerName && (
          <Input
            placeholder="Название поставщика"
            value={globalSellerName}
            onChange={(e) => setGlobalSellerName(e.target.value)}
            className="w-64"
          />
        )}
      </div>

      {/* Product Table */}
      <Card>
        <CardHeader>
          <CardTitle>Товары для генерации этикеток</CardTitle>
          <CardDescription>
            Заполните данные о ваших товарах для генерации этикеток
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Штрихкод*</th>
                  <th className="text-left p-2 font-medium">Артикул</th>
                  <th className="text-left p-2 font-medium">Цвет</th>
                  <th className="text-left p-2 font-medium">Размер</th>
                  <th className="text-left p-2 font-medium">Название товара*</th>
                  <th className="text-left p-2 font-medium">Наименование продавца</th>
                  <th className="text-left p-2 font-medium">Количество*</th>
                  <th className="text-left p-2 font-medium"></th>
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
                        className="min-w-[120px]"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="Артикул"
                        value={row.article}
                        onChange={(e) => updateRow(row.id, 'article', e.target.value)}
                        className="min-w-[100px]"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="Цвет"
                        value={row.color}
                        onChange={(e) => updateRow(row.id, 'color', e.target.value)}
                        className="min-w-[80px]"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="Размер"
                        value={row.size}
                        onChange={(e) => updateRow(row.id, 'size', e.target.value)}
                        className="min-w-[80px]"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="Название товара"
                        value={row.productName}
                        onChange={(e) => updateRow(row.id, 'productName', e.target.value)}
                        className="min-w-[150px]"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="Наименование продавца"
                        value={sameSellerName ? globalSellerName : row.sellerName}
                        onChange={(e) => updateRow(row.id, 'sellerName', e.target.value)}
                        disabled={sameSellerName}
                        className="min-w-[150px]"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        placeholder="1"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="min-w-[80px]"
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

          <div className="mt-4">
            <Button onClick={addRow} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Добавить строку
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Основные настройки</CardTitle>
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
              <div className="flex gap-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="A4"
                    checked={barcodeType === "A4"}
                    onChange={(e) => setBarcodeType(e.target.value)}
                  />
                  <span className="text-sm">A4</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="Термоэтикетка"
                    checked={barcodeType === "Термоэтикетка"}
                    onChange={(e) => setBarcodeType(e.target.value)}
                  />
                  <span className="text-sm">Термоэтикетка</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Размер наклейки (мм, ШхВ)</Label>
              <Select value={labelSize} onValueChange={setLabelSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="40x25">40x25</SelectItem>
                  <SelectItem value="58x40">58x40</SelectItem>
                  <SelectItem value="70x40">70x40</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Размер шрифта (px)</Label>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8px</SelectItem>
                  <SelectItem value="10">10px</SelectItem>
                  <SelectItem value="12">12px</SelectItem>
                  <SelectItem value="14">14px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-end">
        <Button onClick={generateLabels} size="lg" className="bg-wb-purple hover:bg-wb-purple/80">
          <Download className="h-4 w-4 mr-2" />
          Сгенерировать этикетки
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        * - параметры Штрихкод, Наименование продавца, Количество обязательны для заполнения. 
        Штрихкод также проверяется на валидность.
      </div>
    </div>
  );
}