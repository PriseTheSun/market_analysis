import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  type PublicUser,
  type SessionView,
} from "@market/contracts";
import { api, request, RequestError, errorText, queryClient } from "../lib/api";
import { Button } from "./ui/button";
import { UserAvatar } from "./user-avatar";

export function ProfilePhoto({ user }: { user: PublicUser }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<{ file: File; url: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      if (selected) URL.revokeObjectURL(selected.url);
    },
    [selected],
  );

  function choose(file?: File) {
    if (!file) return;
    setSelected(undefined);
    setError("");
    if (!AVATAR_TYPES.some((type) => type === file.type)) {
      setError(t("preferences.photoInvalid"));
    } else if (file.size > AVATAR_MAX_BYTES) {
      setError(t("preferences.photoTooLarge"));
    } else {
      setSelected({ file, url: URL.createObjectURL(file) });
    }
  }
  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (busy || !selected) return;
    const body = new FormData();
    body.append("image", selected.file);
    await mutate(
      () =>
        request("/preferences/avatar", { method: "POST", body }).then((r) =>
          r.json(),
        ),
      false,
    );
  }
  async function mutate(action: () => Promise<PublicUser>, removed: boolean) {
    setBusy(true);
    setError("");
    try {
      const updated = await action();
      queryClient.setQueryData<SessionView>(["session"], (old) =>
        old?.user.id === updated.id ? { ...old, user: updated } : old,
      );
      setSelected(undefined);
      toast.success(
        t(removed ? "preferences.photoRemoved" : "preferences.photoSaved"),
      );
    } catch (e) {
      setError(
        e instanceof RequestError && e.detail.code === "UPLOAD_TOO_LARGE"
          ? t("preferences.photoTooLarge")
          : e instanceof RequestError && e.detail.code === "UPLOAD_INVALID"
            ? t("preferences.photoInvalid")
            : errorText(e),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="profile-photo-section"
      aria-labelledby="profile-photo-title"
    >
      <h2 id="profile-photo-title">{t("preferences.photo")}</h2>
      <form
        className="profile-photo-form"
        onSubmit={(e) => void save(e)}
        aria-busy={busy}
      >
        <UserAvatar
          user={{ ...user, avatarUrl: selected?.url ?? user.avatarUrl }}
          className="profile-photo-preview"
        />
        <div className="profile-photo-controls">
          <p id="profile-photo-help">{t("preferences.photoHint")}</p>
          <input
            ref={input}
            type="file"
            hidden
            accept={AVATAR_TYPES.join(",")}
            aria-label={t("preferences.choosePhoto")}
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="profile-photo-actions">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              aria-describedby="profile-photo-help"
              onClick={() => input.current?.click()}
            >
              <Camera aria-hidden="true" />
              {t(
                user.avatarUrl || selected
                  ? "preferences.changePhoto"
                  : "preferences.choosePhoto",
              )}
            </Button>
            {user.avatarUrl && !selected && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void mutate(
                    () => api<PublicUser>("/preferences/avatar", "DELETE"),
                    true,
                  )
                }
              >
                <Trash2 aria-hidden="true" />
                {t("preferences.removePhoto")}
              </Button>
            )}
          </div>
          {selected && (
            <>
              <p className="profile-photo-filename">{selected.file.name}</p>
              <div className="profile-photo-actions">
                <Button disabled={busy}>
                  {t(busy ? "common.saving" : "preferences.savePhoto")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setSelected(undefined);
                    setError("");
                  }}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
