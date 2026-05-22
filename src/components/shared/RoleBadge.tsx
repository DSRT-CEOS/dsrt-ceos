"use client";
import { useCurrentUser } from "@/lib/hooks/useUser";
import { ROLES } from "@/lib/auth/roles";
import { Crown, Briefcase, Calculator, HardHat, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<string, any> = {
  OWNER: Crown, MANAGER: Briefcase, ACCOUNTANT: Calculator, SUPERVISOR: HardHat, VIEWER: Eye,
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "text-orange-300 bg-orange-500/15 border-orange-500/30",
  MANAGER: "text-blue-300 bg-blue-500/15 border-blue-500/30",
  ACCOUNTANT: "text-green-300 bg-green-500/15 border-green-500/30",
  SUPERVISOR: "text-purple-300 bg-purple-500/15 border-purple-500/30",
  VIEWER: "text-slate-300 bg-slate-500/15 border-slate-500/30",
};

export default function RoleBadge() {
  const { role, loading } = useCurrentUser();
  if (loading) return null;

  const Icon = ROLE_ICONS[role] || Eye;
  const roleDef = ROLES[role];

  return (
    <div className={cn(
      "hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium",
      ROLE_COLORS[role]
    )}>
      <Icon className="w-3 h-3" />
      <span>{roleDef?.name || role}</span>
    </div>
  );
}