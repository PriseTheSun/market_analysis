import {
  RecordCollection,
  ViewToggle,
  useRecordView,
} from "../components/ui/collection";
import {
  TableSearch,
  RecordIdentity,
  ActiveStatus,
  RecordActions,
} from "../components/ui/table";
import { PAGE_SIZE } from "../lib/pagination";
import { useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { LocalizedLink as Link } from "../lib/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Check,
  UserMinus,
  UserPlus,
  Plus,
  Pencil,
  ShieldCheck,
  ArrowRight,
  Mail,
  Search,
  Filter,
  ChevronDown,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import {
  agencySchema,
  tenantCreateSchema,
  invitationSchema,
  agencyMembershipSchema,
  platformRoleSchema,
  accountStatusSchema,
  type Page,
} from "@market/contracts";
import { api, errorText, queryClient } from "../lib/api";
import { useScope, PageHeading } from "../components/shell";
import { Button } from "../components/ui/button";
import {
  Field,
  Loading,
  ErrorState,
  Empty,
  Modal,
  ModalBody,
  ModalFooter,
  Pagination,
  Badge,
} from "../components/ui/common";
interface User {
  id: string;
  name: string;
  email: string;
  platformRole: string | null;
  active: boolean;
}
interface Member {
  id: string;
  role: "ADMIN" | "USER";
  active: boolean;
  user: User;
}
interface Agency {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}
interface Tenant {
  id: string;
  name: string;
  slug: string;
  agencyId: string;
  agency: { name: string };
  status: string;
}
interface Invitation {
  id: string;
  email: string;
  role: string;
  deliveryStatus: string;
  consumedAt: string | null;
  expiresAt: string;
}
type FormField = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
};
export function EditForm({
  schema,
  fields,
  defaults,
  onSave,
  modal = false,
  onCancel,
}: {
  modal?: boolean;
  onCancel?: () => void;
  schema: z.ZodType;
  fields: FormField[];
  defaults?: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const f = useForm<Record<string, unknown>>({
    resolver: zodResolver(
      schema as z.ZodType<Record<string, unknown>, Record<string, unknown>>,
    ),
    defaultValues: defaults,
  });
  const Body = modal ? ModalBody : "div";
  const Footer = modal ? ModalFooter : "div";
  return (
    <form
      className={modal ? "dialog-form" : undefined}
      onSubmit={f.handleSubmit(async (data) => {
        setError("");
        try {
          await onSave(data);
        } catch (e) {
          setError(errorText(e));
        }
      })}
      noValidate
    >
      <Body className="form-stack">
        {fields.map((field) => (
          <Field
            key={field.name}
            label={field.label}
            error={
              f.formState.errors[field.name] ? t("common.required") : undefined
            }
          >
            {field.options ? (
              <select {...f.register(field.name)}>
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea {...f.register(field.name)} rows={3} />
            ) : (
              <input
                {...f.register(field.name)}
                type={field.type ?? "text"}
                aria-invalid={!!f.formState.errors[field.name]}
              />
            )}
          </Field>
        ))}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </Body>
      <Footer className={modal ? undefined : "form-actions"}>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={f.formState.isSubmitting}
            onClick={onCancel}
          >
            <X aria-hidden="true" />
            {t("common.cancel")}
          </Button>
        )}
        <Button disabled={f.formState.isSubmitting}>
          <Check aria-hidden="true" />
          {t(f.formState.isSubmitting ? "common.saving" : "common.confirm")}
        </Button>
      </Footer>
    </form>
  );
}
function AdminTable<T>({
  title,
  description,
  path,
  columns,
  render,
  actions,
  toolbar,
  tableClassName,
}: {
  title: string;
  description?: string;
  path: string;
  columns: string[];
  render: (item: T) => ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  tableClassName?: string;
}) {
  const s = useScope(),
    { t } = useTranslation();
  const display = useRecordView();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: [...s.key, path, page, search, PAGE_SIZE],
    queryFn: ({ signal }) =>
      api<Page<T>>(
        path +
          `?page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(search)}`,
        "GET",
        undefined,
        signal,
      ),
  });
  return (
    <main className="page">
      <PageHeading title={title} description={description}>
        {actions}
      </PageHeading>
      <div className="table-toolbar">
        <TableSearch
          aria-label={t("common.search")}
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        {toolbar}
        <ViewToggle {...display} />
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : !q.data.items.length ? (
        <Empty />
      ) : (
        <>
          <RecordCollection
            view={display.view}
            label={title}
            tableClassName={tableClassName}
            columns={columns.map((label, index) => ({
              label,
              role:
                index === 0
                  ? "identity"
                  : index === columns.length - 1
                    ? "actions"
                    : label === t("common.status")
                      ? "status"
                      : "detail",
            }))}
          >
            {q.data.items.map(render)}
          </RecordCollection>
          <Pagination
            page={page}
            total={q.data.total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </>
      )}
    </main>
  );
}
export function Members() {
  const display = useRecordView();
  const s = useScope(),
    { t } = useTranslation();
  const [invite, setInvite] = useState(false),
    [change, setChange] = useState<{
      member: Member;
      body: Record<string, unknown>;
    }>(),
    [pending, setPending] = useState(false);
  const [invitationPage, setInvitationPage] = useState(1);
  const invitations = useQuery({
    queryKey: [...s.key, "invitations"],
    queryFn: ({ signal }) =>
      api<Invitation[]>(s.prefix + "/invitations", "GET", undefined, signal),
    enabled: s.tenant?.role !== "USER",
  });
  const visibleInvitationPage = Math.min(
    invitationPage,
    Math.max(1, Math.ceil((invitations.data?.length ?? 0) / PAGE_SIZE)),
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey: s.key });
  if (s.tenant?.role === "USER") return <Empty title={t("shell.forbidden")} />;
  return (
    <>
      <AdminTable<Member>
        title={t("shell.members")}
        description={t("admin.membersSub")}
        path={s.prefix + "/members"}
        columns={[
          t("common.name"),
          t("common.role"),
          t("common.status"),
          t("common.actions"),
        ]}
        actions={
          <Button onClick={() => setInvite(true)}>
            <Plus />
            {t("admin.invite")}
          </Button>
        }
        render={(m) => (
          <tr key={m.id}>
            <td>
              <RecordIdentity name={m.user.name} detail={m.user.email} />
            </td>
            <td>
              <select
                value={m.role}
                aria-label={t("common.role") + " " + m.user.name}
                onChange={(e) =>
                  setChange({ member: m, body: { role: e.target.value } })
                }
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </td>
            <td>
              <ActiveStatus active={m.active} />
            </td>
            <td>
              <Button
                size="small"
                variant="ghost"
                onClick={() =>
                  setChange({ member: m, body: { active: !m.active } })
                }
              >
                {m.active ? (
                  <UserX aria-hidden="true" />
                ) : (
                  <UserCheck aria-hidden="true" />
                )}
                {t(m.active ? "admin.deactivate" : "admin.activate")}
              </Button>
            </td>
          </tr>
        )}
      />
      <section className="page supplemental">
        <div className="collection-heading">
          <h2>{t("admin.invitations")}</h2>
          <ViewToggle {...display} />
        </div>
        {invitations.isPending ? (
          <Loading />
        ) : invitations.isError ? (
          <ErrorState error={invitations.error} />
        ) : !invitations.data.length ? (
          <Empty />
        ) : (
          <>
            <RecordCollection
              view={display.view}
              label={t("admin.invitations")}
              columns={[
                { label: t("common.email"), role: "identity" },
                { label: t("common.role") },
                { label: t("common.status"), role: "status" },
                { label: t("common.actions"), role: "actions" },
              ]}
            >
              {invitations.data
                .slice(
                  (visibleInvitationPage - 1) * PAGE_SIZE,
                  visibleInvitationPage * PAGE_SIZE,
                )
                .map((i) => (
                  <tr key={i.id}>
                    <td data-label={t("common.email")}>{i.email}</td>
                    <td data-label={t("common.role")}>
                      {i.role === "ADMIN" ? "Admin" : "User"}
                    </td>
                    <td data-label={t("common.status")}>
                      {i.consumedAt ? (
                        t("auth.inviteSuccess")
                      ) : (
                        <Badge status={i.deliveryStatus} />
                      )}
                    </td>
                    <td data-label={t("common.actions")}>
                      <Button
                        variant="ghost"
                        size="small"
                        disabled={
                          !!i.consumedAt || new Date(i.expiresAt) < new Date()
                        }
                        onClick={() =>
                          void s
                            .call(
                              `${s.prefix}/invitations/${i.id}/resend`,
                              "POST",
                              {},
                            )
                            .then(() => {
                              toast.success(t("admin.inviteSent"));
                              return refresh();
                            })
                            .catch((e) => toast.error(errorText(e)))
                        }
                      >
                        <Mail />
                        {t("admin.resend")}
                      </Button>
                    </td>
                  </tr>
                ))}
            </RecordCollection>
            <Pagination
              page={visibleInvitationPage}
              total={invitations.data.length}
              pageSize={PAGE_SIZE}
              onChange={setInvitationPage}
            />
          </>
        )}
      </section>
      <Modal
        open={invite}
        onOpenChange={setInvite}
        title={t("admin.invite")}
        description={s.tenant?.name}
      >
        <EditForm
          modal
          onCancel={() => setInvite(false)}
          schema={invitationSchema}
          fields={[
            { name: "email", label: t("common.email"), type: "email" },
            {
              name: "role",
              label: t("common.role"),
              options: [
                { value: "USER", label: "User" },
                { value: "ADMIN", label: "Admin" },
              ],
            },
          ]}
          defaults={{ role: "USER" }}
          onSave={async (data) => {
            await s.call(s.prefix + "/invitations", "POST", data);
            setInvite(false);
            toast.success(t("admin.inviteSent"));
            await refresh();
          }}
        />
      </Modal>
      <Modal
        open={!!change}
        onOpenChange={(v) => !v && setChange(undefined)}
        title={t("common.confirm")}
        variant="confirmation"
      >
        <ModalBody>
          <p>
            {t(
              change?.body.role
                ? "admin.roleConfirm"
                : "admin.deactivateConfirm",
              { name: change?.member.user.name, scope: s.tenant?.name },
            )}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setChange(undefined)}
          >
            <X aria-hidden="true" />
            {t("common.cancel")}
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              if (!change) return;
              setPending(true);
              void s
                .call(
                  `${s.prefix}/members/${change.member.id}`,
                  "PATCH",
                  change.body,
                )
                .then(() => {
                  setChange(undefined);
                  toast.success(t("common.saved"));
                  return refresh();
                })
                .catch((e) => toast.error(errorText(e)))
                .finally(() => setPending(false));
            }}
          >
            <Check aria-hidden="true" />
            {t(pending ? "common.saving" : "common.confirm")}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
