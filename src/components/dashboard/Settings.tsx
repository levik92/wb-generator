import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Link as LinkIcon, Save, Lock, Mail, MessageCircle, Headphones, Eye, EyeOff, Trash2, Settings as SettingsIcon, Sun, Moon, Monitor } from "lucide-react";
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
}
export const Settings = ({
  profile,
  onUpdate,
  onSignOut
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
        description: error.message,
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
        description: error.message,
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
        description: error.message,
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
        description: error.message,
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
        description: error.message,
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
  }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Настройки</h2>
          <p className="text-muted-foreground text-sm">Управление профилем и подключениями</p>
        </div>
      </div>

      {/* Support Block */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.4,
      delay: 0.1
    }}>
        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-cyan-500/10 border-blue-500/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Headphones className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  Поддержка
                </CardTitle>
                <CardDescription>
                  Нужна помощь? Мы всегда готовы помочь!
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200" asChild>
              <a href="https://t.me/wbgen_support/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Написать в поддержку
              </a>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Theme Settings */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card className="border border-border/50 bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                {mounted && resolvedTheme === 'dark' ? (
                  <Moon className="w-5 h-5 text-primary" />
                ) : (
                  <Sun className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Тема оформления</CardTitle>
                <CardDescription>Выберите предпочитаемую тему</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                  mounted && theme === 'light' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center shadow-lg ${
                  mounted && theme === 'light' ? 'shadow-amber-400/30' : ''
                }`}>
                  <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Светлая</span>
              </button>
              
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                  mounted && theme === 'dark' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg ${
                  mounted && theme === 'dark' ? 'shadow-slate-500/30' : ''
                }`}>
                  <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Тёмная</span>
              </button>
              
              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                  mounted && theme === 'system' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg ${
                  mounted && theme === 'system' ? 'shadow-gray-400/30' : ''
                }`}>
                  <Monitor className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Авто</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {mounted && theme === 'system' 
                ? `Сейчас: ${resolvedTheme === 'dark' ? 'тёмная' : 'светлая'} (по системе)` 
                : 'Авто — следует настройкам системы'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <Card className="border border-border/50 bg-card">
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
          <CardDescription>Основная информация аккаунта</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled className="input-bordered" />
          </div>
          <div className="space-y-2">
            <Label>Имя</Label>
            <div className="flex space-x-2">
              <Input placeholder="Ваше имя" value={fullName} onChange={e => setFullName(e.target.value)} className="input-bordered" />
              <Button onClick={updateProfile} disabled={updating || !fullName.trim()} size="sm">
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/50 bg-card">
        <CardHeader>
          <CardTitle>Смена email</CardTitle>
          <CardDescription>Изменить адрес электронной почты</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Новый email</Label>
            <div className="flex space-x-2">
              <Input type="email" placeholder="new@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="input-bordered" />
              <Button onClick={updateEmail} disabled={updating || !newEmail.trim()} size="sm">
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/50 bg-card">
        <CardHeader>
          <CardTitle>Смена пароля</CardTitle>
          <CardDescription>Изменить пароль для входа</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Текущий пароль</Label>
            <Input type="password" placeholder="Введите текущий пароль" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="input-bordered" />
          </div>
          <div className="space-y-2">
            <Label>Новый пароль</Label>
            <Input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-bordered" minLength={8} />
            <p className="text-xs text-muted-foreground">
              Минимум 8 символов, должен содержать заглавные и строчные буквы, цифры
            </p>
          </div>
          <div className="space-y-2">
            <Label>Подтвердите пароль</Label>
            <Input type="password" placeholder="Повторите новый пароль" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-bordered" />
          </div>
          <Button onClick={updatePassword} disabled={updating} className="w-full">
            <Lock className="w-4 h-4 mr-2" />
            Изменить пароль
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border/50 relative bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Wildberries API</CardTitle>
              <CardDescription>Безопасное хранение API ключа для интеграции</CardDescription>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Скоро
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Функция интеграции с Wildberries находится в разработке
            </p>
            <Button variant="outline" disabled className="w-full bg-muted text-muted-foreground border-muted hover:bg-muted hover:text-muted-foreground cursor-not-allowed">
              В разработке
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/50 bg-card">
        <CardHeader>
          <CardTitle>Действия</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={onSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Выйти из аккаунта
          </Button>
        </CardContent>
      </Card>
    </motion.div>;
};