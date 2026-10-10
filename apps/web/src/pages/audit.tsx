import { useState } from "react";
import { useTranslation } from "react-i18next";
import { auditReadSchema } from "@market/contracts";
import { useScope, PageHeading } from "../components/shell";
import { EditForm } from "./admin";
import { Button } from "../components/ui/button";
import { Empty, ErrorState } from "../components/ui/common";
import { Markdown } from "./chat";
export function Audit() {
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
      {items.map((c) => (
        <div className="context-row" key={c.id}>
          <span>
            <strong>{c.title || t("chat.untitled")}</strong>
            <small>{c.owner.email}</small>
          </span>
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
            {t("common.open")}
          </Button>
        </div>
      ))}
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
