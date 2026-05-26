import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, Headphones, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildChatTimeline, bubbleRoundingClasses, type ChatMessage } from "@/lib/groupMessages";
import { formatChatDateSeparator, formatChatTime } from "@/lib/formatChatDate";

interface Message extends ChatMessage {
  sender_type: "user" | "ai" | "admin" | "system";
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const getVisitorId = () => {
  let id = localStorage.getItem("support_visitor_id");
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem("support_visitor_id", id);
  }
  return id;
};

export const SupportWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visitorId = getVisitorId();

  const scrollToBottom = useCallback(() => {
    const el = messagesEndRef.current;
    if (el?.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Open widget when other components dispatch the support event
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("open-support-widget", handler);
    return () => window.removeEventListener("open-support-widget", handler);
  }, []);

  const callApi = async (body: any) => {
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  // Load existing conversation when widget opens
  useEffect(() => {
    if (!isOpen) return;
    const loadConversation = async () => {
      setInitialLoading(true);
      try {
        const { conversation } = await callApi({
          action: "get_conversation",
          visitor_id: visitorId,
        });
        if (conversation) {
          setConversationId(conversation.id);
          const { messages: msgs } = await callApi({
            action: "get_messages",
            conversation_id: conversation.id,
          });
          setMessages(msgs || []);
        }
      } catch (e) {
        console.error("Failed to load conversation:", e);
      } finally {
        setInitialLoading(false);
      }
    };
    loadConversation();
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    try {
      let convId = conversationId;

      // Create conversation if needed
      if (!convId) {
        const { conversation } = await callApi({
          action: "create_conversation",
          visitor_id: visitorId,
          channel: "widget",
        });
        convId = conversation.id;
        setConversationId(convId);
      }

      // Optimistic update
      const tempMsg: Message = {
        id: "temp-" + Date.now(),
        sender_type: "user",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMsg]);

      // Send message
      const { ai_response } = await callApi({
        action: "send_message",
        conversation_id: convId,
        message: text,
      });

      // Refresh messages to get accurate state
      const { messages: allMsgs } = await callApi({
        action: "get_messages",
        conversation_id: convId,
      });
      setMessages(allMsgs || []);
    } catch (e) {
      console.error("Send error:", e);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Poll for new messages every 10s when open
  useEffect(() => {
    if (!isOpen || !conversationId) return;
    const interval = setInterval(async () => {
      try {
        const { messages: msgs } = await callApi({
          action: "get_messages",
          conversation_id: conversationId,
        });
        setMessages(msgs || []);
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen, conversationId]);

  const getSenderIcon = (type: string) => {
    switch (type) {
      case "ai": return <Bot className="w-3.5 h-3.5" />;
      case "admin": return <Headphones className="w-3.5 h-3.5" />;
      case "system": return <Headphones className="w-3.5 h-3.5" />;
      default: return <User className="w-3.5 h-3.5" />;
    }
  };

  const getSenderName = (type: string) => {
    switch (type) {
      case "ai": return "Ассистент";
      case "admin": return "Менеджер";
      case "system": return "Система";
      default: return "Вы";
    }
  };

  const timeline = useMemo(() => buildChatTimeline(messages), [messages]);

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 animate-[scaleIn_0.3s_ease-out]">
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Открыть поддержку"
            className="group relative w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-purple-700 text-white shadow-[0_10px_30px_-8px_hsl(263_70%_55%/0.65)] hover:shadow-[0_14px_34px_-8px_hsl(263_70%_55%/0.8)] hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400/40 to-purple-500/40 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="absolute -inset-1 rounded-full ring-2 ring-violet-400/40 animate-ping pointer-events-none" />
            <MessageCircle className="w-6 h-6 mx-auto relative" strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden bg-card border border-border/60 shadow-2xl animate-[chatPanelIn_0.25s_ease-out]
            bottom-0 right-0 left-0 w-full h-[100dvh] rounded-none
            sm:bottom-5 sm:right-5 sm:left-auto sm:w-[380px] sm:h-[600px] sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-2xl"
        >
          {/* Header */}
          <div className="relative px-4 py-3 bg-gradient-to-br from-violet-500 via-purple-600 to-purple-700 text-white overflow-hidden shrink-0">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-10 w-28 h-28 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm ring-2 ring-white/30 flex items-center justify-center">
                    <Headphones className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white/80 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">Поддержка WBGen</p>
                  <p className="text-[11px] text-white/80 leading-tight mt-0.5">Обычно отвечаем быстро</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-white/20 text-white shrink-0"
                onClick={() => setIsOpen(false)}
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gradient-to-b from-muted/20 via-card to-card">
            {initialLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 rotate-6" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                    <MessageCircle className="w-7 h-7 text-violet-500" strokeWidth={2} />
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1.5">Привет! 👋</p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px]">
                  Задайте вопрос — наш ассистент или менеджер поможет вам разобраться.
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
                    <span className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1 px-1">
                      {getSenderIcon(group.sender_type)}
                      {getSenderName(group.sender_type)}
                    </span>
                    {group.items.map(({ msg, position }) => (
                      <div
                        key={msg.id}
                        className={`max-w-[85%] px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                          bubbleRoundingClasses(isOwn ? "own" : "other", position)
                        } ${
                          msg.sender_type === "user"
                            ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/20"
                            : msg.sender_type === "system"
                            ? "bg-muted/50 text-muted-foreground italic text-xs"
                            : "bg-secondary/80 text-secondary-foreground border border-border/40"
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))}
                    <span className="text-[10px] text-muted-foreground/70 mt-0.5 px-1 tabular-nums">
                      {formatChatTime(group.endedAt)}
                    </span>
                  </div>
                );
              })
            )}
            {loading && (
              <div className="flex items-start gap-2 animate-fade-in">
                <div className="bg-secondary/80 border border-border/40 rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-violet-500/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-violet-500/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-violet-500/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/60 p-3 bg-card/95 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите сообщение..."
                  className="w-full bg-muted/50 border border-border/60 rounded-full pl-4 pr-3 py-2.5 text-sm outline-none focus:border-violet-500/60 focus:bg-card focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground/70 transition-all"
                  disabled={loading}
                  maxLength={1000}
                />
              </div>
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 rounded-full shrink-0 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white shadow-md shadow-violet-500/30 disabled:opacity-40 disabled:shadow-none transition-all"
                disabled={!input.trim() || loading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground/80 mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Сообщения зашифрованы
            </p>
          </div>
        </div>
      )}
    </>
  );
};
