import { PAGE_SIZE } from "../lib/pagination";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Sun, Moon } from "lucide-react";
import type { Locale } from "@market/contracts";
import { useSession, savePreference } from "../lib/session";
import { errorText, queryClient } from "../lib/api";
import { useScope, PageHeading, useNotifications } from "../components/shell";
import { Button } from "../components/ui/button";
import {
  Field,
  Loading,
  ErrorState,
  Empty,
  Pagination,
} from "../components/ui/common";
export function Preferences() {
  const { session } = useSession();
  const s = useScope();
  const { t } = useTranslation();
  const p = session!.preference;
  const [zone, setZone] = useState(p.timeZone),
    [saving, setSaving] = useState(false);
  return (
    <main className="page">
      <PageHeading
        title={t("shell.preferences")}
        description={t("preferences.sub")}
      />
      <form
        className="preferences-form form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          setSaving(true);
          void savePreference({ timeZone: zone })
            .then(() => toast.success(t("common.saved")))
            .catch((e) => toast.error(errorText(e)))
            .finally(() => setSaving(false));
        }}
      >
        <Field label={t("common.language")}>
          <select
            value={p.locale}
            onChange={(e) =>
              void savePreference({ locale: e.target.value as Locale }).catch(
                (e) => toast.error(errorText(e)),
              )
            }
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </Field>
        <fieldset>
          <legend>{t("preferences.theme")}</legend>
          <div className="theme-options">
            {(["light", "dark"] as const).map((theme) => (
              <Button
                key={theme}
                type="button"
                variant="outline"
                aria-pressed={p.theme === theme}
                onClick={() =>
                  void savePreference({ theme }).catch((e) =>
                    toast.error(errorText(e)),
                  )
                }
              >
                {theme === "light" ? <Sun /> : <Moon />}
                {t("preferences." + theme)}
                {p.theme === theme && <Check />}
              </Button>
            ))}
          </div>
        </fieldset>
        <Field label={t("preferences.zone")}>
          <input
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            list="timezones"
          />
          <datalist id="timezones">
            {Intl.supportedValuesOf("timeZone").map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </Field>
        <Button disabled={saving}>
          {t(saving ? "common.saving" : "common.save")}
        </Button>
      </form>
      {s.tenant && (
        <section className="preference-section">
          <h2>{t("preferences.tour")}</h2>
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new Event("ma:tour"))}
          >
            {t("preferences.restart")}
          </Button>
        </section>
      )}
    </main>
  );
}
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
