import { BlurFade } from "./magicui/blur-fade";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import {
  LocalizedLink as Link,
  LocalizedNavLink as NavLink,
  LocalizedNavigate as Navigate,
  useLocalizedNavigate as useNavigate,
} from "../lib/navigation";
import { useQuery } from "@tanstack/react-query";
import type { Context, Page, PublicUser } from "@market/contracts";
import { canonicalAppPath } from "@market/contracts";
import {
  Bell,
  LayoutGrid,
  MessageSquare,
  Files,
  Users,
  ClipboardList,
  Settings,
  Building2,
  Layers,
  LogOut,
  Menu,
  ChevronsLeft,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "./user-avatar";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { api, errorText, queryClient, resetCsrf } from "../lib/api";
import { useSession } from "../lib/session";
import {
  lastWorkspace,
  loadAllAgencies,
  groupWorkspaces,
  rememberWorkspace,
  workspaceDestination,
  type AgencyContext,
} from "../lib/workspace";
import { Language } from "./language";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { Loading, Empty, ErrorState } from "./ui/common";
import { Tour } from "./tour";
import { Tooltip, TooltipProvider } from "./ui/tooltip";
import { PAGE_SIZE } from "../lib/pagination";
import { ScopeContext, useScope, type Scope } from "../lib/scope";
export { useScope } from "../lib/scope";
export function Protected() {
  const { session, loading } = useSession();
  if (loading) return <Loading />;
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
function useContexts(userId: string) {
  return useQuery({
    queryKey: [userId, "contexts"],
    queryFn: ({ signal }) =>
      api<Context[]>("/contexts", "GET", undefined, signal),
  });
}
function useAgencies(userId: string, enabled = true) {
  return useQuery({
    queryKey: [userId, "agencies"],
    queryFn: ({ signal }) =>
      loadAllAgencies((page) =>
        api<Page<AgencyContext>>(
          `/agencies?page=${page}&pageSize=100`,
          "GET",
          undefined,
          signal,
        ),
      ),
    enabled,
  });
}
export function WorkspaceEntry() {
  const { session } = useSession();
  const { t } = useTranslation();
  const user = session!.user;
  const contexts = useContexts(user.id);
  const needsAgency =
    contexts.isSuccess &&
    !contexts.data.length &&
    user.platformRole !== "GLOBAL";
  const agencies = useAgencies(user.id, needsAgency);
  if (contexts.isPending || (needsAgency && agencies.isPending))
    return <Loading />;
  if (contexts.isError)
    return (
      <ErrorState
        error={contexts.error}
        retry={() => void contexts.refetch()}
      />
    );
  if (needsAgency && agencies.isError)
    return (
      <ErrorState
        error={agencies.error}
        retry={() => void agencies.refetch()}
      />
    );
  const destination = workspaceDestination(
    user,
    contexts.data,
    agencies.data ?? [],
    lastWorkspace(user.id),
  );
  if (destination) return <Navigate to={destination} replace />;
  return (
    <div className="context-page">
      <header>
        <img
          className="brand-dark"
          src="/brand/logo-dark.svg"
          alt="Market Analysis"
        />
        <Language />
      </header>
      <main>
        <Empty
          title={t("shell.noAccess")}
          description={t("shell.noAccessSub")}
        />
        <div className="context-tools">
          <Button
            variant="outline"
            onClick={() =>
              void Promise.allSettled([contexts.refetch(), agencies.refetch()])
            }
          >
            {t("common.retry")}
          </Button>
          <Logout />
        </div>
      </main>
    </div>
  );
}
function WorkspaceSwitcher({
  tenant,
  user,
  contexts,
}: {
  tenant?: Context;
  user: PublicUser;
  contexts: Context[];
}) {
  const { t, i18n } = useTranslation();
  const { agencyId } = useParams();
  const agencies = useAgencies(user.id);
  const currentAgencyId = tenant?.agencyId ?? agencyId;
  const [expandedId, setExpandedId] = useState(currentAgencyId);
  const groups = useMemo(
    () => groupWorkspaces(agencies.data ?? [], contexts, i18n.language),
    [agencies.data, contexts, i18n.language],
  );
  const agency = groups.find((item) => item.id === agencyId);
  return (
    <Dropdown.Root
      onOpenChange={(open) => {
        if (open) {
          setExpandedId(currentAgencyId);
          void agencies.refetch();
          void queryClient.invalidateQueries({
            queryKey: [user.id, "contexts"],
          });
        }
      }}
    >
      <Dropdown.Trigger asChild>
        <button
          className="scope-switch"
          data-tour="context"
          aria-label={t("shell.switch")}
        >
          <Building2 className="scope-leading-icon" aria-hidden="true" />
          <span>
            <small>
              {tenant?.agencyName ??
                t(
                  agencyId
                    ? "admin.agency"
                    : user.platformRole === "GLOBAL"
                      ? "shell.platform"
                      : "shell.agencyArea",
                )}
            </small>
            <strong>{tenant?.name ?? agency?.name ?? "Market Analysis"}</strong>
          </span>
          <ChevronDown aria-hidden="true" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          className="workspace-menu"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          aria-label={t("shell.switch")}
        >
          <Dropdown.Label className="workspace-label">
            {t("shell.switch")}
          </Dropdown.Label>
          {(user.platformRole === "GLOBAL" ||
            groups.some((group) => group.canManage)) && (
            <>
              <Dropdown.Item asChild>
                <Link
                  to="/platform/management"
                  aria-current={!tenant && !agencyId ? "page" : undefined}
                >
                  <ShieldCheck aria-hidden="true" />
                  <span>
                    {t(
                      user.platformRole === "GLOBAL"
                        ? "shell.platform"
                        : "management.title",
                    )}
                  </span>
                  {!tenant && !agencyId && (
                    <Check className="workspace-current" aria-hidden="true" />
                  )}
                </Link>
              </Dropdown.Item>
              <Dropdown.Separator />
            </>
          )}
          <Dropdown.Label className="workspace-label">
            {t("shell.agencies")}
          </Dropdown.Label>
          {groups.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <Dropdown.Group key={item.id}>
                <Dropdown.Item
                  className="workspace-agency"
                  textValue={item.name}
                  disabled={item.active === false}
                  aria-expanded={expanded}
                  aria-controls={
                    expanded ? `workspace-clients-${item.id}` : undefined
                  }
                  data-current={currentAgencyId === item.id || undefined}
                  onSelect={(event) => {
                    event.preventDefault();
                    setExpandedId(expanded ? undefined : item.id);
                  }}
                >
                  <Building2 aria-hidden="true" />
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.active === false
                        ? t("common.inactive")
                        : t(
                            item.clients.length === 1
                              ? "shell.clientCountOne"
                              : "shell.clientCount",
                            { count: item.clients.length },
                          )}
                    </small>
                  </span>
                  <ChevronDown
                    className="workspace-expand"
                    aria-hidden="true"
                  />
                </Dropdown.Item>
                {expanded && item.active !== false && (
                  <Dropdown.Group
                    className="workspace-clients"
                    id={`workspace-clients-${item.id}`}
                    aria-label={t("shell.agencyClients", { name: item.name })}
                  >
                    {item.canManage && (
                      <Dropdown.Item asChild>
                        <Link
                          to={`/agencies/${item.id}`}
                          aria-current={
                            agencyId === item.id ? "page" : undefined
                          }
                        >
                          <Layers aria-hidden="true" />
                          <span>{t("shell.openAgency")}</span>
                          {agencyId === item.id && (
                            <Check
                              className="workspace-current"
                              aria-hidden="true"
                            />
                          )}
                        </Link>
                      </Dropdown.Item>
                    )}
                    {item.clients.map((client) => (
                      <Dropdown.Item key={client.id} asChild>
                        <Link
                          to={`/app/${client.id}/chat`}
                          aria-current={
                            tenant?.id === client.id ? "page" : undefined
                          }
                        >
                          <span
                            className="workspace-client-avatar"
                            aria-hidden="true"
                          >
                            {client.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span>
                            <strong>{client.name}</strong>
                            <small>{t("admin.client")}</small>
                          </span>
                          {tenant?.id === client.id && (
                            <Check
                              className="workspace-current"
                              aria-hidden="true"
                            />
                          )}
                        </Link>
                      </Dropdown.Item>
                    ))}
                    {!item.clients.length && (
                      <p className="workspace-empty">
                        {t("shell.noAgencyClients")}
                      </p>
                    )}
                  </Dropdown.Group>
                )}
              </Dropdown.Group>
            );
          })}
          {agencies.isPending && <Loading />}
          {agencies.isError && (
            <ErrorState
              error={agencies.error}
              retry={() => void agencies.refetch()}
            />
          )}
          {agencies.isSuccess && !groups.length && (
            <p className="workspace-empty">{t("shell.noAccess")}</p>
          )}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
function useLogout() {
  const navigate = useNavigate();
  return async () => {
    try {
      await api("/auth/logout", "POST", {});
      await queryClient.cancelQueries();
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== "session",
      });
      resetCsrf();
      queryClient.setQueryData(["session"], null);
      navigate("/login", { replace: true });
    } catch (e) {
      toast.error(errorText(e));
    }
  };
}
export function Logout() {
  const { t } = useTranslation();
  const logout = useLogout();
  return (
    <Button variant="ghost" onClick={() => void logout()}>
      <LogOut />
      {t("common.logout")}
    </Button>
  );
}
function AccountMenu({
  user,
  role,
  preferencesPath,
  inDrawer = false,
}: {
  user: PublicUser;
  role: string;
  preferencesPath?: string;
  inDrawer?: boolean;
}) {
  const { t } = useTranslation();
  const logout = useLogout();
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          className="platform-account-trigger"
          aria-label={t("shell.accountMenu", { name: user.name })}
        >
          <UserAvatar user={user} />
          <span className="platform-account-identity">
            <strong>{user.name}</strong>
            <small>{role}</small>
          </span>
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          className="platform-account-menu"
          side={inDrawer ? "top" : "right"}
          align={inDrawer ? "start" : "end"}
          sideOffset={inDrawer ? 8 : 0}
          alignOffset={inDrawer ? 0 : 25}
          collisionPadding={12}
        >
          {preferencesPath && (
            <>
              <Dropdown.Item asChild>
                <Link to={preferencesPath}>
                  <Settings aria-hidden="true" />
                  {t("shell.preferences")}
                </Link>
              </Dropdown.Item>
              <Dropdown.Separator />
            </>
          )}
          <Dropdown.Item onSelect={() => void logout()}>
            <LogOut aria-hidden="true" />
            {t("common.logout")}
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
export function Shell() {
  const { tenantId, agencyId } = useParams();
  const { session } = useSession();
  const user = session!.user;
  const q = useContexts(user.id);
  const agencyQuery = useAgencies(
    user.id,
    !!agencyId || user.platformRole !== "GLOBAL",
  );
  const location = useLocation();
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorState error={q.error} />;
  const tenant = q.data.find((x) => x.id === tenantId);
  if (tenantId && !tenant)
    return (
      <div className="page">
        <Empty title="403" description="" />
        <Link to="/app">Market Analysis</Link>
      </div>
    );
  const platformPath = canonicalAppPath(location.pathname);
  const isManagementRoute = [
    "/platform/management",
    "/platform/agencies",
    "/platform/clients",
    "/platform/users",
  ].includes(platformPath);
  const canManage =
    user.platformRole === "GLOBAL" ||
    !!agencyQuery.data?.some((agency) => agency.active !== false);
  if (platformPath.startsWith("/platform") && user.platformRole !== "GLOBAL") {
    if (!isManagementRoute) return <Navigate to="/app" replace />;
    if (agencyQuery.isPending) return <Loading />;
    if (agencyQuery.isError)
      return (
        <ErrorState
          error={agencyQuery.error}
          retry={() => void agencyQuery.refetch()}
        />
      );
    if (!canManage) return <Navigate to="/app" replace />;
  }
  if (agencyId && agencyQuery.isPending) return <Loading />;
  if (
    agencyId &&
    !agencyQuery.data?.some((a) => a.id === agencyId && a.active !== false)
  )
    return <Navigate to="/app" replace />;
  return (
    <ScopedShell
      key={user.id + ":" + (tenantId ?? agencyId ?? "platform")}
      tenant={tenant}
      user={user}
      contexts={q.data}
      canManage={canManage}
    />
  );
}
function ScopedShell({
  tenant,
  user,
  contexts,
  canManage,
}: {
  tenant?: Context;
  user: PublicUser;
  contexts: Context[];
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [drawer, setDrawer] = useState(false),
    [collapsed, setCollapsed] = useState(() => {
      try {
        return localStorage.getItem(`ma:sidebar:${user.id}`) === "collapsed";
      } catch {
        return false;
      }
    });
  useEffect(() => {
    try {
      localStorage.setItem(
        `ma:sidebar:${user.id}`,
        collapsed ? "collapsed" : "expanded",
      );
    } catch {
      // The menu remains usable when browser storage is unavailable.
    }
  }, [collapsed, user.id]);
  const location = useLocation();
  const { agencyId } = useParams();
  const scopeId = tenant?.id ?? agencyId ?? "platform";
  const controller = useRef(new AbortController());
  const key = useMemo(() => [user.id, scopeId], [user.id, scopeId]);
  const prefix = tenant ? `/tenants/${tenant.id}` : "";
  const scope = useMemo<Scope>(
    () => ({
      tenant,
      user,
      key,
      prefix,
      call: (path, method = "GET", body) =>
        api(path, method, body, controller.current.signal),
    }),
    [tenant, user, key, prefix, controller],
  );
  useEffect(() => {
    controller.current = new AbortController();
    return () => {
      controller.current.abort();
      void queryClient.cancelQueries({ queryKey: key });
      queryClient.removeQueries({ queryKey: key });
    };
  }, [key]);
  const activeTenantId = tenant?.id;
  useEffect(() => {
    if (activeTenantId) rememberWorkspace(user.id, activeTenantId);
  }, [user.id, activeTenantId]);
  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);
  const nav = tenant
    ? [
        { to: "chat", label: "shell.chat", icon: MessageSquare },
        ...(tenant.role !== "USER"
          ? [
              { to: "files", label: "shell.files", icon: Files },
              { to: "members", label: "shell.members", icon: Users },
              { to: "requests", label: "shell.requests", icon: ClipboardList },
            ]
          : []),
        ...(user.platformRole === "GLOBAL"
          ? [{ to: "audit", label: "admin.audit", icon: ShieldCheck }]
          : []),
        { to: "notifications", label: "shell.notifications", icon: Bell },
        { to: "preferences", label: "shell.preferences", icon: Settings },
        ...(user.platformRole === "GLOBAL"
          ? [
              {
                to: "/platform/management",
                label: "shell.platform",
                icon: ShieldCheck,
              },
            ]
          : tenant.role === "SUPER_ADMIN"
            ? [
                {
                  to: `/agencies/${tenant.agencyId}`,
                  label: "shell.agencyArea",
                  icon: Building2,
                },
              ]
            : []),
        ...(canManage && user.platformRole !== "GLOBAL"
          ? [
              {
                to: "/platform/management",
                label: "management.title",
                icon: LayoutGrid,
              },
            ]
          : []),
      ]
    : agencyId
      ? [
          {
            to: `/agencies/${agencyId}`,
            label: "shell.clients",
            icon: Layers,
          },
          ...(canManage
            ? [
                {
                  to: "/platform/management",
                  label: "management.title",
                  icon: LayoutGrid,
                },
              ]
            : []),
        ]
      : user.platformRole !== "GLOBAL"
        ? [
            {
              to: "/platform/management",
              label: "management.title",
              icon: LayoutGrid,
            },
          ]
        : [
            {
              to: "/platform/management",
              label: "management.title",
              icon: LayoutGrid,
            },
            {
              to: "/platform/requests",
              label: "shell.requests",
              icon: ClipboardList,
            },
            {
              to: "/platform/notifications",
              label: "shell.notifications",
              icon: Bell,
            },
            {
              to: "/platform/preferences",
              label: "shell.preferences",
              icon: Settings,
            },
          ];
  const preferencesTenant =
    tenant ??
    contexts.find((context) => !agencyId || context.agencyId === agencyId);
  const preferencesPath = tenant
    ? `/app/${tenant.id}/preferences`
    : user.platformRole === "GLOBAL"
      ? "/platform/preferences"
      : preferencesTenant
        ? `/app/${preferencesTenant.id}/preferences`
        : undefined;
  const links = (inDrawer = false) => (
    <>
      <div className="sidebar-brand-row">
        <Link className="sidebar-brand" to="/app">
          <img
            className="brand-dark"
            src="/brand/logo-dark.svg"
            alt="Market Analysis"
          />
        </Link>
      </div>
      <p className="platform-nav-label">
        {tenant
          ? tenant.name
          : t(
              agencyId || user.platformRole !== "GLOBAL"
                ? "shell.agencyArea"
                : "shell.platformLabel",
            )}
      </p>
      <nav aria-label="Market Analysis">
        {nav
          .filter((item) => item.label !== "shell.preferences")
          .map((item) => (
            <Tooltip key={item.to} label={t(item.label)}>
              <NavLink
                to={
                  item.to.startsWith("/")
                    ? item.to
                    : `/app/${tenant!.id}/${item.to}`
                }
                className={
                  item.label === "shell.notifications"
                    ? "nav-section-start"
                    : undefined
                }
                data-tour={item.to}
                aria-label={t(item.label)}
              >
                <item.icon aria-hidden="true" />
                <span aria-hidden={collapsed && !inDrawer}>
                  {t(item.label)}
                </span>
              </NavLink>
            </Tooltip>
          ))}
      </nav>
      <div className="sidebar-bottom">
        <AccountMenu
          user={user}
          role={
            user.platformRole === "GLOBAL"
              ? t("shell.platform")
              : (tenant?.role ??
                t(canManage ? "role.SUPER_ADMIN" : "shell.agencyArea"))
          }
          preferencesPath={preferencesPath}
          inDrawer={inDrawer}
        />
      </div>
    </>
  );
  return (
    <ScopeContext.Provider value={scope}>
      <TooltipProvider delayDuration={350}>
        <motion.div
          className={"app-shell" + (collapsed ? " collapsed" : "")}
          initial={false}
          animate={{ "--sidebar-progress": collapsed ? 0 : 1 }}
          transition={{
            duration: reducedMotion ? 0 : 0.28,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <aside className="sidebar">{links()}</aside>
          <Dialog.Root open={drawer} onOpenChange={setDrawer}>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay sidebar-overlay" />
              <Dialog.Content
                className="mobile-drawer"
                aria-describedby={undefined}
              >
                <Dialog.Title className="sr-only">
                  {t("shell.menu")}
                </Dialog.Title>
                <Dialog.Close
                  className="icon-button dialog-close"
                  aria-label={t("common.close")}
                >
                  <X />
                </Dialog.Close>
                {links(true)}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <div className="workspace">
            <header className="app-header">
              <button
                className="icon-button menu-toggle"
                onClick={() => setDrawer(true)}
                aria-label={t("shell.menu")}
              >
                <Menu />
              </button>
              <div className="platform-header-context">
                <Tooltip
                  label={t(collapsed ? "shell.expand" : "shell.collapse")}
                  side="bottom"
                >
                  <button
                    className="icon-button sidebar-toggle"
                    onClick={() => setCollapsed((value) => !value)}
                    aria-label={t(
                      collapsed ? "shell.expand" : "shell.collapse",
                    )}
                    aria-expanded={!collapsed}
                  >
                    <ChevronsLeft aria-hidden="true" />
                  </button>
                </Tooltip>
                <WorkspaceSwitcher
                  tenant={tenant}
                  user={user}
                  contexts={contexts}
                />
              </div>
              <div className="header-tools">
                {!agencyId && (tenant || user.platformRole === "GLOBAL") && (
                  <NotificationBell />
                )}
                <ThemeToggle />
                <Language />
              </div>
            </header>
            {tenant && <Tour />}
            <BlurFade
              key={canonicalAppPath(location.pathname)}
              className="route-content"
            >
              <Outlet />
            </BlurFade>
          </div>
        </motion.div>
      </TooltipProvider>
    </ScopeContext.Provider>
  );
}
interface Notification {
  id: string;
  type: string;
  parameters: Record<string, string>;
  readAt: string | null;
  createdAt: string;
}
export type NotificationsPage = Page<Notification> & { unread: number };
export function useNotifications(page = 1) {
  const s = useScope();
  return useQuery({
    queryKey: [...s.key, "notifications", page, PAGE_SIZE],
    queryFn: ({ signal }) =>
      api<NotificationsPage>(
        s.prefix + `/notifications?page=${page}&pageSize=${PAGE_SIZE}`,
        "GET",
        undefined,
        signal,
      ),
    refetchInterval: () => (document.hidden ? false : 30000),
    refetchIntervalInBackground: false,
  });
}
function NotificationBell() {
  const { t } = useTranslation();
  const s = useScope(),
    q = useNotifications();
  const navigate = useNavigate();
  const path = s.tenant
    ? `/app/${s.tenant.id}/notifications`
    : "/platform/notifications";
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          className="notification-bell icon-button"
          data-tour="notifications"
          aria-label={
            t("shell.notifications") +
            (q.data?.unread ? ` (${q.data.unread})` : "")
          }
        >
          <Bell />
          {!!q.data?.unread && (
            <span className="notification-count">
              {q.data.unread > 99 ? "99+" : q.data.unread}
            </span>
          )}
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          className="notification-popover"
          align="end"
          sideOffset={12}
        >
          <Dropdown.Label>{t("shell.notifications")}</Dropdown.Label>
          {q.isPending ? (
            <Loading />
          ) : q.isError ? (
            <ErrorState error={q.error} />
          ) : q.data.items.length ? (
            q.data.items.slice(0, 5).map((n) => (
              <Dropdown.Item
                key={n.id}
                onSelect={() => navigate(path)}
                className={n.readAt ? "read" : "unread"}
              >
                {t("notification." + n.type, {
                  ...n.parameters,
                  defaultValue: t("shell.notifications"),
                })}
              </Dropdown.Item>
            ))
          ) : (
            <p>{t("notifications.empty")}</p>
          )}
          <Dropdown.Separator />
          <Dropdown.Item onSelect={() => navigate(path)}>
            {t("notifications.all")}
            <ArrowRight />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const { tenant, user } = useScope();
  const { agencyId } = useParams();
  const home = tenant
    ? `/app/${tenant.id}/chat`
    : agencyId
      ? `/agencies/${agencyId}`
      : "/platform/management";
  return (
    <>
      <nav className="platform-breadcrumb" aria-label={t("shell.breadcrumb")}>
        <ol>
          <li>
            <Link to={home}>
              {tenant?.name ??
                t(
                  agencyId || user.platformRole !== "GLOBAL"
                    ? "shell.agencyArea"
                    : "shell.platform",
                )}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {children}
      </div>
    </>
  );
}
