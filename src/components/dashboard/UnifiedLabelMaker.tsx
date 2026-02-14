import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Info } from "lucide-react";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UnifiedLabelMakerProps {
  mode: "barcode" | "wb";
}

export default function UnifiedLabelMaker({ mode }: UnifiedLabelMakerProps) {
  const [code, setCode] = useState("ABC-abc-1234");
  const [field1, setField1] = useState(""); // barcode: Наименование, wb: Порядковый номер
  const [field2, setField2] = useState(""); // barcode: Артикул, wb: Свободное поле
  const [format, setFormat] = useState("a4");
  const [barWidth, setBarWidth] = useState(3);
  const [barHPct, setBarHPct] = useState(45);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageInnerRef = useRef<HTMLDivElement>(null);

  const PRESETS = useMemo(
    () => ({
      a4: {
        w_mm: 210,
        h_mm: 297,
        dpi: 300,
        badge: "A4",
        margins_mm: { top: 15, left: 15, right: 15, bottom: 25 },
        titlePx: 36,
        skuPx: 28,
      },
      "58x40": {
        w_mm: 58,
        h_mm: 40,
        dpi: 203,
        badge: "58×40",
        margins_mm: { top: 3, left: 3, right: 3, bottom: 6 },
        titlePx: 16,
        skuPx: 13,
      },
    }),
    []
  );

  const mm2px = useCallback(
    (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi),
    []
  );

  // Load Montserrat font once
  useEffect(() => {
    if (!document.getElementById("montserrat-link")) {
      const l = document.createElement("link");
      l.id = "montserrat-link";
      l.rel = "stylesheet";
      l.href =
        "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const render = useCallback(async () => {
    const p = previewCanvasRef.current;
    const stageBox = stageInnerRef.current;
    if (!p || !stageBox) return;

    if (document?.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    const fmt = PRESETS[format as keyof typeof PRESETS];
    const W = mm2px(fmt.w_mm, fmt.dpi);
    const H = mm2px(fmt.h_mm, fmt.dpi);

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const ctx = off.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    const ML = mm2px(fmt.margins_mm.left, fmt.dpi);
    const MR = mm2px(fmt.margins_mm.right, fmt.dpi);
    const MT = mm2px(fmt.margins_mm.top, fmt.dpi);
    const MB = mm2px(fmt.margins_mm.bottom, fmt.dpi);
    const innerW = W - ML - MR;
    const usableH = H - MT - MB;

    // Title lines (field1)
    let titleLines: string[] = [];
    let titleH = 0;
    if (field1.trim()) {
      ctx.font = `700 ${fmt.titlePx}px Montserrat, Arial, sans-serif`;
      ctx.textAlign = "left";
      const lineH = Math.round(fmt.titlePx * 1.25);
      const words = field1.trim().split(/\s+/);
      let line = "";
      for (const w of words) {
        const t = line ? `${line} ${w}` : w;
        if (ctx.measureText(t).width > innerW && line) {
          titleLines.push(line);
          line = w;
        } else {
          line = t;
        }
      }
      if (line) titleLines.push(line);
      titleH = lineH * titleLines.length + Math.round(lineH * 0.4);
    }

    const field2H = field2.trim() ? Math.round(fmt.skuPx * 1.2) : 0;

    const barHeight = Math.max(
      60,
      Math.round(usableH * (Number(barHPct) / 100))
    );
    const barLineW = Number(barWidth);

    const bCanvas = document.createElement("canvas");
    bCanvas.width = innerW;
    bCanvas.height = barHeight;
    let barcodeOk = true;
    try {
      JsBarcode(bCanvas, (code || " ").trim(), {
        format: "CODE128",
        width: barLineW,
        height: Math.max(60, barHeight - 60),
        margin: 10,
        displayValue: true,
        fontSize: Math.max(18, Math.round(barHeight * 0.13)),
        textMargin: 8,
        lineColor: "#000",
      });
    } catch (e: any) {
      barcodeOk = false;
      ctx.fillStyle = "#b00020";
      ctx.font = `700 ${fmt.skuPx}px Montserrat, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        "Ошибка: " + e.message,
        ML + innerW / 2,
        MT + fmt.skuPx * 1.2
      );
    }

    const totalH = titleH + field2H + barHeight;
    let y = MT + Math.max(0, Math.floor((usableH - totalH) / 2));

    if (titleLines.length) {
      ctx.fillStyle = "#111";
      ctx.font = `700 ${fmt.titlePx}px Montserrat, Arial, sans-serif`;
      ctx.textAlign = "center";
      const lineH = Math.round(fmt.titlePx * 1.25);
      const cx = ML + innerW / 2;
      titleLines.forEach((ln, i) =>
        ctx.fillText(ln, cx, y + lineH * (i + 1))
      );
      y += lineH * titleLines.length + Math.round(lineH * 0.4);
    }

    if (field2.trim()) {
      ctx.fillStyle = "#333";
      ctx.font = `600 ${fmt.skuPx}px Montserrat, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(field2.trim(), ML + innerW / 2, y + fmt.skuPx * 1.2);
      y += field2H;
    }

    if (barcodeOk) {
      const bx = ML + Math.round((innerW - bCanvas.width) / 2);
      ctx.drawImage(bCanvas, bx, y);
    }

    // Scale preview with ResizeObserver-compatible sizing
    const rect = stageBox.getBoundingClientRect();
    const scale = Math.min(rect.width / W, rect.height / H, 1) || 1;
    p.width = Math.round(W * scale);
    p.height = Math.round(H * scale);
    const pctx = p.getContext("2d")!;
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = "high";
    pctx.clearRect(0, 0, p.width, p.height);
    pctx.drawImage(off, 0, 0, p.width, p.height);

    (p as any).__fullImage = off;
  }, [PRESETS, format, barHPct, barWidth, code, field1, field2, mm2px]);

  // ResizeObserver for adaptive preview
  useEffect(() => {
    const stageBox = stageInnerRef.current;
    if (!stageBox) {
      render();
      return;
    }

    let raf: number;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => render());
    });
    observer.observe(stageBox);
    render();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [render]);

  const handleDownload = useCallback(() => {
    const full = (previewCanvasRef.current as any)?.__fullImage;
    if (!full) return;
    const a = document.createElement("a");
    const fmtLabel = format === "a4" ? "A4" : "58x40";
    a.download = `barcode_${fmtLabel}.png`;
    a.href = full.toDataURL("image/png", 1.0);
    a.click();
  }, [format]);

  const field1Label = mode === "barcode" ? "Наименование" : "Порядковый номер";
  const field1Placeholder =
    mode === "barcode"
      ? "Введите наименование товара"
      : "Введите порядковый номер";
  const field2Label = mode === "barcode" ? "Артикул" : "Свободное поле";
  const field2Placeholder =
    mode === "barcode"
      ? "Введите артикул товара"
      : "Введите произвольный текст";

  const fmt = PRESETS[format as keyof typeof PRESETS];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: Form */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="font-semibold">
            Штрих-код (Code-128) <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Введите штрихкод"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bg-background/50 border-border/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="font-semibold">{field1Label}</Label>
          <Input
            placeholder={field1Placeholder}
            value={field1}
            onChange={(e) => setField1(e.target.value)}
            className="bg-background/50 border-border/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="font-semibold">{field2Label}</Label>
          <Input
            placeholder={field2Placeholder}
            value={field2}
            onChange={(e) => setField2(e.target.value)}
            className="bg-background/50 border-border/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="font-semibold">Формат печати</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="bg-background/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4 (лист)</SelectItem>
              <SelectItem value="58x40">58×40 мм (термоэтикетка)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-semibold">Толщина штрихов</Label>
              <span className="text-sm text-muted-foreground font-medium">
                {barWidth}
              </span>
            </div>
            <Slider
              value={[barWidth]}
              onValueChange={(v) => setBarWidth(v[0])}
              min={1}
              max={5}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-semibold">Высота штрих-кода</Label>
              <span className="text-sm text-muted-foreground font-medium">
                {barHPct}%
              </span>
            </div>
            <Slider
              value={[barHPct]}
              onValueChange={(v) => setBarHPct(v[0])}
              min={20}
              max={80}
              step={1}
            />
          </div>
        </div>

        <Button
          size="lg"
          className="w-full sm:w-auto gap-2"
          onClick={handleDownload}
        >
          <Download className="w-4 h-4" />
          Скачать PNG
        </Button>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            Бесплатный инструмент. Для термопринтера выбирайте 58×40 мм и
            печатайте без масштабирования (Actual size).
          </p>
        </div>
      </div>

      {/* RIGHT: Preview */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-6 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Превью макета</h3>
          <Badge variant="outline" className="font-bold text-xs">
            {fmt.badge}
          </Badge>
        </div>

        <div className="flex-1 border border-dashed border-border/50 rounded-xl p-3 bg-card/30 min-h-[360px] lg:min-h-0">
          <div
            ref={stageInnerRef}
            className="bg-white dark:bg-white/95 rounded-lg w-full h-full flex items-center justify-center overflow-auto min-h-[320px]"
          >
            <canvas
              ref={previewCanvasRef}
              className="block max-w-full h-auto"
              aria-label="Предпросмотр этикетки"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
