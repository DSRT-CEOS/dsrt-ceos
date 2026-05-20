export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-2xl mb-6 shadow-2xl shadow-orange-500/30">
          <span className="text-white font-bold text-2xl">DS</span>
        </div>
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">DSRT CEOS</h1>
        <p className="text-slate-300 text-lg mb-2">Construction Enterprise Operating System</p>
        <p className="text-slate-500 text-sm mb-8">AI-powered tender management for Indian contractors</p>
        
        <div className="grid grid-cols-2 gap-3 mb-8 text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-wide">Tender AI</p>
            <p className="text-slate-300 text-sm mt-1">PDF Upload + Analysis</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-wide">Documents</p>
            <p className="text-slate-300 text-sm mt-1">Auto Generation</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-wide">Billing</p>
            <p className="text-slate-300 text-sm mt-1">RA Bill Engine</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-wide">Compliance</p>
            <p className="text-slate-300 text-sm mt-1">ESI EPF GST</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-400 text-sm font-medium">System Online &middot; Production Ready</span>
        </div>
        
        <p className="text-slate-600 text-xs mt-8">
          v0.1.0 &middot; Built for Bengali, Hindi &amp; English speaking contractors
        </p>
      </div>
    </div>
  );
}