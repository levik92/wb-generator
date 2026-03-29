/**
 * Telegram Mini App utilities
 * Detects if the app is running inside Telegram WebView
 * and provides helper functions for TMA-specific behavior.
 */

export const isTelegramWebApp = (): boolean => {
  const tg = (window as any).Telegram?.WebApp;
  // The SDK script creates window.Telegram.WebApp even in regular browsers.
  // To distinguish real TMA usage, check for initData or platform which are
  // only populated when launched from Telegram.
  if (!tg) return false;
  return !!(tg.initData || tg.initDataUnsafe?.user || tg.platform === 'android' || tg.platform === 'ios' || tg.platform === 'android_x');
};

export const getTelegramWebApp = () => {
  return (window as any).Telegram?.WebApp;
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
