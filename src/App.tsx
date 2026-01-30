import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthRedirect } from "./components/AuthRedirect";
import { CookieConsent } from "./components/CookieConsent";
import { PageLoader } from "@/components/ui/lightning-loader";

// Critical pages loaded immediately
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load public pages for better performance
const Landing = lazy(() => import("./pages/Landing"));
const Cases = lazy(() => import("./pages/Cases"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Partner = lazy(() => import("./pages/Partner"));
const PartnerAgreement = lazy(() => import("./pages/PartnerAgreement"));

// Service pages - lazy loaded
const CardDesign = lazy(() => import("./pages/services/CardDesign"));
const SeoDescriptions = lazy(() => import("./pages/services/SeoDescriptions"));
const BarcodeGenerator = lazy(() => import("./pages/services/BarcodeGenerator"));
const VideoGeneration = lazy(() => import("./pages/services/VideoGeneration"));

// Resource pages - lazy loaded
const Blog = lazy(() => import("./pages/Blog"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const KnowledgeArticle = lazy(() => import("./pages/KnowledgeArticle"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PartnersPage = lazy(() => import("./pages/PartnersPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CookieConsent />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;