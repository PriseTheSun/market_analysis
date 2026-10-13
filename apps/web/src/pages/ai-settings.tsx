import { ModuleInfo } from "../components/module-info";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Clock,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  Image as ImageIcon,
  Play,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AiSettings,
  AiCatalog,
  AiSource,
  AiFeature,
  AiModel,
  AiOperation,
  AiUsage,
} from "@market/contracts";
import { api, request, errorText, queryClient } from "../lib/api";
import { useScope } from "../components/shell";
import { LocalizedLink as Link } from "../lib/navigation";
import { Button } from "../components/ui/button";
import { ErrorState, Loading } from "../components/ui/common";
import "./ai-settings.css";

export function AiSettingsPage() {
  const scope = useScope();
  const key = [...scope.key, "ai-settings"];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      api<AiSettings>("/ai/settings", "GET", undefined, signal),
    refetchInterval: 30000,
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const settings = query.data;
  return (
    <SettingsForm
      key={`${settings.configuration.version}:${settings.connections.temporary.revision}:${settings.connections.managed.revision}`}
      settings={settings}
      refresh={async () => {
        await query.refetch();
      }}
      saved={(value) => queryClient.setQueryData(key, value)}
    />
  );
}
function SettingsForm({
  settings,
  refresh,
  saved,
}: {
  settings: AiSettings;
  refresh: () => Promise<void>;
  saved: (settings: AiSettings) => void;
}) {
  const { t } = useTranslation();
  const scope = useScope();
  const initial = settings.configuration;
  const [source, setSource] = useState<AiSource>(
    !initial.exists &&
      settings.localTokenAllowed &&
      settings.connections.managed.status !== "connected"
      ? "temporary"
      : initial.source,
  );
  const [models, setModels] = useState(initial.models);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const token = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const lifecycle = useRef(new AbortController());
  useEffect(() => {
    lifecycle.current = new AbortController();
    const field = token.current;
    return () => {
      lifecycle.current.abort();
      if (field) field.value = "";
    };
  }, []);
  const local = initial.scope === "local";
  const connection = settings.connections[source];
  const catalog = useQuery({
    queryKey: [...scope.key, "ai-models", source, connection.revision],
    queryFn: ({ signal }) =>
      api<AiCatalog>(`/ai/models?source=${source}`, "GET", undefined, signal),
    enabled: connection.status === "connected",
  });
  const usage = useQuery({
    queryKey: [...scope.key, "ai-usage", source],
    queryFn: ({ signal }) =>
      api<AiUsage>(`/ai/usage?source=${source}`, "GET", undefined, signal),
    refetchInterval: 5000,
  });
  const revision = catalog.data?.connectionRevision;
  const compatible = (feature: AiFeature) =>
    !models[feature] ||
    catalog.data?.models.some(
      (m) => m.id === models[feature] && m.features.includes(feature),
    );
  const dirty =
    (initial.exists && source !== initial.source) ||
    JSON.stringify(models) !== JSON.stringify(initial.models) ||
    (!!revision && revision !== initial.connectionRevision);
  const canSave =
    settings.enabled &&
    !!revision &&
    compatible("chatText") &&
    compatible("imageGeneration") &&
    dirty &&
    !busy;
  const perform = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (e) {
      if (!lifecycle.current.signal.aborted) setError(errorText(e));
    } finally {
      lock.current = false;
      if (!lifecycle.current.signal.aborted) setBusy(false);
    }
  };
  const clearToken = () => {
    if (token.current) token.current.value = "";
    setEditing(false);
  };
  const changeSource = (next: AiSource) => {
    clearToken();
    setSource(next);
    setModels({ chatText: null, imageGeneration: null });
    setError(undefined);
  };
  const connect = () => {
    let value = token.current?.value.trim() ?? "";
    if (value.length < 16) {
      setError(t("ai.invalidToken"));
      return;
    }
    if (token.current) token.current.value = "";
    void perform(async () => {
      const pending = api(
        "/ai/local-connection",
        "POST",
        { provider: "gemini", token: value },
        lifecycle.current.signal,
      );
      value = "";
      await pending;
      clearToken();
      await refresh();
    });
  };
  const save = () =>
    void perform(async () => {
      const value = await api<AiSettings>(
        "/ai/settings",
        "PUT",
        {
          scope: initial.scope,
          expectedVersion: initial.version,
          source,
          connectionRevision: revision,
          models,
        },
        lifecycle.current.signal,
      );
      saved(value);
      toast.success(t("ai.saved"));
      void queryClient.invalidateQueries({
        queryKey: [...scope.key, "ai-usage"],
      });
    });
  return (
    <main className="ai-page">
      <nav className="ai-breadcrumb" aria-label={t("ai.breadcrumb")}>
        <Link to="/platform/management">{t("shell.platform")}</Link>
        <span>/</span>
        <span>{t("ai.title")}</span>
      </nav>
      <header className="ai-heading">
        <div className="ai-title-row">
          <h1>{t("ai.title")}</h1>
          <ModuleInfo />
        </div>
        <p>{t("ai.description")}</p>
      </header>
      {!settings.enabled && (
        <div className="ai-notice" role="status">
          {t("ai.disabled")}
        </div>
      )}
      <section className="ai-card ai-origin" aria-labelledby="ai-origin-title">
        <div className="ai-section-heading">
          <h2 id="ai-origin-title">{t("ai.origin")}</h2>
          <span
            className={`ai-pill ${connection.status === "connected" ? "ai-connected" : ""}`}
          >
            {t(`ai.connection.${connection.status}`)}
          </span>
        </div>
        <div
          className="ai-source-options"
          role="radiogroup"
          aria-labelledby="ai-origin-title"
        >
          {(
            [
              "managed",
              ...(settings.localTokenAllowed ? ["temporary"] : []),
            ] as AiSource[]
          ).map((item) => (
            <label
              className={`ai-source ${source === item ? "selected" : ""}`}
              key={item}
            >
              <input
                type="radio"
                name="ai-source"
                checked={source === item}
                onChange={() => changeSource(item)}
                disabled={busy}
              />
              <span>
                <strong>{t(`ai.source.${item}`)}</strong>
                <small>{t(`ai.sourceHint.${item}`)}</small>
              </span>
            </label>
          ))}
        </div>
      </section>
      <div className="ai-columns">
        <section className="ai-features" aria-labelledby="ai-features-title">
          <div className="ai-feature-intro">
            <h2 id="ai-features-title">{t("ai.features")}</h2>
            <p>{t("ai.featuresHint")}</p>
          </div>
          {catalog.isError && (
            <div className="ai-notice" role="alert">
              {errorText(catalog.error)}
              <Button
                size="small"
                variant="outline"
                onClick={() => void catalog.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          )}
          {(["chatText", "imageGeneration"] as const).map((feature) => {
            const available =
              catalog.data?.models.filter((m) =>
                m.features.includes(feature),
              ) ?? [];
            const chosen = available.find((m) => m.id === models[feature]);
            const Icon = feature === "chatText" ? MessageCircle : ImageIcon;
            return (
              <article className="ai-card ai-feature-card" key={feature}>
                <div className="ai-feature-icon">
                  <Icon aria-hidden="true" />
                </div>
                <div className="ai-feature-content">
                  <div className="ai-feature-title">
                    <h3>{t(`ai.feature.${feature}`)}</h3>
                    <span
                      className={`ai-pill ${feature === "imageGeneration" ? "ai-image-pill" : "ai-text-pill"}`}
                    >
                      {t(`ai.kind.${feature}`)}
                    </span>
                  </div>
                  <p>{t(`ai.featureHint.${feature}`)}</p>
                  <label className="field" htmlFor={`ai-model-${feature}`}>
                    <span>{t(`ai.modelLabel.${feature}`)}</span>
                    <span className="ai-select">
                      <select
                        id={`ai-model-${feature}`}
                        aria-label={t(`ai.modelLabel.${feature}`)}
                        value={models[feature] ?? ""}
                        disabled={
                          busy ||
                          !catalog.data ||
                          connection.status !== "connected"
                        }
                        onChange={(event) =>
                          setModels({
                            ...models,
                            [feature]: event.target.value || null,
                          })
                        }
                      >
                        <option value="">{t(`ai.select.${feature}`)}</option>
                        {models[feature] && !chosen && (
                          <option value={models[feature]!} disabled>
                            {t("ai.modelUnavailable")}
                          </option>
                        )}
                        {available.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown aria-hidden="true" />
                    </span>
                  </label>
                  {connection.status !== "connected" ? (
                    <small className="muted">{t("ai.connectFirst")}</small>
                  ) : catalog.isPending ? (
                    <small>{t("common.loading")}</small>
                  ) : available.length === 0 ? (
                    <small className="muted">{t("ai.noModels")}</small>
                  ) : null}
                  <ModelTest
                    key={`${feature}:${source}:${revision}:${chosen?.id}`}
                    feature={feature}
                    model={chosen}
                    source={source}
                    revision={revision}
                    disabled={busy || connection.status !== "connected"}
                  />
                </div>
              </article>
            );
          })}
        </section>
        <aside
          className="ai-card ai-connection-panel"
          aria-label={t("ai.connectionPanel")}
        >
          <div className="ai-panel-heading">
            <KeyRound aria-hidden="true" />
            <div>
              <div className="ai-feature-title">
                <h2>
                  {t(
                    source === "temporary"
                      ? "ai.testConnection"
                      : "ai.managedConnection",
                  )}
                </h2>
                {source === "temporary" && (
                  <span className="ai-pill">{t("ai.temporary")}</span>
                )}
              </div>
              <p>
                {t(
                  source === "temporary"
                    ? "ai.testConnectionHint"
                    : "ai.managedConnectionHint",
                )}
              </p>
            </div>
          </div>
          <label className="field">
            <span className="sr-only">{t("ai.provider")}</span>
            <span className="ai-select">
              <select value="gemini" disabled>
                <option value="gemini">Google Gemini</option>
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>
          {source === "temporary" ? (
            <>
              {connection.status === "connected" && !editing ? (
                <div className="ai-credential">
                  <LockKeyhole aria-hidden="true" />
                  <span>{t("ai.credentialConfigured")}</span>
                  <Button
                    variant="outline"
                    size="small"
                    disabled={busy}
                    onClick={() => setEditing(true)}
                  >
                    {t("ai.replace")}
                  </Button>
                </div>
              ) : (
                <form
                  className="ai-token-form"
                  autoComplete="off"
                  onSubmit={(event) => {
                    event.preventDefault();
                    connect();
                  }}
                >
                  <label className="field">
                    <span>{t("ai.apiToken")}</span>
                    <input
                      ref={token}
                      type="password"
                      name="temporary-gemini-credential"
                      autoComplete="off"
                      spellCheck={false}
                      minLength={16}
                      maxLength={512}
                      required
                      placeholder={t("ai.tokenPlaceholder")}
                      disabled={busy}
                    />
                  </label>
                  <p className="ai-fine-print">{t("ai.tokenHint")}</p>
                  <div className="ai-actions">
                    {editing && (
                      <Button
                        type="button"
                        size="small"
                        variant="outline"
                        onClick={clearToken}
                        disabled={busy}
                      >
                        {t("common.cancel")}
                      </Button>
                    )}
                    <Button type="submit" size="small" disabled={busy}>
                      {t(busy ? "common.loading" : "ai.connect")}
                    </Button>
                  </div>
                </form>
              )}
              {connection.expiresAt && (
                <p className="ai-expiry">
                  <Clock aria-hidden="true" />
                  <Expiry
                    expiresAt={connection.expiresAt}
                    serverTime={settings.serverTime}
                  />
                </p>
              )}
              {connection.status === "expired" && (
                <p className="ai-notice">{t("ai.expiredHint")}</p>
              )}
              {connection.status === "connected" && (
                <button
                  className="ai-revoke"
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      await api(
                        "/ai/local-connection",
                        "DELETE",
                        undefined,
                        lifecycle.current.signal,
                      );
                      clearToken();
                      await refresh();
                    })
                  }
                >
                  {t("ai.revoke")}
                </button>
              )}
            </>
          ) : (
            <p className="ai-fine-print">
              {t(
                connection.status === "connected"
                  ? "ai.managedReady"
                  : "ai.managedMissing",
              )}
            </p>
          )}
          {connection.errorCode && connection.status !== "expired" && (
            <p className="ai-notice" role="alert">
              {t(`errors.${connection.errorCode}`)}
            </p>
          )}
          <div className="ai-usage">
            <div className="ai-section-heading">
              <h2>{t("ai.usage")}</h2>
              <span className="ai-pill ai-text-pill">
                {t("ai.noLocalLimit")}
              </span>
            </div>
            {usage.isError ? (
              <ErrorState
                error={usage.error}
                retry={() => void usage.refetch()}
              />
            ) : !usage.data ? (
              <Loading />
            ) : (
              <Usage value={usage.data} />
            )}
          </div>
        </aside>
      </div>
      {error && (
        <div className="ai-notice" role="alert">
          {error}
          <Button variant="outline" size="small" onClick={() => void refresh()}>
            {t("ai.reload")}
          </Button>
        </div>
      )}
      <footer className="ai-footer">
        <span aria-live="polite">
          {t(dirty ? "ai.unsaved" : "ai.noChanges")}
        </span>
        <div className="ai-actions">
          <Button
            variant="outline"
            disabled={busy || !dirty}
            onClick={() => {
              clearToken();
              setSource(initial.source);
              setModels(initial.models);
              setError(undefined);
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button disabled={!canSave} onClick={save}>
            {t(local ? "ai.saveLocal" : "ai.saveManaged")}
          </Button>
        </div>
      </footer>
    </main>
  );
}
function Expiry({
  expiresAt,
  serverTime,
}: {
  expiresAt: string;
  serverTime: string;
}) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(timer);
  }, [expiresAt, serverTime]);
  const minutes = Math.max(
    0,
    Math.ceil(
      (Date.parse(expiresAt) - Date.parse(serverTime) - elapsed) / 60000,
    ),
  );
  return (
    <span>
      {t(minutes ? "ai.expires" : "ai.connection.expired", { count: minutes })}
    </span>
  );
}
function Usage({ value }: { value: AiUsage }) {
  const { t, i18n } = useTranslation();
  const n = (num: number) => num.toLocaleString(i18n.language);
  return (
    <>
      <p className="ai-usage-total">
        <strong>{n(value.confirmed)}</strong>
        <span>{t("ai.tokens")}</span>
      </p>
      <div className="ai-usage-metrics">
        <div>
          <small>{t("ai.input")}</small>
          <strong>{n(value.input)}</strong>
        </div>
        <div>
          <small>{t("ai.output")}</small>
          <strong>{n(value.output)}</strong>
        </div>
      </div>
      {value.thinking > 0 && (
        <p className="ai-fine-print">
          {t("ai.thinking", { value: n(value.thinking) })}
        </p>
      )}
      {(value.reserved > 0 || value.unknownOperations > 0) && (
        <p className="ai-fine-print">
          {t("ai.reservations", {
            reserved: n(value.reserved),
            estimated: n(value.estimated),
            count: value.unknownOperations,
          })}
        </p>
      )}
      <p className="ai-fine-print">
        {t("ai.imagesObserved", { count: value.imageOperations })}
      </p>
      <p className="ai-fine-print">
        {t("ai.observedWindow", {
          time: new Date(value.resetsAt).toLocaleTimeString(i18n.language, {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })}
      </p>
      <p className="ai-fine-print">{t("ai.unlimitedUsageHint")}</p>
      <p className="ai-fine-print">{t("ai.quotaUnknown")}</p>
    </>
  );
}
function ModelTest({
  feature,
  model,
  source,
  revision,
  disabled,
}: {
  feature: AiFeature;
  model?: AiModel;
  source: AiSource;
  revision?: string;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const scope = useScope();
  const [operation, setOperation] = useState<AiOperation>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string>();
  const inFlight = useRef(false);
  const active = useRef<string | undefined>(undefined);
  const lifecycle = useRef(new AbortController());
  useEffect(() => {
    lifecycle.current = new AbortController();
    return () => {
      lifecycle.current.abort();
      if (active.current)
        void api(`/ai/model-tests/${active.current}`, "DELETE").catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (!operation?.previewAvailable || !operation.previewExpiresAt) return;
    const control = new AbortController();
    let url: string | undefined;
    const timer = setTimeout(
      () => {
        if (url) URL.revokeObjectURL(url);
        setPreview(undefined);
      },
      Math.max(0, Date.parse(operation.previewExpiresAt) - Date.now()),
    );
    void request(`/ai/model-tests/${operation.id}/image`, {
      signal: control.signal,
      cache: "no-store",
    })
      .then((response) => response.blob())
      .then((blob) => {
        if (!control.signal.aborted) {
          url = URL.createObjectURL(blob);
          setPreview(url);
        }
      })
      .catch((e) => {
        if (!control.signal.aborted) setError(errorText(e));
      });
    return () => {
      control.abort();
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [operation?.id, operation?.previewAvailable, operation?.previewExpiresAt]);
  const run = async () => {
    if (inFlight.current || !model || !revision) return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    setOperation(undefined);
    setPreview(undefined);
    const id = crypto.randomUUID();
    active.current = id;
    const signal = lifecycle.current.signal;
    try {
      let result = await api<AiOperation>(
        "/ai/model-tests",
        "POST",
        {
          operationId: id,
          feature,
          modelId: model.id,
          source,
          connectionRevision: revision,
        },
        signal,
      );
      while (!signal.aborted) {
        setOperation(result);
        if (!["queued", "running"].includes(result.status)) {
          active.current = undefined;
          break;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 700));
        if (signal.aborted) break;
        result = await api<AiOperation>(
          `/ai/model-tests/${id}`,
          "GET",
          undefined,
          signal,
        );
      }
      void queryClient.invalidateQueries({
        queryKey: [...scope.key, "ai-usage"],
      });
    } catch (e) {
      if (!signal.aborted) setError(errorText(e));
    } finally {
      inFlight.current = false;
      if (!signal.aborted) setBusy(false);
    }
  };
  return (
    <div className="ai-model-test">
      <div className="ai-actions">
        {busy && (
          <Button
            size="small"
            variant="outline"
            onClick={() =>
              void api(`/ai/model-tests/${active.current}`, "DELETE").catch(
                (e) => setError(errorText(e)),
              )
            }
          >
            <Square aria-hidden="true" />
            {t("ai.cancelTest")}
          </Button>
        )}
        <Button
          size="small"
          variant="outline"
          onClick={() => void run()}
          disabled={busy || disabled || !model || !revision}
        >
          <Play aria-hidden="true" />
          {t("ai.testModel")}
        </Button>
      </div>
      {error && (
        <p className="ai-notice" role="alert">
          {error}
        </p>
      )}
      {operation && (
        <div className="ai-test-result" aria-live="polite">
          <span>
            {operation.errorCode
              ? t(`errors.${operation.errorCode}`)
              : t(`ai.operation.${operation.status}`)}
          </span>
          {operation.text && <p>{operation.text}</p>}
          {preview && <img src={preview} alt={t("ai.previewAlt")} />}
          {operation.previewExpiresAt && <small>{t("ai.previewHint")}</small>}
        </div>
      )}
    </div>
  );
}
