"use client";
import { useEffect, useState } from "react";
import { hasPermission, type Role } from "@/lib/auth/roles";

export interface UserContext {
  userId: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  companyName: string;
  loading: boolean;
}

let cachedContext: UserContext | null = null;
let cachePromise: Promise<UserContext> | null = null;

async function fetchContext(): Promise<UserContext> {
  if (cachedContext) return cachedContext;
  if (cachePromise) return cachePromise;

  cachePromise = fetch("/api/auth/user")
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        cachedContext = {
          userId: d.data.id,
          name: d.data.name,
          email: d.data.email,
          role: d.data.role as Role,
          companyId: d.data.company.id,
          companyName: d.data.company.name,
          loading: false,
        };
        return cachedContext;
      }
      throw new Error("Failed to load user");
    })
    .catch(() => ({
      userId: "", name: "", email: "", role: "VIEWER" as Role,
      companyId: "", companyName: "", loading: false,
    }))
    .finally(() => { cachePromise = null; });

  return cachePromise;
}

export function useCurrentUser(): UserContext {
  const [ctx, setCtx] = useState<UserContext>({
    userId: "", name: "", email: "", role: "VIEWER",
    companyId: "", companyName: "", loading: true,
  });

  useEffect(() => {
    fetchContext().then(setCtx);
  }, []);

  return ctx;
}

export function useCan(module: string, action: string): boolean {
  const { role, loading } = useCurrentUser();
  if (loading) return false;
  return hasPermission(role, module as any, action);
}

export function clearUserCache() {
  cachedContext = null;
  cachePromise = null;
}