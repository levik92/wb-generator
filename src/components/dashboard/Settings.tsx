import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Link as LinkIcon, Save, Lock, Mail, MessageCircle, Headphones, Eye, EyeOff, Trash2, Settings as SettingsIcon, Sun, Moon, User, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}
interface SettingsProps {
  profile: Profile;
  onUpdate: () => void;
  onSignOut: () => void;
  onNavigateToSupport?: () => void;
}
export const Settings = ({
  profile,
  onUpdate,
  onSignOut,
  onNavigateToSupport
}: SettingsProps) => {
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const validatePassword = (password: string): {
    isValid: boolean;
    message?: string;
  } => {
    if (password.length < 8) {
      return {
        isValid: false,
        message: "Пароль должен содержать минимум 8 символов"
      };
    }
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    if (!hasUppercase || !hasLowercase || !hasNumbers) {
      return {
        isValid: false,
        message: "Пароль должен содержать заглавные и строчные буквы, а также цифры"
      };
    }
    return {
      isValid: true
    };
  };
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  // Wildberries API key management
  const [wbApiKey, setWbApiKey] = useState("");
  const [maskedWbKey, setMaskedWbKey] = useState<string | null>(null);
  const [showWbApiKey, setShowWbApiKey] = useState(false);
  const [hasWbKey, setHasWbKey] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    loadWbApiKeyStatus();
  }, []);
  const loadWbApiKeyStatus = async () => {
    try {
      // Check if user has active WB API key
      const {
        data: hasKey,
        error: hasKeyError
      } = await supabase.rpc('has_active_api_key', {
        provider_name: 'wildberries'
      });
      if (hasKeyError) throw hasKeyError;
      setHasWbKey(hasKey || false);
      if (hasKey) {
        // Get masked version for display
        const {
          data: masked,
          error: maskedError
        } = await supabase.rpc('get_user_api_key_masked', {
          provider_name: 'wildberries'
        });
        if (maskedError) throw maskedError;
        setMaskedWbKey(masked);
      }
    } catch (error: any) {
      console.error('Error loading WB API key status:', error);
    }
  };
  const saveWbApiKey = async () => {
    if (!wbApiKey.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите API ключ Wildberries",
        variant: "destructive"
      });
      return;
    }
    setUpdating(true);
    try {
      const {
        data,
        error
      } = await supabase.rpc('store_user_api_key_secure', {
        provider_name: 'wildberries',
        api_key: wbApiKey.trim()
      });
      if (error) throw error;
      toast({
        title: "API ключ сохранен",
        description: "Wildberries API ключ успешно добавлен"
      });
      setWbApiKey("");
      setShowWbApiKey(false);
      await loadWbApiKeyStatus();
      onUpdate(); // Refresh profile to update wb_connected status
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить API ключ",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };
  const removeWbApiKey = async () => {
    setUpdating(true);
    try {
      const {
        error
      } = await supabase.from('user_api_keys').update({
        is_active: false
      }).eq('provider', 'wildberries').eq('user_id', profile.id);
      if (error) throw error;
      toast({
        title: "API ключ удален",
        description: "Wildberries API ключ был удален"
      });
      await loadWbApiKeyStatus();
      onUpdate(); // Refresh profile to update wb_connected status
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить API ключ",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };
  const updateProfile = async () => {
    if (!fullName.trim()) return;
    setUpdating(true);
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        full_name: fullName.trim()
      }).eq('id', profile.id);
      if (error) throw error;
      toast({
        title: "Профиль обновлен",
        description: "Имя успешно изменено"
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить профиль",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };
  const updateEmail = async () => {
    if (!newEmail.trim()) return;
    setUpdating(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        email: newEmail.trim()
      });
      if (error) throw error;
      toast({
        title: "Email обновлен",
        description: "Проверьте почту для подтверждения"
      });
      setNewEmail("");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить email. Попробуйте позже",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };
  const updatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive"
      });
      return;
    }

    // Validate password complexity
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "Ошибка",
        description: passwordValidation.message,
        variant: "destructive"
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive"
      });
      return;
    }
    setUpdating(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast({
        title: "Пароль изменен",
        description: "Новый пароль успешно установлен"
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить пароль. Попробуйте позже",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4
  }} className="space-y-4 sm:space-y-6 w-full min-w-0">

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-card">
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-violet-500/15 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30">
              <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-violet-700 dark:text-violet-300">Аккаунт</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight break-words">
                Настройки <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">профиля</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Управляйте профилем, безопасностью и интеграциями. Поддержка на связи, если что-то пойдёт не так.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Support Block */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Card className="relative overflow-hidden rounded-2xl border border-blue-500/25 bg-card">
          <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-blue-500/15 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/30">
                <Headphones className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg">Поддержка 24/7</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Ответим за 5 минут — без ботов, живые люди</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <Button className="h-11 rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md shadow-blue-500/20" asChild>
                <a href="https://t.me/wbgen_support/" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4" />
                  Телеграм чат
                </a>
              </Button>
              <Button className="h-11 rounded-xl gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0 shadow-md shadow-cyan-500/20" onClick={() => onNavigateToSupport?.()}>
                <Headphones className="w-4 h-4" />
                Онлайн чат
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Theme Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <Card className="rounded-2xl border border-border/60 bg-card transition-colors hover:border-violet-500/30">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/20 flex items-center justify-center">
                  {mounted && resolvedTheme === 'dark' ? (
                    <Moon className="w-5 h-5 text-violet-600 dark:text-violet-300" />
                  ) : (
                    <Sun className="w-5 h-5 text-violet-600 dark:text-violet-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Тема оформления</CardTitle>
                  <CardDescription className="text-xs">
                    {mounted && resolvedTheme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
                  </CardDescription>
                </div>
              </div>

              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className={`shrink-0 relative w-16 h-9 rounded-full transition-all duration-300 ease-in-out ${
                  mounted && resolvedTheme === 'dark'
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-md shadow-violet-500/30'
                    : 'bg-muted border border-border'
                }`}
                aria-label="Переключить тему"
              >
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <Sun className={`w-3.5 h-3.5 transition-opacity duration-200 ${
                    mounted && resolvedTheme === 'dark' ? 'opacity-60 text-white' : 'opacity-0'
                  }`} />
                  <Moon className={`w-3.5 h-3.5 transition-opacity duration-200 ${
                    mounted && resolvedTheme === 'dark' ? 'opacity-0' : 'opacity-50 text-muted-foreground'
                  }`} />
                </div>
                <motion.div
                  className={`absolute top-1/2 left-1 -translate-y-1/2 w-7 h-7 rounded-full shadow-md flex items-center justify-center bg-white ${
                    mounted && resolvedTheme !== 'dark' ? 'border border-border/50' : ''
                  }`}
                  animate={{ x: mounted && resolvedTheme === 'dark' ? 28 : 0 }}
                  transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                  style={{ y: '-50%' }}
                >
                  {mounted && resolvedTheme === 'dark' ? (
                    <Moon className="w-4 h-4 text-violet-600" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                </motion.div>
              </button>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Profile */}
      <Card className="rounded-2xl border border-border/60 bg-card transition-colors hover:border-violet-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-violet-600 dark:text-violet-300" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Профиль</CardTitle>
              <CardDescription className="text-xs">Основная информация аккаунта</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Email</Label>
            <Input value={profile.email} disabled className="h-11 rounded-xl bg-muted/40 border-border/60" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Имя</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ваше имя"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="h-11 rounded-xl bg-background border-border/60 focus-visible:border-violet-500/50"
              />
              <Button
                onClick={updateProfile}
                disabled={updating || !fullName.trim()}
                className="h-11 rounded-xl px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-500/20"
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email change */}
      <Card className="rounded-2xl border border-border/60 bg-card transition-colors hover:border-violet-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-violet-600 dark:text-violet-300" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Смена email</CardTitle>
              <CardDescription className="text-xs">Изменить адрес электронной почты</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Новый email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="new@example.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="h-11 rounded-xl bg-background border-border/60 focus-visible:border-violet-500/50"
              />
              <Button
                onClick={updateEmail}
                disabled={updating || !newEmail.trim()}
                className="h-11 rounded-xl px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-500/20"
              >
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password change */}
      <Card className="rounded-2xl border border-border/60 bg-card transition-colors hover:border-violet-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-violet-600 dark:text-violet-300" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Смена пароля</CardTitle>
              <CardDescription className="text-xs">Изменить пароль для входа</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Текущий пароль</Label>
            <Input
              type="password"
              placeholder="Введите текущий пароль"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="h-11 rounded-xl bg-background border-border/60 focus-visible:border-violet-500/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Новый пароль</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="h-11 rounded-xl bg-background border-border/60 focus-visible:border-violet-500/50"
              minLength={8}
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Минимум 8 символов, должен содержать заглавные и строчные буквы, цифры
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Подтвердите пароль</Label>
            <Input
              type="password"
              placeholder="Повторите новый пароль"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="h-11 rounded-xl bg-background border-border/60 focus-visible:border-violet-500/50"
            />
          </div>
          <Button
            onClick={updatePassword}
            disabled={updating}
            className="w-full h-11 rounded-xl gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-500/20"
          >
            <Lock className="w-4 h-4" />
            Изменить пароль
          </Button>
        </CardContent>
      </Card>

      {/* WB API key */}
      <Card className="relative overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:border-violet-500/30">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/20 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-violet-600 dark:text-violet-300" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base">Wildberries API</CardTitle>
                <CardDescription className="text-xs">Безопасное хранение API ключа для интеграции</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30">
              Скоро
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled
            className="w-full h-11 rounded-xl bg-muted/40 text-muted-foreground border-border/60 cursor-not-allowed"
          >
            В разработке
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="rounded-2xl border border-destructive/30 bg-card transition-colors hover:border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Действия</CardTitle>
              <CardDescription className="text-xs">Выход из аккаунта на этом устройстве</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={onSignOut}
            className="w-full sm:w-auto h-11 rounded-xl gap-2"
          >
            <LogOut className="w-4 h-4" />
            Выйти из аккаунта
          </Button>
        </CardContent>
      </Card>
    </motion.div>;
};
