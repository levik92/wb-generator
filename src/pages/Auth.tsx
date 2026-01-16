import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSecurityLogger } from "@/hooks/useSecurityLogger";
import { ArrowLeft, Loader2, Eye, EyeOff, Mail, Lock, User, Sparkles, Zap } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import YandexMetrika from "@/components/YandexMetrika";
import "@/styles/landing-theme.css";

const HCaptcha = lazy(() => import("@hcaptcha/react-hcaptcha"));

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "reset" | "new-password">("signin");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showTermsError, setShowTermsError] = useState(false);
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const captchaRef = useRef<any>(null);
  const { toast } = useToast();
  const { logLoginAttempt } = useSecurityLogger();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const partnerCode = searchParams.get("partner");
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "hsl(240, 10%, 4%)";
    
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    const handleSessionFromUrl = async () => {
      if (tabParam === "reset-password") {
        setActiveTab("new-password");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          toast({
            title: "Ошибка",
            description: "Не удалось восстановить сессию. Попробуйте запросить новую ссылку.",
            variant: "destructive",
          });
        } else if (session) {
          setSessionReady(true);
        } else {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
              setSessionReady(true);
              subscription.unsubscribe();
            }
          });
          
          setTimeout(() => {
            subscription.unsubscribe();
            setSessionLoading(false);
          }, 10000);
        }
      } else if (tabParam === "signup") {
        setActiveTab("signup");
      } else if (tabParam === "signin") {
        setActiveTab("signin");
      }
      
      setSessionLoading(false);
    };

    handleSessionFromUrl();
  }, [tabParam, toast]);

  useEffect(() => {
    const siteKey = "d15aeff4-fff0-4da6-b948-86f26ab65ffa";
    setCaptchaSiteKey(siteKey);
  }, []);

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

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Ошибка регистрации",
        description: passwordValidation.message,
        variant: "destructive",
      });
      return;
    }

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
      const { data: emailCheckData, error: emailCheckError } = await supabase.functions.invoke("check-email-exists", {
        body: { email },
      });

      if (emailCheckError) {
        throw new Error("Ошибка проверки email");
      }

      if (emailCheckData.exists) {
        toast({
          title: "Аккаунт уже существует",
          description: "Аккаунт с таким email уже зарегистрирован. Войдите через вкладку 'Вход'.",
          variant: "destructive",
          duration: 8000,
        });
        setLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/dashboard`;
      const signupOptions: any = { emailRedirectTo: redirectUrl };

      if (captchaToken) signupOptions.captchaToken = captchaToken;
      if (referralCode) signupOptions.data = { referral_code: referralCode };
      if (partnerCode) signupOptions.data = { ...signupOptions.data, partner_code: partnerCode };

      const { error } = await supabase.auth.signUp({ email, password, options: signupOptions });

      if (error) {
        await logLoginAttempt(email, false, error.message);
        throw error;
      }

      await logLoginAttempt(email, true);
      toast({
        title: "Аккаунт создан! 📧",
        description: "Перейдите в почту и подтвердите email. После — войдите через вкладку 'Вход'.",
        duration: 10000,
      });
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    } catch (error: any) {
      toast({ title: "Ошибка регистрации", description: error.message, variant: "destructive" });
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
      if (captchaToken) authOptions.captchaToken = captchaToken;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        ...(Object.keys(authOptions).length > 0 ? { options: authOptions } : {}),
      });

      if (error) {
        await logLoginAttempt(email, false, error.message);
        throw error;
      }

      if (data.user) {
        await logLoginAttempt(email, true);
        toast({ title: "Добро пожаловать!", description: "Вы успешно вошли в систему." });
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Ошибка входа", description: error.message, variant: "destructive" });
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (captchaSiteKey && !captchaToken) {
      toast({ title: "Ошибка", description: "Пройдите проверку капчи.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const resetOptions: any = { redirectTo: `${window.location.origin}/auth?tab=reset-password` };
      if (captchaToken) resetOptions.captchaToken = captchaToken;

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, resetOptions);
      if (error) throw error;

      toast({
        title: "Письмо отправлено!",
        description: "Проверьте почту и следуйте инструкциям.",
        duration: 8000,
      });
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      setActiveTab("signin");
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Ошибка",
        description: "Сессия истекла. Запросите новую ссылку для сброса.",
        variant: "destructive",
      });
      setActiveTab("reset");
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      toast({ title: "Ошибка", description: passwordValidation.message, variant: "destructive" });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({ title: "Ошибка", description: "Пароли не совпадают.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Пароль обновлен!", description: "Теперь вы можете войти с новым паролем." });
      navigate("/dashboard");
    } catch (error: any) {
      if (error.message?.includes("Auth session missing")) {
        toast({
          title: "Ошибка",
          description: "Ссылка для сброса пароля истекла. Запросите новую.",
          variant: "destructive",
        });
        setActiveTab("reset");
        return;
      }
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (activeTab === "signup" && !agreeToTerms) {
      setShowTermsError(true);
      toast({
        title: "Необходимо согласие",
        description: "Для регистрации согласитесь с офертой и политикой конфиденциальности.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      if (referralCode) sessionStorage.setItem('pending_referral_code', referralCode);
      if (partnerCode) sessionStorage.setItem('pending_partner_code', partnerCode);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const inputClasses = "h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(268,83%,58%)] focus:ring-[hsl(268,83%,58%)]/20 rounded-xl pl-12";

  return (
    <>
      <YandexMetrika />
      
      <div className="min-h-screen bg-[hsl(240,10%,4%)] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[hsl(268,83%,58%)]/15 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[hsl(280,83%,58%)]/10 rounded-full blur-[120px]" />
        </div>
        <div className="noise-overlay" />

        {/* Back to home */}
        <Link
          to="/"
          className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-white/50 hover:text-white transition-colors z-20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Назад</span>
        </Link>

        {/* Auth card */}
        <div
          className="relative z-10 w-full max-w-md mx-4 sm:mx-0 mt-16 sm:mt-0"
        >
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-white/20 transition-colors">
            {/* Logo */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-3 mb-4 group">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_hsl(268,83%,60%,0.4)] transition-shadow duration-300">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-[hsl(268,83%,60%)] to-[hsl(268,83%,45%)] blur-lg transition-opacity rounded-lg opacity-50" />
                </div>
                <span className="text-xl font-bold text-white">
                  WB<span className="text-[hsl(268,83%,65%)]">Gen</span>
                </span>
              </Link>
              <h1 className="text-2xl font-bold text-white mb-2">
                {activeTab === "signin" && "Вход в аккаунт"}
                {activeTab === "signup" && "Создание аккаунта"}
                {activeTab === "reset" && "Восстановление пароля"}
                {activeTab === "new-password" && "Новый пароль"}
              </h1>
              <p className="text-white/50 text-sm">
                {activeTab === "signin" && "Войдите, чтобы продолжить"}
                {activeTab === "signup" && "Создавайте карточки за 3 минуты"}
                {activeTab === "reset" && "Введите email для восстановления"}
                {activeTab === "new-password" && "Придумайте новый пароль"}
              </p>
            </div>

            {/* Tab switcher for signin/signup */}
            {(activeTab === "signin" || activeTab === "signup") && (
              <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                <button
                  onClick={() => setActiveTab("signin")}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "signin"
                      ? "bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] text-white"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Вход
                </button>
                <button
                  onClick={() => setActiveTab("signup")}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "signup"
                      ? "bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] text-white"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Регистрация
                </button>
              </div>
            )}

            {/* Google sign in */}
            {(activeTab === "signin" || activeTab === "signup") && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl mb-6"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <FcGoogle className="w-5 h-5 mr-3" />
                      Войти через Google
                    </>
                  )}
                </Button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[hsl(240,10%,8%)] px-3 text-white/40">или</span>
                  </div>
                </div>
              </>
            )}

            {/* Sign In Form */}
            {activeTab === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={inputClasses}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={inputClasses}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {captchaSiteKey && (
                  <div className="flex justify-center">
                    <Suspense fallback={
                      <div className="h-[78px] w-[302px] bg-white/5 border border-white/10 rounded-lg flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                        <span className="text-xs text-white/40">Загрузка капчи...</span>
                      </div>
                    }>
                      <HCaptcha
                        ref={captchaRef}
                        sitekey={captchaSiteKey}
                        theme="dark"
                        onVerify={(token) => setCaptchaToken(token)}
                        onExpire={() => setCaptchaToken(null)}
                      />
                    </Suspense>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] hover:opacity-90 text-white font-semibold rounded-xl"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Войти"}
                </Button>

                <button
                  type="button"
                  onClick={() => setActiveTab("reset")}
                  className="w-full text-center text-sm text-white/50 hover:text-white transition-colors"
                >
                  Забыли пароль?
                </button>
              </form>
            )}

            {/* Sign Up Form */}
            {activeTab === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={inputClasses}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={inputClasses}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Подтвердите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={inputClasses}
                  />
                </div>

                <p className="text-xs text-white/40">
                  Минимум 8 символов, заглавные и строчные буквы, цифры
                </p>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={(checked) => {
                      setAgreeToTerms(checked as boolean);
                      if (checked) setShowTermsError(false);
                    }}
                    className={`mt-0.5 border-white/20 data-[state=checked]:bg-[hsl(268,83%,58%)] data-[state=checked]:border-[hsl(268,83%,58%)] ${showTermsError ? 'border-red-500' : ''}`}
                  />
                  <Label htmlFor="terms" className="text-xs text-white/50 leading-relaxed">
                    Я согласен с{" "}
                    <Link to="/terms" className="text-[hsl(268,83%,58%)] hover:underline" target="_blank">
                      договором оферты
                    </Link>{" "}
                    и{" "}
                    <Link to="/privacy" className="text-[hsl(268,83%,58%)] hover:underline" target="_blank">
                      политикой конфиденциальности
                    </Link>
                  </Label>
                </div>

                {captchaSiteKey && (
                  <div className="flex justify-center">
                    <Suspense fallback={
                      <div className="h-[78px] w-[302px] bg-white/5 border border-white/10 rounded-lg flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                        <span className="text-xs text-white/40">Загрузка капчи...</span>
                      </div>
                    }>
                      <HCaptcha
                        ref={captchaRef}
                        sitekey={captchaSiteKey}
                        theme="dark"
                        onVerify={(token) => setCaptchaToken(token)}
                        onExpire={() => setCaptchaToken(null)}
                      />
                    </Suspense>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] hover:opacity-90 text-white font-semibold rounded-xl"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Создать аккаунт"}
                </Button>
              </form>
            )}

            {/* Reset Password Form */}
            {activeTab === "reset" && (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className={inputClasses}
                  />
                </div>

                {captchaSiteKey && (
                  <div className="flex justify-center">
                    <Suspense fallback={
                      <div className="h-[78px] w-[302px] bg-white/5 border border-white/10 rounded-lg flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                        <span className="text-xs text-white/40">Загрузка капчи...</span>
                      </div>
                    }>
                      <HCaptcha
                        ref={captchaRef}
                        sitekey={captchaSiteKey}
                        theme="dark"
                        onVerify={(token) => setCaptchaToken(token)}
                        onExpire={() => setCaptchaToken(null)}
                      />
                    </Suspense>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] hover:opacity-90 text-white font-semibold rounded-xl"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Отправить ссылку"}
                </Button>

                <button
                  type="button"
                  onClick={() => setActiveTab("signin")}
                  className="w-full text-center text-sm text-white/50 hover:text-white transition-colors"
                >
                  Вернуться ко входу
                </button>
              </form>
            )}

            {/* New Password Form */}
            {activeTab === "new-password" && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Новый пароль"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className={inputClasses}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Подтвердите пароль"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className={inputClasses}
                  />
                </div>

                <p className="text-xs text-white/40">
                  Минимум 8 символов, заглавные и строчные буквы, цифры
                </p>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-[hsl(268,83%,58%)] to-[hsl(280,83%,58%)] hover:opacity-90 text-white font-semibold rounded-xl"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить пароль"}
                </Button>
              </form>
            )}

            {/* Referral badge */}
            {(referralCode || partnerCode) && (activeTab === "signin" || activeTab === "signup") && (
              <div className="mt-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-400 text-center">
                  🎁 Вы пришли по реферальной ссылке — бонус будет начислен после регистрации
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
