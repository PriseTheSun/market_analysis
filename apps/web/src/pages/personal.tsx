import { PAGE_SIZE } from "../lib/pagination";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useSession } from "../lib/session";
import { errorText, queryClient } from "../lib/api";
import { useScope, PageHeading, useNotifications } from "../components/shell";
import { Button } from "../components/ui/button";
import {
  Loading,
  ErrorState,
  Empty,
  Pagination,
} from "../components/ui/common";
export function Notifications() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const s = useScope(),
    q = useNotifications(page);
  const { session } = useSession();
  const read = async (id?: string) => {
    try {
      await s.call(
        s.prefix + "/notifications/" + (id ? id + "/read" : "read-all"),
        "POST",
        {},
      );
      await queryClient.invalidateQueries({
        queryKey: [...s.key, "notifications"],
      });
    } catch (e) {
      toast.error(errorText(e));
    }
  };
  return (
    <main className="page">
      <PageHeading title={t("shell.notifications")}>
        <Button
          variant="outline"
          disabled={!q.data?.unread}
          onClick={() => void read()}
        >
          {t("notifications.readAll")}
        </Button>
      </PageHeading>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : !q.data.items.length ? (
        <Empty
          title={t("notifications.empty")}
          description={t("notifications.emptySub")}
        />
      ) : (
        <ul className="notification-list">
          {q.data.items.map((n) => (
            <li key={n.id} className={n.readAt ? "read" : "unread"}>
              <div>
                <p>
                  {t("notification." + n.type, {
                    ...n.parameters,
                    defaultValue: t("shell.notifications"),
                  })}
                </p>
                <time>
                  {new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: session!.preference.timeZone,
                  }).format(new Date(n.createdAt))}
                </time>
              </div>
              {!n.readAt && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("notifications.read")}
                  onClick={() => void read(n.id)}
                >
                  <Check />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {q.data && (
        <Pagination
          page={page}
          total={q.data.total}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      )}
    </main>
  );
}
