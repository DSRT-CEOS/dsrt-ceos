"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Minimize2, Maximize2, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

const WELCOME = `নমস্কার! আমি CEOS — আপনার Construction Assistant।

আমি সাহায্য করতে পারি:
• টেন্ডার বিশ্লেষণ
• ডকুমেন্ট তৈরি
• RA Bill হিসাব
• ESI/EPF/GST হিসাব
• Rate analysis

বাংলায়, হিন্দিতে বা English-এ প্রশ্ন করুন।`;

export default function CEOSChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    const loadingMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "", isLoading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => prev.map((m) => m.isLoading ? { ...m, content: data.response || "Error", isLoading: false } : m));
    } catch {
      setMessages((prev) => prev.map((m) => m.isLoading ? { ...m, content: "Connection error", isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/30 transition-all z-50 hover:scale-110">
        <MessageSquare className="w-6 h-6 text-white" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-950 animate-pulse" />
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col transition-all duration-300",
      isMaximized ? "inset-4" : "bottom-6 right-6 w-96 h-[600px]"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/80 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-white text-sm font-semibold">CEOS Assistant</h3>
              <Sparkles className="w-3 h-3 text-orange-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs">Online</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setIsMaximized(!isMaximized)} className="h-7 w-7 p-0">
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-7 w-7 p-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 bg-orange-500/20 border border-orange-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                <Bot className="w-3.5 h-3.5 text-orange-400" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
              msg.role === "user" ? "bg-orange-500 text-white rounded-br-sm" : "bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/50"
            )}>
              {msg.isLoading ? (
                <div className="flex gap-1 py-1">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-end gap-2 bg-slate-800 rounded-xl p-2.5 border border-slate-700">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="বাংলায় লিখুন বা Type..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 resize-none outline-none min-h-[20px] max-h-24"
            rows={1}
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="sm" className="h-7 w-7 p-0 rounded-lg">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}