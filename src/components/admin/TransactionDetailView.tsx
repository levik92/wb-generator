import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Image as ImageIcon, AlertTriangle, FileText, Sparkles, Loader2, Video, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

interface Props {
  transaction: Transaction | null;
}

interface JobDetails {
  kind: 'job';
  id: string;
  product_name: string;
  category: string;
  description: string;
  status: string;
  error_message: string | null;
  created_at: string;
  product_images: any[];
  tasks: Array<{
    id: string;
    card_type: string;
    card_index: number;
    status: string;
    image_url: string | null;
    last_error: string | null;
  }>;
}

interface DescriptionDetails {
  kind: 'description';
  id: string;
  product_name: string | null;
  category: string | null;
  status: string;
  created_at: string;
  input_data: any;
  output_data: any;
}

type Details = JobDetails | DescriptionDetails;

function extractImageUrl(img: any): string | null {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (typeof img === 'object') {
    return img.url || img.src || img.publicUrl || img.signedUrl || img.image_url || null;
  }
  return null;
}

function translateError(err: string | null): string {
  if (!err) return 'Неизвестная ошибка';
  const lower = err.toLowerCase();
  if (lower.includes('timeout')) return 'Превышено время ожидания генерации';
  if (lower.includes('safety') || lower.includes('blocked') || lower.includes('policy')) return 'Контент заблокирован фильтром безопасности';
  if (lower.includes('overload') || lower.includes('503') || lower.includes('500')) return 'Сервис временно перегружен';
  if (lower.includes('rate limit') || lower.includes('429')) return 'Превышен лимит запросов';
  if (lower.includes('non-2xx')) return 'Ошибка вызова API генерации';
  return err;
}

const CARD_TYPE_LABELS: Record<string, string> = {
  cover: 'Обложка',
  benefits: 'Преимущества',
  characteristics: 'Характеристики',
  beforeAfter: 'До / После',
  application: 'Применение',
  guarantee: 'Гарантия',
  size: 'Размер',
  composition: 'Состав',
  infographic: 'Инфографика',
  lifestyle: 'Лайфстайл',
};

