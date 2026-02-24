import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Gift, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  Coins,
  TrendingUp,
  Eye,
  ExternalLink
} from "lucide-react";
import { StatCard } from "@/components/dashboard/GlassCard";
import { PromoCodeManager } from "@/components/dashboard/PromoCodeManager";

interface BonusProgram {
  id: string;
  title: string;
  description: string;
  tokens_reward: number;
  is_active: boolean;
  display_order: number;
  requires_link: boolean;
  requires_contact: boolean;
  link_placeholder: string;
  contact_placeholder: string;
  button_text: string;
  icon_name: string;
  admin_tag: string | null;
  created_at: string;
}

type SubmissionStatus = 'pending' | 'approved' | 'rejected';

interface BonusSubmission {
  id: string;
  user_id: string;
  program_id: string;
  status: SubmissionStatus;
  submission_link: string | null;
  contact_info: string | null;
  admin_notes: string | null;
  tokens_awarded: number | null;
  created_at: string;
  reviewed_at: string | null;
  program?: BonusProgram;
  user_email?: string;
}

interface BonusStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalTokensAwarded: number;
}

export const AdminBonuses = () => {
  const [programs, setPrograms] = useState<BonusProgram[]>([]);
  const [submissions, setSubmissions] = useState<BonusSubmission[]>([]);
  const [stats, setStats] = useState<BonusStats>({
    totalSubmissions: 0,
    pendingSubmissions: 0,
    approvedSubmissions: 0,
    rejectedSubmissions: 0,
    totalTokensAwarded: 0
  });
  const [loading, setLoading] = useState(true);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<BonusProgram | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<BonusSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [customTokens, setCustomTokens] = useState("");
  
  const [programForm, setProgramForm] = useState({
    title: '',
    description: '',
    tokens_reward: '',
    requires_link: false,
    requires_contact: false,
    link_placeholder: 'Вставьте ссылку на публикацию',
    contact_placeholder: 'Ваш Telegram для связи',
    button_text: 'Выполнил',
    icon_name: 'gift',
    display_order: '0',
    admin_tag: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load programs
      const { data: programsData, error: programsError } = await supabase
        .from('bonus_programs')
        .select('*')
        .order('display_order', { ascending: true });

      if (programsError) throw programsError;
      setPrograms(programsData || []);

      // Load submissions with user emails
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('bonus_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Get user emails
      if (submissionsData && submissionsData.length > 0) {
        const userIds = [...new Set(submissionsData.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const emailMap = new Map(profiles?.map(p => [p.id, p.email]));
        const programMap = new Map(programsData?.map(p => [p.id, p]));

        const enrichedSubmissions = submissionsData.map(s => ({
          ...s,
          status: s.status as SubmissionStatus,
          user_email: emailMap.get(s.user_id) || 'Неизвестно',
          program: programMap.get(s.program_id)
        }));

        setSubmissions(enrichedSubmissions);

        // Calculate stats
        const approved = enrichedSubmissions.filter(s => s.status === 'approved');
        setStats({
          totalSubmissions: enrichedSubmissions.length,
          pendingSubmissions: enrichedSubmissions.filter(s => s.status === 'pending').length,
          approvedSubmissions: approved.length,
          rejectedSubmissions: enrichedSubmissions.filter(s => s.status === 'rejected').length,
          totalTokensAwarded: approved.reduce((sum, s) => sum + (s.tokens_awarded || 0), 0)
        });
      }
    } catch (error) {
      console.error('Error loading bonus data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProgram = async () => {
    try {
      const programData = {
        title: programForm.title,
        description: programForm.description,
        tokens_reward: parseInt(programForm.tokens_reward) || 0,
        requires_link: programForm.requires_link,
        requires_contact: programForm.requires_contact,
        link_placeholder: programForm.link_placeholder,
        contact_placeholder: programForm.contact_placeholder,
        button_text: programForm.button_text,
        icon_name: programForm.icon_name,
        display_order: parseInt(programForm.display_order) || 0,
        admin_tag: programForm.admin_tag.trim() || null
      };

      let error;
      if (editingProgram) {
        ({ error } = await supabase
          .from('bonus_programs')
          .update(programData)
          .eq('id', editingProgram.id));
      } else {
        ({ error } = await supabase.from('bonus_programs').insert(programData));
      }

      if (error) throw error;

      toast({
        title: "Успешно",
        description: editingProgram ? "Программа обновлена" : "Программа создана"
      });

      setProgramDialogOpen(false);
      resetProgramForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving program:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить программу",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm('Удалить эту бонусную программу?')) return;
    
    try {
      const { error } = await supabase.from('bonus_programs').delete().eq('id', id);
      if (error) throw error;

      toast({ title: "Успешно", description: "Программа удалена" });
      loadData();
    } catch (error) {
      console.error('Error deleting program:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить программу",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bonus_programs')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling program:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    try {
      const tokens = customTokens 
        ? parseInt(customTokens) 
        : selectedSubmission.program?.tokens_reward || 0;

      const { error } = await supabase.rpc('approve_bonus_submission', {
        submission_id_param: selectedSubmission.id,
        tokens_amount: tokens,
        admin_notes_param: adminNotes || null
      });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: `Начислено ${tokens} токенов`
      });

      setReviewDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось одобрить заявку",
        variant: "destructive"
      });
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;

    try {
      const { error } = await supabase.rpc('reject_bonus_submission', {
        submission_id_param: selectedSubmission.id,
        admin_notes_param: adminNotes || null
      });

      if (error) throw error;

      toast({
        title: "Заявка отклонена"
      });

      setReviewDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отклонить заявку",
        variant: "destructive"
      });
    }
  };

  const openReviewDialog = (submission: BonusSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes("");
    setCustomTokens(submission.program?.tokens_reward?.toString() || "");
    setReviewDialogOpen(true);
  };

  const openEditProgram = (program: BonusProgram) => {
    setEditingProgram(program);
    setProgramForm({
      title: program.title,
      description: program.description,
      tokens_reward: program.tokens_reward.toString(),
      requires_link: program.requires_link,
      requires_contact: program.requires_contact,
      link_placeholder: program.link_placeholder,
      contact_placeholder: program.contact_placeholder,
      button_text: program.button_text,
      icon_name: program.icon_name,
      display_order: program.display_order.toString(),
      admin_tag: program.admin_tag || ''
    });
    setProgramDialogOpen(true);
  };

  const resetProgramForm = () => {
    setEditingProgram(null);
    setProgramForm({
      title: '',
      description: '',
      tokens_reward: '',
      requires_link: false,
      requires_contact: false,
      link_placeholder: 'Вставьте ссылку на публикацию',
      contact_placeholder: 'Ваш Telegram для связи',
      button_text: 'Выполнил',
      icon_name: 'gift',
      display_order: '0',
      admin_tag: ''
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');

  if (loading) {
    return <div className="p-8 text-center">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="На проверке"
          value={stats.pendingSubmissions}
          delay={0}
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Одобрено"
          value={stats.approvedSubmissions}
          delay={0.05}
        />
        <StatCard
          icon={<XCircle className="w-5 h-5" />}
          label="Отклонено"
          value={stats.rejectedSubmissions}
          delay={0.1}
        />
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          label="Выдано токенов"
          value={stats.totalTokensAwarded}
          delay={0.15}
        />
      </div>

      <Tabs defaultValue="submissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submissions" className="relative">
            Заявки
            {stats.pendingSubmissions > 0 && (
              <Badge className="ml-2 bg-yellow-500 text-white text-xs px-1.5">
                {stats.pendingSubmissions}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="programs">Программы</TabsTrigger>
          <TabsTrigger value="promocodes">Промокоды</TabsTrigger>
        </TabsList>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Заявки на проверку</CardTitle>
              <CardDescription>Проверяйте выполнение заданий и начисляйте бонусы</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              {pendingSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Нет заявок на проверку
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Задание</TableHead>
                        <TableHead className="hidden md:table-cell">Ссылка</TableHead>
                        <TableHead className="hidden md:table-cell">Дата</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-medium text-sm">
                            {submission.user_email}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {submission.program?.admin_tag || submission.program?.title || 'Неизвестно'}
                              </Badge>
                              <span className="text-primary text-xs font-semibold">
                                +{submission.program?.tokens_reward || 0}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {submission.submission_link && (
                              <a 
                                href={submission.submission_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 text-sm"
                              >
                                Открыть <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {submission.contact_info && (
                              <span className="text-sm text-muted-foreground">
                                {submission.contact_info}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {formatDate(submission.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              onClick={() => openReviewDialog(submission)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Проверить
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Submissions History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">История всех заявок</CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Задание</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="hidden md:table-cell">Дата</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.slice(0, 20).map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium text-sm">
                          {submission.user_email}
                        </TableCell>
                        <TableCell className="text-sm">
                          {submission.program?.admin_tag || submission.program?.title || 'Неизвестно'}
                        </TableCell>
                        <TableCell>
                          {submission.status === 'pending' && (
                             <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                              <Clock className="w-3 h-3 mr-1" />На проверке
                             </Badge>
                          )}
                          {submission.status === 'approved' && (
                             <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                              <CheckCircle className="w-3 h-3 mr-1" />+{submission.tokens_awarded}
                             </Badge>
                          )}
                          {submission.status === 'rejected' && (
                             <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
                              <XCircle className="w-3 h-3 mr-1" />Отклонено
                             </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {formatDate(submission.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Бонусные программы</CardTitle>
                  <CardDescription>Управляйте заданиями для пользователей</CardDescription>
                </div>
                <Dialog open={programDialogOpen} onOpenChange={setProgramDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetProgramForm} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProgram ? 'Редактировать программу' : 'Новая бонусная программа'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Название</Label>
                        <Input
                          value={programForm.title}
                          onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
                          placeholder="Сторис в Instagram"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Тег (внутренний, виден только в админке)</Label>
                        <Input
                          value={programForm.admin_tag}
                          onChange={(e) => setProgramForm({ ...programForm, admin_tag: e.target.value })}
                          placeholder="stories, reels-100k, etc."
                        />
                        <p className="text-xs text-muted-foreground">Отображается в списке заданий вместо названия</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Описание</Label>
                        <Textarea
                          value={programForm.description}
                          onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                          placeholder="Разместите сторис с отметкой @wbgenerator"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Токенов за выполнение</Label>
                          <Input
                            type="number"
                            value={programForm.tokens_reward}
                            onChange={(e) => setProgramForm({ ...programForm, tokens_reward: e.target.value })}
                            placeholder="10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Порядок отображения</Label>
                          <Input
                            type="number"
                            value={programForm.display_order}
                            onChange={(e) => setProgramForm({ ...programForm, display_order: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Иконка</Label>
                        <Select 
                          value={programForm.icon_name}
                          onValueChange={(v) => setProgramForm({ ...programForm, icon_name: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gift">🎁 Подарок</SelectItem>
                            <SelectItem value="instagram">📸 Instagram</SelectItem>
                            <SelectItem value="telegram">✈️ Telegram</SelectItem>
                            <SelectItem value="video">🎬 Видео</SelectItem>
                            <SelectItem value="trending-up">📈 Тренд</SelectItem>
                            <SelectItem value="crown">👑 Корона</SelectItem>
                            <SelectItem value="star">⭐ Звезда</SelectItem>
                            <SelectItem value="heart">❤️ Сердце</SelectItem>
                            <SelectItem value="zap">⚡ Молния</SelectItem>
                            <SelectItem value="camera">📷 Камера</SelectItem>
                            <SelectItem value="users">👥 Пользователи</SelectItem>
                            <SelectItem value="share">🔗 Поделиться</SelectItem>
                            <SelectItem value="megaphone">📢 Мегафон</SelectItem>
                            <SelectItem value="award">🏆 Награда</SelectItem>
                            <SelectItem value="target">🎯 Цель</SelectItem>
                            <SelectItem value="flame">🔥 Огонь</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Текст кнопки</Label>
                        <Input
                          value={programForm.button_text}
                          onChange={(e) => setProgramForm({ ...programForm, button_text: e.target.value })}
                          placeholder="Выполнил"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Требуется ссылка</Label>
                        <Switch
                          checked={programForm.requires_link}
                          onCheckedChange={(v) => setProgramForm({ ...programForm, requires_link: v })}
                        />
                      </div>
                      {programForm.requires_link && (
                        <div className="space-y-2">
                          <Label>Плейсхолдер для ссылки</Label>
                          <Input
                            value={programForm.link_placeholder}
                            onChange={(e) => setProgramForm({ ...programForm, link_placeholder: e.target.value })}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <Label>Требуется контакт</Label>
                        <Switch
                          checked={programForm.requires_contact}
                          onCheckedChange={(v) => setProgramForm({ ...programForm, requires_contact: v })}
                        />
                      </div>
                      {programForm.requires_contact && (
                        <div className="space-y-2">
                          <Label>Плейсхолдер для контакта</Label>
                          <Input
                            value={programForm.contact_placeholder}
                            onChange={(e) => setProgramForm({ ...programForm, contact_placeholder: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setProgramDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button onClick={handleSaveProgram}>
                        {editingProgram ? 'Сохранить' : 'Создать'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Тег / Название</TableHead>
                      <TableHead>Токены</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium">
                          {program.admin_tag ? (
                            <div className="flex flex-col">
                              <span className="text-primary font-semibold">{program.admin_tag}</span>
                              <span className="text-xs text-muted-foreground">{program.title}</span>
                            </div>
                          ) : (
                            program.title
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            +{program.tokens_reward}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={program.is_active ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive(program.id, program.is_active)}
                          >
                            {program.is_active ? 'Активна' : 'Неактивна'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditProgram(program)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteProgram(program.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promocodes Tab */}
        <TabsContent value="promocodes">
          <PromoCodeManager />
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Проверка заявки</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.program?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <strong>Пользователь:</strong> {selectedSubmission?.user_email}
              </p>
              {selectedSubmission?.submission_link && (
                <p className="text-sm break-all">
                  <strong>Ссылка:</strong>{' '}
                  <a 
                    href={selectedSubmission.submission_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {selectedSubmission.submission_link}
                  </a>
                </p>
              )}
              {selectedSubmission?.contact_info && (
                <p className="text-sm">
                  <strong>Контакт:</strong> {selectedSubmission.contact_info}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Токенов к начислению</Label>
              <Input
                type="number"
                value={customTokens}
                onChange={(e) => setCustomTokens(e.target.value)}
                placeholder={selectedSubmission?.program?.tokens_reward?.toString()}
              />
            </div>

            <div className="space-y-2">
              <Label>Комментарий (опционально)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Причина отклонения или заметка"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="destructive" onClick={handleReject}>
              <XCircle className="w-4 h-4 mr-2" />
              Отклонить
            </Button>
            <Button onClick={handleApprove}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Одобрить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
