import Link from "next/link";
import { Search, FileText, Receipt, Shield, Bot, ArrowRight, CheckCircle2 } from "lucide-react";
import Logo from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex gap-2">
            <Link href="/auth/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link href="/auth/register"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl text-center">
          <div className="inline-flex items-center justify-center mb-8">
            <Logo size="xl" showText={false} />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Construction Enterprise<br />Operating System
          </h1>
          <p className="text-muted-foreground text-lg mb-2 max-w-2xl mx-auto">
            AI-powered tender management, billing, and compliance for Indian construction enterprises.
          </p>
          <p className="text-muted-foreground text-sm mb-10">
            From tender upload to final bill — all in one platform.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 max-w-3xl mx-auto">
            {[
              { icon: Search, label: "Tender AI", desc: "PDF analysis" },
              { icon: FileText, label: "Documents", desc: "Auto generation" },
              { icon: Receipt, label: "RA Billing", desc: "All deductions" },
              { icon: Shield, label: "Compliance", desc: "ESI EPF GST" },
            ].map((item) => (
              <div key={item.label} className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
                <item.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-foreground text-sm font-semibold">{item.label}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Link href="/auth/register">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started Free <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">Sign In</Button>
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Free forever plan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-primary" />
              <span>AI speaks Bengali, Hindi, English</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-4">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-muted-foreground">
          DSRT CEOS · Built for Indian Construction · v1.0
        </div>
      </footer>
    </div>
  );
}