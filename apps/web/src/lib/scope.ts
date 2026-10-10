import { createContext, useContext } from "react";
import type { Context, PublicUser } from "@market/contracts";

export interface Scope {
  tenant?: Context;
  user: PublicUser;
  key: string[];
  prefix: string;
  call: <T>(path: string, method?: string, body?: unknown) => Promise<T>;
}
export const ScopeContext = createContext<Scope | null>(null);
export function useScope() {
  const value = useContext(ScopeContext);
  if (!value) throw new Error("scope missing");
  return value;
}
