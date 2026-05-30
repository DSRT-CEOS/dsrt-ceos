"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";
import Link from "next/link";
import { Loader2, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import Logo from "@/components/shared/Logo";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const [userData, setUserData] = useState({ name: "", email: "", phone: "", password: "" });
  const [companyData, setCompanyData] = useState({
    name: "", type: "PROPRIETORSHIP", panNumber: "",
    gstNumber: "", state: "West Bengal", city: "", contractorClass: "CLASS_III",
  });

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!isValidEmail(userData.email)) { setErrorMsg("Please enter a valid email address"); return; }
    if (userData.password.length < 8) { setErrorMsg("Password must be 8+ characters"); return; }
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email, password: userData.password,
        options: { data: { full_name: userData.name } },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setErrorMsg("This email is already registered. Please sign in instead."); return;
        }
        if (authError.message.includes("rate limit")) {
          setErrorMsg("Too many attempts. Please wait and try again."); return;
        }
        throw authError;
      }
      if (!authData.user) throw new Error("Registration failed");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: { ...userData, supabaseId: authData.user.id },
          company: companyData,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Setup failed");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email, password: userData.password,
      });

      if (signInError) {
        toast.success("Account created. Please sign in.");
        router.push("/auth/login"); return;
      }

      toast.success("Welcome to DSRT CEOS!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setErrorMsg(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link href="/" className="flex justify-center mb-8">
          <Logo size="md" />
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Create Your Account</h1>
          <div className="flex items-center justify-center gap-1 mt-3">
            <div className={`h-1 w-16 rounded-full transition-all ${step >= 1 ? "bg-primary" : "bg-border"}`} />
            <div className={`h-1 w-16 rounded-full transition-all ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          </div>
          <p className="text-muted-foreground text-xs mt-2 uppercase tracking-wider">Step {step} of 2</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-destructive text-sm">{errorMsg}</p>
          </div>
        )}

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={step === 2 ? handleRegister : handleStep1}>
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-foreground font-semibold mb-4">Your Details</h3>
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input value={userData.name} onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      placeholder="Ramesh Kumar" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address *</Label>
                    <Input type="email" value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      placeholder="ramesh@company.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile Number</Label>
                    <Input type="tel" value={userData.phone}
                      onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                      placeholder="+91 98765 43210" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password (min 8 characters) *</Label>
                    <Input type="password" value={userData.password}
                      onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required minLength={8} />
                  </div>
                  <Button type="submit" className="w-full">
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-2 bg-success/10 border border-success/20 rounded-md mb-4">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <p className="text-success text-xs">{userData.email}</p>
                  </div>

                  <h3 className="text-foreground font-semibold">Company Details</h3>

                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input value={companyData.name}
                      onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                      placeholder="Kumar Construction Co." required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Type</Label>
                      <Select value={companyData.type} onValueChange={(v) => setCompanyData({ ...companyData, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PROPRIETORSHIP">Proprietorship</SelectItem>
                          <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                          <SelectItem value="PRIVATE_LIMITED">Pvt Limited</SelectItem>
                          <SelectItem value="LLP">LLP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Contractor Class</Label>
                      <Select value={companyData.contractorClass} onValueChange={(v) => setCompanyData({ ...companyData, contractorClass: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CLASS_I">Class I</SelectItem>
                          <SelectItem value="CLASS_II">Class II</SelectItem>
                          <SelectItem value="CLASS_III">Class III</SelectItem>
                          <SelectItem value="CLASS_IV">Class IV</SelectItem>
                          <SelectItem value="CLASS_V">Class V</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PAN (optional)</Label>
                      <Input value={companyData.panNumber}
                        onChange={(e) => setCompanyData({ ...companyData, panNumber: e.target.value.toUpperCase() })}
                        placeholder="ABCDE1234F" />
                    </div>
                    <div className="space-y-2">
                      <Label>GST (optional)</Label>
                      <Input value={companyData.gstNumber}
                        onChange={(e) => setCompanyData({ ...companyData, gstNumber: e.target.value.toUpperCase() })}
                        placeholder="19ABCDE1234F1Z5" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={companyData.city}
                      onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                      placeholder="Kolkata" />
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Account"}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            <div className="mt-4 text-center">
              <p className="text-muted-foreground text-sm">
                Already registered?{" "}
                <Link href="/auth/login" className="text-primary hover:text-blue-400">Sign in</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}