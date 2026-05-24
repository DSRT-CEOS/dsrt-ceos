"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageSquare, X, Send, Bot, Sparkles, Minimize2, Maximize2, Mic, Trash2, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  toolResults?: any[];
  navigate?: string | null;
  timestamp?: number;
}

const WELCOME = `নমস্কার! আমি **CEOS** — আপনার Construction OS AI।

আমি system-এর full control নিতে পারি:
- 📊 **Live data** দেখানো
- 🧭 যেকোনো page-এ **navigate**
- 💰 GST, TDS, ESI, EPF **calculate**
- 📋 Tender eligibility **analyze**

বাংলা · हिंदी · English — যেকোনো ভাষায় লিখুন।`;

const QUICK_PROMPTS = [
  "Show urgent tenders",
  "Eligible tenders কী আছে?",
  "Pending bills দেখাও",
  "Compliance summary",
];

const STORAGE_KEY = "ceos_chat_history";

export default function CEOSChat() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [max, setMax] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) { setMsgs(parsed); return; }
      }
    } catch {}
    setMsgs([{ id: "welcome", role: "assistant", content: WELCOME, timestamp: Date.now() }]);
  }, []);

  useEffect(() => {
    if (msgs.length > 0 && !msgs.some(m => m.loading)) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-30))); } catch {}
    }
  }, [msgs]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const send = useCallback(async (overrideMsg?: string) => {
    const msg = (overrideMsg || input).trim();
    if (!msg || busy) return;

    const userMsg: Msg = { id: Date.now().toString(), role: "user", content: msg, timestamp: Date.now() };
    const loadingMsg: Msg = { id: Date.now() + "l", role: "assistant", content: "", loading: true, timestamp: Date.now() };

    setMsgs(p => [...p, userMsg, loadingMsg]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: msgs.slice(-8).filter(m => !m.loading).map(m => ({ role: m.role, content: m.content })),
          currentPath: pathname,
        }),
      });

      const data = await res.json();

      setMsgs(p => p.map(m => m.loading ? {
        ...m,
        content: data.success
          ? (data.response || "Done.")
          : data.isRateLimit
            ? `⚠️ **AI Quota Reached**\n\n${data.error}\n\nFree tier resets every 24 hours. System still fully functional — only AI chat is paused.`
            : `Error: ${data.error || "Failed"}`,
        loading: false,
        toolResults: data.toolResults,
        navigate: data.navigate,
      } : m));

      if (data.success && data.navigate) {
        setTimeout(() => {
          router.push(data.navigate);
          toast.success(`Navigating to ${data.navigate}`);
        }, 1000);
      }
    } catch {
      setMsgs(p => p.map(m => m.loading ? { ...m, content: "Connection error. Please try again.", loading: false } : m));
    } finally { setBusy(false); }
  }, [input, busy, msgs, pathname, router]);

  const startVoice = () => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice not supported"); return; }
    const recognition = new SR();
    recognition.lang = "bn-IN";
    recognition.interimResults = false;
    setListening(true);
    recognition.start();
    recognition.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
    recognition.onerror = () => { toast.error("Voice error"); setListening(false); };
    recognition.onend = () => setListening(false);
  };

  const clearHistory = () => {
    if (!confirm("Clear chat history?")) return;
    setMsgs([{ id: "welcome", role: "assistant", content: WELCOME, timestamp: Date.now() }]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-primary to-blue-700 rounded-full flex items-center justify-center shadow-xl shadow-primary/30 z-50 hover:scale-110 transition-all">
      <MessageSquare className="w-6 h-6 text-white" />
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-background animate-pulse" />
    </button>
  );

  return (
    <div className={cn(
      "fixed z-50 bg-card border border-border rounded-lg shadow-2xl flex flex-col transition-all duration-300",
      max ? "inset-4" : "bottom-6 right-6 w-[420px] h-[640px] max-h-[calc(100vh-3rem)]"
    )}>
      <div className="flex items-center justify-between p-3 border-b border-border rounded-t-lg bg-gradient-to-r from-card to-secondary/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-700 rounded-md flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-foreground text-sm font-bold">CEOS</span>
              <span className="px-1.5 py-0.5 bg-primary/15 border border-primary/30 rounded text-primary text-[10px] font-bold">AI</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              <span className="text-success text-xs">Active</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={clearHistory} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMax(!max)} className="h-7 w-7 p-0">
            {max ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-7 w-7 p-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {msgs.map(m => (
          <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 bg-primary/15 border border-primary/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className={cn(
              "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm shadow-md"
                : "bg-secondary text-foreground rounded-bl-sm border border-border"
            )}>
              {m.loading ? (
                <div className="flex gap-1 py-1">
                  {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              ) : (
                <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1 [&_strong]:text-primary [&_strong]:font-semibold">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              )}

              {m.toolResults && m.toolResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {m.toolResults.map((r: any, i: number) => (
                    <ToolResultDisplay key={i} result={r} />
                  ))}
                </div>
              )}

              {m.navigate && (
                <Link href={m.navigate}>
                  <button className="mt-2 text-xs flex items-center gap-1 px-2 py-1 bg-primary/15 border border-primary/30 rounded text-primary hover:bg-primary/25">
                    <ExternalLink className="w-3 h-3" />Open page
                  </button>
                </Link>
              )}

              {m.timestamp && !m.loading && (
                <div className={cn("text-[10px] mt-1.5", m.role === "user" ? "text-white/60" : "text-muted-foreground")}>
                  {new Date(m.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {msgs.length <= 1 && (
        <div className="px-3 pb-2">
          <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-2">Try asking:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_PROMPTS.map((q, i) => (
              <button key={i} onClick={() => send(q)} disabled={busy}
                className="text-left p-2 bg-secondary/50 border border-border rounded-md hover:bg-secondary hover:border-primary/30 transition-all">
                <span className="text-foreground text-xs truncate">{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-border">
        <div className="flex gap-2 bg-secondary rounded-md p-2 border border-border focus-within:border-primary/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="বাংলায় লিখুন বা type..."
            rows={1}
            className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground resize-none outline-none max-h-32 leading-relaxed py-1.5"
            disabled={busy}
          />
          <div className="flex flex-col gap-1 justify-end">
            <Button onClick={startVoice} disabled={busy || listening} size="sm" variant="ghost"
              className={cn("h-8 w-8 p-0", listening && "bg-destructive text-white animate-pulse")}>
              <Mic className="w-3.5 h-3.5" />
            </Button>
            <Button onClick={() => send()} disabled={!input.trim() || busy} size="sm"
              className="h-8 w-8 p-0">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolResultDisplay({ result }: { result: any }) {
  if (!result.success || !result.data) {
    if (result.navigate) {
      return (
        <div className="p-2 bg-primary/10 border border-primary/30 rounded-md flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5 text-primary" />
          <p className="text-primary text-xs">Navigating to <code>{result.navigate}</code></p>
        </div>
      );
    }
    return null;
  }

  const data = result.data;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="p-2 bg-background/50 border border-border rounded-md">
          <p className="text-muted-foreground text-xs">No items found</p>
        </div>
      );
    }
    return (
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {data.slice(0, 5).map((item: any, i: number) => (
          <Link key={i} href={item.url || "#"}>
            <div className="p-2 bg-background/50 border border-border rounded-md hover:border-primary/30 cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-xs font-semibold truncate">
                    {item.workName || item.name || item.billNumber || "Item"}
                  </p>
                  {item.department && <p className="text-muted-foreground text-[10px] truncate">{item.department}</p>}
                  {item.project && <p className="text-muted-foreground text-[10px] truncate">Project: {item.project}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {item.estimatedCost && <p className="text-success text-xs font-semibold">{formatCurrency(item.estimatedCost)}</p>}
                  {item.netPayable && <p className="text-primary text-xs font-semibold">{formatCurrency(item.netPayable)}</p>}
                  {item.contractValue && <p className="text-primary text-xs font-semibold">{formatCurrency(item.contractValue)}</p>}
                  {item.matchScore !== undefined && <p className="text-primary text-[10px]">{item.matchScore}% match</p>}
                  {item.daysLeft !== undefined && (
                    <p className={cn("text-[10px] font-semibold", item.daysLeft <= 3 ? "text-destructive" : "text-success")}>
                      {item.daysLeft}d left
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
        {data.length > 5 && <p className="text-muted-foreground text-[10px] text-center">+{data.length - 5} more</p>}
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data).filter(([k]) => k !== "url" && k !== "period");
    return (
      <div className="p-2 bg-background/50 border border-border rounded-md space-y-1">
        {data.period && <p className="text-primary text-[10px] uppercase font-semibold">{data.period}</p>}
        {entries.slice(0, 6).map(([k, v]: any) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{k.replace(/([A-Z])/g, " $1").trim()}:</span>
            <span className="text-foreground font-semibold">{typeof v === "number" ? formatCurrency(v) : String(v)}</span>
          </div>
        ))}
        {data.url && (
          <Link href={data.url}>
            <button className="w-full mt-1 text-[10px] py-1 bg-primary/15 border border-primary/30 rounded text-primary hover:bg-primary/25">
              Open full view
            </button>
          </Link>
        )}
      </div>
    );
  }

  return null;
}