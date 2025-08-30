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
    data: "",
    name: "",
    sku: "",
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
          displayValue: false,
          font: 'Inter, Arial',
          textPosition: 'bottom',
          fontSize: currentState.format === '58x40' ? 36 : 46,
          textMargin: currentState.format === '58x40' ? 24 : 32,
          margin: 0,
          width: currentState.format === '58x40' ? 4 : 5,
          height: Math.round(mmToPx(barsMM, dpi))
        });

      // Don't scale the barcode - keep it original size
      const bw = barsCanvas.width;
      const bh = barsCanvas.height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(barsCanvas, x, y, bw, bh);
      y += bh + Math.round((currentState.format === '58x40' ? 42 : 66) * 0.35);

      // Tech line
      const infoPx = currentState.format === '58x40' ? 28 : 34;
      ctx.font = `400 ${infoPx}px Inter, Arial`;
      ctx.fillText('ШК: ' + currentState.data, x, y);
    } catch (error) {
      console.warn('Barcode generation failed:', error);
      // Fallback: just show placeholder
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x, y, innerW, Math.round(mmToPx(barsMM, dpi)));
      ctx.fillStyle = '#000000';
      ctx.fillText('ШК: ' + currentState.data, x, y + Math.round(mmToPx(barsMM, dpi)) + 20);
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

  // Generate and download PNG function
  const generatePNG = async (format: 'A4' | '58x40', isWB: boolean = false) => {
    const currentState = isWB ? wbState : labelState;
    if (!currentState.data) {
      toast('Введите данные для штрих‑кода');
      return;
    }

    const btn = document.activeElement as HTMLButtonElement;
    
    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Генерируется…';
      }

      // PNG dimensions as specified: A4: 2481×3507, 58x40: 685x472
      const W = format === '58x40' ? 685 : 2481;
      const H = format === '58x40' ? 472 : 3507;
      
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#000000';
      
      // Calculate margins and positioning - center the content
      const margin = format === '58x40' ? 20 : 100;
      const innerW = W - margin * 2;
      let x = margin, y = margin + (format === '58x40' ? 40 : 150);

      if (isWB) {
        // WB Box label rendering
        if (wbState.sequenceNumber?.trim()) {
          const titlePx = format === '58x40' ? 32 : 120;
          ctx.font = `700 ${titlePx}px Arial, sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText(wbState.sequenceNumber, x, y);
          y += Math.round(titlePx * 1.3);
        }

        if (wbState.freeField?.trim()) {
          const fieldPx = format === '58x40' ? 24 : 80;
          ctx.font = `500 ${fieldPx}px Arial, sans-serif`;
          y = drawWrap(ctx, wbState.freeField, x, y, innerW, Math.round(fieldPx * 1.3), format === '58x40' ? 2 : 3);
          y += Math.round(fieldPx * 0.5);
        }

        const skuPx = format === '58x40' ? 24 : 80;
        ctx.font = `500 ${skuPx}px Arial, sans-serif`;
        ctx.fillText('Количество: ' + wbState.quantity, x, y);
        y += Math.round(skuPx * 1.5);
      } else {
        // Product label rendering
        const titlePx = format === '58x40' ? 32 : 120;
        ctx.font = `700 ${titlePx}px Arial, sans-serif`;
        ctx.textAlign = 'left';
        y = drawWrap(ctx, labelState.name || '-', x, y, innerW, Math.round(titlePx * 1.3), format === '58x40' ? 2 : 3);
        y += Math.round(titlePx * 0.5);

        const skuPx = format === '58x40' ? 24 : 80;
        ctx.font = `500 ${skuPx}px Arial, sans-serif`;
        ctx.fillText('Артикул: ' + (labelState.sku || '-'), x, y);
        y += Math.round(skuPx * 1.5);
      }

      // Barcode rendering
      const barsCanvas = document.createElement('canvas');
      try {
        JsBarcode(barsCanvas, currentState.data, {
          format: 'code128',
          displayValue: false,
          font: 'Arial',
          textPosition: 'bottom',
          fontSize: format === '58x40' ? 18 : 60,
          textMargin: format === '58x40' ? 8 : 20,
          margin: 0,
          width: format === '58x40' ? 2 : 6,
          height: format === '58x40' ? 120 : 300
        });

        // Center the barcode horizontally without scaling
        const bw = barsCanvas.width;
        const bh = barsCanvas.height;
        const barcodeX = x + (innerW - bw) / 2; // Center horizontally
        
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(barsCanvas, barcodeX, y, bw, bh);
        y += bh + (format === '58x40' ? 20 : 40);

        // Tech line
        const infoPx = format === '58x40' ? 16 : 50;
        ctx.font = `400 ${infoPx}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('ШК: ' + currentState.data, W / 2, y);
      } catch (error) {
        console.warn('Barcode generation failed:', error);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, innerW, format === '58x40' ? 60 : 150);
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText('ШК: ' + currentState.data, W / 2, y + (format === '58x40' ? 40 : 100));
      }

      // Download PNG
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      const filename = `${isWB ? 'wb_' : ''}label_${format === '58x40' ? '58x40mm' : 'A4'}_${((isWB ? wbState.sequenceNumber : labelState.sku) || 'sku').replace(/[^a-z0-9_-]/gi, '')}.png`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast("PNG файл успешно создан!");
    } catch (e: any) {
      toast('Не удалось сформировать PNG: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Скачать PNG';
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
            <span className="text-green-700 text-sm font-medium">для всех пользователей WB Генератор</span>
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
          <div dangerouslySetInnerHTML={{
            __html: `
<!-- WB Barcode Generator – compact fields + grey cards -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>

<div id="wb-gen">
  <div class="wb-grid">
    <!-- LEFT: form -->
    <div class="wb-card wb-form">
      <label class="wb-label req">Штрих-код (Code-128)*</label>
      <input id="f_code" class="wb-input" placeholder="Введите штрихкод" value="ABC-abc-1234"/>

      <label class="wb-label">Наименование</label>
      <input id="f_title" class="wb-input" placeholder="Введите наименование товара"/>

      <label class="wb-label">Артикул</label>
      <input id="f_sku" class="wb-input" placeholder="Введите артикул товара"/>

      <label class="wb-label">Формат печати</label>
      <div class="wb-select-wrap">
        <select id="f_format" class="wb-select">
          <option value="a4" selected>A4 (лист)</option>
          <option value="58x40">58×40 мм (термоэтикетка)</option>
        </select>
        <span class="wb-select-arrow">▾</span>
      </div>

      <div class="wb-row">
        <div class="wb-range">
          <div class="wb-range-top">
            <span>Толщина штрихов</span><span id="val_width">3</span>
          </div>
          <input id="r_width" type="range" min="1" max="5" step="1" value="3" />
        </div>
        <div class="wb-range">
          <div class="wb-range-top">
            <span>Высота штрих-кода</span><span id="val_hpct">45%</span>
          </div>
          <input id="r_hpct" type="range" min="20" max="80" step="1" value="45" />
        </div>
      </div>

      <button id="btn_download" class="wb-btn wb-primary">
        <span class="wb-btn-ico">⬇</span> Скачать PNG
      </button>

      <p class="wb-note">Для термопринтера выбирайте 58×40 мм и печатайте без масштабирования (Actual size).</p>
    </div>

    <!-- RIGHT: preview -->
    <div class="wb-card wb-preview">
      <div class="wb-prev-head">
        <div class="wb-prev-title">Превью макета</div>
        <div id="badge" class="wb-badge">A4</div>
      </div>
      <div class="wb-prev-stage">
        <div class="wb-stage-in">
          <canvas id="preview" aria-label="Предпросмотр"></canvas>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* base / palette */
  #wb-gen, #wb-gen *{box-sizing:border-box}
  #wb-gen{
    --bg:#ffffff;           /* фон блока */
    --card:#f5f6f8;         /* светло-серые подложки */
    --line:#e3e6ea;
    --muted:#7e8a8a;
    --text:#222;
    --green:#20a04b; --green-h:#199243;
    --radius:14px; --shadow:0 8px 28px rgba(0,0,0,.06);
    font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--text);
    background:var(--bg); padding:0; border-radius:var(--radius);
  }

  /* layout */
  #wb-gen .wb-grid{display:grid;grid-template-columns:minmax(320px,520px) 1fr;gap:18px}
  #wb-gen .wb-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px;overflow:hidden}

  /* compact fields */
  .wb-input,.wb-select,.wb-btn{width:100%;max-width:520px} /* ограничение ширины */
  .wb-input,.wb-select{height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px;outline:none;background:#fff}
  .wb-input:focus,.wb-select:focus{border-color:#cfd7d6;box-shadow:0 0 0 2px rgba(32,160,75,.07)}
  .wb-label{display:block;font-weight:600;margin:10px 2px 6px}
  .wb-label.req::after{content:" *";color:#d33}
  .wb-select-wrap{position:relative;max-width:520px}
  .wb-select{appearance:none}
  .wb-select-arrow{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted)}
  .wb-btn{margin-top:14px;display:inline-flex;gap:8px;align-items:center;justify-content:center;border:0;border-radius:12px;padding:12px 16px;font-weight:700;cursor:pointer;transition:.15s}
  .wb-primary{background:var(--green);color:#fff}.wb-primary:hover{background:var(--green-h)}
  .wb-btn-ico{font-size:16px}
  .wb-note{margin:10px 2px 0;color:var(--muted);font-size:13px}
  .wb-row{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px;max-width:520px}

  /* ranges */
  .wb-range{display:flex;flex-direction:column;gap:8px}
  .wb-range-top{display:flex;justify-content:space-between;align-items:center;font-weight:600}
  .wb-range input[type=range]{-webkit-appearance:none;appearance:none;height:34px;background:transparent;width:100%}
  .wb-range input[type=range]:focus{outline:none}
  .wb-range input[type=range]::-webkit-slider-runnable-track{height:8px;background:#eef2f1;border-radius:999px;border:1px solid var(--line)}
  .wb-range input[type=range]::-moz-range-track{height:8px;background:#eef2f1;border-radius:999px;border:1px solid var(--line)}
  .wb-range input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;margin-top:-6px;width:20px;height:20px;border-radius:50%;background:var(--green);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  .wb-range input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--green);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  .wb-range input[type=range]::-moz-range-progress{height:8px;background:rgba(32,160,75,.25);border-radius:999px}

  /* preview */
  .wb-preview{display:flex;flex-direction:column;gap:14px}
  .wb-prev-head{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 0}
  .wb-prev-title{font-weight:700;font-size:20px}
  .wb-badge{font-weight:700;font-size:12px;color:#6c757d;border:1px solid var(--line);padding:4px 8px;border-radius:999px;background:#fff}
  .wb-prev-stage{flex:1;border:1px dashed #dcdedd;border-radius:12px;padding:14px;background:var(--card);min-height:360px}
  .wb-stage-in{background:#fff;border-radius:10px;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:auto}
  #preview{display:block;max-width:100%;height:auto}

  /* responsive */
  @media (max-width:980px){
    #wb-gen .wb-grid{grid-template-columns:1fr}
    .wb-input,.wb-select,.wb-btn,.wb-row,.wb-select-wrap{max-width:100%} /* по мобиле на всю ширину карточки */
    .wb-prev-stage{min-height:420px}
  }
</style>

<script>
(function(){
  const $ = (s,scope=document)=>scope.querySelector(s);

  const elCode=$('#f_code'), elTitle=$('#f_title'), elSku=$('#f_sku'),
        elFormat=$('#f_format'), elPrev=$('#preview'), elBadge=$('#badge'),
        rWidth=$('#r_width'), rHPct=$('#r_hpct'),
        vWidth=$('#val_width'), vHPct=$('#val_hpct'),
        btnDownload=$('#btn_download');

  const PRESETS = {
    a4:   { w_mm:210, h_mm:297, dpi:300, badge:'A4',
            margins_mm:{top:15,left:15,right:15,bottom:25},
            titlePx:36, skuPx:28 },
    '58x40': { w_mm:58, h_mm:40, dpi:203, badge:'58×40',
               margins_mm:{top:3,left:3,right:3,bottom:6},
               titlePx:16, skuPx:13 }
  };
  const mm2px = (mm, dpi)=> Math.round(mm/25.4*dpi);

  function render(){
    vWidth.textContent = rWidth.value;
    vHPct.textContent  = rHPct.value + '%';

    const fmt = PRESETS[elFormat.value];
    elBadge.textContent = fmt.badge;

    const W = mm2px(fmt.w_mm, fmt.dpi);
    const H = mm2px(fmt.h_mm, fmt.dpi);

    const off = document.createElement('canvas');
    off.width=W; off.height=H;
    const ctx = off.getContext('2d');

    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,W,H);

    const ML=mm2px(fmt.margins_mm.left, fmt.dpi);
    const MR=mm2px(fmt.margins_mm.right, fmt.dpi);
    const MT=mm2px(fmt.margins_mm.top, fmt.dpi);
    const MB=mm2px(fmt.margins_mm.bottom, fmt.dpi);
    const innerW = W-ML-MR;
    const usableH = H-MT-MB;

    // title measure
    let titleLines=[], titleH=0, skuH=0;
    if(elTitle.value.trim()){
      ctx.font = \`700 \${fmt.titlePx}px Montserrat, Arial, sans-serif\`;
      const lineH = Math.round(fmt.titlePx*1.25);
      const words = elTitle.value.trim().split(/\\s+/);
      let line='';
      for (let w of words){
        const t = line? (line+' '+w) : w;
        if(ctx.measureText(t).width > innerW && line){ titleLines.push(line); line=w; }
        else line=t;
      }
      if(line) titleLines.push(line);
      titleH = lineH*titleLines.length + Math.round(lineH*0.4);
    }
    if(elSku.value.trim()){ skuH = Math.round(fmt.skuPx*1.2); }

    const barHeight = Math.max(60, Math.round(usableH * (Number(rHPct.value)/100)));
    const barLineW  = Number(rWidth.value);

    const bCanvas = document.createElement('canvas');
    bCanvas.width  = innerW;
    bCanvas.height = barHeight;

    try{
      JsBarcode(bCanvas, elCode.value.trim() || ' ', {
        format:'CODE128',
        width: barLineW,
        height: Math.max(60, barHeight-60),
        margin: 10,
        displayValue: true,
        /* не задаём font — JsBarcode оставит дефолтный для подписи */
        fontSize: Math.max(18, Math.round(barHeight*0.13)),
        textMargin: 8,
        lineColor:"#000"
      });
    }catch(e){
      ctx.fillStyle='#b00020';
      ctx.font = \`700 \${fmt.skuPx}px Montserrat, Arial, sans-serif\`;
      ctx.textAlign='center';
      ctx.fillText('Ошибка: ' + e.message, ML+innerW/2, MT + fmt.skuPx*1.2);
    }

    // Центровка всего блока по вертикали в границах печати
    const totalH = titleH + skuH + barHeight;
    let y = MT + Math.max(0, Math.floor((usableH - totalH)/2));

    // draw title
    if(titleLines.length){
      ctx.fillStyle='#111';
      ctx.font = \`700 \${fmt.titlePx}px Montserrat, Arial, sans-serif\`;
      ctx.textAlign='center';
      const lineH = Math.round(fmt.titlePx*1.25);
      const cx = ML + innerW/2;
      titleLines.forEach((ln,i)=> ctx.fillText(ln, cx, y + lineH*(i+1)) );
      y += lineH*titleLines.length + Math.round(lineH*0.4);
    }

    // draw SKU
    if(elSku.value.trim()){
      ctx.fillStyle='#333';
      ctx.font = \`600 \${fmt.skuPx}px Montserrat, Arial, sans-serif\`;
      ctx.textAlign='center';
      ctx.fillText(elSku.value.trim(), ML+innerW/2, y + fmt.skuPx*1.2);
      y += skuH;
    }

    // barcode centered horizontally
    const bx = ML + Math.round((innerW - bCanvas.width)/2);
    ctx.drawImage(bCanvas, bx, y);

    // preview scale
    const box = document.querySelector('.wb-stage-in').getBoundingClientRect();
    const scale = Math.min(box.width / W, box.height / H, 1) || 1;
    elPrev.width = Math.round(W*scale);
    elPrev.height= Math.round(H*scale);
    const pctx = elPrev.getContext('2d');
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = 'high';
    pctx.clearRect(0,0,elPrev.width, elPrev.height);
    pctx.drawImage(off, 0,0, elPrev.width, elPrev.height);

    elPrev.__fullImage = off;
  }

  function downloadPNG(){
    const full = elPrev.__fullImage;
    if(!full) return;
    const a = document.createElement('a');
    const fmt = document.querySelector('#f_format').value === 'a4' ? 'A4' : '58x40';
    a.download = \`barcode_\${fmt}.png\`;
    a.href = full.toDataURL('image/png', 1.0);
    a.click();
  }

  ['input','change'].forEach(ev=>{
    ['#f_code','#f_title','#f_sku','#f_format','#r_width','#r_hpct']
      .map(s=>document.querySelector(s)).forEach(el=> el.addEventListener(ev, render));
    window.addEventListener('resize', render);
  });
  document.querySelector('#btn_download').addEventListener('click', downloadPNG);

  render();
})();
</script>
            `
          }} />
        </TabsContent>

        <TabsContent value="wb" className="space-y-4 sm:space-y-6">
          <div dangerouslySetInnerHTML={{
            __html: `
<!-- WB Barcode Generator – compact fields + grey cards -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>

<div id="wb-gen-box">
  <div class="wb-grid">
    <!-- LEFT: form -->
    <div class="wb-card wb-form">
      <label class="wb-label req">Штрих-код (Code-128)*</label>
      <input id="f_code_wb" class="wb-input" placeholder="Введите штрихкод" value="ABC-abc-1234"/>
      
      <label class="wb-label">Наименование</label>
      <input id="f_title_wb" class="wb-input" placeholder="Введите наименование товара"/>
      
      <label class="wb-label">Артикул</label>
      <input id="f_sku_wb" class="wb-input" placeholder="Введите артикул товара"/>
      
      <label class="wb-label">Формат печати</label>
      <div class="wb-select-wrap">
        <select id="f_format_wb" class="wb-select">
          <option value="a4" selected>A4 (лист)</option>
          <option value="58x40">58×40 мм (термоэтикетка)</option>
        </select>
        <span class="wb-select-arrow">▾</span>
      </div>
      
      <div class="wb-row">
        <div class="wb-range">
          <div class="wb-range-top">
            <span>Толщина штрихов</span><span id="val_width_wb">3</span>
          </div>
          <input id="r_width_wb" type="range" min="1" max="5" step="1" value="3" />
        </div>
        <div class="wb-range">
          <div class="wb-range-top">
            <span>Высота штрих-кода</span><span id="val_hpct_wb">45%</span>
          </div>
          <input id="r_hpct_wb" type="range" min="20" max="80" step="1" value="45" />
        </div>
      </div>
      
      <button id="btn_download_wb" class="wb-btn wb-primary">
        <span class="wb-btn-ico">⬇</span> Скачать PNG
      </button>
      
      <p class="wb-note">Для термопринтера выбирайте 58×40 мм и печатайте без масштабирования (Actual size).</p>
    </div>
    
    <!-- RIGHT: preview -->
    <div class="wb-card wb-preview">
      <div class="wb-prev-head">
        <div class="wb-prev-title">Превью макета</div>
        <div id="badge_wb" class="wb-badge">A4</div>
      </div>
      <div class="wb-prev-stage">
        <div class="wb-stage-in">
          <canvas id="preview_wb" aria-label="Предпросмотр"></canvas>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* base / palette */
  #wb-gen-box, #wb-gen-box *{box-sizing:border-box}
  #wb-gen-box{
    --bg:#ffffff;           /* фон блока */
    --card:#f5f6f8;         /* светло-серые подложки */
    --line:#e3e6ea;
    --muted:#7e8a8a;
    --text:#222;
    --green:#20a04b; --green-h:#199243;
    --radius:14px; --shadow:0 8px 28px rgba(0,0,0,.06);
    font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--text);
    background:var(--bg); padding:0; border-radius:var(--radius);
  }
  
  /* layout */
  #wb-gen-box .wb-grid{display:grid;grid-template-columns:minmax(320px,520px) 1fr;gap:18px}
  #wb-gen-box .wb-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px;overflow:hidden}
  
  /* compact fields */
  #wb-gen-box .wb-input,#wb-gen-box .wb-select,#wb-gen-box .wb-btn{width:100%;max-width:520px} /* ограничение ширины */
  #wb-gen-box .wb-input,#wb-gen-box .wb-select{height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px;outline:none;background:#fff}
  #wb-gen-box .wb-input:focus,#wb-gen-box .wb-select:focus{border-color:#cfd7d6;box-shadow:0 0 0 2px rgba(32,160,75,.07)}
  #wb-gen-box .wb-label{display:block;font-weight:600;margin:10px 2px 6px}
  #wb-gen-box .wb-label.req::after{content:" *";color:#d33}
  #wb-gen-box .wb-select-wrap{position:relative;max-width:520px}
  #wb-gen-box .wb-select{appearance:none}
  #wb-gen-box .wb-select-arrow{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted)}
  #wb-gen-box .wb-btn{margin-top:14px;display:inline-flex;gap:8px;align-items:center;justify-content:center;border:0;border-radius:12px;padding:12px 16px;font-weight:700;cursor:pointer;transition:.15s}
  #wb-gen-box .wb-primary{background:var(--green);color:#fff}#wb-gen-box .wb-primary:hover{background:var(--green-h)}
  #wb-gen-box .wb-btn-ico{font-size:16px}
  #wb-gen-box .wb-note{margin:10px 2px 0;color:var(--muted);font-size:13px}
  #wb-gen-box .wb-row{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px;max-width:520px}
  
  /* ranges */
  #wb-gen-box .wb-range{display:flex;flex-direction:column;gap:8px}
  #wb-gen-box .wb-range-top{display:flex;justify-content:space-between;align-items:center;font-weight:600}
  #wb-gen-box .wb-range input[type=range]{-webkit-appearance:none;appearance:none;height:34px;background:transparent;width:100%}
  #wb-gen-box .wb-range input[type=range]:focus{outline:none}
  #wb-gen-box .wb-range input[type=range]::-webkit-slider-runnable-track{height:8px;background:#eef2f1;border-radius:999px;border:1px solid var(--line)}
  #wb-gen-box .wb-range input[type=range]::-moz-range-track{height:8px;background:#eef2f1;border-radius:999px;border:1px solid var(--line)}
  #wb-gen-box .wb-range input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;margin-top:-6px;width:20px;height:20px;border-radius:50%;background:var(--green);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  #wb-gen-box .wb-range input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--green);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  #wb-gen-box .wb-range input[type=range]::-moz-range-progress{height:8px;background:rgba(32,160,75,.25);border-radius:999px}
  
  /* preview */
  #wb-gen-box .wb-preview{display:flex;flex-direction:column;gap:14px}
  #wb-gen-box .wb-prev-head{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 0}
  #wb-gen-box .wb-prev-title{font-weight:700;font-size:20px}
  #wb-gen-box .wb-badge{font-weight:700;font-size:12px;color:#6c757d;border:1px solid var(--line);padding:4px 8px;border-radius:999px;background:#fff}
  #wb-gen-box .wb-prev-stage{flex:1;border:1px dashed #dcdedd;border-radius:12px;padding:14px;background:var(--card);min-height:360px}
  #wb-gen-box .wb-stage-in{background:#fff;border-radius:10px;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:auto}
  #wb-gen-box #preview_wb{display:block;max-width:100%;height:auto}
  
  /* responsive */
  @media (max-width:980px){
    #wb-gen-box .wb-grid{grid-template-columns:1fr}
    #wb-gen-box .wb-input,#wb-gen-box .wb-select,#wb-gen-box .wb-btn,#wb-gen-box .wb-row,#wb-gen-box .wb-select-wrap{max-width:100%} /* по мобиле на всю ширину карточки */
    #wb-gen-box .wb-prev-stage{min-height:420px}
  }
</style>

<script>
(function(){
  const $ = (s,scope=document)=>scope.querySelector(s);
  
  const elCode=$('#f_code_wb'), elTitle=$('#f_title_wb'), elSku=$('#f_sku_wb'),
        elFormat=$('#f_format_wb'), elPrev=$('#preview_wb'), elBadge=$('#badge_wb'),
        rWidth=$('#r_width_wb'), rHPct=$('#r_hpct_wb'),
        vWidth=$('#val_width_wb'), vHPct=$('#val_hpct_wb'),
        btnDownload=$('#btn_download_wb');
  
  const PRESETS = {
    a4:   { w_mm:210, h_mm:297, dpi:300, badge:'A4',
            margins_mm:{top:15,left:15,right:15,bottom:25},
            titlePx:36, skuPx:28 },
    '58x40': { w_mm:58, h_mm:40, dpi:203, badge:'58×40',
               margins_mm:{top:3,left:3,right:3,bottom:6},
               titlePx:16, skuPx:13 }
  };
  const mm2px = (mm, dpi)=> Math.round(mm/25.4*dpi);
  
  function render(){
    vWidth.textContent = rWidth.value;
    vHPct.textContent  = rHPct.value + '%';
    
    const fmt = PRESETS[elFormat.value];
    elBadge.textContent = fmt.badge;
    
    const W = mm2px(fmt.w_mm, fmt.dpi);
    const H = mm2px(fmt.h_mm, fmt.dpi);
    
    const off = document.createElement('canvas');
    off.width=W; off.height=H;
    const ctx = off.getContext('2d');
    
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,W,H);
    
    const ML=mm2px(fmt.margins_mm.left, fmt.dpi);
    const MR=mm2px(fmt.margins_mm.right, fmt.dpi);
    const MT=mm2px(fmt.margins_mm.top, fmt.dpi);
    const MB=mm2px(fmt.margins_mm.bottom, fmt.dpi);
    const innerW = W-ML-MR;
    const usableH = H-MT-MB;
    
    // title measure
    let titleLines=[], titleH=0, skuH=0;
    if(elTitle.value.trim()){
      ctx.font = \`700 \${fmt.titlePx}px Montserrat, Arial, sans-serif\`;
      const lineH = Math.round(fmt.titlePx*1.25);
      const words = elTitle.value.trim().split(/\\s+/);
      let line='';
      for (let w of words){
        const t = line? (line+' '+w) : w;
        if(ctx.measureText(t).width > innerW && line){ titleLines.push(line); line=w; }
        else line=t;
      }
      if(line) titleLines.push(line);
      titleH = lineH*titleLines.length + Math.round(lineH*0.4);
    }
    if(elSku.value.trim()){ skuH = Math.round(fmt.skuPx*1.2); }
    
    const barHeight = Math.max(60, Math.round(usableH * (Number(rHPct.value)/100)));
    const barLineW  = Number(rWidth.value);
    
    const bCanvas = document.createElement('canvas');
    bCanvas.width  = innerW;
    bCanvas.height = barHeight;
    
    try{
      JsBarcode(bCanvas, elCode.value.trim() || ' ', {
        format:'CODE128',
        width: barLineW,
        height: Math.max(60, barHeight-60),
        margin: 10,
        displayValue: true,
        /* не задаём font — JsBarcode оставит дефолтный для подписи */
        fontSize: Math.max(18, Math.round(barHeight*0.13)),
        textMargin: 8,
        lineColor:"#000"
      });
    }catch(e){
      ctx.fillStyle='#b00020';
      ctx.font = \`700 \${fmt.skuPx}px Montserrat, Arial, sans-serif\`;
      ctx.textAlign='center';
      ctx.fillText('Ошибка: ' + e.message, ML+innerW/2, MT + fmt.skuPx*1.2);
    }
    
    // Центровка всего блока по вертикали в границах печати
    const totalH = titleH + skuH + barHeight;
    let y = MT + Math.max(0, Math.floor((usableH - totalH)/2));
    
    // draw title
    if(titleLines.length){
      ctx.fillStyle='#111';
      ctx.font = \`700 \${fmt.titlePx}px Montserrat, Arial, sans-serif\`;
      ctx.textAlign='center';
      const lineH = Math.round(fmt.titlePx*1.25);
      const cx = ML + innerW/2;
      titleLines.forEach((ln,i)=> ctx.fillText(ln, cx, y + lineH*(i+1)) );
      y += lineH*titleLines.length + Math.round(lineH*0.4);
    }
    
    // draw SKU
    if(elSku.value.trim()){
      ctx.fillStyle='#333';
      ctx.font = \`600 \${fmt.skuPx}px Montserrat, Arial, sans-serif\`;
      ctx.textAlign='center';
      ctx.fillText(elSku.value.trim(), ML+innerW/2, y + fmt.skuPx*1.2);
      y += skuH;
    }
    
    // barcode centered horizontally
    const bx = ML + Math.round((innerW - bCanvas.width)/2);
    ctx.drawImage(bCanvas, bx, y);
    
    // preview scale
    const box = document.querySelector('#wb-gen-box .wb-stage-in').getBoundingClientRect();
    const scale = Math.min(box.width / W, box.height / H, 1) || 1;
    elPrev.width = Math.round(W*scale);
    elPrev.height= Math.round(H*scale);
    const pctx = elPrev.getContext('2d');
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = 'high';
    pctx.clearRect(0,0,elPrev.width, elPrev.height);
    pctx.drawImage(off, 0,0, elPrev.width, elPrev.height);
    
    elPrev.__fullImage = off;
  }
  
  function downloadPNG(){
    const full = elPrev.__fullImage;
    if(!full) return;
    const a = document.createElement('a');
    const fmt = document.querySelector('#f_format_wb').value === 'a4' ? 'A4' : '58x40';
    a.download = \`barcode_wb_\${fmt}.png\`;
    a.href = full.toDataURL('image/png', 1.0);
    a.click();
  }
  
  ['input','change'].forEach(ev=>{
    ['#f_code_wb','#f_title_wb','#f_sku_wb','#f_format_wb','#r_width_wb','#r_hpct_wb']
      .map(s=>document.querySelector(s)).forEach(el=> el.addEventListener(ev, render));
    window.addEventListener('resize', render);
  });
  document.querySelector('#btn_download_wb').addEventListener('click', downloadPNG);
  
  render();
})();
</script>
            `
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}