export function TransactionDetailView({ transaction }: Props) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<Details | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!transaction) {
      setDetails(null);
      setZoomedImage(null);
      setNotFound(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const txTime = new Date(transaction.created_at).getTime();
        const fromIso = new Date(txTime - 10_000).toISOString();
        const toIso = new Date(txTime + 10_000).toISOString();

        const { data: jobs } = await supabase
          .from('generation_jobs')
          .select('id, product_name, category, description, status, error_message, created_at, product_images')
          .eq('user_id', transaction.user_id)
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .order('created_at', { ascending: true })
          .limit(5);

        if (jobs && jobs.length > 0) {
          const closest = jobs.reduce((best, j) => {
            const diff = Math.abs(new Date(j.created_at).getTime() - txTime);
            const bestDiff = Math.abs(new Date(best.created_at).getTime() - txTime);
            return diff < bestDiff ? j : best;
          }, jobs[0]);

          const { data: tasks } = await supabase
            .from('generation_tasks')
            .select('id, card_type, card_index, status, image_url, last_error')
            .eq('job_id', closest.id)
            .order('card_index', { ascending: true });

          setDetails({
            kind: 'job',
            id: closest.id,
            product_name: closest.product_name,
            category: closest.category,
            description: closest.description,
            status: closest.status || 'unknown',
            error_message: closest.error_message,
            created_at: closest.created_at,
            product_images: Array.isArray(closest.product_images) ? closest.product_images : [],
            tasks: tasks || [],
          });
          return;
        }

        const { data: gens } = await supabase
          .from('generations')
          .select('id, generation_type, status, created_at, input_data, output_data, product_name, category')
          .eq('user_id', transaction.user_id)
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .order('created_at', { ascending: true })
          .limit(5);

        if (gens && gens.length > 0) {
          const closest = gens.reduce((best, g) => {
            const diff = Math.abs(new Date(g.created_at).getTime() - txTime);
            const bestDiff = Math.abs(new Date(best.created_at).getTime() - txTime);
            return diff < bestDiff ? g : best;
          }, gens[0]);

          setDetails({
            kind: 'description',
            id: closest.id,
            product_name: closest.product_name,
            category: closest.category,
            status: closest.status,
            created_at: closest.created_at,
            input_data: closest.input_data,
            output_data: closest.output_data,
          });
          return;
        }

        setNotFound(true);
      } catch (e) {
        console.error('Failed to load transaction details', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [transaction]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (zoomedImage) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setZoomedImage(null)}
        >
          <ArrowLeft className="w-4 h-4" /> К операции
        </Button>
        <div className="bg-muted/30 rounded-xl overflow-hidden flex items-center justify-center">
          <img
            src={zoomedImage}
            alt="Просмотр"
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
      </div>
    );
  }

  if (notFound || !details) {
    return (
      <div className="space-y-4 py-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Данные генерации недоступны</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Возможно, операция выполнена более 30 дней назад — фотографии и история автоматически удаляются по политике хранения данных.
          </p>
        </div>
      </div>
    );
  }

  const sectionTitle = "text-sm font-semibold text-foreground flex items-center gap-2";
  const metaCard = "bg-muted/40 rounded-lg p-3";
  const grayBlock = "bg-muted/40 rounded-lg p-3";

  if (details.kind === 'description') {
    const out = details.output_data || {};
    const text = out.description || out.text || (typeof out === 'string' ? out : '');
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className={metaCard}>
            <div className="text-xs text-muted-foreground mb-1">Товар</div>
            <div className="text-sm font-medium truncate">{details.product_name || '—'}</div>
          </div>
          <div className={metaCard}>
            <div className="text-xs text-muted-foreground mb-1">Статус</div>
            <Badge variant={details.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
              {details.status}
            </Badge>
          </div>
        </div>
        <section className="space-y-2">
          <h4 className={sectionTitle}>
            <FileText className="w-4 h-4 text-muted-foreground" /> Сгенерированный текст
          </h4>
          <div className={cn(grayBlock, "text-sm whitespace-pre-wrap max-h-72 overflow-auto")}>
            {text || <span className="text-muted-foreground">Текст не сохранён</span>}
          </div>
        </section>
      </div>
    );
  }

  const sourceUrls = details.product_images.map(extractImageUrl).filter((u): u is string => !!u);
  const isFailed = details.status === 'failed' || !!details.error_message;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className={metaCard}>
          <div className="text-xs text-muted-foreground mb-1">Товар</div>
          <div className="text-sm font-medium truncate">{details.product_name || '—'}</div>
        </div>
        <div className={metaCard}>
          <div className="text-xs text-muted-foreground mb-1">Статус</div>
          <Badge
            variant={details.status === 'completed' ? 'default' : isFailed ? 'destructive' : 'secondary'}
            className="text-[10px]"
          >
            {details.status === 'completed' ? 'Готово' : isFailed ? 'Ошибка' : details.status}
          </Badge>
        </div>
      </div>

      <section className="space-y-2">
        <h4 className={sectionTitle}>
          <Sparkles className="w-4 h-4 text-muted-foreground" /> Описание / пожелания пользователя
        </h4>
        <div className={cn(grayBlock, "text-sm whitespace-pre-wrap max-h-40 overflow-auto")}>
          {details.description || <span className="text-muted-foreground">Не указано</span>}
        </div>
      </section>

      {details.error_message && (
        <section className="space-y-2">
          <h4 className={cn(sectionTitle, "text-destructive")}>
            <AlertTriangle className="w-4 h-4" /> Ошибка
          </h4>
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
            {translateError(details.error_message)}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className="space-y-2">
          <h4 className={sectionTitle}>
            <ImageIcon className="w-4 h-4 text-muted-foreground" /> Исходные фото ({sourceUrls.length})
          </h4>
          <div className={cn(grayBlock, "min-h-[120px]")}>
            {sourceUrls.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2 text-center">Исходные изображения не сохранены</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {sourceUrls.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setZoomedImage(url)}
                    className="aspect-square rounded-lg overflow-hidden bg-background/60 group relative focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <img
                      src={url}
                      alt={`Исходное фото ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className={sectionTitle}>
            <Video className="w-4 h-4 text-muted-foreground" /> Результат ({details.tasks.length})
          </h4>
          <div className={cn(grayBlock, "min-h-[120px]")}>
            {details.tasks.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2 text-center">Нет данных по задачам</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {details.tasks.map((task) => {
                  const label = CARD_TYPE_LABELS[task.card_type] || task.card_type;
                  const failed = task.status === 'failed';
                  return (
                    <div key={task.id} className="space-y-1.5">
                      <div className={cn(
                        "aspect-square rounded-lg overflow-hidden flex items-center justify-center relative",
                        failed ? "bg-destructive/10 border border-destructive/30" : "bg-background/60"
                      )}>
                        {task.image_url && !failed ? (
                          <button
                            type="button"
                            onClick={() => setZoomedImage(task.image_url!)}
                            className="w-full h-full focus:outline-none focus:ring-2 focus:ring-primary group"
                          >
                            <img
                              src={task.image_url}
                              alt={label}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
                            />
                          </button>
                        ) : failed ? (
                          <div className="p-2 text-center space-y-1">
                            <AlertTriangle className="w-5 h-5 text-destructive mx-auto" />
                            <p className="text-[10px] text-destructive leading-tight line-clamp-3">
                              {translateError(task.last_error)}
                            </p>
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground px-2 text-center">
                            {task.status === 'pending' || task.status === 'processing' ? 'В обработке' : 'Нет результата'}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium truncate">{label}</span>
                        <Badge
                          variant={task.status === 'completed' ? 'default' : failed ? 'destructive' : 'secondary'}
                          className="text-[9px] px-1.5 py-0"
                        >
                          {task.status === 'completed' ? '✓' : failed ? '✕' : '…'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
