"use client";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, Sparkles, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Msg { id: string; role: "user" | "assistant"; content: string; loading?: boolean; }

const WELCOME = `নমস্কার! আমি CEOS — আপনার Construction AI Assistant।

সাহায্য করতে পারি:
• টেন্ডার বিশ্লেষণ ও eligibility check
• Document তৈরি (covering letter, affidavit)
• RA Bill ও সব deduction হিসাব
• ESI, EPF, GST calculation
• Rate analysis ও BOQ

বাংলায়, হিন্দিতে বা English-এ লিখুন।`;

export default function CEOSChat() {
  const [open, setOpen] = useState(false);
  const [max, setMax] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: "w", role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || busy) return;
    setMsgs(p => [...p, { id: Date.now().toString(), role: "user", content: msg }, { id: Date.now() + "l", role: "assistant", content: "", loading: true }]);
    setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: msgs.slice(-10).map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMsgs(p => p.map(m => m.loading ? { ...m, content: data.response || "Error", loading: false } : m));
    } catch {
      setMsgs(p => p.map(m => m.loading ? { ...m, content: "Connection error. Try again.", loading: false } : m));
    } finally { setBusy(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/30 z-50 hover:scale-110 transition-all">
      <MessageSquare className="w-6 h-6 text-white" />
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-950 animate-pulse" />
    </button>
  );

  return (
    <div className={cn("fixed z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col transition-all duration-300", max ? "inset-4" : "bottom-6 right-6 w-96 h-[580px]")}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-white text-sm font-semibold">CEOS</span>
              <Sparkles className="w-3 h-3 text-orange-400" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs">Online</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setMax(!max)} className="h-7 w-7 p-0">
            {max ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-7 w-7 p-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map(m => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                <Bot className="w-3.5 h-3.5 text-orange-400" />
              </div>
            )}
            <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed",
              m.role === "user" ? "bg-orange-500 text-white rounded-br-sm" : "bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/50"
            )}>
              {m.loading ? (
                <div className="flex gap-1 py-1">
                  {[0, 150, 300].map(d => <div key={d} className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              ) : m.content}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-4 border-t border-slate-800">
        <div className="flex gap-2 bg-slate-800 rounded-xl p-2.5 border border-slate-700 focus-within:border-orange-500/50 transition-colors">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="বাংলায় লিখুন বা type in English..." rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 resize-none outline-none max-h-24"
            disabled={busy} />
          <Button onClick={send} disabled={!input.trim() || busy} size="sm" className="h-8 w-8 p-0 rounded-lg flex-shrink-0">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}