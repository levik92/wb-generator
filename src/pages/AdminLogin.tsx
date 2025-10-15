import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import HCaptcha from "@hcaptcha/react-hcaptcha";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Получаем site key для hCaptcha из Supabase
    const fetchCaptchaSiteKey = async () => {
      try {
        const response = await fetch(`https://xguiyabpngjkavyosbza.supabase.co/auth/v1/settings`);
        const data = await response.json();
        if (data.external?.hcaptcha?.site_key) {
          setCaptchaSiteKey(data.external.hcaptcha.site_key);
        }
      } catch (error) {
        console.error('Error fetching captcha site key:', error);
      }
    };
    fetchCaptchaSiteKey();
  }, []);

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: captchaToken
        }
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
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
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
        navigate('/admin');
      }
    } catch (error) {
      console.error('Login error:', error);
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
          <CardDescription>
            Введите учетные данные администратора
          </CardDescription>
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
                <HCaptcha
                  ref={captchaRef}
                  sitekey={captchaSiteKey}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading || !captchaToken}>
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/')}
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