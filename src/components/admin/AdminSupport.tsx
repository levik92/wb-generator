import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, MessageCircle, Bot, BotOff, User, Headphones, X, ChevronLeft, AlertTriangle, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { compressImage } from "@/lib/imageCompression";

interface Conversation {
  id: string;
  visitor_id: string | null;
  user_id: string | null;
  channel: string;
  status: string;
  ai_enabled: boolean;
  needs_admin_attention: boolean;
  created_at: string;
  updated_at: string;
  last_message: string;
  last_message_sender: string;
  last_message_at: string;
  user_email: string | null;
  message_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: "user" | "ai" | "admin" | "system";
  content: string;
  created_at: string;
  attachment_url?: string | null;
}

const ADMIN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-admin`;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const CONVS_PER_PAGE = 10;
const MSGS_PER_PAGE = 15;

export const AdminSupport = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [hasMoreConvs, setHasMoreConvs] = useState(false);
  const [loadingMoreConvs, setLoadingMoreConvs] = useState(false);
  const [hasMoreMsgs, setHasMoreMsgs] = useState(false);
  const [loadingMoreMsgs, setLoadingMoreMsgs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const convsContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldScrollRef = useRef(true);
  const isMobile = useIsMobile();

  const callApiRef = useRef<(body: any) => Promise<any>>();
  callApiRef.current = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    const res = await fetch(ADMIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const callApi = useCallback((body: any) => callApiRef.current!(body), []);

  const uploadFile = async (file: File): Promise<string | null> => {
    const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 1.0 });
    const ext = compressed.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `admin/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("support-attachments")
      .upload(path, compressed, { contentType: compressed.type });
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data } = supabase.storage.from("support-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const loadConversations = useCallback(async (append = false) => {
    try {
      const offset = append ? conversations.length : 0;
      const { conversations: convs, hasMore } = await callApi({
        action: "list_conversations",
        offset,
        limit: CONVS_PER_PAGE,
      });
      if (append) {
        setConversations(prev => [...prev, ...(convs || [])]);
      } else {
        setConversations(convs || []);
      }
      setHasMoreConvs(hasMore);
    } catch (e) {
      console.error("Load conversations error:", e);
    } finally {
      setLoading(false);
      setLoadingMoreConvs(false);
    }
  }, [callApi, conversations.length]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => loadConversations(false), 15000);
    return () => clearInterval(interval);
  }, [callApi]);

  const loadMoreConvs = () => {
    if (loadingMoreConvs || !hasMoreConvs) return;
    setLoadingMoreConvs(true);
    loadConversations(true);
  };

  const handleConvsScroll = useCallback(() => {
    const container = convsContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 80 && hasMoreConvs && !loadingMoreConvs) {
      loadMoreConvs();
    }
  }, [hasMoreConvs, loadingMoreConvs]);

  const loadMessages = useCallback(async (convId: string, beforeId?: string) => {
    const { messages: msgs, hasMore } = await callApi({
      action: "get_messages",
      conversation_id: convId,
      ...(beforeId ? { before_id: beforeId } : {}),
      limit: MSGS_PER_PAGE,
    });
    setHasMoreMsgs(hasMore);
    return msgs || [];
  }, [callApi]);

  const selectConversation = useCallback(async (conv: Conversation) => {
    setSelectedConv(conv);
    setMsgsLoading(true);
    shouldScrollRef.current = true;
    try {
      const msgs = await loadMessages(conv.id);
      setMessages(msgs);
    } catch (e) {
      console.error("Load messages error:", e);
    } finally {
      setMsgsLoading(false);
    }
  }, [loadMessages]);

  // Poll messages for selected conversation
  useEffect(() => {
    if (!selectedConv) return;
    const interval = setInterval(async () => {
      try {
        shouldScrollRef.current = true;
        const msgs = await loadMessages(selectedConv.id);
        setMessages(prev => {
          if (msgs.length !== prev.length || msgs[msgs.length - 1]?.id !== prev[prev.length - 1]?.id) {
            return msgs;
          }
          return prev;
        });
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedConv?.id, loadMessages]);

  useEffect(() => {
    if (!shouldScrollRef.current) return;
    const el = messagesEndRef.current;
    if (el?.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, [messages]);

  const loadOlderMessages = async () => {
    if (!selectedConv || loadingMoreMsgs || !hasMoreMsgs || messages.length === 0) return;
    setLoadingMoreMsgs(true);
    shouldScrollRef.current = false;
    try {
      const container = messagesContainerRef.current;
      const prevScrollHeight = container?.scrollHeight || 0;
      
      const oldestId = messages[0]?.id;
      const olderMsgs = await loadMessages(selectedConv.id, oldestId);
      if (olderMsgs.length > 0) {
        setMessages(prev => [...olderMsgs, ...prev]);
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          }
        });
      }
    } catch (e) {
      console.error("Load more error:", e);
    } finally {
      setLoadingMoreMsgs(false);
    }
  };

  const handleMsgsScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 60 && hasMoreMsgs && !loadingMoreMsgs) {
      loadOlderMessages();
    }
  }, [hasMoreMsgs, loadingMoreMsgs, messages]);

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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if ((!text && !pendingFile) || sending || !selectedConv) return;
    setInput("");
    setSending(true);
    shouldScrollRef.current = true;

    try {
      let attachmentUrl: string | null = null;
      if (pendingFile) {
        setUploading(true);
        attachmentUrl = await uploadFile(pendingFile);
        setUploading(false);
        clearPendingFile();
      }

      await callApi({
        action: "send_message",
        conversation_id: selectedConv.id,
        message: text || "📎 Изображение",
        attachment_url: attachmentUrl,
      });
      const msgs = await loadMessages(selectedConv.id);
      setMessages(msgs);
      setSelectedConv((prev) => prev ? { ...prev, ai_enabled: false, needs_admin_attention: false } : null);
      loadConversations(false);
    } catch (e) {
      console.error("Send error:", e);
    } finally {
      setSending(false);
      setUploading(false);
      inputRef.current?.focus();
    }
  }, [input, pendingFile, sending, selectedConv, callApi, loadMessages]);

  const handleToggleAI = async () => {
    if (!selectedConv) return;
    try {
      const { ai_enabled } = await callApi({
        action: "toggle_ai",
        conversation_id: selectedConv.id,
      });
      setSelectedConv((prev) => prev ? { ...prev, ai_enabled } : null);
      loadConversations(false);
    } catch (e) {
      console.error("Toggle AI error:", e);
    }
  };

  const handleCloseConv = async () => {
    if (!selectedConv) return;
    try {
      await callApi({
        action: "update_status",
        conversation_id: selectedConv.id,
        status: "closed",
      });
      setSelectedConv(null);
      setMessages([]);
      loadConversations(false);
    } catch (e) {
      console.error("Close error:", e);
    }
  };

  const closeConversationInline = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await callApi({
        action: "update_status",
        conversation_id: convId,
        status: "closed",
      });
      if (selectedConv?.id === convId) {
        setSelectedConv(null);
        setMessages([]);
      }
      loadConversations(false);
    } catch (err) {
      console.error("Close error:", err);
    }
  };

  const getStatusBadge = (conv: Conversation) => {
    if (conv.needs_admin_attention) {
      return (
        <span className="group/badge relative">
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 group-hover/badge:hidden">Требует внимания</Badge>
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 hidden group-hover/badge:inline-flex cursor-pointer hover:bg-destructive/20"
            onClick={(e) => closeConversationInline(conv.id, e)}>Закрыть</Badge>
        </span>
      );
    }
    switch (conv.status) {
      case "waiting_for_admin":
        return (
          <span className="group/badge relative">
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 group-hover/badge:hidden">Ожидает ответа</Badge>
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 hidden group-hover/badge:inline-flex cursor-pointer hover:bg-destructive/20"
              onClick={(e) => closeConversationInline(conv.id, e)}>Закрыть</Badge>
          </span>
        );
      case "closed":
        return <Badge variant="secondary" className="text-[10px] px-1.5">Закрыт</Badge>;
      default:
        return (
          <span className="group/badge relative">
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 group-hover/badge:hidden">Активен</Badge>
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 hidden group-hover/badge:inline-flex cursor-pointer hover:bg-destructive/20"
              onClick={(e) => closeConversationInline(conv.id, e)}>Закрыть</Badge>
          </span>
        );
    }
  };

  const getChannelLabel = (channel: string) => channel === "dashboard" ? "Дашборд" : "Виджет";

  const attentionCount = conversations.filter((c) => c.needs_admin_attention).length;

  const renderMessageBubble = (msg: Message) => (
    <div
      key={msg.id}
      className={`flex flex-col ${msg.sender_type === "admin" ? "items-end" : "items-start"}`}
    >
      <span className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
        {msg.sender_type === "user" && <User className="w-3 h-3" />}
        {msg.sender_type === "ai" && <Bot className="w-3 h-3" />}
        {msg.sender_type === "admin" && <Headphones className="w-3 h-3" />}
        {msg.sender_type === "system" && <AlertTriangle className="w-3 h-3" />}
        {msg.sender_type === "user" ? "Пользователь" : msg.sender_type === "ai" ? "AI" : msg.sender_type === "admin" ? "Вы" : "Система"}
      </span>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          msg.sender_type === "admin"
            ? "bg-primary text-primary-foreground rounded-br-md"
            : msg.sender_type === "user"
            ? "bg-secondary text-secondary-foreground rounded-bl-md"
            : msg.sender_type === "system"
            ? "bg-muted/50 text-muted-foreground italic rounded-bl-md text-xs"
            : "bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-bl-md border border-blue-500/20"
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
      <span className="text-[10px] text-muted-foreground mt-0.5">
        {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );

  const conversationListContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            Поддержка
          </h3>
          {attentionCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-xs">
              {attentionCount}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Управление обращениями пользователей</p>
      </div>
      <div ref={convsContainerRef} className="flex-1 overflow-y-auto" onScroll={handleConvsScroll}>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Обращений пока нет</p>
          </div>
        ) : (
          <>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors ${
                  selectedConv?.id === conv.id ? "bg-primary/5" : ""
                } ${conv.needs_admin_attention ? "bg-destructive/5" : ""}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate max-w-[160px]">
                      {conv.user_email || conv.visitor_id?.slice(0, 8) || "Аноним"}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {getChannelLabel(conv.channel)}
                    </Badge>
                  </div>
                  {getStatusBadge(conv)}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {conv.last_message || "Нет сообщений"}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">{conv.message_count} сообщ.</span>
                  <span className="text-[10px] text-muted-foreground">
                    {conv.last_message_at
                      ? new Date(conv.last_message_at).toLocaleString("ru-RU", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
              </button>
            ))}
            {loadingMoreConvs && (
              <div className="flex justify-center p-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const chatViewContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(isMobile || !selectedConv) && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"
              onClick={() => { setSelectedConv(null); setMessages([]); }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <p className="text-sm font-medium">
              {selectedConv?.user_email || selectedConv?.visitor_id?.slice(0, 8) || "Аноним"}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {selectedConv && getChannelLabel(selectedConv.channel)}
              </span>
              {selectedConv?.ai_enabled && (
                <span className="text-[10px] text-primary flex items-center gap-0.5">
                  <Bot className="w-3 h-3" /> AI активен
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 text-xs rounded-lg" onClick={handleToggleAI}
            title={selectedConv?.ai_enabled ? "Выключить AI" : "Включить AI"}>
            {selectedConv?.ai_enabled ? <BotOff className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs rounded-lg text-destructive hover:text-destructive" onClick={handleCloseConv}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3" onScroll={handleMsgsScroll}>
        {/* Load more indicator */}
        {hasMoreMsgs && (
          <div className="flex justify-center py-2">
            {loadingMoreMsgs ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <button onClick={loadOlderMessages} className="text-xs text-primary hover:underline">
                Загрузить ранние сообщения
              </button>
            )}
          </div>
        )}
        {msgsLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map(renderMessageBubble)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending file preview */}
      {pendingPreview && (
        <div className="px-3 pb-2">
          <div className="relative inline-block">
            <img src={pendingPreview} alt="Превью" className="h-16 w-16 rounded-lg object-cover border border-border" />
            <button onClick={clearPendingFile}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {selectedConv?.status !== "closed" && (
        <div className="border-t border-border p-3">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileSelect} />
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-40 hover:opacity-100 transition-all"
              onClick={() => fileInputRef.current?.click()} disabled={sending || uploading}>
              <Paperclip className="w-4 h-4" />
            </Button>
            <input
              ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Ответить пользователю..."
              className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
              disabled={sending || uploading} maxLength={2000}
            />
            <Button type="submit" size="icon" className="h-9 w-9 rounded-xl shrink-0"
              disabled={(!input.trim() && !pendingFile) || sending || uploading}>
              {sending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="border border-border rounded-2xl bg-card overflow-hidden h-[calc(100vh-200px)] min-h-[400px]">
          {selectedConv ? chatViewContent : conversationListContent}
        </div>
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
            <button onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 z-10 bg-white/20 hover:bg-white/30 rounded-lg w-7 h-7 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
            {previewImage && <img src={previewImage} alt="Просмотр" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="border border-border rounded-2xl bg-card overflow-hidden flex h-[calc(100vh-200px)] min-h-[500px]">
        <div className="w-80 border-r border-border flex-shrink-0">{conversationListContent}</div>
        <div className="flex-1 flex flex-col">
          {selectedConv ? chatViewContent : (
            <div className="flex-1 flex items-center justify-center text-center px-8">
              <div>
                <MessageCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Выберите диалог для просмотра</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
          <button onClick={() => setPreviewImage(null)}
            className="absolute top-2 right-2 z-10 bg-white/20 hover:bg-white/30 rounded-lg w-7 h-7 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          {previewImage && <img src={previewImage} alt="Просмотр" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>
    </>
  );
};
