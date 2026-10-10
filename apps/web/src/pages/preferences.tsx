import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Clock3, Globe2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import type {
  Locale,
  Preference,
  PublicUser,
  SessionView,
} from "@market/contracts";
import { useSession, savePreference } from "../lib/session";
import { api, request, errorText, RequestError, queryClient } from "../lib/api";
import { useScope, PageHeading } from "../components/shell";
import { Button } from "../components/ui/button";
import { Field } from "../components/ui/common";
import { ProfilePhoto, type PhotoDraft } from "../components/profile-photo";
import "./preferences.css";

function ThemePreview({ theme }: { theme: "light" | "dark" }) {
  return (
    <span className={`theme-preview theme-preview-${theme}`} aria-hidden="true">
      <span className="theme-preview-sidebar">
        <img
          src={`/brand/logo-${theme === "light" ? "dark" : "light"}.svg`}
          alt=""
        />
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="theme-preview-main">
        <span className="theme-preview-header">
          <i />
          <i />
        </span>
        <span className="theme-preview-content">
          <i />
          <i />
          <i />
          <i />
        </span>
      </span>
    </span>
  );
}

export function Preferences() {
  const { session } = useSession();
  const scope = useScope();
  const { t } = useTranslation();
  const preference = session!.preference;
  const [draft, setDraft] = useState<Partial<Preference>>({});
  const [photo, setPhoto] = useState<PhotoDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const values = {
    ...preference,
    ...draft,
    theme: draft.theme ?? preference.theme ?? "light",
  };
  const preferenceChanged =
    values.theme !== (preference.theme ?? "light") ||
    values.locale !== preference.locale ||
    values.timeZone !== preference.timeZone;
  const dirty = preferenceChanged || Boolean(photo);
  useEffect(
    () => () => {
      if (photo?.kind === "upload") URL.revokeObjectURL(photo.previewUrl);
    },
    [photo],
  );

  async function save() {
    if (photo) {
      let user: PublicUser;
      if (photo.kind === "upload") {
        const body = new FormData();
        body.append("image", photo.file);
        user = await request("/preferences/avatar", {
          method: "POST",
          body,
        }).then((r) => r.json());
      } else {
        user = await api<PublicUser>("/preferences/avatar", "DELETE");
      }
      queryClient.setQueryData<SessionView>(["session"], (old) =>
        old?.user.id === user.id ? { ...old, user } : old,
      );
      // Reflect each committed operation even if the next request fails.
      setPhoto(null);
    }
    if (preferenceChanged) await savePreference(draft);
    setDraft({});
  }
  return (
    <main className="page preferences-page">
      <PageHeading
        title={t("shell.preferences")}
        description={t("preferences.sub")}
      />
      <form
        className="preferences-panel"
        aria-busy={saving}
        onSubmit={(e) => {
          e.preventDefault();
          if (saving || !dirty) return;
          setSaving(true);
          toast.promise(save(), {
            loading: t("common.saving"),
            success: t("common.saved"),
            error: (e) =>
              e instanceof RequestError && e.detail.code === "UPLOAD_TOO_LARGE"
                ? t("preferences.photoTooLarge")
                : errorText(e),
            finally: () => setSaving(false),
          });
        }}
      >
        <section
          className="preference-row"
          aria-labelledby="profile-photo-title"
        >
          <div className="preference-copy">
            <h2 id="profile-photo-title">{t("preferences.photo")}</h2>
            <p>{t("preferences.photoSub")}</p>
          </div>
          <ProfilePhoto
            user={session!.user}
            draft={photo}
            onChange={setPhoto}
            disabled={saving}
          />
        </section>
        <section className="preference-row" aria-labelledby="appearance-title">
          <div className="preference-copy">
            <h2 id="appearance-title">{t("preferences.theme")}</h2>
            <p>{t("preferences.themeSub")}</p>
          </div>
          <div
            className="theme-choices"
            role="radiogroup"
            aria-labelledby="appearance-title"
          >
            {(["light", "dark"] as const).map((theme) => (
              <label className="theme-choice" key={theme}>
                <input
                  type="radio"
                  name="appearance"
                  value={theme}
                  checked={values.theme === theme}
                  disabled={saving}
                  onChange={() => setDraft((old) => ({ ...old, theme }))}
                />
                <ThemePreview theme={theme} />
                <span className="theme-choice-caption">
                  {theme === "light" ? (
                    <Sun aria-hidden="true" />
                  ) : (
                    <Moon aria-hidden="true" />
                  )}
                  <span>{t(`preferences.${theme}`)}</span>
                  {theme === "light" && (
                    <span className="theme-default">
                      {t("preferences.default")}
                    </span>
                  )}
                  <span className="theme-radio" aria-hidden="true" />
                </span>
              </label>
            ))}
          </div>
        </section>
        <section className="preference-row" aria-labelledby="language-title">
          <div className="preference-copy">
            <h2 id="language-title">{t("common.language")}</h2>
            <p>{t("preferences.languageSub")}</p>
          </div>
          <div className="preference-locale-fields">
            <Field label={t("common.language")}>
              <span className="input-icon">
                <Globe2 aria-hidden="true" />
                <select
                  value={values.locale}
                  disabled={saving}
                  onChange={(e) =>
                    setDraft((old) => ({
                      ...old,
                      locale: e.target.value as Locale,
                    }))
                  }
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
                <ChevronDown
                  className="preference-select-chevron"
                  aria-hidden="true"
                />
              </span>
            </Field>
            <Field label={t("preferences.zone")}>
              <span className="input-icon">
                <Clock3 aria-hidden="true" />
                <input
                  value={values.timeZone}
                  disabled={saving}
                  required
                  list="timezones"
                  onChange={(e) =>
                    setDraft((old) => ({ ...old, timeZone: e.target.value }))
                  }
                />
              </span>
            </Field>
            <datalist id="timezones">
              {Intl.supportedValuesOf("timeZone").map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </div>
        </section>
        <div className="preferences-footer">
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || saving}
            onClick={() => {
              setDraft({});
              setPhoto(null);
            }}
          >
            {t("preferences.discard")}
          </Button>
          <Button disabled={!dirty || saving}>
            {t(saving ? "common.saving" : "common.save")}
          </Button>
        </div>
      </form>
      {scope.tenant && (
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
