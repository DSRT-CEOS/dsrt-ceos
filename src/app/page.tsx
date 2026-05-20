import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, Search, FileText, Receipt, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-2xl mb-6 shadow-2xl shadow-orange-500/30">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">DSRT CEOS</h1>
        <p className="text-slate-300 text-lg mb-2">Construction Enterprise Operating System</p>
        <p className="text-slate-500 text-sm mb-8">
          AI-powered tender management built for Indian contractors. Upload tender PDFs and let AI handle everything.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <Search className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Tender AI</p>
            <p className="text-slate-500 text-xs mt-1">PDF Analysis</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <FileText className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Documents</p>
            <p className="text-slate-500 text-xs mt-1">Auto Generation</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <Receipt className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Billing</p>
            <p className="text-slate-500 text-xs mt-1">RA Bills</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <Shield className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Compliance</p>
            <p className="text-slate-500 text-xs mt-1">ESI EPF GST</p>
          </div>
        </div>

        <div className="flex gap-3 justify-center mb-8">
          <Link href="/auth/register">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8">
              Get Started Free
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8">
              Sign In
            </Button>
          </Link>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-400 text-sm font-medium">System Online · Production Ready</span>
        </div>

        <p className="text-slate-600 text-xs mt-8">
          v1.0.0 · বাংলা · हिंदी · English
        </p>
      </div>
    </div>
  );
}