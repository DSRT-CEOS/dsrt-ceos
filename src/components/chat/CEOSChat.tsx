"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageSquare, X, Send, Bot, Sparkles, Minimize2, Maximize2, Mic, Trash2, ExternalLink, FileText, Building2, Receipt, FolderOpen, AlertCircle } from "lucide-react";
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

const WELCOME = `Ã Â¦Â¨Ã Â¦Â®Ã Â¦Â¸Ã Â§ÂÃ Â¦â€¢Ã Â¦Â¾Ã Â¦Â°! Ã Â¦â€ Ã Â¦Â®Ã Â¦Â¿ **CEOS** Ã¢â‚¬â€ Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Construction Operating System AIÃ Â¥Â¤

Ã Â¦â€ Ã Â¦Â®Ã Â¦Â¿ Ã Â¦Â¶Ã Â§ÂÃ Â¦Â§Ã Â§Â Ã Â¦Å¡Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Å¸Ã Â¦Â¬Ã Â¦Å¸ Ã Â¦Â¨Ã Â¦â€¡ Ã¢â‚¬â€ Ã Â¦â€ Ã Â¦Â®Ã Â¦Â¿ Ã Â¦ÂªÃ Â§ÂÃ Â¦Â°Ã Â§â€¹ system control Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â°Ã Â¦Â¿:
- Ã°Å¸â€œÅ  **Live data** Ã Â¦Â¦Ã Â§â€¡Ã Â¦â€“Ã Â¦Â¾Ã Â¦Â¤Ã Â§â€¡ Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â°Ã Â¦Â¿ (tenders, bills, projects)
- Ã°Å¸Â§Â­ **Navigate** Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â°Ã Â¦Â¿ Ã Â¦Â¯Ã Â§â€¡Ã Â¦â€¢Ã Â§â€¹Ã Â¦Â¨Ã Â§â€¹ page-Ã Â¦Â
- Ã°Å¸â€™Â° **Calculate** Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â°Ã Â¦Â¿ GST, TDS, ESI, EPF
- Ã°Å¸â€œâ€¹ **Analyze** Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¤Ã Â§â€¡ Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â°Ã Â¦Â¿ tender eligibility
- Ã°Å¸â€¡Â§Ã°Å¸â€¡Â© **Ã Â¦Â¬Ã Â¦Â¾Ã Â¦â€šÃ Â¦Â²Ã Â¦Â¾**, Ã°Å¸â€¡Â®Ã°Å¸â€¡Â³ **Ã Â¤Â¹Ã Â¤Â¿Ã Â¤â€šÃ Â¤Â¦Ã Â¥â‚¬**, Ã°Å¸â€¡Â¬Ã°Å¸â€¡Â§ **English** Ã¢â‚¬â€ Ã Â¦Â¸Ã Â¦Â¬ Ã Â¦Â­Ã Â¦Â¾Ã Â¦Â·Ã Â¦Â¾Ã Â¦Â¯Ã Â¦Â¼

Ã Â¦â€¢Ã Â§â‚¬ Ã Â¦Å“Ã Â¦Â¾Ã Â¦Â¨Ã Â¦Â¤Ã Â§â€¡ Ã Â¦Å¡Ã Â¦Â¾Ã Â¦Â¨?`;

