import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, User, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  sender_type: "user" | "ai" | "admin" | "system";
  content: string;
  created_at: string;
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full shadow-lg shadow-purple-500/40 bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 hover:from-violet-400 hover:via-purple-500 hover:to-indigo-600 text-white border-0"
            >
              <MessageCircle className="w-7 h-7" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-2rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Поддержка WBGen</p>
                  <p className="text-xs opacity-80">Обычно отвечаем быстро</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-white/20 text-primary-foreground"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {initialLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Привет! 👋</p>
                  <p className="text-xs text-muted-foreground">
                    Задайте вопрос, и наш ассистент поможет вам разобраться с сервисом.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender_type === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {getSenderIcon(msg.sender_type)}
                        {getSenderName(msg.sender_type)}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        msg.sender_type === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : msg.sender_type === "system"
                          ? "bg-muted/50 text-muted-foreground italic rounded-bl-md text-xs"
                          : "bg-secondary text-secondary-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex items-start gap-2">
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-3 py-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите сообщение..."
                  className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  disabled={loading}
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 rounded-xl shrink-0"
                  disabled={!input.trim() || loading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
