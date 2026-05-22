"use client";
import { useCurrentUser } from "@/lib/hooks/useUser";
import { hasPermission } from "@/lib/auth/roles";
import { Lock } from "lucide-react";

interface PermissionGateProps {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLock?: boolean;
}

export default function PermissionGate({
  module, action, children, fallback, showLock = false
}: PermissionGateProps) {
  const { role, loading } = useCurrentUser();

  if (loading) return null;
  if (hasPermission(role, module as any, action)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;
  if (showLock) {
    return (
      <div className="inline-flex items-center gap-1 text-slate-500 text-xs">
        <Lock className="w-3 h-3" />
        <span>Restricted</span>
      </div>
    );
  }
  return null;
}

export function NoAccessMessage({ module }: { module: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-slate-500" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
      <p className="text-slate-400 text-sm max-w-md">
        Your role does not have permission to access {module}. Contact your account owner to request access.
      </p>
    </div>
  );
}