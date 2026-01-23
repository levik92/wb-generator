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

// Service pages
import CardDesign from "./pages/services/CardDesign";
import SeoDescriptions from "./pages/services/SeoDescriptions";
import BarcodeGenerator from "./pages/services/BarcodeGenerator";
import VideoGeneration from "./pages/services/VideoGeneration";

// Resource pages
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import KnowledgeBase from "./pages/KnowledgeBase";
import KnowledgeArticle from "./pages/KnowledgeArticle";
import PricingPage from "./pages/PricingPage";
import PartnersPage from "./pages/PartnersPage";

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
          <Route path="/partners/cabinet" element={
            <ProtectedRoute>
              <Partner />
            </ProtectedRoute>
          } />
          <Route path="/partner-agreement" element={<PartnerAgreement />} />
          <Route path="/cases" element={<Cases />} />
          
          {/* Product/Service pages */}
          <Route path="/sozdanie-kartochek" element={<CardDesign />} />
          <Route path="/seo-opisaniya" element={<SeoDescriptions />} />
          <Route path="/generator-shk" element={<BarcodeGenerator />} />
          <Route path="/video-generaciya" element={<VideoGeneration />} />
          
          {/* Resource pages */}
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogArticle />} />
          <Route path="/baza-znaniy" element={<KnowledgeBase />} />
          <Route path="/baza-znaniy/:articleId" element={<KnowledgeArticle />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
