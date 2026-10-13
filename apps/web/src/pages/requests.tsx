import {
  RecordCollection,
  ViewToggle,
  useRecordView,
} from "../components/ui/collection";
import {
  TableSearch,
  RecordIdentity,
  RecordActions,
} from "../components/ui/table";
import { PAGE_SIZE } from "../lib/pagination";
import { useState, type ComponentProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Save, Check, ChevronDown, Mail, Pencil, X } from "lucide-react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import type {
  AccessRequestRecord,
  AccessRequestOptions,
  TenantRole,
  Page,
} from "@market/contracts";
import { api, errorText, queryClient } from "../lib/api";
import { useScope, PageHeading } from "../components/shell";
import { Button } from "../components/ui/button";
import {
  Loading,
  ErrorState,
  Empty,
  Field,
  Modal,
  ModalBody,
  ModalFooter,
  Pagination,
} from "../components/ui/common";
import "./requests.css";

function RequestSelect(props: ComponentProps<"select">) {
  return (
    <span className="request-select">
      <select {...props} />
      <ChevronDown aria-hidden="true" />
    </span>
  );
}

export function Requests() {
  const s = useScope(),
    { t } = useTranslation();
  const display = useRecordView();
  const global = s.user.platformRole === "GLOBAL" && !s.tenant;
  const path = global
    ? "/platform/access-requests"
    : s.prefix + "/access-requests";
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState<{
      item: AccessRequestRecord;
      action: "edit" | "reject";
    }>(),
    [resending, setResending] = useState<string>();
  const q = useQuery({
    queryKey: [...s.key, path, page, search, status, PAGE_SIZE],
    queryFn: ({ signal }) =>
      api<Page<AccessRequestRecord>>(
        path +
          `?page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(search)}${status ? "&status=" + status : ""}`,
        "GET",
        undefined,
        signal,
      ),
    enabled: s.tenant?.role !== "USER",
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: s.key });
  async function saved(rejected = false) {
    setSelected(undefined);
    if (
      rejected &&
      q.data?.items.length === 1 &&
      page > 1 &&
      status !== "rejected"
    )
      setPage(page - 1);
    await refresh();
    toast.success(t(rejected ? "requests.rejected" : "common.saved"));
  }
  async function resend(item: AccessRequestRecord) {
    if (resending) return;
    setResending(item.id);
    try {
      await s.call(`${path}/${item.id}/resend`, "POST", {});
      await refresh();
      toast.success(t("admin.inviteSent"));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setResending(undefined);
    }
  }
  if (s.tenant?.role === "USER") return <Empty title={t("shell.forbidden")} />;
  return (
    <main className="page requests-page">
      <PageHeading
        title={t("shell.requests")}
        description={t("requests.sub")}
      />
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
        <RequestSelect
          aria-label={t("common.status")}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("common.status")}</option>
          {["pending", "approved", "rejected"].map((x) => (
            <option key={x} value={x}>
              {t("requests.status." + x)}
            </option>
          ))}
        </RequestSelect>
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
            label={t("shell.requests")}
            columns={[
              { label: t("auth.name"), role: "identity" },
              { label: t("requests.agencyName") },
              { label: t("admin.client") },
              { label: t("common.status"), role: "status" },
              { label: t("common.actions"), role: "actions" },
            ]}
          >
            {q.data.items.map((r) => {
              const accepted = !!r.invitation?.consumedAt;
              const closed = r.status === "rejected" || accepted;
              return (
                <tr key={r.id}>
                  <td data-label={t("auth.name")}>
                    <RecordIdentity name={r.name} detail={r.email} />
                  </td>
                  <td data-label={t("requests.agencyName")}>
                    {r.tenant?.agency?.name ?? t("requests.noAgency")}
                  </td>
                  <td data-label={t("admin.client")}>
                    {r.tenant?.name ?? t("requests.unscoped")}
                  </td>
                  <td data-label={t("common.status")}>
                    <span className={"badge status-" + r.status}>
                      {t("requests.status." + r.status)}
                    </span>
                  </td>
                  <td data-label={t("common.actions")}>
                    <RecordActions name={r.name} disabled={resending === r.id}>
                      <Dropdown.Item
                        disabled={
                          !!resending ||
                          closed ||
                          r.status !== "approved" ||
                          !r.invitationId ||
                          !!r.invitation?.revokedAt
                        }
                        onSelect={() => void resend(r)}
                      >
                        <Mail aria-hidden="true" />
                        {t("requests.resend")}
                      </Dropdown.Item>
                      <Dropdown.Item
                        disabled={closed || (!global && r.status !== "pending")}
                        onSelect={() =>
                          setSelected({ item: r, action: "edit" })
                        }
                      >
                        <Pencil aria-hidden="true" />
                        {t("management.edit")}
                      </Dropdown.Item>
                      <Dropdown.Item
                        className="danger"
                        disabled={closed}
                        onSelect={() =>
                          setSelected({ item: r, action: "reject" })
                        }
                      >
                        <X aria-hidden="true" />
                        {t("requests.rejectAction")}
                      </Dropdown.Item>
                      {accepted && (
                        <Dropdown.Label className="request-action-note">
                          {t("requests.acceptedHint")}
                        </Dropdown.Label>
                      )}
                    </RecordActions>
                  </td>
                </tr>
              );
            })}
          </RecordCollection>
          <Pagination
            page={page}
            total={q.data.total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </>
      )}
      {selected?.action === "edit" && (
        <RequestEditor
          item={selected.item}
          global={global}
          path={path}
          onClose={() => setSelected(undefined)}
          onSaved={() => saved()}
        />
      )}
      {selected?.action === "reject" && (
        <RequestRejection
          item={selected.item}
          path={path}
          onClose={() => setSelected(undefined)}
          onSaved={() => saved(true)}
        />
      )}
    </main>
  );
}

