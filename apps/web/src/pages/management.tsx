import {
  RecordCollection,
  ViewToggle,
  useRecordView,
  RecordChips,
} from "../components/ui/collection";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import {
  Building2,
  Users,
  ShieldCheck,
  ContactRound,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Archive,
  Link2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  managementUserSchema,
  managementUserCreateSchema,
  managementAgencySchema,
  managementClientSchema,
  canonicalManagementTab,
  localizedManagementTab,
  permissionSchema,
  type ManagementKind,
  type ManagementUser,
  type ManagementAgency,
  type ManagementClient,
  type ManagementPermission,
  type ManagementOptions,
  type ManagementUserInput,
  type Page,
} from "@market/contracts";
import { api, errorText, queryClient } from "../lib/api";
import { PAGE_SIZE } from "../lib/pagination";
import { useScope, PageHeading } from "../components/shell";
import { Button } from "../components/ui/button";
import {
  RecordActions,
  RecordIdentity,
  TableSearch,
  ActiveStatus,
} from "../components/ui/table";
import {
  Field,
  Loading,
  ErrorState,
  Empty,
  Pagination,
  Badge,
  Password,
} from "../components/ui/common";
import "./management.css";

type RecordItem =
  ManagementUser | ManagementAgency | ManagementClient | ManagementPermission;
const managementTabs = [
  { key: "users", icon: Users },
  { key: "permissions", icon: ShieldCheck },
  { key: "agencies", icon: Building2 },
  { key: "clients", icon: ContactRound },
] as const;
const recordName = (item: RecordItem) =>
  "user" in item ? item.user.name : item.name;
const archived = (item: RecordItem) =>
  "archivedAt" in item && !!item.archivedAt;

