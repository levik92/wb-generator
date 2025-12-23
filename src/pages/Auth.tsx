import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSecurityLogger } from "@/hooks/useSecurityLogger";
import { ArrowLeft, Zap, Loader2, Gift } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import YandexMetrika from "@/components/YandexMetrika";

// Lazy load HCaptcha for faster initial page load
const HCaptcha = lazy(() => import("@hcaptcha/react-hcaptcha"));

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [activeTab, setActiveTab] = useState("signin");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showTermsError, setShowTermsError] = useState(false);
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<any>(null);
  const { toast } = useToast();
  const { logLoginAttempt } = useSecurityLogger();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const partnerCode = searchParams.get("partner");
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    if (tabParam === "reset-password") {
      setActiveTab("new-password");
    } else if (tabParam === "signup") {
      setActiveTab("signup");
    } else if (tabParam === "signin") {
      setActiveTab("signin");
    }
  }, [tabParam]);

  useEffect(() => {
    // Site key для hCaptcha - получите его из настроек Supabase
    // Authentication > Attack Protection > Bot and Abuse Protection
    // Замените на ваш реальный site key
    const siteKey = "d15aeff4-fff0-4da6-b948-86f26ab65ffa"; // Замените на ваш site key
    setCaptchaSiteKey(siteKey);
  }, []);

  // Сбрасываем captcha token при смене вкладки
  useEffect(() => {
    setCaptchaToken(null);
    captchaRef.current?.resetCaptcha();
  }, [activeTab]);

  const validatePassword = (password: string): { isValid: boolean; message?: string } => {
    if (password.length < 8) {
      return { isValid: false, message: "Пароль должен содержать минимум 8 символов" };
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumbers) {
      return {
        isValid: false,
        message: "Пароль должен содержать заглавные и строчные буквы, а также цифры",
      };
    }

    return { isValid: true };
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeToTerms) {
      setShowTermsError(true);
      toast({
        title: "Ошибка регистрации",
        description: "Необходимо согласиться с договором оферты и политикой конфиденциальности.",
        variant: "destructive",
      });
      return;
    }

    if (captchaSiteKey && !captchaToken) {
      toast({
        title: "Ошибка регистрации",
        description: "Пожалуйста, пройдите проверку капчи.",
        variant: "destructive",
      });
      return;
    }

    // Validate password complexity
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Ошибка регистрации",
        description: passwordValidation.message,
        variant: "destructive",
      });
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      toast({
        title: "Ошибка регистрации",
        description: "Пароли не совпадают. Проверьте правильность ввода.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // First check if email already exists
      console.log("Starting signup with referral code:", referralCode);
      const { data: emailCheckData, error: emailCheckError } = await supabase.functions.invoke("check-email-exists", {
        body: { email },
      });

      if (emailCheckError) {
        console.error("Error checking email:", emailCheckError);
        throw new Error("Ошибка проверки email");
      }

      // If email exists, show message to use login tab
      if (emailCheckData.exists) {
        toast({
          title: "Аккаунт уже существует",
          description: "Аккаунт с таким email уже зарегистрирован в системе. Пожалуйста, войдите через вкладку 'Вход'.",
          variant: "destructive",
          duration: 8000,
        });
        setLoading(false);
        return;
      }

      // If email doesn't exist, proceed with signup
      const redirectUrl = `${window.location.origin}/dashboard`;

      const signupOptions: any = {
        emailRedirectTo: redirectUrl,
      };

      // Добавляем captcha token если он есть
      if (captchaToken) {
        signupOptions.captchaToken = captchaToken;
      }

      // Add referral code if present
      if (referralCode) {
        console.log("Adding referral code to signup:", referralCode);
        signupOptions.data = {
          referral_code: referralCode,
        };
      }

      // Add partner code if present
      if (partnerCode) {
        console.log("Adding partner code to signup:", partnerCode);
        signupOptions.data = {
          ...signupOptions.data,
          partner_code: partnerCode,
        };
      }

      console.log("Signup options:", signupOptions);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: signupOptions,
      });

      if (error) {
        console.error("Signup error:", error);
        // Log failed signup attempt
        await logLoginAttempt(email, false, error.message);
        throw error;
      }

      console.log("Signup successful");
      // Log successful signup
      await logLoginAttempt(email, true);

      toast({
        title: "Аккаунт создан! 📧",
        description:
          "Перейдите в свою почту и подтвердите email (проверьте папку спам). После подтверждения войдите через вкладку 'Вход'.",
        duration: 10000,
      });
      // Сброс капчи после успешной регистрации
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    } catch (error: any) {
      toast({
        title: "Ошибка регистрации",
        description: error.message,
        variant: "destructive",
      });
      // Сброс капчи после ошибки
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
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
        // Log failed login attempt
        await logLoginAttempt(email, false, error.message);
        throw error;
      }

      if (data.user) {
        // Log successful login
        await logLoginAttempt(email, true);

        toast({
          title: "Добро пожаловать!",
          description: "Вы успешно вошли в систему.",
        });
        // Сброс капчи после успешного входа
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Ошибка входа",
        description: error.message,
        variant: "destructive",
      });
      // Сброс капчи после ошибки
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (captchaSiteKey && !captchaToken) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, пройдите проверку капчи.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const resetOptions: any = {
        redirectTo: `${window.location.origin}/auth?tab=reset-password`,
      };

      if (captchaToken) {
        resetOptions.captchaToken = captchaToken;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, resetOptions);

      if (error) {
        throw error;
      }

      toast({
        title: "Письмо отправлено!",
        description: "Проверьте почту и следуйте инструкциям для восстановления пароля.",
        duration: 8000,
      });

      // Сброс капчи после успешной отправки
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      setActiveTab("signin");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
      // Сброс капчи после ошибки
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password complexity
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "Ошибка",
        description: passwordValidation.message,
        variant: "destructive",
      });
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают. Проверьте правильность ввода.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Пароль обновлен!",
        description: "Ваш пароль успешно изменен. Теперь вы можете войти с новым паролем.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Check if on signup tab and terms not agreed
    if (activeTab === "signup" && !agreeToTerms) {
      setShowTermsError(true);
      toast({
        title: "Необходимо согласие",
        description: "Для регистрации необходимо согласиться с договором оферты и политикой конфиденциальности.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Always save referral and partner codes to sessionStorage if they exist in URL
      // This ensures they work for both new signups and existing users clicking partner links
      if (referralCode) {
        sessionStorage.setItem('pending_referral_code', referralCode);
        console.log('Saved referral code to sessionStorage:', referralCode);
      }
      if (partnerCode) {
        sessionStorage.setItem('pending_partner_code', partnerCode);
        console.log('Saved partner code to sessionStorage:', partnerCode);
      }
      
      const redirectUrl = `${window.location.origin}/dashboard`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <YandexMetrika />
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            На главную
          </Link>

          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-hero rounded-[12px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold">WB Генератор</span>
          </div>

          <h1 className="text-2xl font-bold">Добро пожаловать</h1>
          <p className="text-muted-foreground">Войдите или создайте аккаунт для начала работы</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <div className="bg-wb-purple/10 text-wb-purple px-3 py-2 rounded-lg text-sm text-center">
              {referralCode ? (
                <>
                  <Gift className="w-4 h-4 inline mr-2" />
                  🎉 25 токенов при регистрации (15 + 10 по реферальной программе)
                </>
              ) : partnerCode ? (
                <>
                  <Gift className="w-4 h-4 inline mr-2" />
                  🎉 15 токенов при регистрации по партнерской ссылке
                </>
              ) : (
                "🎉 15 токенов бесплатно при регистрации"
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {activeTab !== "new-password" && activeTab !== "reset" && (
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Вход</TabsTrigger>
                  <TabsTrigger value="signup">Регистрация</TabsTrigger>
                </TabsList>
              )}

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {captchaSiteKey && (
                    <div className="flex justify-center">
                      <Suspense fallback={<Skeleton className="h-[78px] w-[303px] rounded" />}>
                        <HCaptcha
                          ref={captchaRef}
                          sitekey={captchaSiteKey}
                          onVerify={(token) => setCaptchaToken(token)}
                          onExpire={() => setCaptchaToken(null)}
                        />
                      </Suspense>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-wb-purple hover:bg-wb-purple-dark"
                    disabled={loading || (captchaSiteKey && !captchaToken)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Вход...
                      </>
                    ) : (
                      "Войти"
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab("reset")}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Забыли пароль?
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">или</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <FcGoogle className="w-5 h-5 mr-2" />
                    Войти через Google
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="reset">
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold">Восстановление пароля</h3>
                    <p className="text-sm text-muted-foreground">
                      Введите email для получения ссылки на восстановление пароля
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>

                  {captchaSiteKey && (
                    <div className="flex justify-center">
                      <Suspense fallback={<Skeleton className="h-[78px] w-[303px] rounded" />}>
                        <HCaptcha
                          ref={captchaRef}
                          sitekey={captchaSiteKey}
                          onVerify={(token) => setCaptchaToken(token)}
                          onExpire={() => setCaptchaToken(null)}
                        />
                      </Suspense>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-wb-purple hover:bg-wb-purple-dark"
                    disabled={loading || (captchaSiteKey && !captchaToken)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      "Отправить ссылку"
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab("signin")}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Вернуться ко входу
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="new-password">
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold">Установка нового пароля</h3>
                    <p className="text-sm text-muted-foreground">Введите новый пароль для вашего аккаунта</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">Новый пароль</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      Минимум 8 символов, должен содержать заглавные и строчные буквы, цифры
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Подтвердите новый пароль</Label>
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-wb-purple hover:bg-wb-purple-dark" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Обновление...
                      </>
                    ) : (
                      "Обновить пароль"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Пароль</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      Минимум 8 символов, должен содержать заглавные и строчные буквы, цифры
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Подтвердите пароль</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground">Повторите пароль для подтверждения</p>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="agree-terms"
                      checked={agreeToTerms}
                      onCheckedChange={(checked) => {
                        setAgreeToTerms(checked === true);
                        if (checked) setShowTermsError(false);
                      }}
                      className={showTermsError && !agreeToTerms ? "border-2 border-destructive" : ""}
                    />
                    <label
                      htmlFor="agree-terms"
                      className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Я соглашаюсь с{" "}
                      <Link to="/terms" className="text-wb-purple hover:underline" onClick={(e) => e.stopPropagation()}>
                        договором оферты
                      </Link>{" "}
                      и{" "}
                      <Link
                        to="/privacy"
                        className="text-wb-purple hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        политикой конфиденциальности
                      </Link>
                    </label>
                  </div>

                  {captchaSiteKey && (
                    <div className="flex justify-center">
                      <Suspense fallback={<Skeleton className="h-[78px] w-[303px] rounded" />}>
                        <HCaptcha
                          ref={captchaRef}
                          sitekey={captchaSiteKey}
                          onVerify={(token) => setCaptchaToken(token)}
                          onExpire={() => setCaptchaToken(null)}
                        />
                      </Suspense>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-wb-purple hover:bg-wb-purple-dark"
                    disabled={loading || (captchaSiteKey && !captchaToken)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Создание аккаунта...
                      </>
                    ) : (
                      "Создать аккаунт"
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">или</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <FcGoogle className="w-5 h-5 mr-2" />
                    Зарегистрироваться через Google
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <Separator className="my-4" />

            <div className="text-center text-xs text-muted-foreground">
              {activeTab === "signup" && 'Уже есть аккаунт? Переключитесь на вкладку "Вход"'}
              {activeTab === "signin" && 'Нет аккаунта? Переключитесь на вкладку "Регистрация"'}
              {activeTab === "reset" && "Вспомнили пароль? Вернитесь ко входу"}
              {activeTab === "new-password" && "После смены пароля вы автоматически войдете в систему"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
