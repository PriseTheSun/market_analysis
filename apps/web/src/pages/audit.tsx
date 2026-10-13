import { ExternalLink } from "lucide-react";
import {
  RecordCollection,
  ViewToggle,
  useRecordView,
} from "../components/ui/collection";
import { RecordIdentity } from "../components/ui/table";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { auditReadSchema } from "@market/contracts";
import { useScope, PageHeading } from "../components/shell";
import { EditForm } from "./admin";
import { Button } from "../components/ui/button";
import { Empty, ErrorState } from "../components/ui/common";
import { Markdown } from "./chat";
export function Audit() {
  const display = useRecordView();
  const s = useScope(),
    { t } = useTranslation();
  const [items, setItems] = useState<
      { id: string; title: string; owner: { email: string } }[]
    >([]),
    [reason, setReason] = useState(""),
    [detail, setDetail] = useState<{
      messages: { id: string; role: string; content: string }[];
    }>(),
    [error, setError] = useState<unknown>();
  if (s.user.platformRole !== "GLOBAL")
    return <Empty title={t("shell.forbidden")} />;
  return (
    <main className="page">
      <PageHeading title={t("admin.audit")} description={t("admin.auditSub")} />
      <EditForm
        schema={auditReadSchema}
        fields={[
          { name: "reason", label: t("admin.reason"), type: "textarea" },
        ]}
        onSave={async (data) => {
          const r = await s.call<{ items: typeof items }>(
            `/platform${s.prefix}/conversations/audit`,
            "POST",
            data,
          );
          setReason(String(data.reason));
          setItems(r.items);
          setDetail(undefined);
        }}
      />
      {reason && (
        <>
          <div className="table-toolbar audit-collection-toolbar">
            <ViewToggle {...display} />
          </div>
          {items.length === 0 ? (
            <Empty />
          ) : (
            <RecordCollection
              view={display.view}
              label={t("admin.audit")}
              columns={[
                { label: t("common.name"), role: "identity" },
                { label: t("common.email") },
                { label: t("common.actions"), role: "actions" },
              ]}
            >
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <RecordIdentity
                      name={c.title || t("chat.untitled")}
                      detail=""
                    />
                  </td>
                  <td>{c.owner.email}</td>
                  <td>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void s
                          .call<typeof detail>(
                            `/platform${s.prefix}/conversations/${c.id}/audit`,
                            "POST",
                            { reason },
                          )
                          .then(setDetail)
                          .catch(setError)
                      }
                    >
                      <ExternalLink aria-hidden="true" />
                      {t("common.open")}
                    </Button>
                  </td>
                </tr>
              ))}
            </RecordCollection>
          )}
        </>
      )}
      {error != null && <ErrorState error={error} />}
      <div className="audit-messages">
        {detail?.messages.map((m) => (
          <article key={m.id}>
            <strong>
              {t(m.role === "user" ? "chat.you" : "chat.assistant")}
            </strong>
            <Markdown>{m.content}</Markdown>
          </article>
        ))}
      </div>
    </main>
  );
}
