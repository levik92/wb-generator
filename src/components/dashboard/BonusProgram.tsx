import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Gift, 
  Instagram, 
  Video, 
  TrendingUp, 
  Crown, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Download,
  Sparkles,
  MessageSquare,
  Star,
  Heart,
  Zap,
  Camera,
  Users,
  Share2,
  Megaphone,
  Award,
  Target,
  Flame
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";

interface BonusProgram {
  id: string;
  title: string;
  description: string;
  tokens_reward: number;
  requires_link: boolean;
  requires_contact: boolean;
  link_placeholder: string;
  contact_placeholder: string;
  button_text: string;
  icon_name: string;
  display_order: number;
  task_url: string | null;
}

type SubmissionStatus = 'pending' | 'approved' | 'rejected';

interface BonusSubmission {
  id: string;
  program_id: string;
  status: SubmissionStatus;
  submission_link: string | null;
  contact_info: string | null;
  tokens_awarded: number | null;
  admin_notes: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

interface BonusProgramProps {
  profile: Profile;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  gift: Gift,
  instagram: Instagram,
  video: Video,
  'trending-up': TrendingUp,
  crown: Crown,
  telegram: FaTelegram,
  star: Star,
  heart: Heart,
  zap: Zap,
  camera: Camera,
  users: Users,
  share: Share2,
  megaphone: Megaphone,
  award: Award,
  target: Target,
  flame: Flame,
};

export const BonusProgram = ({ profile }: BonusProgramProps) => {
  const [programs, setPrograms] = useState<BonusProgram[]>([]);
  const [submissions, setSubmissions] = useState<BonusSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<BonusProgram | null>(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [programsRes, submissionsRes] = await Promise.all([
        supabase
          .from('bonus_programs')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('bonus_submissions')
          .select('*')
          .eq('user_id', profile.id)
      ]);

      if (programsRes.error) throw programsRes.error;
      if (submissionsRes.error) throw submissionsRes.error;

      setPrograms(programsRes.data || []);
      setSubmissions((submissionsRes.data || []).map(s => ({
        ...s,
        status: s.status as SubmissionStatus
      })));
    } catch (error) {
      console.error('Error loading bonus data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить бонусные программы",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForProgram = (programId: string) => {
    return submissions.find(s => s.program_id === programId);
  };

  const handleOpenSubmission = (program: BonusProgram) => {
    setSelectedProgram(program);
    setSubmissionLink("");
    setContactInfo("");
    setDialogOpen(true);
  };

  const handleRetrySubmission = async (program: BonusProgram, submissionId: string) => {
    setIsSubmitting(true);
    try {
      // Update existing submission status back to pending
      const { error } = await supabase
        .from('bonus_submissions')
        .update({
          status: 'pending',
          admin_notes: null,
          reviewed_at: null,
          reviewed_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Заявка отправлена повторно",
        description: "Мы проверим выполнение и начислим бонус в ближайшее время"
      });

      loadData();
    } catch (error: any) {
      console.error('Error retrying submission:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку. Попробуйте позже",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProgram) return;

    if (selectedProgram.requires_link && !submissionLink.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, вставьте ссылку",
        variant: "destructive"
      });
      return;
    }

    if (selectedProgram.requires_contact && !contactInfo.trim()) {
      toast({
        title: "Ошибка", 
        description: "Пожалуйста, укажите контакт для связи",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('bonus_submissions')
        .insert({
          user_id: profile.id,
          program_id: selectedProgram.id,
          submission_link: submissionLink.trim() || null,
          contact_info: contactInfo.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Заявка отправлена!",
        description: "Мы проверим выполнение и начислим бонус в ближайшее время"
      });

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error submitting bonus:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку. Попробуйте позже",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, tokensAwarded?: number | null, tokensReward?: number) => {
    switch (status) {
      case 'pending':
        return (
          <div className="w-fit bg-yellow-500/10 text-yellow-700 border border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-400 text-[10px] px-2 py-0.5 rounded-full inline-flex items-center font-semibold">
            <Clock className="w-3 h-3 mr-1" />
            На проверке
          </div>
        );
      case 'approved':
        return (
          <div className="w-fit bg-green-500/10 text-green-700 border border-green-500/20 dark:bg-green-500/20 dark:text-green-400 text-[10px] px-2 py-0.5 rounded-full inline-flex items-center font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            +{tokensAwarded} токенов
          </div>
        );
      case 'rejected':
        return (
          <div className="w-fit bg-red-500/10 text-red-700 border border-red-500/20 dark:bg-red-500/20 dark:text-red-400 text-[10px] px-2 py-0.5 rounded-full inline-flex items-center font-semibold">
            <XCircle className="w-3 h-3 mr-1" />
            Отклонено
          </div>
        );
      default:
        return null;
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Gift;
    return IconComponent;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }

  const totalEarned = submissions
    .filter((s) => s.status === 'approved')
    .reduce((sum, s) => sum + (s.tokens_awarded || 0), 0);
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const availableTotal = programs
    .filter((p) => {
      const sub = getSubmissionForProgram(p.id);
      return !sub || sub.status === 'rejected';
    })
    .reduce((sum, p) => sum + (p.tokens_reward || 0), 0);

  return (
    <div className="space-y-5">

      {/* Hero header — white card with subtle violet radial glow */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-4 py-5 sm:px-6 sm:py-6 shadow-sm">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(268 83% 60% / 0.10) 0%, transparent 70%)' }}
        />


        <div className="relative flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold leading-tight">Бонусная программа</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Выполняйте задания, делитесь сервисом и получайте токены на баланс
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
              <div className="text-[10px] sm:text-xs text-muted-foreground">Заработано</div>
              <div className="text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">+{totalEarned}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
              <div className="text-[10px] sm:text-xs text-muted-foreground">На проверке</div>
              <div className="text-base sm:text-lg font-semibold tabular-nums">{pendingCount}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
              <div className="text-[10px] sm:text-xs text-muted-foreground">Доступно</div>
              <div className="text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">+{availableTotal}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href="https://instagram.com/wbgenerator"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5 hover:border-violet-500/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shrink-0">
                <Instagram className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-muted-foreground leading-none">Instagram</div>
                <div className="text-sm font-medium truncate">@wbgenerator</div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-violet-600 shrink-0" />
            </a>
            <a
              href="https://t.me/wbgen_official"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5 hover:border-violet-500/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#229ED9] to-[#0088cc] flex items-center justify-center shrink-0">
                <FaTelegram className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-muted-foreground leading-none">Telegram</div>
                <div className="text-sm font-medium truncate">@wbgen_official</div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-violet-600 shrink-0" />
            </a>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 w-full sm:w-fit bg-background/70 border-border/60 hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-500/40"
            onClick={() => {
              const link = document.createElement('a');
              link.href = '/downloads/stories-template.png';
              link.download = 'stories-template-wbgen.png';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="w-4 h-4" />
            Скачать макет для сторис
          </Button>
        </div>
      </div>

      {/* Tasks list */}
      <div className="space-y-2.5">
        {programs.map((program) => {
          const submission = getSubmissionForProgram(program.id);
          const Icon = getIcon(program.icon_name);
          const isCompleted = submission?.status === 'approved';
          const isPending = submission?.status === 'pending';
          const isRejected = submission?.status === 'rejected';

          const iconBg =
            program.icon_name === 'instagram'
              ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500'
              : program.icon_name === 'telegram'
                ? 'bg-gradient-to-br from-[#229ED9] to-[#0088cc]'
                : program.icon_name === 'crown'
                  ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                  : program.icon_name === 'flame'
                    ? 'bg-gradient-to-br from-orange-500 to-red-500'
                    : 'bg-primary/15 border border-primary/25';
          const iconColor = ['instagram', 'telegram', 'crown', 'flame'].includes(program.icon_name)
            ? 'text-white'
            : 'text-primary';

          return (
            <div
              key={program.id}
              className={`relative overflow-hidden rounded-xl border p-3 sm:p-4 transition-all ${
                isCompleted
                  ? 'border-emerald-500/60 bg-card'
                  : isPending
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : isRejected
                      ? 'border-red-500/25 bg-red-500/5'
                      : 'border-border/50 bg-card hover:border-primary/30 hover:bg-muted/30'
              }`}
            >
              {isCompleted && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-16 -right-16 w-48 h-48 rounded-full"
                  style={{ background: 'radial-gradient(circle, hsl(142 76% 45% / 0.22) 0%, transparent 70%)' }}
                />
              )}
              <div className="relative">
              <div className="flex gap-3">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm leading-tight">{program.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{program.description}</div>
                    </div>
                    <div className="shrink-0">
                      {submission ? (
                        getStatusBadge(submission.status, submission.tokens_awarded, program.tokens_reward)
                      ) : program.tokens_reward > 0 ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                          <Sparkles className="w-3 h-3" />
                          +{program.tokens_reward}
                        </div>
                      ) : (
                        <div className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          Индивидуально
                        </div>
                      )}
                    </div>
                  </div>

                  {submission?.admin_notes && (
                    <div className="flex items-start gap-2 mt-2.5 p-2.5 rounded-lg text-xs bg-background/60 border border-border/40 text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{submission.admin_notes}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    {program.task_url && (
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                        <a href={program.task_url} target="_blank" rel="noopener noreferrer">
                          Перейти к заданию
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {!submission && (
                      <Button
                        onClick={() => handleOpenSubmission(program)}
                        size="sm"
                        className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                      >
                        {program.button_text}
                      </Button>
                    )}
                    {isRejected && (
                      <Button
                        onClick={() => handleRetrySubmission(program, submission.id)}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Отправка...' : 'Повторить попытку'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed px-4">
        Модераторы сервиса оставляют за собой право принимать решение об одобрении или отклонении заявки по своему усмотрению.
        Обработка запроса занимает до 24 часов.
      </p>

      {/* Submission Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProgram?.title}</DialogTitle>
            <DialogDescription>
              {selectedProgram?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedProgram?.requires_link && (
              <div className="space-y-2">
                <Label>Подтверждение выполнения</Label>
                <Input
                  placeholder={selectedProgram.link_placeholder}
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                />
              </div>
            )}

            {selectedProgram?.requires_contact && (
              <div className="space-y-2">
                <Label>Контакт для связи</Label>
                <Input
                  placeholder={selectedProgram.contact_placeholder}
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                />
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
              <p>
                После отправки заявки мы проверим выполнение задания. 
                При успешной проверке токены будут начислены на ваш баланс автоматически.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Отправка..." : "Отправить на проверку"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