export function Management() {
  const { t, i18n } = useTranslation(),
    scope = useScope();
  const display = useRecordView();
  const tabs =
    scope.user.platformRole === "GLOBAL"
      ? managementTabs
      : managementTabs.filter((tab) => tab.key === "permissions");
  const [params, setParams] = useSearchParams();
  const requestedTab = canonicalManagementTab(params.get("tab"));
  const tab = tabs.find((x) => x.key === requestedTab)?.key ?? tabs[0]!.key;
  const [search, setSearch] = useState("");
  const [agency, setAgency] = useState("");
  const [view, setView] = useState<"current" | "archived">("current");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<{
    kind: ManagementKind;
    item?: RecordItem;
  }>();
  const [deletion, setDeletion] = useState<{
    kind: ManagementKind;
    item: RecordItem;
  }>();
  const options = useQuery({
    queryKey: [...scope.key, "management-options"],
    queryFn: ({ signal }) =>
      api<ManagementOptions>(
        "/platform/management/options",
        "GET",
        undefined,
        signal,
      ),
  });
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    search,
    view: tab === "permissions" ? "current" : view,
  });
  if (agency && tab !== "agencies") query.set("agencyId", agency);
  const list = useQuery({
    queryKey: [...scope.key, "management", tab, query.toString()],
    queryFn: ({ signal }) =>
      api<Page<RecordItem>>(
        `/platform/management/${tab}?${query}`,
        "GET",
        undefined,
        signal,
      ),
  });
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: [scope.user.id] });
    await queryClient.invalidateQueries({ queryKey: ["session"] });
  }
  const switchTab = (next: ManagementKind) => {
    setParams((p) => {
      p.set("tab", localizedManagementTab(next, i18n.language));
      return p;
    });
    setSearch("");
    setAgency("");
    setView("current");
    setPage(1);
    setEdit(undefined);
    setDeletion(undefined);
  };
  function statusCell(
    item: ManagementUser | ManagementAgency | ManagementClient,
  ) {
    return (
      <td data-label={t("common.status")}>
        {archived(item) ? (
          <span className="record-status is-inactive">
            <Archive className="management-archive-icon" aria-hidden="true" />
            {t("management.archived")}
          </span>
        ) : "active" in item ? (
          <ActiveStatus active={item.active} />
        ) : item.status === "provisioning" ? (
          <Badge status={item.status} />
        ) : (
          <ActiveStatus active={item.status === "active"} />
        )}
      </td>
    );
  }
  function cells(item: RecordItem) {
    if (tab === "users") {
      const user = item as ManagementUser;
      return (
        <>
          <td data-label={t("management.user")}>
            <button
              className="management-identity"
              onClick={() => setEdit({ kind: tab, item })}
            >
              <RecordIdentity name={user.name} detail={user.email} />
            </button>
          </td>
          <td data-label={t("management.agencies")}>
            <RecordChips
              names={[
                ...user.agencies.map((m) => m.agency.name),
                ...user.tenants.map((m) => m.tenant.agency.name),
              ]}
              tone="agency"
              empty={t("collection.noAgencies")}
            />
          </td>
          <td data-label={t("management.clients")}>
            <RecordChips
              names={user.tenants.map((m) => m.tenant.name)}
              tone="client"
              empty={t("collection.noClients")}
            />
          </td>
          {statusCell(user)}
        </>
      );
    }
    if (tab === "permissions") {
      const permission = item as ManagementPermission;
      return (
        <>
          <td data-label={t("management.user")}>
            <button
              className="management-identity"
              onClick={() => setEdit({ kind: tab, item })}
            >
              <RecordIdentity
                name={permission.user.name}
                detail={permission.user.email}
              />
            </button>
          </td>
          <td data-label={t("management.permission")}>
            <span className="management-role">
              {t(`role.${permission.role}`)}
            </span>
          </td>
          <td data-label={t("management.scope")}>
            <strong>
              {permission.client?.name ??
                permission.agency?.name ??
                t("shell.platform")}
            </strong>
            {permission.client && (
              <small className="management-cell-detail">
                {permission.agency?.name}
              </small>
            )}
          </td>
        </>
      );
    }
    if (tab === "agencies") {
      const agency = item as ManagementAgency;
      return (
        <>
          <td data-label={t("admin.agency")}>
            <button
              className="management-identity"
              onClick={() => setEdit({ kind: tab, item })}
            >
              <RecordIdentity name={agency.name} detail={agency.slug} />
            </button>
          </td>
          {statusCell(agency)}
        </>
      );
    }
    const client = item as ManagementClient;
    return (
      <>
        <td data-label={t("admin.client")}>
          <button
            className="management-identity"
            onClick={() => setEdit({ kind: tab, item })}
          >
            <RecordIdentity name={client.name} detail={client.slug} />
          </button>
        </td>
        <td data-label={t("admin.agency")}>{client.agency.name}</td>
        {statusCell(client)}
      </>
    );
  }
  const columns =
    tab === "users"
      ? [
          "management.user",
          "management.agencies",
          "management.clients",
          "common.status",
        ]
      : tab === "permissions"
        ? ["management.user", "management.permission", "management.scope"]
        : tab === "agencies"
          ? ["admin.agency", "common.status"]
          : ["admin.client", "admin.agency", "common.status"];
  return (
    <main className="page management-page">
      <PageHeading
        title={t("management.title")}
        description={t(
          scope.user.platformRole === "GLOBAL"
            ? "management.description"
            : "management.permissionsDescription",
        )}
      />
      <div
        className="management-tabs"
        role="tablist"
        aria-label={t("management.title")}
      >
        {tabs.map(({ key, icon: Icon }, index) => (
          <button
            key={key}
            id={`management-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls="management-panel"
            tabIndex={tab === key ? 0 : -1}
            onClick={() => switchTab(key)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : undefined;
              if (next !== undefined) {
                event.preventDefault();
                const key = tabs[next]!.key;
                switchTab(key);
                document.getElementById(`management-tab-${key}`)?.focus();
              }
            }}
          >
            <Icon aria-hidden="true" />
            {t(`management.${key}`)}
          </button>
        ))}
      </div>
      <section
        id="management-panel"
        role="tabpanel"
        aria-labelledby={`management-tab-${tab}`}
      >
        <div className="management-toolbar">
          <TableSearch
            placeholder={t(
              tab === "users" || tab === "permissions"
                ? "management.searchUsers"
                : "admin.agencySearch",
            )}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {tab !== "agencies" && (
            <label className="management-filter">
              <Building2 aria-hidden="true" />
              <select
                aria-label={t("admin.agency")}
                value={agency}
                onChange={(e) => {
                  setAgency(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t("management.allAgencies")}</option>
                {options.data?.agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {tab !== "permissions" && (
            <label className="management-filter management-view-filter">
              <Archive aria-hidden="true" />
              <select
                aria-label={t("management.recordView")}
                value={view}
                onChange={(e) => {
                  setView(e.target.value as "current" | "archived");
                  setPage(1);
                }}
              >
                <option value="current">{t("management.notArchived")}</option>
                <option value="archived">
                  {t("management.archivedRecords")}
                </option>
              </select>
            </label>
          )}
          <ViewToggle {...display} />
          <Button onClick={() => setEdit({ kind: tab })}>
            <Plus aria-hidden="true" />
            {t(`management.create.${tab}`)}
          </Button>
        </div>
        {list.isPending ? (
          <Loading />
        ) : list.isError ? (
          <ErrorState error={list.error} retry={() => void list.refetch()} />
        ) : !list.data.items.length ? (
          <Empty
            title={t("management.empty")}
            description={t("management.emptyHint")}
          />
        ) : (
          <RecordCollection
            view={display.view}
            label={t(`management.${tab}`)}
            kind={tab}
            tableClassName="management-table"
            columns={[
              ...columns.map((c, index) => ({
                label: t(c),
                role:
                  index === 0
                    ? ("identity" as const)
                    : c === "common.status"
                      ? ("status" as const)
                      : ("detail" as const),
              })),
              { label: t("common.actions"), role: "actions" },
            ]}
          >
            {list.data.items.map((item) => (
              <tr
                key={item.id}
                data-selected={
                  edit?.item?.id === item.id ||
                  deletion?.item.id === item.id ||
                  undefined
                }
              >
                {cells(item)}
                <td data-label={t("common.actions")}>
                  <RecordActions name={recordName(item)}>
                    {archived(item) ? (
                      <Dropdown.Item
                        onSelect={() => setEdit({ kind: tab, item })}
                      >
                        <RotateCcw aria-hidden="true" />
                        {t("management.restore")}
                      </Dropdown.Item>
                    ) : (
                      <>
                        <Dropdown.Item
                          onSelect={() => setEdit({ kind: tab, item })}
                        >
                          <Pencil aria-hidden="true" />
                          {t("management.edit")}
                        </Dropdown.Item>
                        <Dropdown.Item
                          className="danger"
                          onSelect={() => setDeletion({ kind: tab, item })}
                        >
                          <Trash2 aria-hidden="true" />
                          {t("management.delete")}
                        </Dropdown.Item>
                      </>
                    )}
                  </RecordActions>
                </td>
              </tr>
            ))}
          </RecordCollection>
        )}
        <div className="management-list-footer">
          <div>
            <p>
              {t("management.count", { count: list.data?.items.length ?? 0 })}
            </p>
          </div>
          {!!list.data?.total && (
            <Pagination
              page={page}
              total={list.data.total}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          )}
        </div>
      </section>
      <Dialog.Root
        open={!!edit}
        onOpenChange={(open) => !open && setEdit(undefined)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="management-overlay" />
          <Dialog.Content
            className="management-modal"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            {edit && (
              <>
                <div className="management-modal-heading">
                  <Dialog.Title>
                    {t(
                      archived(edit.item ?? ({} as RecordItem))
                        ? "management.restore"
                        : edit.item
                          ? `management.edit.${edit.kind}`
                          : `management.create.${edit.kind}`,
                    )}
                  </Dialog.Title>
                  <Dialog.Description>
                    {t(
                      !edit.item && edit.kind === "users"
                        ? "management.createUserHint"
                        : `management.hint.${edit.kind}`,
                    )}
                  </Dialog.Description>
                  <Dialog.Close asChild>
                    <button
                      className="icon-button"
                      aria-label={t("common.close")}
                    >
                      <X />
                    </button>
                  </Dialog.Close>
                </div>
                {options.isPending ? (
                  <Loading />
                ) : options.isError ? (
                  <ErrorState
                    error={options.error}
                    retry={() => void options.refetch()}
                  />
                ) : (
                  <ManagementEditor
                    key={`${edit.kind}:${edit.item?.id ?? "new"}`}
                    kind={edit.kind}
                    item={edit.item}
                    options={options.data}
                    onClose={() => setEdit(undefined)}
                    onSaved={async (removed) => {
                      setEdit(undefined);
                      await refresh();
                      if (removed && list.data?.items.length === 1 && page > 1)
                        setPage(page - 1);
                    }}
                  />
                )}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {deletion && (
        <ManagementDeleteDialog
          kind={deletion.kind}
          item={deletion.item}
          onClose={() => setDeletion(undefined)}
          onDeleted={async () => {
            setDeletion(undefined);
            await refresh();
            if (list.data?.items.length === 1 && page > 1) setPage(page - 1);
          }}
        />
      )}
    </main>
  );
}

function ManagementDeleteDialog({
  kind,
  item,
  onClose,
  onDeleted,
}: {
  kind: ManagementKind;
  item: RecordItem;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(
        `/platform/management/${kind}/${encodeURIComponent(item.id)}`,
        "DELETE",
      );
      toast.success(t("common.saved"));
      await onDeleted();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root open onOpenChange={(open) => !open && !busy && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="management-overlay" />
        <Dialog.Content
          className="management-modal management-delete-dialog"
          aria-busy={busy}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <div className="management-modal-heading">
            <Dialog.Title>{t(`management.delete.${kind}`)}</Dialog.Title>
            <p className="management-delete-target">{recordName(item)}</p>
            <Dialog.Description>
              {t(
                kind === "permissions"
                  ? "management.revokeHint"
                  : `management.archiveHint.${kind}`,
              )}
            </Dialog.Description>
            {error && (
              <div className="field-error" role="alert">
                {error}
              </div>
            )}
          </div>
          <footer className="management-editor-footer">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {t(busy ? "common.saving" : "management.confirmDelete")}
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ManagementEditor({
  kind,
  item,
  options,
  onClose,
  onSaved,
}: {
  kind: ManagementKind;
  item?: RecordItem;
  options: ManagementOptions;
  onClose: () => void;
  onSaved: (removed?: boolean) => Promise<void>;
}) {
  const { t } = useTranslation();
  const user =
    kind === "users" ? (item as ManagementUser | undefined) : undefined;
  const permission =
    kind === "permissions"
      ? (item as ManagementPermission | undefined)
      : undefined;
  const client =
    kind === "clients" ? (item as ManagementClient | undefined) : undefined;
  const agency =
    kind === "agencies" ? (item as ManagementAgency | undefined) : undefined;
  const [values, setValues] = useState({
    name: user?.name ?? client?.name ?? agency?.name ?? "",
    email: user?.email ?? "",
    active: user?.active ?? agency?.active ?? true,
    slug: client?.slug ?? agency?.slug ?? "",
    status: client?.status === "disabled" ? "disabled" : "active",
    agencyId: client?.agencyId ?? permission?.agency?.id ?? "",
    adminId: "",
    userId: permission?.user.id ?? "",
    scope: permission?.scope ?? "CLIENT",
    tenantId: permission?.client?.id ?? "",
    role: permission?.role === "ADMIN" ? "ADMIN" : "USER",
  });
  const [links, setLinks] = useState<ManagementUserInput["clients"]>(
    user?.tenants.map((m) => ({
      agencyId: m.tenant.agencyId,
      tenantId: m.tenant.id,
      role: m.role,
    })) ?? [],
  );
  const [linkIndex, setLinkIndex] = useState(0);
  const canCreateDirect =
    kind === "users" && !item && options.role === "GLOBAL";
  const [directAccess, setDirectAccess] = useState(false);
  const [password, setPassword] = useState("");
  const [accessRole, setAccessRole] = useState<
    "GLOBAL" | "SUPER_ADMIN" | "ADMIN" | "USER"
  >("USER");
  const accessScope =
    accessRole === "GLOBAL"
      ? "GLOBAL"
      : accessRole === "SUPER_ADMIN"
        ? "AGENCY"
        : "CLIENT";
  const [directAgencyId, setDirectAgencyId] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isArchived = !!item && archived(item);
  const link = links[linkIndex];
  const clients = [
    ...options.clients,
    ...(permission?.client &&
    !options.clients.some((c) => c.id === permission.client!.id)
      ? [permission.client]
      : []),
    ...(user?.tenants
      .map((m) => m.tenant)
      .filter((c) => !options.clients.some((o) => o.id === c.id)) ?? []),
  ];
  const agencies = [
    ...options.agencies,
    ...[client?.agency, permission?.agency, ...clients.map((c) => c.agency)]
      .filter((a): a is ManagementAgency => !!a)
      .filter((a) => !options.agencies.some((o) => o.id === a.id)),
  ].filter((a, i, all) => all.findIndex((o) => o.id === a.id) === i);
  const set = (key: keyof typeof values, value: string | boolean) =>
    setValues((v) => ({ ...v, [key]: value }));
  const fieldError = (key: string) =>
    errors[key] ? t("common.required") : undefined;
  const agencyOptions = agencies.map((a) => (
    <option key={a.id} value={a.id}>
      {a.name}
    </option>
  ));
  const clientOptions = (agencyId: string) =>
    clients
      .filter((c) => c.agencyId === agencyId)
      .map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ));
  const userChoices = [
    ...options.users,
    ...(permission?.user &&
    !options.users.some((u) => u.id === permission.user.id)
      ? [permission.user]
      : []),
  ];
  const selectedPermissionUser = userChoices.find(
    (u) => u.id === values.userId,
  );
  const userOptions = userChoices.map((u) => (
    <option key={u.id} value={u.id}>
      {u.name} · {u.email}
    </option>
  ));
  function setLink(key: "agencyId" | "tenantId" | "role", value: string) {
    setLinks((items) =>
      items.map((c, i) =>
        i === linkIndex
          ? ({
              ...c,
              [key]: value,
              ...(key === "agencyId" ? { tenantId: "" } : {}),
            } as typeof c)
          : c,
      ),
    );
  }
  async function mutate(
    method: "POST" | "PATCH",
    payload?: unknown,
    suffix = "",
  ) {
    setError("");
    setBusy(true);
    try {
      await api(
        `/platform/management/${kind}${item ? "/" + encodeURIComponent(item.id) : ""}${suffix}`,
        method,
        payload,
      );
      toast.success(t("common.saved"));
      await onSaved(suffix === "/restore");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const schema =
      kind === "users"
        ? item
          ? managementUserSchema
          : managementUserCreateSchema
        : kind === "agencies"
          ? managementAgencySchema
          : kind === "clients"
            ? managementClientSchema
            : permissionSchema;
    const payload =
      kind === "users"
        ? {
            name: values.name,
            email: values.email,
            active: values.active,
            clients:
              canCreateDirect && directAccess
                ? accessScope === "CLIENT"
                  ? links.map((link) => ({ ...link, role: accessRole }))
                  : []
                : links,
            ...(canCreateDirect && directAccess
              ? {
                  directAccess: true,
                  password,
                  accessScope,
                  ...(accessScope === "AGENCY"
                    ? { agencyId: directAgencyId }
                    : {}),
                }
              : {}),
          }
        : kind === "agencies"
          ? { name: values.name, slug: values.slug, active: values.active }
          : kind === "clients"
            ? {
                name: values.name,
                slug: values.slug,
                agencyId: values.agencyId,
                status: values.status,
                ...(values.adminId ? { adminId: values.adminId } : {}),
              }
            : {
                userId: values.userId,
                scope: values.scope,
                ...(values.scope !== "GLOBAL"
                  ? { agencyId: values.agencyId }
                  : {}),
                ...(values.scope === "CLIENT"
                  ? { tenantId: values.tenantId, role: values.role }
                  : {}),
              };
    const result = schema.safeParse(payload);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [String(issue.path[0]), true]),
        ),
      );
      setError(t("management.checkFields"));
      return;
    }
    if (kind === "clients" && !item && !values.adminId) {
      setErrors({ adminId: true });
      return;
    }
    setErrors({});
    await mutate(item ? "PATCH" : "POST", result.data);
  }
  return (
    <form
      className={`management-editor${canCreateDirect ? " management-user-editor" : ""}`}
      onSubmit={submit}
      noValidate
    >
      <div className="management-editor-body">
        {isArchived ? (
          <div className="management-restore">
            <RotateCcw />
            <h3>{recordName(item!)}</h3>
            <p>{t("management.restoreHint")}</p>
          </div>
        ) : (
          <>
            {(kind === "users" ||
              kind === "agencies" ||
              kind === "clients") && (
              <section className="management-form-section">
                {canCreateDirect && (
                  <div className="management-direct-access">
                    <div>
                      <strong id="direct-access-label">
                        {t("management.directAccess")}
                      </strong>
                      <p id="direct-access-hint">
                        {t("management.directAccessHint")}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      className="management-switch"
                      aria-checked={directAccess}
                      aria-labelledby="direct-access-label"
                      aria-describedby="direct-access-hint"
                      disabled={busy}
                      onClick={() => {
                        setDirectAccess(!directAccess);
                        setPassword("");
                        setErrors({});
                      }}
                    >
                      <span />
                    </button>
                  </div>
                )}
                <h3>{t(`management.details.${kind}`)}</h3>
                <div
                  className={
                    canCreateDirect
                      ? "management-user-identity-fields"
                      : "management-identity-fields"
                  }
                >
                  <Field
                    label={t(kind === "users" ? "auth.name" : "common.name")}
                    error={fieldError("name")}
                  >
                    <input
                      value={values.name}
                      onChange={(e) => set("name", e.target.value)}
                      autoComplete="off"
                      aria-invalid={!!errors.name}
                    />
                  </Field>
                  {kind === "users" ? (
                    <Field
                      label={t("management.email")}
                      error={fieldError("email")}
                    >
                      <input
                        type="email"
                        value={values.email}
                        onChange={(e) => set("email", e.target.value)}
                        autoComplete="off"
                        aria-invalid={!!errors.email}
                      />
                    </Field>
                  ) : (
                    <Field label={t("admin.slug")} error={fieldError("slug")}>
                      <input
                        value={values.slug}
                        onChange={(e) => set("slug", e.target.value)}
                        aria-invalid={!!errors.slug}
                      />
                    </Field>
                  )}
                </div>
                {canCreateDirect && directAccess && (
                  <>
                    <Field
                      label={t("auth.password")}
                      error={
                        errors.password
                          ? t("management.directPasswordHint")
                          : undefined
                      }
                    >
                      <Password
                        autoComplete="new-password"
                        value={password}
                        minLength={12}
                        maxLength={128}
                        aria-invalid={!!errors.password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={busy}
                      />
                    </Field>
                    <p className="management-help">
                      {t("management.directPasswordHint")}
                    </p>
                    <Field label={t("management.permissionLevel")}>
                      <select
                        value={accessRole}
                        onChange={(e) =>
                          setAccessRole(e.target.value as typeof accessRole)
                        }
                        disabled={busy}
                      >
                        {(
                          ["GLOBAL", "SUPER_ADMIN", "ADMIN", "USER"] as const
                        ).map((role) => (
                          <option key={role} value={role}>
                            {t(`role.${role}`)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <p className="management-help">
                      {t(
                        accessScope === "CLIENT"
                          ? `management.directRoleHint.${accessRole}`
                          : `management.scopeHint.${accessScope}`,
                      )}
                    </p>
                    {accessScope === "AGENCY" && (
                      <Field
                        label={t("admin.agency")}
                        error={fieldError("agencyId")}
                      >
                        <select
                          value={directAgencyId}
                          onChange={(e) => setDirectAgencyId(e.target.value)}
                          disabled={busy}
                          aria-invalid={!!errors.agencyId}
                        >
                          <option value="">
                            {t("management.selectAgency")}
                          </option>
                          {agencyOptions}
                        </select>
                      </Field>
                    )}
                  </>
                )}
                {!item && kind === "users" && !directAccess && (
                  <p className="management-help">
                    {t("management.setupEmail")}
                  </p>
                )}
                {item && kind !== "clients" && (
                  <Field label={t("common.status")}>
                    <select
                      value={String(values.active)}
                      onChange={(e) => set("active", e.target.value === "true")}
                    >
                      <option value="true">{t("common.active")}</option>
                      <option value="false">{t("common.inactive")}</option>
                    </select>
                  </Field>
                )}
              </section>
            )}
            {kind === "users" &&
              (!directAccess || accessScope === "CLIENT") && (
                <section className="management-form-section">
                  <h3>{t("management.clientLink")}</h3>
                  {directAccess && (
                    <p className="management-help">
                      {t("management.optionalLinks")}
                    </p>
                  )}
                  {links.length > 1 && (
                    <div className="management-link-tabs">
                      {links.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-pressed={i === linkIndex}
                          onClick={() => setLinkIndex(i)}
                        >
                          {clients.find((o) => o.id === c.tenantId)?.name ??
                            t("management.newLink")}
                        </button>
                      ))}
                    </div>
                  )}
                  {link && (
                    <>
                      <Field
                        label={t("admin.agency")}
                        error={fieldError("clients")}
                      >
                        <select
                          value={link.agencyId}
                          onChange={(e) => setLink("agencyId", e.target.value)}
                        >
                          <option value="">
                            {t("management.selectAgency")}
                          </option>
                          {agencyOptions}
                        </select>
                      </Field>
                      <Field
                        label={t("management.agencyClient")}
                        error={fieldError("clients")}
                      >
                        <select
                          value={link.tenantId}
                          onChange={(e) => setLink("tenantId", e.target.value)}
                          disabled={!link.agencyId}
                        >
                          <option value="">
                            {t("management.selectClient")}
                          </option>
                          {clientOptions(link.agencyId)}
                        </select>
                      </Field>
                      <p className="management-help">
                        {t("management.clientHint")}
                      </p>
                      {!directAccess && (
                        <>
                          <Field label={t("management.accessRole")}>
                            <select
                              value={link.role}
                              onChange={(e) => setLink("role", e.target.value)}
                            >
                              <option value="USER">User</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </Field>
                          <p className="management-help">
                            {t("management.roleHint")}
                          </p>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        className="management-unlink"
                        onClick={() => {
                          setLinks((items) =>
                            items.filter((_, i) => i !== linkIndex),
                          );
                          setLinkIndex(0);
                        }}
                      >
                        <Link2 />
                        {t("management.removeLink")}
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setLinks((items) => [
                        ...items,
                        { agencyId: "", tenantId: "", role: "USER" },
                      ]);
                      setLinkIndex(links.length);
                    }}
                  >
                    <Plus />
                    {t("management.addLink")}
                  </Button>
                </section>
              )}
            {kind === "clients" && (
              <section className="management-form-section">
                <h3>{t("management.clientAgency")}</h3>
                <Field label={t("admin.agency")} error={fieldError("agencyId")}>
                  <select
                    value={values.agencyId}
                    disabled={!!item}
                    onChange={(e) => set("agencyId", e.target.value)}
                  >
                    <option value="">{t("management.selectAgency")}</option>
                    {agencyOptions}
                  </select>
                </Field>
                <Field
                  label={t("management.responsibleAdmin")}
                  error={fieldError("adminId")}
                >
                  <select
                    value={values.adminId}
                    onChange={(e) => set("adminId", e.target.value)}
                  >
                    <option value="">
                      {t(
                        item ? "management.keepAdmin" : "management.selectUser",
                      )}
                    </option>
                    {userOptions}
                  </select>
                </Field>
                <p className="management-help">{t("management.adminHint")}</p>
                {item && (
                  <Field label={t("common.status")}>
                    <select
                      value={values.status}
                      onChange={(e) => set("status", e.target.value)}
                    >
                      <option value="active">{t("common.active")}</option>
                      <option value="disabled">{t("common.inactive")}</option>
                    </select>
                  </Field>
                )}
              </section>
            )}
            {kind === "permissions" && (
              <section className="management-form-section">
                <h3>{t("management.accessRole")}</h3>
                <Field
                  label={t("management.userName")}
                  error={fieldError("userId")}
                >
                  <select
                    value={values.userId}
                    onChange={(e) => set("userId", e.target.value)}
                  >
                    <option value="">{t("management.selectUser")}</option>
                    {userChoices.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("management.email")}>
                  <input
                    type="email"
                    value={selectedPermissionUser?.email ?? ""}
                    readOnly
                    autoComplete="off"
                  />
                </Field>
                <Field label={t("management.scope")}>
                  <select
                    value={values.scope}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        scope: e.target.value as typeof v.scope,
                        agencyId: "",
                        tenantId: "",
                      }))
                    }
                  >
                    <option value="CLIENT">{t("admin.client")}</option>
                    <option value="AGENCY">
                      {t("admin.agency")} · Super Admin
                    </option>
                    {options.role === "GLOBAL" && (
                      <option value="GLOBAL">
                        {t("shell.platform")} · Global
                      </option>
                    )}
                  </select>
                </Field>
                {values.scope !== "GLOBAL" && (
                  <Field
                    label={t("admin.agency")}
                    error={fieldError("agencyId")}
                  >
                    <select
                      value={values.agencyId}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          agencyId: e.target.value,
                          tenantId: "",
                        }))
                      }
                    >
                      <option value="">{t("management.selectAgency")}</option>
                      {agencyOptions}
                    </select>
                  </Field>
                )}
                {values.scope === "CLIENT" && (
                  <>
                    <Field
                      label={t("management.agencyClient")}
                      error={fieldError("tenantId")}
                    >
                      <select
                        value={values.tenantId}
                        onChange={(e) => set("tenantId", e.target.value)}
                        disabled={!values.agencyId}
                      >
                        <option value="">{t("management.selectClient")}</option>
                        {clientOptions(values.agencyId)}
                      </select>
                    </Field>
                    <Field label={t("management.permission")}>
                      <select
                        value={values.role}
                        onChange={(e) => set("role", e.target.value)}
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </Field>
                  </>
                )}
                <p className="management-help">
                  {t(`management.scopeHint.${values.scope}`)}
                </p>
              </section>
            )}
          </>
        )}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer className="management-editor-footer">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onClose}
        >
          {t("common.cancel")}
        </Button>
        {isArchived ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => void mutate("POST", {}, "/restore")}
          >
            <RotateCcw />
            {t("management.restore")}
          </Button>
        ) : (
          <Button disabled={busy}>
            {t(
              busy
                ? "common.saving"
                : item
                  ? "management.save"
                  : `management.create.${kind}`,
            )}
          </Button>
        )}
      </footer>
    </form>
  );
}
