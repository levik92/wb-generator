/**
 * Telegram Mini App utilities
 * Detects if the app is running inside Telegram WebView
 * and provides helper functions for TMA-specific behavior.
 */

export const isTelegramWebApp = (): boolean => {
  return !!(window as any).Telegram?.WebApp;
};

export const getTelegramWebApp = () => {
  return (window as any).Telegram?.WebApp;
};

/**
 * Safely download a file in Telegram WebView.
 * Falls back to window.open() since <a download> doesn't work in TMA.
 */
export const telegramSafeDownload = (url: string, filename?: string): void => {
  if (isTelegramWebApp()) {
    // In Telegram WebView, window.open triggers the built-in browser/download
    window.open(url, '_blank');
  } else {
    // Standard browser download via blob
    const link = document.createElement('a');
    link.href = url;
    if (filename) link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
