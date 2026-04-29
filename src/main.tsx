import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import { setupKeyboardInsetTracking } from './hooks/useKeyboardInset'
import { installStorageProxyGuard } from './lib/storage-proxy-guard'

// MUST run before any other code that may construct fetch/Image/XHR
// requests to Supabase storage. Rewrites *.supabase.co → api.wbgen.ru so
// users in restricted regions (RU) can load images without a VPN.
installStorageProxyGuard();
setupKeyboardInsetTracking();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <App />
    </ThemeProvider>
  </HelmetProvider>
);