function RequestEditor({
  item,
  global,
  path,
  onClose,
  onSaved,
}: {
  item: AccessRequestRecord;
  global: boolean;
  path: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const s = useScope();
  const [agencyId, setAgencyId] = useState(
    item.agencyId ?? item.tenant?.agencyId ?? "",
  );
  const [tenantId, setTenantId] = useState(item.tenantId ?? "");
  const [role, setRole] = useState<TenantRole>(item.invitation?.role ?? "USER");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const options = useQuery({
    queryKey: [...s.key, "requestAssignmentOptions"],
    queryFn: ({ signal }) =>
      api<AccessRequestOptions>(
        "/platform/access-requests/options",
        "GET",
        undefined,
        signal,
      ),
    enabled: global,
  });
  const clients =
    options.data?.clients.filter((client) => client.agencyId === agencyId) ??
    [];
  const available = global
    ? clients.some((client) => client.id === tenantId)
    : !!tenantId;
  async function save() {
    if (busy || !available) return;
    setBusy(true);
    setError("");
    try {
      if (global)
        await s.call(`${path}/${item.id}/assignment`, "PATCH", {
          agencyId,
          tenantId,
          role,
          approve: item.status === "pending",
        });
      else
        await s.call(`${path}/${item.id}/review`, "POST", {
          decision: "approved",
          role,
        });
      await onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={t("requests.edit")}
      description={`${item.name} · ${item.email}`}
    >
      <form
        className="dialog-form request-editor"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <ModalBody className="form-stack">
          <p className="request-organization">
            {t("requests.reportedOrganization")}:{" "}
            <strong>{item.organization}</strong>
          </p>
          {global && options.isPending ? (
            <Loading />
          ) : global && options.isError ? (
            <ErrorState
              error={options.error}
              retry={() => void options.refetch()}
            />
          ) : (
            <>
              <Field label={t("admin.agency")}>
                <RequestSelect
                  value={agencyId}
                  disabled={busy || !global}
                  required
                  onChange={(e) => {
                    setAgencyId(e.target.value);
                    setTenantId("");
                  }}
                >
                  <option value="">{t("management.selectAgency")}</option>
                  {item.tenant &&
                    !options.data?.agencies.some(
                      (agency) => agency.id === item.tenant!.agencyId,
                    ) && (
                      <option value={item.tenant.agencyId} disabled={global}>
                        {item.tenant.agency.name}
                      </option>
                    )}
                  {options.data?.agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </RequestSelect>
              </Field>
              <Field label={t("admin.client")}>
                <RequestSelect
                  value={tenantId}
                  disabled={busy || !global || !agencyId}
                  required
                  onChange={(e) => setTenantId(e.target.value)}
                >
                  <option value="">{t("management.selectClient")}</option>
                  {item.tenantId &&
                    item.tenant &&
                    item.tenant.agencyId === agencyId &&
                    !clients.some((client) => client.id === item.tenantId) && (
                      <option value={item.tenantId} disabled={global}>
                        {item.tenant.name}
                      </option>
                    )}
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </RequestSelect>
              </Field>
              <Field label={t("common.role")}>
                <RequestSelect
                  value={role}
                  disabled={busy}
                  onChange={(e) => setRole(e.target.value as TenantRole)}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </RequestSelect>
              </Field>
              <p className="request-form-hint">
                {t(
                  item.status === "approved"
                    ? "requests.reassignHint"
                    : "requests.roleHint",
                )}
              </p>
            </>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            <X aria-hidden="true" />
            {t("common.cancel")}
          </Button>
          <Button
            disabled={
              busy ||
              !available ||
              (global && (options.isPending || options.isError))
            }
          >
            {item.status === "pending" ? (
              <Check aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {t(
              busy
                ? "common.saving"
                : item.status === "pending"
                  ? "requests.approve"
                  : "management.save",
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function RequestRejection({
  item,
  path,
  onClose,
  onSaved,
}: {
  item: AccessRequestRecord;
  path: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation(),
    s = useScope();
  const [reason, setReason] = useState(""),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function reject() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await s.call(`${path}/${item.id}/review`, "POST", {
        decision: "rejected",
        reason,
      });
      await onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={t("requests.reject")}
      variant="confirmation"
      description={`${item.name} · ${item.email}`}
    >
      <form
        className="dialog-form request-editor"
        onSubmit={(event) => {
          event.preventDefault();
          void reject();
        }}
      >
        <ModalBody className="form-stack">
          <p className="request-form-hint">{t("requests.rejectHint")}</p>
          <Field label={t("admin.reason")}>
            <textarea
              value={reason}
              maxLength={1000}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            <X aria-hidden="true" />
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" disabled={busy}>
            <X aria-hidden="true" />
            {t(busy ? "common.saving" : "requests.rejectAction")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
