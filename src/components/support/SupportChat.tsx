import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Headphones, MessageCircle, ShieldCheck, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";

interface Message {
  id: string;
  sender_type: "user" | "ai" | "admin" | "system";
  content: string;
  created_at: string;
  attachment_url?: string | null;
}

interface SupportChatProps {
  profile: { id: string; email: string; full_name: string | null };
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadFile = async (file: File): Promise<string | null> => {
    // Compress image before upload
    const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
    const ext = compressed.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/${Date.now()}.${ext}`;
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

      let attachmentUrl: string | null = null;
      if (pendingFile) {
        setUploading(true);
        attachmentUrl = await uploadFile(pendingFile);
        setUploading(false);
        clearPendingFile();
      }

      // Optimistic update
      setMessages((prev) => [
        ...prev,
        {
          id: "temp-" + Date.now(),
          sender_type: "user",
          content: text || (attachmentUrl ? "📎 Изображение" : ""),
          created_at: new Date().toISOString(),
          attachment_url: attachmentUrl,
        },
      ]);

      await callApi({
        action: "send_message",
        conversation_id: convId,
        message: text || "📎 Изображение",
        attachment_url: attachmentUrl,
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

        {/* Pending file preview */}
        {pendingPreview && (
          <div className="px-4 pb-2">
            <div className="relative inline-block">
              <img src={pendingPreview} alt="Превью" className="h-20 rounded-lg object-cover border border-border" />
              <button
                onClick={clearPendingFile}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

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
              className="h-10 w-10 rounded-xl shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/5 opacity-60 hover:opacity-100 transition-opacity"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploading}
            >
              <Paperclip className="w-4.5 h-4.5" />
            </Button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Напишите сообщение..."
              className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
              disabled={loading || uploading}
              maxLength={2000}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0"
              disabled={(!input.trim() && !pendingFile) || loading || uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
