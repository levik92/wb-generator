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
  MessageSquare
} from "lucide-react";

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
        description: error.message || "Не удалось отправить заявку повторно",
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
        description: error.message || "Не удалось отправить заявку",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, tokensAwarded?: number | null) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="w-fit bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-400 text-[10px] px-2 py-0.5">
            <Clock className="w-3 h-3 mr-1" />
            На проверке
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="w-fit bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400 text-[10px] px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            +{tokensAwarded} токенов
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="w-fit bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 text-[10px] px-2 py-0.5">
            <XCircle className="w-3 h-3 mr-1" />
            Отклонено
          </Badge>
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
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            Бонусная программа
          </h2>
          <p className="text-muted-foreground text-sm">
            Получайте токены за контент о нашем сервисе
          </p>
        </div>
      </div>

      {/* Main Bonus Program Card - similar to Balance.tsx generation costs */}
      <Card className="border-border/50 w-full overflow-hidden bg-card">
        <CardHeader className="p-4 sm:p-6 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold">Наш Instagram</p>
                <a 
                  href="https://instagram.com/wbgenerator" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm flex items-center gap-1"
                >
                  @wbgenerator <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="sm:ml-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
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
                Скачать макет сторис
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {/* Bonus Tasks Grid - similar to generation costs */}
          <div className="grid grid-cols-1 gap-3">
            {programs.map((program) => {
              const submission = getSubmissionForProgram(program.id);
              const Icon = getIcon(program.icon_name);
              const isCompleted = submission?.status === 'approved';
              const isPending = submission?.status === 'pending';
              const isRejected = submission?.status === 'rejected';
              const canSubmit = !submission || isRejected;

              return (
                <div 
                  key={program.id} 
                  className="bg-muted/30 border border-border/30 rounded-xl p-3 sm:p-4"
                >
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      program.icon_name === 'instagram' 
                        ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500'
                        : program.icon_name === 'crown'
                          ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                          : 'bg-primary/10'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        program.icon_name === 'instagram' || program.icon_name === 'crown'
                          ? 'text-white'
                          : 'text-primary'
                      }`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
                        <div>
                          <div className="font-medium text-sm">{program.title}</div>
                          <div className="text-xs text-muted-foreground">{program.description}</div>
                        </div>
                        
                        {/* Reward Badge */}
                        <div className="shrink-0 self-start">
                          {program.tokens_reward > 0 ? (
                            <div className="bg-background/80 border border-border/50 px-2 py-0.5 rounded-md font-medium text-[10px] text-primary">
                              +{program.tokens_reward} токенов
                            </div>
                          ) : (
                            <div className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium text-[10px] text-amber-600 dark:text-amber-400">
                              Индивидуально
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status & Action */}
                      <div className="flex flex-col gap-2 mt-2">
                        {submission && (
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(submission.status, submission.tokens_awarded)}
                            
                            {/* Admin notes/message display */}
                            {submission.admin_notes && (
                              <div className="flex items-start gap-2 mt-2 p-2 rounded-lg text-xs bg-muted/50 text-muted-foreground">
                                <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>{submission.admin_notes}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {!submission && (
                            <Button 
                              onClick={() => handleOpenSubmission(program)}
                              size="sm"
                              className="text-xs"
                            >
                              {program.button_text}
                            </Button>
                          )}
                          
                          {isRejected && (
                            <Button 
                              onClick={() => handleRetrySubmission(program, submission.id)}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? "Отправка..." : "Повторить попытку"}
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

          {/* Official Disclaimer */}
          <div className="mt-6 pt-4 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
              Администрация сервиса оставляет за собой право принимать решение об одобрении или отклонении заявки по своему усмотрению. 
              Решение является окончательным и не подлежит пересмотру.
            </p>
          </div>
        </CardContent>
      </Card>

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
                <Label>Ссылка на публикацию</Label>
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
