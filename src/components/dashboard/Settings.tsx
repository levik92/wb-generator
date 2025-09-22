import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Link as LinkIcon, Save, Lock, Mail, MessageCircle, Headphones, Eye, EyeOff, Trash2 } from "lucide-react";

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

export const Settings = ({ profile, onUpdate, onSignOut }: SettingsProps) => {
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  
  // Wildberries API key management
  const [wbApiKey, setWbApiKey] = useState("");
  const [maskedWbKey, setMaskedWbKey] = useState<string | null>(null);
  const [showWbApiKey, setShowWbApiKey] = useState(false);
  const [hasWbKey, setHasWbKey] = useState(false);
  
  const { toast } = useToast();

  // Load Wildberries API key status on component mount
  useEffect(() => {
    loadWbApiKeyStatus();
  }, []);

  const loadWbApiKeyStatus = async () => {
    try {
      // Check if user has active WB API key
      const { data: hasKey, error: hasKeyError } = await supabase
        .rpc('has_active_api_key', { provider_name: 'wildberries' });

      if (hasKeyError) throw hasKeyError;

      setHasWbKey(hasKey || false);

      if (hasKey) {
        // Get masked version for display
        const { data: masked, error: maskedError } = await supabase
          .rpc('get_user_api_key_masked', { provider_name: 'wildberries' });

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
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { data, error } = await supabase
        .rpc('store_user_api_key_secure', {
          provider_name: 'wildberries',
          api_key: wbApiKey.trim()
        });

      if (error) throw error;

      toast({
        title: "API ключ сохранен",
        description: "Wildberries API ключ успешно добавлен",
      });

      setWbApiKey("");
      setShowWbApiKey(false);
      await loadWbApiKeyStatus();
      onUpdate(); // Refresh profile to update wb_connected status
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const removeWbApiKey = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .update({ is_active: false })
        .eq('provider', 'wildberries')
        .eq('user_id', profile.id);

      if (error) throw error;

      toast({
        title: "API ключ удален",
        description: "Wildberries API ключ был удален",
      });

      await loadWbApiKeyStatus();
      onUpdate(); // Refresh profile to update wb_connected status
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateProfile = async () => {
    if (!fullName.trim()) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Профиль обновлен",
        description: "Имя успешно изменено",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateEmail = async () => {
    if (!newEmail.trim()) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim()
      });

      if (error) throw error;

      toast({
        title: "Email обновлен",
        description: "Проверьте почту для подтверждения",
      });
      setNewEmail("");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Ошибка",
        description: "Пароль должен содержать минимум 6 символов",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Пароль изменен",
        description: "Новый пароль успешно установлен",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Настройки</h2>
        <p className="text-muted-foreground">
          Управление профилем и подключениями
        </p>
      </div>

      {/* Support Block */}
      <Card className="bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-cyan-500/10 border-blue-200/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <Headphones className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                Поддержка
              </CardTitle>
              <CardDescription className="text-blue-600/80">
                Нужна помощь? Мы всегда готовы помочь!
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
            asChild
          >
            <a 
              href="https://t.me/wbgen_support/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Написать в поддержку
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
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
              <Input 
                placeholder="Ваше имя" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-bordered"
              />
              <Button 
                onClick={updateProfile}
                disabled={updating || !fullName.trim()}
                size="sm"
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Смена email</CardTitle>
          <CardDescription>Изменить адрес электронной почты</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Новый email</Label>
            <div className="flex space-x-2">
              <Input
                type="email"
                placeholder="new@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input-bordered"
              />
              <Button 
                onClick={updateEmail}
                disabled={updating || !newEmail.trim()}
                size="sm"
              >
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Смена пароля</CardTitle>
          <CardDescription>Изменить пароль для входа</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Текущий пароль</Label>
            <Input
              type="password"
              placeholder="Введите текущий пароль"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-bordered"
            />
          </div>
          <div className="space-y-2">
            <Label>Новый пароль</Label>
            <Input
              type="password"
              placeholder="Минимум 6 символов"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-bordered"
            />
          </div>
          <div className="space-y-2">
            <Label>Подтвердите пароль</Label>
            <Input
              type="password"
              placeholder="Повторите новый пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-bordered"
            />
          </div>
          <Button 
            onClick={updatePassword}
            disabled={updating}
            className="w-full"
          >
            <Lock className="w-4 h-4 mr-2" />
            Изменить пароль
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Wildberries API</CardTitle>
          <CardDescription>Безопасное хранение API ключа для интеграции</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Статус подключения</span>
            <Badge variant={hasWbKey ? "default" : "secondary"}>
              {hasWbKey ? "Подключен" : "Не подключен"}
            </Badge>
          </div>

          {hasWbKey ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Текущий API ключ</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={maskedWbKey || ""}
                    disabled
                    className="input-bordered font-mono text-sm"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowWbApiKey(!showWbApiKey)}
                  className="flex-1"
                >
                  {showWbApiKey ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showWbApiKey ? "Скрыть форму" : "Изменить ключ"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={removeWbApiKey}
                  disabled={updating}
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Добавьте API ключ для интеграции с Wildberries
              </p>
              <Button
                onClick={() => setShowWbApiKey(true)}
                className="w-full"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Добавить API ключ
              </Button>
            </div>
          )}

          {showWbApiKey && (
            <div className="space-y-4 p-4 border rounded-lg bg-background/50">
              <div className="space-y-2">
                <Label>Wildberries API ключ</Label>
                <div className="flex space-x-2">
                  <Input
                    type="password"
                    placeholder="Введите API ключ Wildberries"
                    value={wbApiKey}
                    onChange={(e) => setWbApiKey(e.target.value)}
                    className="input-bordered"
                  />
                  <Button 
                    onClick={saveWbApiKey}
                    disabled={updating || !wbApiKey.trim()}
                    size="sm"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                API ключ будет зашифрован и сохранен безопасно
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
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
    </div>
  );
};