const QUICK_PROMPTS = [
  { icon: AlertCircle, text: "Show urgent tenders", color: "red" },
  { icon: FileText, text: "Eligible tenders Ã Â¦Â¦Ã Â§â€¡Ã Â¦â€“Ã Â¦Â¾Ã Â¦â€œ", color: "green" },
  { icon: Receipt, text: "Pending bills", color: "orange" },
  { icon: Building2, text: "Compliance summary", color: "blue" },
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

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMsgs(parsed);
          return;
        }
      }
    } catch {}
    setMsgs([{ id: "welcome", role: "assistant", content: WELCOME, timestamp: Date.now() }]);
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (msgs.length > 0 && !msgs.some(m => m.loading)) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-30)));
      } catch {}
    }
  }, [msgs]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // Auto-resize textarea
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
            ? `â° **AI Quota Reached**\n\n${data.error}\n\nFree tier limits reset every 24 hours. The system is still fully functional â€” only AI chat is temporarily limited.`
            : `Error: ${data.error || "Failed"}`,
        loading: false,
        toolResults: data.toolResults,
        navigate: data.navigate,
      } : m));

      // Auto-navigate if AI requested it
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

  // Voice input via browser native
  const startVoice = () => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice not supported in this browser"); return; }

    const recognition = new SR();
    recognition.lang = "bn-IN"; // Bengali; fallback to en
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    recognition.start();

    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setListening(false);
    };
    recognition.onerror = () => { toast.error("Voice error"); setListening(false); };
    recognition.onend = () => setListening(false);
  };

  const clearHistory = () => {
    if (!confirm("Clear chat history?")) return;
    setMsgs([{ id: "welcome", role: "assistant", content: WELCOME, timestamp: Date.now() }]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    toast.success("History cleared");
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/30 z-50 hover:scale-110 transition-all">
      <MessageSquare className="w-6 h-6 text-white" />
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-950 animate-pulse" />
    </button>
  );

  return (
    <div className={cn(
      "fixed z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col transition-all duration-300",
      max ? "inset-4" : "bottom-6 right-6 w-[420px] h-[640px] max-h-[calc(100vh-3rem)]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 rounded-t-2xl bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white text-sm font-bold">CEOS</span>
              <span className="px-1.5 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded text-orange-300 text-[10px] font-bold">AI</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs">Active Ã‚Â· Can control system</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={clearHistory} className="h-7 w-7 p-0 text-slate-500 hover:text-red-400" title="Clear history">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {msgs.map(m => (
          <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 bg-orange-500/20 border border-orange-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-orange-400" />
              </div>
            )}
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              m.role === "user"
                ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-sm shadow-md"
                : "bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700/50"
            )}>
              {m.loading ? (
                <div className="flex gap-1 py-1">
                  {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              ) : (
                <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1 [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&_strong]:text-orange-300 [&_strong]:font-semibold [&_code]:text-orange-300 [&_code]:bg-slate-900 [&_code]:px-1 [&_code]:rounded">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              )}

              {/* Tool results - render as interactive cards */}
              {m.toolResults && m.toolResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {m.toolResults.map((r: any, i: number) => (
                    <ToolResultDisplay key={i} result={r} />
                  ))}
                </div>
              )}

              {m.navigate && (
                <Link href={m.navigate}>
                  <button className="mt-2 text-xs flex items-center gap-1 px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-300 hover:bg-orange-500/30 transition-all">
                    <ExternalLink className="w-3 h-3" />Open page
                  </button>
                </Link>
              )}

              {m.timestamp && !m.loading && (
                <p className={cn("text-[10px] mt-1.5", m.role === "user" ? "text-orange-100/60" : "text-slate-500")}>
                  {new Date(m.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Quick prompts - only show if welcome message */}
      {msgs.length <= 1 && (
        <div className="px-3 pb-2">
          <p className="text-slate-500 text-[10px] uppercase mb-2">Try asking:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_PROMPTS.map((q, i) => (
              <button key={i} onClick={() => send(q.text)} disabled={busy}
                className="text-left flex items-center gap-2 p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-800 hover:border-orange-500/30 transition-all">
                <q.icon className={cn("w-3.5 h-3.5 flex-shrink-0",
                  q.color === "red" ? "text-red-400" :
                  q.color === "green" ? "text-green-400" :
                  q.color === "orange" ? "text-orange-400" : "text-blue-400")} />
                <span className="text-slate-300 text-xs truncate">{q.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex gap-2 bg-slate-800 rounded-xl p-2 border border-slate-700 focus-within:border-orange-500/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ã Â¦Â¬Ã Â¦Â¾Ã Â¦â€šÃ Â¦Â²Ã Â¦Â¾Ã Â¦Â¯Ã Â¦Â¼ Ã Â¦Â²Ã Â¦Â¿Ã Â¦â€“Ã Â§ÂÃ Â¦Â¨ Ã Â¦Â¬Ã Â¦Â¾ type in English / Hindi..."
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 resize-none outline-none max-h-32 leading-relaxed py-1.5"
            disabled={busy}
          />
          <div className="flex flex-col gap-1 justify-end">
            <Button onClick={startVoice} disabled={busy || listening} size="sm"
              className={cn("h-8 w-8 p-0 rounded-lg flex-shrink-0", listening ? "bg-red-500 animate-pulse" : "bg-slate-700 hover:bg-slate-600")}>
              <Mic className="w-3.5 h-3.5" />
            </Button>
            <Button onClick={() => send()} disabled={!input.trim() || busy} size="sm"
              className="h-8 w-8 p-0 rounded-lg bg-orange-500 hover:bg-orange-600 flex-shrink-0">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-slate-600 text-[10px] mt-1.5 text-center">CEOS can navigate, fetch data, and answer in your language</p>
      </div>
    </div>
  );
}

// Tool result renderer
function ToolResultDisplay({ result }: { result: any }) {
  if (!result.success || !result.data) {
    if (result.navigate) {
      return (
        <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
          <p className="text-blue-300 text-xs">Navigating to <code className="bg-slate-900 px-1 rounded">{result.navigate}</code></p>
        </div>
      );
    }
    return null;
  }

  const data = result.data;

  // List of items
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="p-2 bg-slate-900/50 border border-slate-700/50 rounded-lg">
          <p className="text-slate-400 text-xs">No items found</p>
        </div>
      );
    }
    return (
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {data.slice(0, 5).map((item: any, i: number) => (
          <Link key={i} href={item.url || "#"}>
            <div className="p-2 bg-slate-900/70 border border-slate-700/50 rounded-lg hover:border-orange-500/30 cursor-pointer transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">
                    {item.workName || item.name || item.billNumber || "Item"}
                  </p>
                  {item.department && <p className="text-slate-500 text-[10px] truncate">{item.department}</p>}
                  {item.project && <p className="text-slate-500 text-[10px] truncate">Project: {item.project}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {item.estimatedCost && <p className="text-green-400 text-xs font-semibold">{formatCurrency(item.estimatedCost)}</p>}
                  {item.netPayable && <p className="text-orange-400 text-xs font-semibold">{formatCurrency(item.netPayable)}</p>}
                  {item.contractValue && <p className="text-blue-400 text-xs font-semibold">{formatCurrency(item.contractValue)}</p>}
                  {item.matchScore !== undefined && <p className="text-purple-400 text-[10px]">{item.matchScore}% match</p>}
                  {item.daysLeft !== undefined && (
                    <p className={cn("text-[10px] font-semibold", item.daysLeft <= 3 ? "text-red-400" : item.daysLeft <= 7 ? "text-yellow-400" : "text-green-400")}>
                      {item.daysLeft}d left
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
        {data.length > 5 && <p className="text-slate-500 text-[10px] text-center">+{data.length - 5} more</p>}
      </div>
    );
  }

  // Object data (e.g. summary)
  if (typeof data === "object") {
    const entries = Object.entries(data).filter(([k]) => k !== "url" && k !== "period");
    return (
      <div className="p-2 bg-slate-900/70 border border-slate-700/50 rounded-lg space-y-1">
        {data.period && <p className="text-orange-300 text-[10px] uppercase font-semibold">{data.period}</p>}
        {entries.slice(0, 6).map(([k, v]: any) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-slate-400">{k.replace(/([A-Z])/g, " $1").trim()}:</span>
            <span className="text-white font-semibold">{typeof v === "number" ? formatCurrency(v) : String(v)}</span>
          </div>
        ))}
        {data.url && (
          <Link href={data.url}>
            <button className="w-full mt-1 text-[10px] py-1 bg-orange-500/20 border border-orange-500/30 rounded text-orange-300 hover:bg-orange-500/30 transition-all">
              Open full view
            </button>
          </Link>
        )}
      </div>
    );
  }

  return null;
}