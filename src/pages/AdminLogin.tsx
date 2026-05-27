import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Shield, Loader2, Mail, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { SmartCaptcha } from "@yandex/smart-captcha";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      toast({
        title: "Ошибка входа",
        description: "Пожалуйста, пройдите проверку капчи.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const authOptions: any = {};
      if (captchaToken) {
        authOptions.captchaToken = captchaToken;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        ...(Object.keys(authOptions).length > 0 ? { options: authOptions } : {}),
      });

      if (error) {
        const localizeAuthError = (msg: string): string => {
          const map: Record<string, string> = {
            'Invalid login credentials': 'Неверный email или пароль',
            'Email not confirmed': 'Подтвердите email перед входом. Проверьте почту.',
          };
          return map[msg] || msg;
        };
        toast({
          title: "Ошибка входа",
          description: localizeAuthError(error.message),
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        // Check if user is admin
        const { data: userRoles, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .single();

        if (roleError || !userRoles) {
          await supabase.auth.signOut();
          toast({
            title: "Доступ запрещен",
            description: "У вас нет прав администратора",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Успешный вход",
          description: "Добро пожаловать в админ-панель",
        });
        setCaptchaToken(null);
        setCaptchaKey(k => k + 1);
        navigate("/admin");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при входе",
        variant: "destructive",
      });
      setCaptchaToken(null);
      setCaptchaKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100svh] flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-background">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.18),transparent_55%),radial-gradient(circle_at_80%_80%,hsl(270_91%_65%/0.18),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.04] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-5 inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          На главную
        </button>

        <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-card/95 shadow-2xl shadow-violet-500/10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

          <CardHeader className="text-center pt-8 pb-2">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 blur-xl opacity-50" />
                <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Shield className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">
              Вход в админ-панель
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Доступ только для администраторов
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 sm:pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@example.com"
                    className="pl-9 h-11 focus-visible:ring-violet-500/40"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">Пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="pl-9 pr-10 h-11 focus-visible:ring-violet-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="w-full overflow-hidden rounded-lg [&>div]:!w-full [&>div>iframe]:!w-full">
                <SmartCaptcha
                  key={captchaKey}
                  sitekey="ysc1_uLpEbWmdSo9D5oYyKjcRh8SUhSgodHaxDVDQYlYJfa517ca8"
                  onSuccess={(token) => setCaptchaToken(token)}
                  onTokenExpired={() => setCaptchaToken(null)}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white shadow-md shadow-violet-500/25 border-0 font-medium"
                disabled={loading || !captchaToken}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Вход...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Войти в админ-панель
                  </>
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-[11px] text-muted-foreground leading-relaxed">
              Защищённое соединение. Все действия в админ-панели записываются.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
