import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Send, Loader2, Headphones, MessageCircle, ShieldCheck, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getProxiedPublicUrl } from "@/lib/storage";
import { compressImage } from "@/lib/imageCompression";
import { buildChatTimeline, bubbleRoundingClasses, type ChatMessage } from "@/lib/groupMessages";
import { formatChatDateSeparator, formatChatTime } from "@/lib/formatChatDate";

interface Message extends ChatMessage {
  sender_type: "user" | "ai" | "admin" | "system";
}

interface SupportChatProps {
  profile: { id: string; email: string; full_name: string | null };
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const MESSAGES_PER_PAGE = 15;

export const SupportChat = ({ profile }: SupportChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldScrollRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (!shouldScrollRef.current) return;
    const el = messagesEndRef.current;
    if (el?.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const callApi = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 1.0 });
    const ext = compressed.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("support-attachments")
      .upload(path, compressed, { contentType: compressed.type });
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    return getProxiedPublicUrl("support-attachments", path);
  };

  const loadMessages = useCallback(async (convId: string, beforeId?: string) => {
    const { messages: msgs, hasMore } = await callApi({
      action: "get_messages",
      conversation_id: convId,
      ...(beforeId ? { before_id: beforeId } : {}),
      limit: MESSAGES_PER_PAGE,
    });
    setHasMoreMessages(hasMore);
    return msgs || [];
  }, []);

  // Load existing conversation
  useEffect(() => {
    const load = async () => {
      try {
        const { conversation } = await callApi({
          action: "get_conversation",
          user_id: profile.id,
        });
        if (conversation) {
          setConversationId(conversation.id);
          setAiEnabled(conversation.ai_enabled ?? false);
          const msgs = await loadMessages(conversation.id);
          setMessages(msgs);
          shouldScrollRef.current = true;
        }
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, [profile.id]);

  const loadOlderMessages = async () => {
    if (!conversationId || loadingMore || !hasMoreMessages || messages.length === 0) return;
    setLoadingMore(true);
    shouldScrollRef.current = false;
    try {
      const container = messagesContainerRef.current;
      const prevScrollHeight = container?.scrollHeight || 0;
      
      const oldestId = messages[0]?.id;
      const olderMsgs = await loadMessages(conversationId, oldestId);
      if (olderMsgs.length > 0) {
        setMessages(prev => [...olderMsgs, ...prev]);
        // Preserve scroll position
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          }
        });
      }
    } catch (e) {
      console.error("Load more error:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 60 && hasMoreMessages && !loadingMore) {
      loadOlderMessages();
    }
  }, [hasMoreMessages, loadingMore, messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Допустимые форматы: JPG, PNG, WEBP");
      return;
    }
    if (file.size > MAX_SIZE) {
      alert("Максимальный размер файла: 5 МБ");
      return;
    }
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    if (e.target) e.target.value = "";
  };

  const clearPendingFile = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !pendingFile) || loading || uploading) return;
    setInput("");
    setLoading(true);
    shouldScrollRef.current = true;

    try {
      let convId = conversationId;

      if (!convId) {
        const { conversation } = await callApi({
          action: "create_conversation",
          user_id: profile.id,
          channel: "dashboard",
        });
        convId = conversation.id;
        setConversationId(convId);
      }

      // Build optimistic message immediately (before upload)
      const tempId = "temp-" + Date.now();
      const optimisticMsg: Message = {
        id: tempId,
        sender_type: "user",
        content: text || "📎 Изображение",
        created_at: new Date().toISOString(),
        attachment_url: pendingPreview || null,
      };

      let attachmentUrl: string | null = null;
      if (pendingFile) {
        // Show optimistic message with local preview right away
        setMessages((prev) => [...prev, optimisticMsg]);
        setLoading(false);
        inputRef.current?.focus();

        setUploading(true);
        attachmentUrl = await uploadFile(pendingFile);
        setUploading(false);
        clearPendingFile();

        // Update optimistic message with real URL
        if (attachmentUrl) {
          setMessages((prev) =>
            prev.map((m) => m.id === tempId ? { ...m, attachment_url: attachmentUrl } : m)
          );
        }
      } else {
        // No file — show optimistic message immediately
        setMessages((prev) => [...prev, optimisticMsg]);
        setLoading(false);
        inputRef.current?.focus();
      }

      // Send in background — don't block UI
      const shouldShowTyping = aiEnabled;
      if (shouldShowTyping) setAiTyping(true);
      callApi({
        action: "send_message",
        conversation_id: convId,
        message: text || "📎 Изображение",
        attachment_url: attachmentUrl,
      }).then(() => {
          setAiTyping(false);
          return loadMessages(convId!);
        })
        .then((msgs) => {
          shouldScrollRef.current = true;
          setMessages(msgs);
        })
        .catch((e) => {
          console.error("Send error:", e);
          setAiTyping(false);
        });
    } catch (e) {
      console.error("Send error:", e);
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Poll for new messages (pause when tab hidden, while sending/uploading, or while user is selecting older history)
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      if (loading || uploading) return;
      try {
        const msgs = await loadMessages(conversationId);
        if (cancelled) return;
        setMessages(prev => {
          const sameLen = msgs.length === prev.length;
          const sameLast = msgs[msgs.length - 1]?.id === prev[prev.length - 1]?.id;
          if (sameLen && sameLast) return prev;
          shouldScrollRef.current = true;
          return msgs;
        });
      } catch {}
    };
    const interval = setInterval(tick, 8000);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [conversationId, loadMessages, loading, uploading]);


  const getSenderName = (type: string) => {
    switch (type) {
      case "admin": return "Менеджер";
      case "ai": return "Ассистент";
      case "system": return "Система";
      default: return "Вы";
    }
  };

  const timeline = useMemo(() => buildChatTimeline(messages), [messages]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }

  const isOnline = (() => {
    const now = new Date();
    const moscowHour = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" })).getHours();
    return moscowHour >= 9 && moscowHour < 22;
  })();

  return (
    <div className="w-full max-w-full px-1">
      {/* Header card */}
      <div className="mb-5 rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/[0.06] via-card to-card p-4 sm:p-5">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/25">
                <Headphones className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card ${
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
              }`} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold leading-tight truncate">Поддержка</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug">
                {isOnline
                  ? "Менеджер ответит вам в ближайшее время"
                  : "Сейчас офлайн — 09:00–22:00 МСК. Оставьте сообщение"}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 ${
            isOnline
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-muted text-muted-foreground border border-border/60"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"}`} />
            {isOnline ? "Онлайн" : "Офлайн"}
          </span>
        </div>
      </div>

      <div className="border border-border/60 rounded-2xl bg-card overflow-hidden flex flex-col h-[calc(100dvh-260px)] min-h-[440px] max-h-[680px] shadow-sm">
        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 bg-gradient-to-b from-muted/15 via-card to-card"
          onScroll={handleScroll}
        >
          {hasMoreMessages && (
            <div className="flex justify-center py-2">
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <button onClick={loadOlderMessages} className="text-xs text-violet-500 hover:text-violet-600 hover:underline font-medium">
                  Загрузить ранние сообщения
                </button>
              )}
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 rotate-6" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-violet-500" strokeWidth={2} />
                </div>
              </div>
              <p className="text-base font-semibold text-foreground mb-1.5">Напишите нам</p>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Опишите вашу проблему или задайте вопрос. Прикрепите скриншот, если нужно.
              </p>
            </div>
          ) : (
            timeline.map((item) => {
              if (item.type === "date") {
                return (
                  <div key={item.key} className="flex items-center justify-center py-1">
                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full font-medium">
                      {formatChatDateSeparator(item.date)}
                    </span>
                  </div>
                );
              }
              const group = item.group;
              const isOwn = group.sender_type === "user";
              return (
                <div
                  key={group.key}
                  className={`flex flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"} animate-fade-in`}
                >
                  {!isOwn && (
                    <span className="text-[10px] text-muted-foreground mb-0.5 px-1 font-medium">
                      {getSenderName(group.sender_type)}
                    </span>
                  )}
                  {group.items.map(({ msg, position }) => (
                    <div
                      key={msg.id}
                      className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        bubbleRoundingClasses(isOwn ? "own" : "other", position)
                      } ${
                        msg.sender_type === "user"
                          ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/20"
                          : msg.sender_type === "system"
                          ? "bg-muted/50 text-muted-foreground italic text-xs"
                          : "bg-secondary/80 text-secondary-foreground border border-border/40"
                      }`}
                    >
                      {msg.attachment_url && (
                        <button onClick={() => setPreviewImage(msg.attachment_url!)} className="block mb-1.5 cursor-zoom-in">
                          <img
                            src={msg.attachment_url}
                            alt="Вложение"
                            className="max-w-[240px] max-h-[180px] rounded-lg object-cover border border-border/30 hover:opacity-90 transition-opacity"
                            loading="lazy"
                          />
                        </button>
                      )}
                      {msg.content && !(msg.content === "📎 Изображение" && msg.attachment_url) && msg.content}
                    </div>
                  ))}
                  <span className="text-[10px] text-muted-foreground/70 mt-0.5 px-1 tabular-nums">
                    {formatChatTime(group.endedAt)}
                  </span>
                </div>
              );
            })
          )}
          {aiTyping && (
            <div className="flex flex-col items-start animate-fade-in">
              <span className="text-[10px] text-muted-foreground mb-1 px-1 font-medium">Ассистент</span>
              <div className="bg-secondary/80 border border-border/40 text-secondary-foreground rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-violet-500/60 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-violet-500/60 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-violet-500/60 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Pending file preview */}
        {pendingPreview && (
          <div className="px-3 sm:px-4 pb-2 pt-1 border-t border-border/40 bg-muted/20">
            <div className="relative inline-block animate-fade-in">
              <img src={pendingPreview} alt="Превью" className="h-20 w-20 rounded-xl object-cover border border-border/60 shadow-sm" />
              <button
                onClick={clearPendingFile}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:scale-110 transition-transform"
                aria-label="Убрать вложение"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border/60 p-3 sm:p-4 bg-card/95">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-violet-500 hover:bg-violet-500/10 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploading}
              aria-label="Прикрепить файл"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Напишите сообщение..."
              className="flex-1 min-w-0 bg-muted/50 border border-border/60 rounded-full px-4 py-2.5 text-sm outline-none focus:border-violet-500/60 focus:bg-card focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground/70 transition-all"
              disabled={loading || uploading}
              maxLength={2000}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white shadow-md shadow-violet-500/30 disabled:opacity-40 disabled:shadow-none transition-all"
              disabled={(!input.trim() && !pendingFile) || loading || uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground/80 mt-2 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Все сообщения зашифрованы и безопасны
          </p>
        </div>
      </div>

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-2 right-2 z-10 bg-white/20 hover:bg-white/30 rounded-lg w-7 h-7 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          {previewImage && (
            <img
              src={previewImage}
              alt="Просмотр"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
