import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SessionView, Preference } from "@market/contracts";
import { api, queryClient, RequestError } from "./api";
import i18n from "./i18n";
const SessionContext = createContext<{
  session: SessionView | null | undefined;
  loading: boolean;
}>({ session: undefined, loading: true });
export function applyPreference(p: Partial<Preference>) {
  if (p.locale) void i18n.changeLanguage(p.locale);
  if (p.theme) {
    document.documentElement.dataset.theme = p.theme;
    try {
      localStorage.setItem("ma.theme", p.theme);
    } catch {
      /* optional */
    }
  }
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const q = useQuery({
    queryKey: ["session"],
    queryFn: async ({ signal }) => {
      try {
        return await api<SessionView>(
          "/auth/session",
          "GET",
          undefined,
          signal,
        );
      } catch (e) {
        if (e instanceof RequestError && e.status === 401) return null;
        throw e;
      }
    },
    refetchInterval: 60000,
  });
  useEffect(() => {
    if (q.data) applyPreference(q.data.preference);
  }, [q.data]);
  return (
    <SessionContext.Provider value={{ session: q.data, loading: q.isPending }}>
      {children}
    </SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
export async function savePreference(value: Partial<Preference>) {
  const p = await api<Preference>("/preferences", "PATCH", value);
  applyPreference(p);
  queryClient.setQueryData<SessionView>(["session"], (old) =>
    old ? { ...old, preference: p } : old,
  );
  return p;
}
