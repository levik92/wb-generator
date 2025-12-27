import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";

// Lazy load HCaptcha for faster initial page load
const HCaptcha = lazy(() => import("@hcaptcha/react-hcaptcha"));

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Site key для hCaptcha - получите его из настроек Supabase
    // Authentication > Attack Protection > Bot and Abuse Protection
    // Замените на ваш реальный site key
    const siteKey = "d15aeff4-fff0-4da6-b948-86f26ab65ffa"; // Замените на ваш site key
    setCaptchaSiteKey(siteKey);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (captchaSiteKey && !captchaToken) {
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
        toast({
          title: "Ошибка входа",
          description: error.message,
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
        captchaRef.current?.resetCaptcha();
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
      captchaRef.current?.resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Вход в админ-панель</CardTitle>
          <CardDescription>Введите учетные данные администратора</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Введите email администратора"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Введите пароль администратора"
              />
            </div>

            {captchaSiteKey && (
              <div className="flex justify-center">
                <Suspense fallback={
                  <div className="h-[78px] w-[303px] rounded border border-border bg-muted/50 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Загрузка капчи...</span>
                  </div>
                }>
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={captchaSiteKey}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </Suspense>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || (captchaSiteKey && !captchaToken)}>
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-foreground hover:text-wb-purple transition-colors duration-200 bg-transparent border-none cursor-pointer"
            >
              Вернуться на главную
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
