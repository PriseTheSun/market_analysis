import { useId, useState, type ComponentProps } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Info,
  History,
  X,
  ShieldCheck,
  Check,
  ChevronDown,
  ArrowUpRight,
  RefreshCw,
  UserRound,
  Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  activityActionSchema,
  canonicalAppPath,
  type ActivityModule,
  type ActivityPage,
  type ActivityItem,
} from "@market/contracts";
import { api } from "../lib/api";
import { useScope } from "../lib/scope";
import { useSession } from "../lib/session";
import { LocalizedLink } from "../lib/navigation";
import { Button } from "./ui/button";
import { Empty, ErrorState, Loading, Pagination } from "./ui/common";
import "./module-info.css";

export function routeActivityModule(
  pathname: string,
): ActivityModule | undefined {
  const path = canonicalAppPath(pathname);
  if (path.startsWith("/agencies/")) return "clients";
  const last = path.split("/").at(-1);
  if (last === "ai-settings") return "ai";
  if (
    [
      "management",
      "clients",
      "members",
      "requests",
      "files",
      "chat",
      "preferences",
      "notifications",
      "audit",
    ].includes(last ?? "")
  )
    return last as ActivityModule;
}
function Select(props: ComponentProps<"select">) {
  return (
    <span className="activity-select">
      <select {...props} />
      <ChevronDown aria-hidden="true" />
    </span>
  );
}
export function ModuleInfo() {
  const { pathname } = useLocation();
  const module = routeActivityModule(pathname);
  if (!module) return null;
  return <ModuleInfoDialog key={pathname} module={module} />;
}
function ModuleInfoDialog({ module }: { module: ActivityModule }) {
  const { t } = useTranslation(),
    scope = useScope(),
    { agencyId } = useParams();
  const [open, setOpen] = useState(false),
    [tab, setTab] = useState<"about" | "history">("about");
  const [period, setPeriod] = useState("30"),
    [action, setAction] = useState(""),
    [person, setPerson] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const id = useId();
  const query = new URLSearchParams({
    module,
    period,
    person,
    search,
    page: String(page),
    pageSize: "15",
  });
  if (scope.tenant) query.set("tenantId", scope.tenant.id);
  if (agencyId) query.set("agencyId", agencyId);
  if (action) query.set("action", action);
  const result = useQuery({
    queryKey: [...scope.key, "activities", query.toString()],
    queryFn: ({ signal }) =>
      api<ActivityPage>(`/activities?${query}`, "GET", undefined, signal),
    enabled: open,
    staleTime: 0,
  });
  const change =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="module-info-trigger"
          aria-label={t("activity.title")}
          title={t("activity.title")}
        >
          <Info aria-hidden="true" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="module-info-dialog">
          <header className="module-info-header">
            <span className="module-info-symbol">
              <Info aria-hidden="true" />
            </span>
            <div>
              <Dialog.Title>{t("activity.title")}</Dialog.Title>
              <Dialog.Description>
                {t("activity.module." + module)}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("common.close")}
              >
                <X />
              </Button>
            </Dialog.Close>
          </header>
          <div
            className="module-info-tabs"
            role="tablist"
            aria-label={t("activity.title")}
          >
            {(["about", "history"] as const).map((key) => (
              <button
                key={key}
                role="tab"
                id={`${id}-${key}-tab`}
                aria-selected={tab === key}
                aria-controls={`${id}-${key}`}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
                onKeyDown={(e) => {
                  if (
                    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  ) {
                    e.preventDefault();
                    const next =
                      e.key === "Home"
                        ? "about"
                        : e.key === "End"
                          ? "history"
                          : tab === "about"
                            ? "history"
                            : "about";
                    setTab(next);
                    document.getElementById(`${id}-${next}-tab`)?.focus();
                  }
                }}
              >
                {key === "about" ? <Info /> : <History />}
                {t(`activity.${key}`)}
              </button>
            ))}
          </div>
          <div
            className="module-info-body"
            role="tabpanel"
            id={`${id}-${tab}`}
            aria-labelledby={`${id}-${tab}-tab`}
            tabIndex={0}
          >
            {tab === "about" ? (
              <>
                <h3>{t("activity.module." + module)}</h3>
                <p className="module-info-description">
                  {t("activity.description." + module)}
                </p>
                {result.isPending ? (
                  <Loading />
                ) : result.isError ? (
                  <ErrorState
                    error={result.error}
                    retry={() => void result.refetch()}
                  />
                ) : (
                  <>
                    <div className="module-info-scope">
                      <ShieldCheck />
                      <div>
                        <span>{t("activity.scope")}</span>
                        <strong>
                          {result.data.scope.name ??
                            t("activity.scope." + result.data.scope.kind)}
                        </strong>
                      </div>
                      <span className="badge">
                        {
                          {
                            GLOBAL: "Global",
                            SUPER_ADMIN: "Super Admin",
                            ADMIN: "Admin",
                            USER: "User",
                          }[result.data.scope.role]
                        }
                      </span>
                    </div>
                    <h4>{t("activity.permissions")}</h4>
                    <ul className="module-info-capabilities">
                      {result.data.scope.capabilities.map((cap) => (
                        <li key={cap}>
                          <Check />
                          {t("activity.cap." + cap)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="module-info-note">
                  <ShieldCheck />
                  {t("activity.privacy")}
                </p>
                <p className="module-info-note">
                  <History />
                  {t("activity.retention")}
                </p>
              </>
            ) : (
              <>
                <form
                  className="activity-filters"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <label>
                    {t("activity.period")}
                    <Select value={period} onChange={change(setPeriod)}>
                      {["7", "30", "90"].map((days) => (
                        <option key={days} value={days}>
                          {t("activity.days", { count: Number(days) })}
                        </option>
                      ))}
                      <option value="all">{t("activity.allTime")}</option>
                    </Select>
                  </label>
                  <label>
                    {t("activity.action")}
                    <Select value={action} onChange={change(setAction)}>
                      <option value="">{t("activity.allActions")}</option>
                      {activityActionSchema.options.map((key) => (
                        <option key={key} value={key}>
                          {t("activity.action." + key)}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label>
                    {t("activity.person")}
                    <span className="activity-input">
                      <UserRound />
                      <input
                        value={person}
                        onChange={change(setPerson)}
                        placeholder={t("activity.personPlaceholder")}
                        maxLength={160}
                      />
                    </span>
                  </label>
                  <label>
                    {t("activity.record")}
                    <span className="activity-input">
                      <Search />
                      <input
                        value={search}
                        onChange={change(setSearch)}
                        placeholder={t("activity.recordPlaceholder")}
                        maxLength={160}
                      />
                    </span>
                  </label>
                </form>
                <div className="activity-results-bar">
                  <span aria-live="polite">
                    {result.data
                      ? t("activity.count", { count: result.data.total })
                      : t("common.loading")}
                  </span>
                  <div>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => {
                        setPeriod("30");
                        setAction("");
                        setPerson("");
                        setSearch("");
                        setPage(1);
                      }}
                    >
                      {t("activity.clear")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("activity.refresh")}
                      disabled={result.isFetching}
                      onClick={() => void result.refetch()}
                    >
                      <RefreshCw className={result.isFetching ? "spin" : ""} />
                    </Button>
                  </div>
                </div>
                {result.isPending ? (
                  <Loading />
                ) : result.isError ? (
                  <ErrorState
                    error={result.error}
                    retry={() => void result.refetch()}
                  />
                ) : result.data.items.length ? (
                  <>
                    <ol className="activity-timeline">
                      {result.data.items.map((item) => (
                        <ActivityRow
                          key={item.id}
                          item={item}
                          close={() => setOpen(false)}
                        />
                      ))}
                    </ol>
                    <Pagination
                      page={page}
                      total={result.data.total}
                      pageSize={result.data.pageSize}
                      onChange={setPage}
                    />
                  </>
                ) : (
                  <Empty
                    title={t("activity.empty")}
                    description={t("activity.emptySub")}
                  />
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function ActivityRow({
  item,
  close,
}: {
  item: ActivityItem;
  close: () => void;
}) {
  const { t, i18n } = useTranslation(),
    { session } = useSession();
  const actor = item.actor.system
    ? t("activity.system")
    : (item.actor.name ?? t("activity.formerUser"));
  const date = new Date(item.createdAt),
    timeZone = session?.preference.timeZone ?? "America/Sao_Paulo";
  const absolute = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
  const elapsed = (date.getTime() - Date.now()) / 1000;
  const unit: Intl.RelativeTimeFormatUnit =
    Math.abs(elapsed) < 60
      ? "second"
      : Math.abs(elapsed) < 3600
        ? "minute"
        : Math.abs(elapsed) < 86400
          ? "hour"
          : "day";
  const relative = new Intl.RelativeTimeFormat(i18n.language, {
    numeric: "auto",
  }).format(
    Math.round(
      elapsed /
        { second: 1, minute: 60, hour: 3600, day: 86400 }[
          unit as "second" | "minute" | "hour" | "day"
        ],
    ),
    unit,
  );
  const value = (value: string | number | boolean | null, field: string) => {
    if (value === null) return t("activity.unset");
    if (typeof value === "boolean")
      return t(value ? "activity.yes" : "activity.no");
    if (typeof value !== "string") return String(value);
    if (field === "role" || field === "platformRole")
      return (
        (
          {
            GLOBAL: "Global",
            SUPER_ADMIN: "Super Admin",
            ADMIN: "Admin",
            USER: "User",
          } as Record<string, string>
        )[value] ?? value
      );
    if (field === "status")
      return t("status." + value, { defaultValue: value });
    if (field === "source")
      return t("ai.source." + value, { defaultValue: value });
    if (field === "theme")
      return t("preferences." + value, { defaultValue: value });
    return value;
  };
  return (
    <li className="activity-item">
      <span className="activity-avatar" aria-hidden="true">
        {item.actor.system ? (
          <History />
        ) : (
          actor
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((x) => x[0])
            .join("")
            .toUpperCase()
        )}
      </span>
      <div className="activity-item-body">
        <div className="activity-item-top">
          <strong>{actor}</strong>
          <time dateTime={item.createdAt} title={`${absolute} · ${timeZone}`}>
            {relative}
          </time>
        </div>
        <p className="activity-summary">
          <span className={`activity-action activity-${item.action}`}>
            {t("activity.action." + item.action)}
          </span>
          <span>
            {item.resourceName ?? t("activity.entity." + item.entity)}
          </span>
        </p>
        <p className="activity-context">
          {[
            t("activity.entity." + item.entity),
            item.agencyName,
            item.tenantName,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <details className="activity-detail">
          <summary>
            {t("activity.details")}
            <ChevronDown />
          </summary>
          <div>
            <p className="activity-exact-time">
              {absolute} · {timeZone}
            </p>
            {item.changes.length ? (
              <div className="activity-changes">
                <table>
                  <thead>
                    <tr>
                      <th>{t("activity.field")}</th>
                      <th>{t("activity.before")}</th>
                      <th>{t("activity.after")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.changes.map((change) => (
                      <tr key={change.field}>
                        <th scope="row">
                          {t("activity.field." + change.field)}
                        </th>
                        <td>{value(change.before, change.field)}</td>
                        <td>{value(change.after, change.field)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                {t(
                  item.detailsRecorded
                    ? "activity.noChanges"
                    : "activity.noDetails",
                )}
              </p>
            )}
            {item.reason && (
              <p className="activity-reason">
                <strong>{t("activity.reason")}: </strong>
                {item.reason}
              </p>
            )}
            {item.href && (
              <LocalizedLink
                to={item.href}
                className="activity-record-link"
                onClick={close}
              >
                {t("activity.view")}
                <ArrowUpRight />
              </LocalizedLink>
            )}
          </div>
        </details>
      </div>
    </li>
  );
}