export function Agencies() {
  const display = useRecordView();
  const s = useScope(),
    { t } = useTranslation();
  const [edit, setEdit] = useState<Agency | "new">(),
    [manage, setManage] = useState<Agency>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const pageSize = PAGE_SIZE;
  const q = useQuery({
    queryKey: [...s.key, "agencies", page, search, status, pageSize],
    queryFn: ({ signal }) =>
      api<Page<Agency>>(
        `/platform/agencies?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}${status ? `&status=${status}` : ""}`,
        "GET",
        undefined,
        signal,
      ),
  });
  return (
    <>
      <main className="page agencies-page">
        <PageHeading
          title={t("shell.agencies")}
          description={t("admin.agenciesSub")}
        >
          <Button onClick={() => setEdit("new")}>
            <Plus />
            {t("admin.newAgency")}
          </Button>
        </PageHeading>
        <div className="agency-filters">
          <label className="agency-search">
            <Search aria-hidden="true" />
            <input
              aria-label={t("common.search")}
              placeholder={t("admin.agencySearch")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="agency-status-filter">
            <Filter aria-hidden="true" />
            <select
              aria-label={t("common.status")}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t("admin.allStatuses")}</option>
              <option value="active">{t("common.active")}</option>
              <option value="inactive">{t("common.inactive")}</option>
            </select>
            <ChevronDown aria-hidden="true" />
          </label>
          <ViewToggle {...display} />
        </div>
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <ErrorState error={q.error} retry={() => void q.refetch()} />
        ) : (
          <>
            <RecordCollection
              view={display.view}
              label={t("shell.agencies")}
              tableClassName="agencies-table"
              columns={[
                { label: t("admin.agency"), role: "identity" },
                { label: t("common.status"), role: "status" },
                { label: t("common.actions"), role: "actions" },
              ]}
            >
              {q.data.items.map((agency) => (
                <tr key={agency.id}>
                  <td>
                    <RecordIdentity name={agency.name} detail={agency.slug} />
                  </td>
                  <td>
                    <ActiveStatus active={agency.active} />
                  </td>
                  <td>
                    <RecordActions name={agency.name}>
                      <Dropdown.Item onSelect={() => setEdit(agency)}>
                        <Pencil aria-hidden="true" />
                        {t("common.change")}
                      </Dropdown.Item>
                      <Dropdown.Item onSelect={() => setManage(agency)}>
                        <ShieldCheck aria-hidden="true" />
                        {t("admin.superAdmins")}
                      </Dropdown.Item>
                    </RecordActions>
                  </td>
                </tr>
              ))}
            </RecordCollection>
            {!q.data.items.length && (
              <Empty
                title={t("admin.noAgencies")}
                description={t("admin.noAgenciesSub")}
              />
            )}
            <div className="agencies-footer">
              <p role="status">
                {t("admin.agencyCount", { count: q.data.items.length })}
              </p>
              {q.data.total > pageSize && (
                <Pagination
                  page={page}
                  total={q.data.total}
                  pageSize={pageSize}
                  onChange={setPage}
                />
              )}
            </div>
          </>
        )}
      </main>
      <Modal
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(undefined)}
        title={t(edit === "new" ? "admin.newAgency" : "common.change")}
        description={edit && edit !== "new" ? edit.name : undefined}
      >
        {edit && (
          <EditForm
            modal
            onCancel={() => setEdit(undefined)}
            key={typeof edit === "string" ? edit : edit.id}
            schema={agencySchema.extend(
              edit === "new"
                ? {}
                : {
                    active: z
                      .enum(["true", "false"])
                      .transform((v) => v === "true"),
                  },
            )}
            fields={[
              { name: "name", label: t("common.name") },
              { name: "slug", label: t("admin.slug") },
              ...(edit === "new"
                ? []
                : [
                    {
                      name: "active",
                      label: t("common.status"),
                      options: [
                        { value: "true", label: t("common.active") },
                        { value: "false", label: t("common.inactive") },
                      ],
                    },
                  ]),
            ]}
            defaults={
              edit === "new"
                ? {}
                : {
                    name: edit.name,
                    slug: edit.slug,
                    active: String(edit.active),
                  }
            }
            onSave={async (data) => {
              await s.call(
                "/platform/agencies" + (edit === "new" ? "" : "/" + edit.id),
                edit === "new" ? "POST" : "PATCH",
                data,
              );
              setEdit(undefined);
              toast.success(t("common.saved"));
              await queryClient.invalidateQueries({ queryKey: s.key });
            }}
          />
        )}
      </Modal>
      <Modal
        open={!!manage}
        onOpenChange={(v) => !v && setManage(undefined)}
        title={t("admin.superAdmins")}
        description={manage?.name}
      >
        <ModalBody>{manage && <SuperAdmins agency={manage} />}</ModalBody>
      </Modal>
    </>
  );
}
function SuperAdmins({ agency }: { agency: Agency }) {
  const s = useScope(),
    { t } = useTranslation();
  const path = `/platform/agencies/${agency.id}/super-admins`;
  const q = useQuery({
    queryKey: [...s.key, path],
    queryFn: ({ signal }) =>
      api<{ id: string; active: boolean; user: User }[]>(
        path,
        "GET",
        undefined,
        signal,
      ),
  });
  return (
    <>
      <EditForm
        schema={agencyMembershipSchema.omit({ active: true })}
        fields={[{ name: "email", label: t("common.email"), type: "email" }]}
        onSave={async (data) => {
          await s.call(path, "POST", { ...data, active: true });
          toast.success(t("common.saved"));
          await q.refetch();
        }}
      />
      {q.data?.map((m) => (
        <div className="member-inline" key={m.id}>
          <span>{m.user.email}</span>
          <Button
            size="small"
            variant="ghost"
            onClick={() =>
              void s
                .call(path, "POST", { email: m.user.email, active: !m.active })
                .then(() => q.refetch())
                .catch((e) => toast.error(errorText(e)))
            }
          >
            {m.active ? (
              <UserMinus aria-hidden="true" />
            ) : (
              <UserPlus aria-hidden="true" />
            )}
            {t(m.active ? "admin.removeSuperAdmin" : "admin.setSuperAdmin")}
          </Button>
        </div>
      ))}
    </>
  );
}
export function Clients() {
  const s = useScope(),
    { t } = useTranslation();
  const { agencyId } = useParams();
  const [edit, setEdit] = useState<Tenant | "new">();
  const agencies = useQuery({
    queryKey: [...s.key, "agencyOptions"],
    queryFn: ({ signal }) =>
      api<Page<Agency>>(
        "/platform/agencies?pageSize=100",
        "GET",
        undefined,
        signal,
      ),
    enabled: !agencyId,
  });
  const createFields = [
    { name: "name", label: t("common.name") },
    { name: "slug", label: t("admin.slug") },
  ];
  return (
    <>
      <AdminTable<Tenant>
        tableClassName="clients-table record-table"
        title={t("shell.clients")}
        path={agencyId ? `/agencies/${agencyId}/tenants` : "/platform/tenants"}
        columns={[
          t("admin.client"),
          t("admin.agency"),
          t("common.status"),
          t("common.actions"),
        ]}
        actions={
          !agencyId && (
            <Button onClick={() => setEdit("new")}>
              <Plus />
              {t("admin.newClient")}
            </Button>
          )
        }
        render={(tenant) => (
          <tr key={tenant.id}>
            <td>
              <RecordIdentity name={tenant.name} detail={tenant.slug} />
            </td>
            <td>{tenant.agency.name}</td>
            <td>
              <Badge status={tenant.status} />
            </td>
            <td>
              <RecordActions
                name={tenant.name}
                disabled={!!agencyId && tenant.status !== "active"}
              >
                {tenant.status === "active" && (
                  <Dropdown.Item asChild>
                    <Link to={`/app/${tenant.id}/chat`}>
                      <ArrowRight aria-hidden="true" />
                      {t("common.open")}
                    </Link>
                  </Dropdown.Item>
                )}
                {!agencyId && (
                  <Dropdown.Item onSelect={() => setEdit(tenant)}>
                    <Pencil aria-hidden="true" />
                    {t("common.change")}
                  </Dropdown.Item>
                )}
              </RecordActions>
            </td>
          </tr>
        )}
      />
      <Modal
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(undefined)}
        title={t(edit === "new" ? "admin.newClient" : "common.change")}
        description={edit && edit !== "new" ? edit.name : undefined}
      >
        {edit && (
          <EditForm
            modal
            onCancel={() => setEdit(undefined)}
            key={typeof edit === "string" ? edit : edit.id}
            schema={
              edit === "new"
                ? tenantCreateSchema
                : agencySchema.extend({
                    status: z.enum(["active", "disabled"]),
                  })
            }
            fields={
              edit === "new"
                ? [
                    ...createFields,
                    {
                      name: "agencyId",
                      label: t("admin.agency"),
                      options: [
                        { value: "", label: t("admin.agency") },
                        ...(agencies.data?.items
                          .filter((a) => a.active)
                          .map((a) => ({ value: a.id, label: a.name })) ?? []),
                      ],
                    },
                    {
                      name: "adminEmail",
                      label: t("admin.adminEmail"),
                      type: "email",
                    },
                  ]
                : [
                    ...createFields,
                    {
                      name: "status",
                      label: t("common.status"),
                      options: [
                        { value: "active", label: t("status.active") },
                        { value: "disabled", label: t("status.disabled") },
                      ],
                    },
                  ]
            }
            defaults={
              edit === "new"
                ? {}
                : {
                    name: edit.name,
                    slug: edit.slug,
                    status:
                      edit.status === "provisioning" ? "active" : edit.status,
                  }
            }
            onSave={async (data) => {
              await s.call(
                "/platform/tenants" + (edit === "new" ? "" : "/" + edit.id),
                edit === "new" ? "POST" : "PATCH",
                data,
              );
              setEdit(undefined);
              toast.success(t("common.saved"));
              await queryClient.invalidateQueries({ queryKey: s.key });
            }}
          />
        )}
      </Modal>
    </>
  );
}
export function UsersPage() {
  const s = useScope(),
    { t } = useTranslation();
  const [action, setAction] = useState<{
    user: User;
    kind: "global-role" | "status";
  }>();
  return (
    <>
      <AdminTable<User>
        tableClassName="record-table"
        title={t("shell.users")}
        path="/platform/users"
        columns={[
          t("common.name"),
          t("common.role"),
          t("common.status"),
          t("common.actions"),
        ]}
        render={(u) => (
          <tr key={u.id}>
            <td>
              <RecordIdentity name={u.name} detail={u.email} />
            </td>
            <td>{u.platformRole ?? "—"}</td>
            <td>
              <ActiveStatus active={u.active} />
            </td>
            <td>
              <RecordActions name={u.name}>
                <Dropdown.Item
                  onSelect={() => setAction({ user: u, kind: "global-role" })}
                >
                  <ShieldCheck aria-hidden="true" />
                  {t(u.platformRole ? "admin.demote" : "admin.promote")}
                </Dropdown.Item>
                <Dropdown.Item
                  onSelect={() => setAction({ user: u, kind: "status" })}
                >
                  {u.active ? (
                    <UserX aria-hidden="true" />
                  ) : (
                    <UserCheck aria-hidden="true" />
                  )}
                  {t(u.active ? "admin.disableAccount" : "admin.enableAccount")}
                </Dropdown.Item>
              </RecordActions>
            </td>
          </tr>
        )}
      />
      <Modal
        open={!!action}
        onOpenChange={(v) => !v && setAction(undefined)}
        title={action?.user.email ?? ""}
        description={t("admin.globalConfirm")}
      >
        {action && (
          <EditForm
            modal
            onCancel={() => setAction(undefined)}
            schema={
              action.kind === "global-role"
                ? platformRoleSchema
                : accountStatusSchema
            }
            fields={[
              { name: "reason", label: t("admin.reason"), type: "textarea" },
            ]}
            defaults={
              action.kind === "global-role"
                ? { global: !action.user.platformRole }
                : { active: !action.user.active }
            }
            onSave={async (data) => {
              await s.call(
                `/platform/users/${action.user.id}/${action.kind}`,
                "POST",
                data,
              );
              setAction(undefined);
              toast.success(t("common.saved"));
              await queryClient.invalidateQueries({ queryKey: s.key });
            }}
          />
        )}
      </Modal>
    </>
  );
}
