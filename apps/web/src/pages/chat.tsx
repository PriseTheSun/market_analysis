import { useLocation } from "react-router-dom";
import { ModuleInfo } from "../components/module-info";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Send,
  Square,
  MessageSquare,
  ArrowDown,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Locale } from "@market/contracts";
import { toast } from "sonner";
import { api, request, errorText, queryClient } from "../lib/api";
import { useScope } from "../components/shell";
import { LocalizedLink as Link } from "../lib/navigation";
import { Button } from "../components/ui/button";
import { Loading, ErrorState } from "../components/ui/common";
interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}
interface Message {
  id: string;
  content: string;
  role: string;
  status: string;
  operationId: string;
}
interface Operation {
  id: string;
  userMessageId: string;
  status: string;
}
interface Detail extends Conversation {
  messages: Message[];
  operations: Operation[];
}
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
export function Chat() {
  const s = useScope();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const requestedConversation =
    new URLSearchParams(location.search).get("conversation") ?? undefined;
  const [routeSearch, setRouteSearch] = useState(location.search);
  const [current, setCurrent] = useState<string | undefined>(
      requestedConversation,
    ),
    [draft, setDraft] = useState(""),
    [stream, setStream] = useState(""),
    [busy, setBusy] = useState(false),
    [following, setFollowing] = useState(true),
    [transportRetry, setTransportRetry] = useState<{
      conversationId: string;
      operationId: string;
      content: string;
      retryOf?: string;
    }>();
  if (routeSearch !== location.search) {
    setRouteSearch(location.search);
    setCurrent(requestedConversation);
  }
  const abort = useRef<AbortController | null>(null),
    operation = useRef<string | null>(null),
    alive = useRef(true),
    scroll = useRef<HTMLDivElement>(null);
  const drafts = useRef(new Map<string, string>());
  const list = useQuery({
    queryKey: [...s.key, "conversations"],
    queryFn: ({ signal }) =>
      api<{ items: Conversation[]; provider: string }>(
        s.prefix + "/conversations",
        "GET",
        undefined,
        signal,
      ),
    refetchInterval: (q) =>
      q.state.data?.provider === "unavailable" ? 15000 : false,
  });
  const unavailable = list.data?.provider === "unavailable";
  const detail = useQuery({
    queryKey: [...s.key, "conversation", current],
    queryFn: ({ signal }) =>
      api<Detail>(
        s.prefix + "/conversations/" + current,
        "GET",
        undefined,
        signal,
      ),
    enabled: !!current,
    refetchInterval: (q) =>
      q.state.data?.operations.some((o) =>
        ["pending", "streaming"].includes(o.status),
      )
        ? 2000
        : false,
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (following && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [stream, detail.data, following]);
  const select = (id?: string) => {
    drafts.current.set(current ?? "new", draft);
    abort.current?.abort();
    setBusy(false);
    setStream("");
    setTransportRetry(undefined);
    setCurrent(id);
    setDraft(drafts.current.get(id ?? "new") ?? "");
    setFollowing(true);
  };
  async function send(
    content = draft,
    retryOf?: string,
    replay?: {
      conversationId: string;
      operationId: string;
      content: string;
      retryOf?: string;
    },
  ) {
    if (busy || !content.trim()) return;
    // Completed operations can still be replayed after the credential expires.
    if (unavailable && !replay) return;
    setBusy(true);
    setStream("");
    setFollowing(true);
    // Clear only the submitted draft, before creating the conversation. Anything
    // typed while that request is pending belongs to the next message.
    setDraft("");
    drafts.current.delete(current ?? "new");
    const control = new AbortController();
    abort.current = control;
    let id = replay?.conversationId ?? current;
    let operationId = replay?.operationId;
    try {
      if (!id) {
        const c = await s.call<Conversation>(
          s.prefix + "/conversations",
          "POST",
          { title: content.slice(0, 80) },
        );
        id = c.id;
        if (!alive.current || control.signal.aborted) return;
        setCurrent(id);
      }
      operationId ??= crypto.randomUUID();
      operation.current = operationId;
      setTransportRetry(undefined);
      const response = await request(
        `${s.prefix}/conversations/${id}/messages`,
        {
          method: "POST",
          signal: control.signal,
          body: JSON.stringify({
            content,
            operationId,
            locale: i18n.language as Locale,
            ...(retryOf ? { retryOf } : {}),
          }),
        },
      );
      const reader = response.body!.getReader(),
        decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let index;
        while ((index = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          const event = frame.match(/^event: (.+)$/m)?.[1],
            json = frame.match(/^data: (.+)$/m)?.[1];
          if (!json) continue;
          const data = JSON.parse(json);
          if (!alive.current || control.signal.aborted) return;
          if (event === "start") {
            void queryClient.invalidateQueries({
              queryKey: [...s.key, "conversation", id],
            });
          } else if (event === "delta") setStream((v) => v + data.text);
          else if (event === "snapshot") setStream(data.content);
          else if (event === "error")
            toast.error(
              t("errors." + data.code, { defaultValue: t("common.error") }),
            );
        }
      }
    } catch (e) {
      if (alive.current && !control.signal.aborted) {
        toast.error(errorText(e));
        if (id && operationId)
          setTransportRetry({
            conversationId: id,
            operationId,
            content,
            retryOf,
          });
        else setDraft((value) => value || content);
      }
    } finally {
      if (alive.current && abort.current === control) {
        setBusy(false);
        setStream("");
        operation.current = null;
        await queryClient.invalidateQueries({
          queryKey: [...s.key, "conversation", id],
        });
        await queryClient.invalidateQueries({
          queryKey: [...s.key, "conversations"],
        });
      }
    }
  }
  const cancel = () => {
    const id = operation.current;
    abort.current?.abort();
    if (id)
      void s
        .call(`${s.prefix}/operations/${id}/cancel`, "POST", {})
        .catch(() => {});
  };
  const messages = detail.data?.messages ?? [];
  return (
    <main className="chat-page">
      <aside className="chat-history">
        <Button variant="outline" onClick={() => select()}>
          <Plus />
          {t("chat.new")}
        </Button>
        <div className="conversation-list">
          {list.isPending ? (
            <Loading />
          ) : list.isError ? (
            <ErrorState error={list.error} />
          ) : (
            list.data.items.map((c) => (
              <button
                key={c.id}
                className={c.id === current ? "selected" : ""}
                onClick={() => select(c.id)}
              >
                <MessageSquare />
                <span>{c.title || t("chat.untitled")}</span>
              </button>
            ))
          )}
        </div>
      </aside>
      <section className="chat-workspace">
        <div className="chat-mode">
          <span className="badge">
            {t(list.data?.provider === "demo" ? "chat.demo" : "chat.assistant")}
          </span>
          <span>
            {t(
              list.data?.provider === "unavailable"
                ? "chat.unavailable"
                : list.data?.provider === "gemini"
                  ? "ai.chatConnected"
                  : "chat.demoSub",
            )}
          </span>
          <ModuleInfo />
        </div>
        <div
          className="chat-messages"
          ref={scroll}
          onScroll={() => {
            const e = scroll.current;
            if (e)
              setFollowing(e.scrollHeight - e.scrollTop - e.clientHeight < 100);
          }}
        >
          {!current ? (
            <div className="chat-welcome">
              <MessageSquare />
              <h1>{t("chat.welcome")}</h1>
              <p>{t("chat.welcomeSub")}</p>
            </div>
          ) : detail.isPending ? (
            <Loading />
          ) : detail.isError ? (
            <ErrorState error={detail.error} />
          ) : (
            <>
              <h1 className="sr-only">
                {detail.data.title || t("chat.untitled")}
              </h1>
              {messages.map((m) => (
                <article key={m.id} className={"chat-message " + m.role}>
                  <div className="message-author">
                    {t(m.role === "user" ? "chat.you" : "chat.assistant")}
                  </div>
                  <div className="markdown">
                    <Markdown>
                      {m.role === "assistant" &&
                      m.operationId === operation.current &&
                      stream
                        ? stream
                        : m.content || t("chat.generating")}
                    </Markdown>
                  </div>
                  {m.role === "assistant" &&
                    ["cancelled", "interrupted", "failed"].includes(
                      m.status,
                    ) && (
                      <div className="partial">
                        <span>{t("chat.partial")}</span>
                        <Button
                          variant="ghost"
                          size="small"
                          disabled={busy || unavailable}
                          onClick={() => {
                            const op = detail.data?.operations.find(
                              (o) => o.id === m.operationId,
                            );
                            const original = messages.find(
                              (x) => x.id === op?.userMessageId,
                            );
                            if (original)
                              void send(original.content, original.id);
                          }}
                        >
                          <RefreshCw />
                          {t("common.retry")}
                        </Button>
                      </div>
                    )}
                </article>
              ))}
              {busy &&
                !messages.some(
                  (m) =>
                    m.operationId === operation.current &&
                    m.role === "assistant",
                ) && (
                  <article className="chat-message assistant">
                    <span className="message-author">
                      {t("chat.assistant")}
                    </span>
                    <div className="markdown">
                      <Markdown>{stream || t("chat.generating")}</Markdown>
                    </div>
                  </article>
                )}
            </>
          )}
        </div>
        {!following && (
          <button
            className="scroll-bottom icon-button"
            aria-label={t("chat.scroll")}
            onClick={() => setFollowing(true)}
          >
            <ArrowDown />
          </button>
        )}
        {transportRetry && (
          <div className="transport-retry" role="status">
            <span>{t("chat.transportRetry")}</span>
            <Button
              variant="outline"
              size="small"
              onClick={() =>
                void send(
                  transportRetry.content,
                  transportRetry.retryOf,
                  transportRetry,
                )
              }
            >
              <RefreshCw aria-hidden="true" />
              {t("common.retry")}
            </Button>
          </div>
        )}
        {unavailable && (
          <div className="chat-connection" role="status" id="chat-connection">
            <span>
              {t(
                s.user.platformRole === "GLOBAL"
                  ? "chat.reconnectGlobal"
                  : "chat.reconnectAdmin",
              )}
            </span>
            {s.user.platformRole === "GLOBAL" && (
              <Link
                to="/platform/ai-settings"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("chat.openSettings")}
              </Link>
            )}
            <Button
              type="button"
              size="small"
              variant="outline"
              disabled={list.isFetching}
              onClick={() => void list.refetch()}
            >
              <RefreshCw />
              {t("chat.checkConnection")}
            </Button>
          </div>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label className="sr-only" htmlFor="chat-input">
            {t("chat.placeholder")}
          </label>
          <textarea
            id="chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("chat.placeholder")}
            rows={2}
            aria-describedby={unavailable ? "chat-connection" : undefined}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="composer-bottom">
            <small>{t("chat.hint")}</small>
            {busy ? (
              <Button
                type="button"
                size="icon"
                aria-label={t("chat.cancel")}
                onClick={(e) => {
                  // Aborting can replace this button with Submit before the
                  // click's default action. Never submit the next draft here.
                  e.preventDefault();
                  cancel();
                }}
              >
                <Square />
              </Button>
            ) : (
              <Button
                size="icon"
                disabled={!draft.trim() || unavailable}
                aria-label={t("chat.send")}
              >
                <Send />
              </Button>
            )}
          </div>
        </form>
        <span className="sr-only" role="status">
          {busy ? t("chat.generating") : ""}
        </span>
      </section>
    </main>
  );
}
