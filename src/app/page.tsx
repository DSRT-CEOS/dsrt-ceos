import Link from "next/link";
import { Building2, Search, FileText, Receipt, Shield, Bot } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-2xl mb-6 shadow-2xl shadow-orange-500/30">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-bold text-white mb-3">DSRT CEOS</h1>
        <p className="text-slate-300 text-lg mb-2">Construction Enterprise Operating System</p>
        <p className="text-slate-500 text-sm mb-10 max-w-md mx-auto">
          AI-powered tender management for Indian contractors. Upload tender PDFs, generate documents, track compliance — all in one place.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { icon: Search, label: "Tender AI", desc: "PDF Analysis" },
            { icon: FileText, label: "Documents", desc: "Auto Generation" },
            { icon: Receipt, label: "RA Billing", desc: "All Deductions" },
            { icon: Shield, label: "Compliance", desc: "ESI EPF GST" },
          ].map((item) => (
            <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-orange-500/30 transition-colors">
              <item.icon className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-white text-sm font-semibold">{item.label}</p>
              <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center mb-10">
          <Link href="/auth/register">
            <button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
              Get Started Free
            </button>
          </Link>
          <Link href="/auth/login">
            <button className="border border-slate-700 text-slate-300 hover:bg-slate-800 px-8 py-3 rounded-lg transition-colors">
              Sign In
            </button>
          </Link>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full mb-4">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-400 text-sm font-medium">System Online</span>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          <Bot className="w-4 h-4 text-orange-400" />
          <p className="text-slate-600 text-xs">CEOS AI speaks Bengali • हिंदी • English</p>
        </div>
      </div>
    </div>
  );
}