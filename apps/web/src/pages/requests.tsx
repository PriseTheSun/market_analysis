import { TableSearch } from "../components/ui/table";
import { PAGE_SIZE } from "../lib/pagination";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { classifySchema, reviewSchema, type Page } from "@market/contracts";
import { api, errorText, queryClient } from "../lib/api";
import { useScope, PageHeading } from "../components/shell";
import { Button } from "../components/ui/button";
import {
  Loading,
  ErrorState,
  Empty,
  Badge,
  Modal,
  Pagination,
} from "../components/ui/common";
import { EditForm } from "./admin";
interface AccessRequest {
  id: string;
  name: string;
  email: string;
  organization: string;
  message: string | null;
  status: string;
  tenantId: string | null;
  tenant: { name: string } | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reason: string | null;
  invitationId: string | null;
  reviewer?: { name: string } | null;
  deliveryStatus?: string | null;
}
export function Requests() {
  const s = useScope(),
    { t } = useTranslation();
  const global = s.user.platformRole === "GLOBAL" && !s.tenant;
  const path = global
    ? "/platform/access-requests"
    : s.prefix + "/access-requests";
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState<AccessRequest>(),
    [action, setAction] = useState<"classify" | "approved" | "rejected">();
  const q = useQuery({
    queryKey: [...s.key, path, page, search, status, PAGE_SIZE],
    queryFn: ({ signal }) =>
      api<Page<AccessRequest>>(
        path +
          `?page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(search)}${status ? "&status=" + status : ""}`,
        "GET",
        undefined,
        signal,
      ),
    enabled: s.tenant?.role !== "USER",
  });
  const tenants = useQuery({
    queryKey: [...s.key, "requestTenantOptions"],
    queryFn: ({ signal }) =>
      api<
        Page<{
          id: string;
          name: string;
          status: string;
          agency: { name: string };
        }>
      >("/platform/tenants?pageSize=100", "GET", undefined, signal),
    enabled: global,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: s.key });
  if (s.tenant?.role === "USER") return <Empty title={t("shell.forbidden")} />;
  return (
    <main className="page">
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
        <select
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
              {t("status." + x)}
            </option>
          ))}
        </select>
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : !q.data.items.length ? (
        <Empty />
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("auth.name")}</th>
                  <th>{t("auth.organization")}</th>
                  <th>{t("admin.organization")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                      <small>{r.email}</small>
                    </td>
                    <td>{r.organization}</td>
                    <td>{r.tenant?.name ?? t("requests.unscoped")}</td>
                    <td>
                      <Badge status={r.status} />
                      {r.deliveryStatus && (
                        <small>
                          <Badge status={r.deliveryStatus} />
                        </small>
                      )}
                    </td>
                    <td>
                      <Button
                        size="small"
                        variant="outline"
                        onClick={() => {
                          setSelected(r);
                          setAction(undefined);
                        }}
                      >
                        {t("common.open")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={q.data.total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </>
      )}
      <Modal
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(undefined)}
        title={selected?.name ?? ""}
        description={selected?.email}
      >
        {selected && (
          <>
            <dl className="request-details">
              <dt>{t("auth.organization")}</dt>
              <dd>{selected.organization}</dd>
              {selected.message && (
                <>
                  <dt>{t("auth.message")}</dt>
                  <dd>{selected.message}</dd>
                </>
              )}
              <dt>{t("admin.organization")}</dt>
              <dd>{selected.tenant?.name ?? t("requests.unscoped")}</dd>
              {selected.reason && (
                <>
                  <dt>{t("admin.reason")}</dt>
                  <dd>{selected.reason}</dd>
                </>
              )}
              {selected.reviewer && (
                <>
                  <dt>{t("requests.reviewer")}</dt>
                  <dd>{selected.reviewer.name}</dd>
                </>
              )}
            </dl>
            {selected.status === "pending" && !action && (
              <div className="dialog-actions wrap">
                {global && (
                  <Button
                    variant="outline"
                    onClick={() => setAction("classify")}
                  >
                    {t("requests.classify")}
                  </Button>
                )}
                <Button
                  disabled={!selected.tenantId}
                  onClick={() => setAction("approved")}
                >
                  {t("requests.approve")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setAction("rejected")}
                >
                  {t("requests.reject")}
                </Button>
              </div>
            )}
            {action === "classify" && (
              <EditForm
                schema={classifySchema}
                fields={[
                  {
                    name: "tenantId",
                    label: t("admin.organization"),
                    options: [
                      { value: "", label: t("requests.unscoped") },
                      ...(tenants.data?.items
                        .filter((x) => x.status === "active")
                        .map((x) => ({
                          value: x.id,
                          label: x.agency.name + " · " + x.name,
                        })) ?? []),
                    ],
                  },
                ]}
                defaults={{ tenantId: selected.tenantId ?? "" }}
                onSave={async (data) => {
                  const item = await s.call<AccessRequest>(
                    path + "/" + selected.id + "/classify",
                    "POST",
                    data,
                  );
                  setSelected({
                    ...selected,
                    ...item,
                    tenant:
                      tenants.data?.items.find((x) => x.id === data.tenantId) ??
                      null,
                  });
                  setAction(undefined);
                  await refresh();
                  toast.success(t("common.saved"));
                }}
              />
            )}
            {(action === "approved" || action === "rejected") && (
              <>
                <p>{t("requests.roleHint")}</p>
                <EditForm
                  key={action}
                  schema={reviewSchema}
                  fields={[
                    ...(action === "approved"
                      ? [
                          {
                            name: "role",
                            label: t("common.role"),
                            options: [
                              { value: "USER", label: "User" },
                              { value: "ADMIN", label: "Admin" },
                            ],
                          },
                        ]
                      : []),
                    {
                      name: "reason",
                      label: t("admin.reason"),
                      type: "textarea",
                    },
                  ]}
                  defaults={{ decision: action, role: "USER", reason: "" }}
                  onSave={async (data) => {
                    await s.call(
                      path + "/" + selected.id + "/review",
                      "POST",
                      data,
                    );
                    setSelected(undefined);
                    setAction(undefined);
                    await refresh();
                    toast.success(t("common.saved"));
                  }}
                />
              </>
            )}
            {selected.invitationId && selected.tenantId && (
              <Button
                variant="outline"
                onClick={() =>
                  void s
                    .call(
                      `/tenants/${selected.tenantId}/invitations/${selected.invitationId}/resend`,
                      "POST",
                      {},
                    )
                    .then(() => toast.success(t("admin.inviteSent")))
                    .catch((e) => toast.error(errorText(e)))
                }
              >
                {t("admin.resend")}
              </Button>
            )}
          </>
        )}
      </Modal>
    </main>
  );
}
