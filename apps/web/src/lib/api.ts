import { QueryClient } from "@tanstack/react-query";
import type { ApiError } from "@market/contracts";
import i18n from "./i18n";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 10000, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
export class RequestError extends Error {
  constructor(
    public status: number,
    public detail: ApiError,
  ) {
    super(detail.code);
  }
}
let csrf: string | undefined;
export async function csrfToken() {
  if (!csrf) {
    const response = await fetch("/api/v1/auth/csrf", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("csrf unavailable");
    csrf = (await response.json()).token;
  }
  return csrf!;
}
export function resetCsrf() {
  csrf = undefined;
}
export async function request(path: string, options: RequestInit = {}) {
  const method = options.method ?? "GET";
  const response = await fetch("/api/v1" + path, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(method !== "GET" ? { "X-CSRF-Token": await csrfToken() } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const detail: ApiError = await response.json().catch(() => ({
      code: "INTERNAL_ERROR",
      message: "INTERNAL_ERROR",
      requestId: "",
    }));
    if (
      response.status === 401 &&
      path != "/auth/session" &&
      path != "/auth/login"
    ) {
      queryClient.setQueryData(["session"], null);
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== "session",
      });
    }
    if (detail.code === "CSRF_INVALID") resetCsrf();
    throw new RequestError(response.status, detail);
  }
  return response;
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return (
    await request(path, {
      method,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  ).json();
}
export function errorText(error: unknown) {
  return error instanceof RequestError
    ? i18n.t("errors." + error.detail.code, {
        defaultValue: i18n.t("common.error"),
      })
    : i18n.t("common.error");
}
