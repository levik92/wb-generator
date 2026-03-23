import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const PERMISSION_KEY = "notifications_asked";

export const useNotifications = () => {
  const lastCheckRef = useRef<Record<string, number>>({});

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;

    // Only ask once per session
    if (sessionStorage.getItem(PERMISSION_KEY)) return false;
    sessionStorage.setItem(PERMISSION_KEY, "1");

    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const showNotification = useCallback((title: string, body: string, tag?: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: tag || `wbgen-${Date.now()}`,
        silent: false,
      });
    } catch {
      // Notification constructor may fail in some contexts
    }
  }, []);

  // Poll for new support messages
  const checkSupportMessages = useCallback(async (userId: string) => {
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "get_conversation", user_id: userId }),
      });

      if (!res.ok) return;
      const { conversation } = await res.json();
      if (!conversation) return;

      // Check for new messages
      const msgsRes = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "get_messages", conversation_id: conversation.id }),
      });

      if (!msgsRes.ok) return;
      const { messages } = await msgsRes.json();
      if (!messages?.length) return;

      // Find last non-user message
      const lastNonUser = [...messages].reverse().find(
        (m: any) => m.sender_type === "admin" || m.sender_type === "ai"
      );

      if (lastNonUser) {
        const msgTime = new Date(lastNonUser.created_at).getTime();
        const lastSeen = lastCheckRef.current["support"] || 0;

        if (msgTime > lastSeen && lastSeen > 0) {
          showNotification(
            "Поддержка WBGen",
            lastNonUser.sender_type === "admin" ? "Менеджер ответил на ваше сообщение" : "Ассистент ответил на ваше сообщение",
            "support-reply"
          );
        }
        lastCheckRef.current["support"] = msgTime;
      }
    } catch {
      // Silently fail
    }
  }, [showNotification]);

  // Poll for new news
  const checkNews = useCallback(async (userId: string) => {
    try {
      const { data: unread, error } = await supabase
        .from("notifications")
        .select("id, title, created_at")
        .eq("user_id", userId)
        .eq("read", false)
        .eq("type", "news")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error || !unread?.length) return;

      const latest = unread[0];
      const msgTime = new Date(latest.created_at).getTime();
      const lastSeen = lastCheckRef.current["news"] || 0;

      if (msgTime > lastSeen && lastSeen > 0) {
        showNotification("WBGen", latest.title, "news-" + latest.id);
      }
      lastCheckRef.current["news"] = msgTime;
    } catch {
      // Silently fail
    }
  }, [showNotification]);

  return { requestPermission, showNotification, checkSupportMessages, checkNews };
};
