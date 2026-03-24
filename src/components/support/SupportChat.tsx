import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Headphones, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  sender_type: "user" | "ai" | "admin" | "system";
  content: string;
  created_at: string;
}

interface SupportChatProps {
  profile: { id: string; email: string; full_name: string | null };
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

export const SupportChat = ({ profile }: SupportChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
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
          const { messages: msgs } = await callApi({
            action: "get_messages",
            conversation_id: conversation.id,
          });
          setMessages(msgs || []);
        }
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, [profile.id]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

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

      // Optimistic update
      setMessages((prev) => [
        ...prev,
        {
          id: "temp-" + Date.now(),
          sender_type: "user",
          content: text,
          created_at: new Date().toISOString(),
        },
      ]);

      await callApi({
        action: "send_message",
        conversation_id: convId,
        message: text,
      });

      // Refresh messages
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

  // Poll for new messages
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const { messages: msgs } = await callApi({
          action: "get_messages",
          conversation_id: conversationId,
        });
        setMessages(msgs || []);
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const getSenderName = (type: string) => {
    switch (type) {
      case "admin": return "Менеджер";
      case "system": return "Система";
      default: return "Вы";
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-1">
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Headphones className="w-5 h-5 text-primary" />
          Поддержка
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Напишите нам, и менеджер ответит вам в ближайшее время
        </p>
      </div>

      <div className="border border-border rounded-2xl bg-card overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[400px] max-h-[600px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-primary" />
              </div>
              <p className="text-base font-medium text-foreground mb-2">Напишите нам</p>
              <p className="text-sm text-muted-foreground">
                Опишите вашу проблему или задайте вопрос. Менеджер ответит в ближайшее время.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender_type === "user" ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] text-muted-foreground mb-1">
                  {getSenderName(msg.sender_type)}
                </span>
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
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
                  {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
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
              className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
              disabled={loading}
              maxLength={2000}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0"
              disabled={!input.trim() || loading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Все сообщения зашифрованы и безопасны
          </p>
        </div>
      </div>
    </div>
  );
};
