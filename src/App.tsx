import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthRedirect } from "./components/AuthRedirect";
import { CookieConsent } from "./components/CookieConsent";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Cases from "./pages/Cases";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import AdminLogin from "./pages/AdminLogin";
import Partner from "./pages/Partner";
import PartnerAgreement from "./pages/PartnerAgreement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CookieConsent />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <AuthRedirect>
              <Landing />
            </AuthRedirect>
          } />
          <Route path="/auth" element={
            <AuthRedirect>
              <Auth />
            </AuthRedirect>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/partner" element={
            <ProtectedRoute>
              <Partner />
            </ProtectedRoute>
          } />
          <Route path="/partner-agreement" element={<PartnerAgreement />} />
          <Route path="/cases" element={<Cases />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
