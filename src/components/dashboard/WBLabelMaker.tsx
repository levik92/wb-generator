import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import JsBarcode from "jsbarcode";

export default function WBLabelMaker() {
  // -------- state (управляемые поля) ----------
  const [code, setCode] = useState("ABC-abc-1234");
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [format, setFormat] = useState("a4");   // "a4" | "58x40"
  const [barWidth, setBarWidth] = useState(3);  // 1..5 (целое)
  const [barHPct, setBarHPct] = useState(45);   // 20..80 (%)

  // -------- refs ----------
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageInnerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  // -------- пресеты/утилиты ----------
  const PRESETS = useMemo(
    () => ({
      a4: {
        w_mm: 210, h_mm: 297, dpi: 300, badge: "A4",
        margins_mm: { top: 15, left: 15, right: 15, bottom: 25 },
        titlePx: 36, skuPx: 28,
      },
      "58x40": {
        w_mm: 58, h_mm: 40, dpi: 203, badge: "58×40",
        margins_mm: { top: 3, left: 3, right: 3, bottom: 6 },
        titlePx: 16, skuPx: 13,
      },
    }),
    []
  );

  const mm2px = useCallback((mm: number, dpi: number) => Math.round((mm / 25.4) * dpi), []);

  // -------- загрузка шрифта Montserrat (из head) ----------
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

  // -------- основной рендер превью + full image ----------
  const render = useCallback(async () => {
    const canvasPrev = previewCanvasRef.current;
    const stageBox = stageInnerRef.current;
    const badge = badgeRef.current;
    if (!canvasPrev || !stageBox) return;

    // дождаться шрифтов (если поддерживается)
    if ((document as any)?.fonts?.ready) {
      try {
        await (document as any).fonts.ready;
      } catch {}
    }

    const fmt = PRESETS[format as keyof typeof PRESETS];
    if (badge) badge.textContent = fmt.badge;

    const W = mm2px(fmt.w_mm, fmt.dpi);
    const H = mm2px(fmt.h_mm, fmt.dpi);

    // оффскрин для печати/скачивания (полное качество)
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const ctx = off.getContext("2d");
    if (!ctx) return;

    // фон
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // поля и рабочая область
    const ML = mm2px(fmt.margins_mm.left, fmt.dpi);
    const MR = mm2px(fmt.margins_mm.right, fmt.dpi);
    const MT = mm2px(fmt.margins_mm.top, fmt.dpi);
    const MB = mm2px(fmt.margins_mm.bottom, fmt.dpi);
    const innerW = W - ML - MR;
    const usableH = H - MT - MB;

    // измерение и перенос title
    let titleLines: string[] = [];
    let titleH = 0;
    if (title.trim()) {
      ctx.font = `700 ${fmt.titlePx}px Montserrat, Arial, sans-serif`;
      ctx.textAlign = "left";
      const lineH = Math.round(fmt.titlePx * 1.25);
      const words = title.trim().split(/\s+/);
      let line = "";
      for (let w of words) {
        const t = line ? line + " " + w : w;
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

    // высота строки sku
    const skuH = sku.trim() ? Math.round(fmt.skuPx * 1.2) : 0;

    // параметры штрих-кода
    const barHeight = Math.max(60, Math.round(usableH * (Number(barHPct) / 100)));
    const barLineW = Number(barWidth);

    // рисуем сам штрих-код на отдельном canvas шириной innerW (чтобы легко центрировать)
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
      // отрисуем ошибку
      ctx.fillStyle = "#b00020";
      ctx.font = `700 ${fmt.skuPx}px Montserrat, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Ошибка: " + e.message, ML + innerW / 2, MT + fmt.skuPx * 1.2);
    }

    // вертикальная центровка композиции
    const totalH = titleH + skuH + barHeight;
    let y = MT + Math.max(0, Math.floor((usableH - totalH) / 2));

    // заголовок (title)
    if (titleLines.length) {
      ctx.fillStyle = "#111";
      ctx.font = `700 ${fmt.titlePx}px Montserrat, Arial, sans-serif`;
      ctx.textAlign = "center";
      const lineH = Math.round(fmt.titlePx * 1.25);
      const cx = ML + innerW / 2;
      titleLines.forEach((ln, i) => ctx.fillText(ln, cx, y + lineH * (i + 1)));
      y += lineH * titleLines.length + Math.round(lineH * 0.4);
    }

    // артикул (sku)
    if (sku.trim()) {
      ctx.fillStyle = "#333";
      ctx.font = `600 ${fmt.skuPx}px Montserrat, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(sku.trim(), ML + innerW / 2, y + fmt.skuPx * 1.2);
      y += skuH;
    }

    // штрих-код по центру
    if (barcodeOk) {
      const bx = ML + Math.round((innerW - bCanvas.width) / 2);
      ctx.drawImage(bCanvas, bx, y);
    }

    // превью (масштаб под контейнер)
    const box = stageBox.getBoundingClientRect();
    const scale = Math.min(box.width / W, box.height / H, 1) || 1;

    const p = previewCanvasRef.current;
    if (!p) return;
    p.width = Math.round(W * scale);
    p.height = Math.round(H * scale);

    const pctx = p.getContext("2d");
    if (!pctx) return;
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = "high";
    pctx.clearRect(0, 0, p.width, p.height);
    pctx.drawImage(off, 0, 0, p.width, p.height);

    // сохраним полный оффскрин внутрь превью для скачивания
    (p as any).__fullImage = off;
  }, [PRESETS, format, barHPct, barWidth, code, sku, title, mm2px]);

  // первичный рендер + реакция на ресайз
  useEffect(() => {
    let raf: number;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => render());
    };
    window.addEventListener("resize", onResize);
    render();
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [render]);

  // скачивание PNG
  const handleDownload = useCallback(() => {
    const p = previewCanvasRef.current;
    const full = (p as any)?.__fullImage;
    if (!full) return;
    const a = document.createElement("a");
    const fmt = format === "a4" ? "A4" : "58x40";
    a.download = `barcode_${fmt}.png`;
    a.href = full.toDataURL("image/png", 1.0);
    a.click();
  }, [format]);

  return (
    <div id="wb-gen">
      {/* локальные стили один-в-один с Тильдой (слегка адаптированы под React) */}
      <style>{`
  #wb-gen, #wb-gen *{box-sizing:border-box}
  #wb-gen{
    --bg:#ffffff; --card:#f5f6f8; --line:#e3e6ea; --muted:#7e8a8a; --text:#222;
    --green:#10b981; --green-h:#059669; --radius:14px; --shadow:0 8px 28px rgba(0,0,0,.06);
    font-family:Montserrat,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    color:var(--text); background:var(--bg); padding:0; border-radius:var(--radius);
  }
  #wb-gen .wb-grid{display:grid;grid-template-columns:minmax(320px,520px) 1fr;gap:18px}
  #wb-gen .wb-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px;overflow:hidden}

  .wb-input,.wb-select,.wb-btn{width:100%;max-width:520px}
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
  .wb-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;max-width:520px}
  @media (max-width:520px){ .wb-row{grid-template-columns:1fr} }

  .wb-range{display:flex;flex-direction:column;gap:8px}
  .wb-range-top{display:flex;justify-content:space-between;align-items:center;font-weight:600}
  .wb-range input[type=range]{-webkit-appearance:none;appearance:none;height:34px;background:transparent;width:100%}
  .wb-range input[type=range]:focus{outline:none}
  .wb-range input[type=range]::-webkit-slider-runnable-track{height:8px;background:#eef2f1;border-radius:999px;border:1px solid var(--line)}
  .wb-range input[type=range]::-moz-range-track{height:8px;background:#eef2f1;border-radius:999px;border:1px solid var(--line)}
  .wb-range input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;margin-top:-6px;width:20px;height:20px;border-radius:50%;background:var(--green);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  .wb-range input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--green);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  .wb-range input[type=range]::-moz-range-progress{height:8px;background:rgba(16,185,129,.3);border-radius:999px}

  .wb-preview{display:flex;flex-direction:column;gap:14px}
  .wb-prev-head{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 0}
  .wb-prev-title{font-weight:700;font-size:20px}
  .wb-badge{font-weight:700;font-size:12px;color:#6c757d;border:1px solid var(--line);padding:4px 8px;border-radius:999px;background:#fff}
  .wb-prev-stage{flex:1;border:1px dashed #dcdedd;border-radius:12px;padding:14px;background:var(--card);min-height:360px}
  .wb-stage-in{background:#fff;border-radius:10px;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:auto}
  canvas#preview{display:block;max-width:100%;height:auto}

  @media (max-width:980px){
    #wb-gen .wb-grid{grid-template-columns:1fr}
    .wb-input,.wb-select,.wb-btn,.wb-row,.wb-select-wrap{max-width:100%}
    .wb-prev-stage{min-height:420px}
  }
      `}</style>

      <div className="wb-grid">
        {/* LEFT: form */}
        <div className="wb-card wb-form">
          <label className="wb-label req">Штрих-код (Code-128)*</label>
          <input
            className="wb-input"
            placeholder="Введите штрихкод"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <label className="wb-label">Наименование</label>
          <input
            className="wb-input"
            placeholder="Введите наименование товара"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="wb-label">Артикул</label>
          <input
            className="wb-input"
            placeholder="Введите артикул товара"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />

          <label className="wb-label">Формат печати</label>
          <div className="wb-select-wrap">
            <select
              className="wb-select"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="a4">A4 (лист)</option>
              <option value="58x40">58×40 мм (термоэтикетка)</option>
            </select>
            <span className="wb-select-arrow">▾</span>
          </div>

          <div className="wb-row">
            <div className="wb-range">
              <div className="wb-range-top">
                <span>Толщина штрихов</span>
                <span id="val_width">{barWidth}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={barWidth}
                onChange={(e) => setBarWidth(parseInt(e.target.value || "1", 10))}
              />
            </div>

            <div className="wb-range">
              <div className="wb-range-top">
                <span>Высота штрих-кода</span>
                <span id="val_hpct">{barHPct}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                step="1"
                value={barHPct}
                onChange={(e) => setBarHPct(parseInt(e.target.value || "20", 10))}
              />
            </div>
          </div>

          <button className="wb-btn wb-primary" onClick={handleDownload}>
            <Download className="wb-btn-ico" size={16} /> Скачать PNG
          </button>

          <p className="wb-note">
            Для термопринтера выбирайте 58×40 мм и печатайте без масштабирования (Actual size).
          </p>
        </div>

        {/* RIGHT: preview */}
        <div className="wb-card wb-preview">
          <div className="wb-prev-head">
            <div className="wb-prev-title">Превью макета</div>
            <div ref={badgeRef} className="wb-badge">A4</div>
          </div>

          <div className="wb-prev-stage">
            <div className="wb-stage-in" ref={stageInnerRef}>
              <canvas id="preview" ref={previewCanvasRef} aria-label="Предпросмотр" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}