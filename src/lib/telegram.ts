/**
 * Telegram Mini App utilities
 * Detects if the app is running inside Telegram WebView
 * and provides helper functions for TMA-specific behavior.
 */

const TELEGRAM_WEB_APP_SCRIPT_URL = "https://telegram.org/js/telegram-web-app.js";
let telegramScriptLoadStarted = false;

const getTelegramGlobal = () => (window as any).Telegram?.WebApp;

const isTelegramLikeEnvironment = (): boolean => {
  const ua = navigator.userAgent || "";
  const referrer = document.referrer || "";

  return (
    /Telegram/i.test(ua) ||
    /TDesktop/i.test(ua) ||
    /TelegramWebview/i.test(ua) ||
    /(?:^|\/\/)(t\.me|telegram\.me)\//i.test(referrer)
  );
};

const runWhenBrowserIsIdle = (callback: () => void): void => {
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(callback, { timeout: 3000 });
    return;
  }

  window.setTimeout(callback, 1500);
};

const scheduleTelegramSdkLoad = (): void => {
  if (telegramScriptLoadStarted || getTelegramGlobal() || !isTelegramLikeEnvironment()) {
    return;
  }

  telegramScriptLoadStarted = true;

  const appendScript = () => {
    runWhenBrowserIsIdle(() => {
      const script = document.createElement("script");
      script.src = TELEGRAM_WEB_APP_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.warn("[telegram] Failed to load Telegram Web App SDK, continuing without it");
      };
      document.head.appendChild(script);
    });
  };

  if (document.readyState === "complete") {
    appendScript();
    return;
  }

  window.addEventListener("load", appendScript, { once: true });
};

export const isTelegramWebApp = (): boolean => {
  const tg = getTelegramGlobal();

  if (tg) {
    // The SDK script creates window.Telegram.WebApp even in regular browsers.
    // To distinguish real TMA usage, check for initData or platform which are
    // only populated when launched from Telegram.
    return !!(
      tg.initData ||
      tg.initDataUnsafe?.user ||
      tg.platform === "android" ||
      tg.platform === "ios" ||
      tg.platform === "android_x"
    );
  }

  scheduleTelegramSdkLoad();
  return isTelegramLikeEnvironment();
};

export const getTelegramWebApp = () => {
  scheduleTelegramSdkLoad();
  return getTelegramGlobal();
};

/**
 * Detect Safari browser (not Chrome-based).
 */
const isSafari = (): boolean => {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg/.test(ua);
};

/**
 * Cross-browser safe download for blob URLs and regular URLs.
 * Handles Safari quirks where programmatic <a>.click() with blob URLs is ignored.
 */
export const safeBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);

  if (isSafari()) {
    // Safari: open blob URL in current tab — triggers native download UI
    // Using a short timeout ensures the object URL is registered before navigation
    const newTab = window.open(url, '_blank');
    if (!newTab) {
      // Popup blocked — fall back to current window
      window.location.href = url;
    }
    // Revoke after a delay so Safari has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Safely download a file in Telegram WebView.
 * Falls back to window.open() since <a download> doesn't work in TMA.
 */
export const telegramSafeDownload = (url: string, filename?: string): void => {
  if (isTelegramWebApp()) {
    window.open(url, '_blank');
  } else {
    const link = document.createElement('a');
    link.href = url;
    if (filename) link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
