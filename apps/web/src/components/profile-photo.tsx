import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Crop, RotateCcw, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  type PublicUser,
} from "@market/contracts";
import { cropAvatar } from "../lib/avatar-crop";
import { Button } from "./ui/button";
import { Modal } from "./ui/common";
import { UserAvatar } from "./user-avatar";

export type PhotoDraft =
  | {
      kind: "upload";
      file: File;
      previewUrl: string;
      source?: File;
      crop: Point;
      zoom: number;
    }
  | { kind: "remove" };

export function ProfilePhoto({
  user,
  draft,
  onChange,
  disabled,
}: {
  user: PublicUser;
  draft: PhotoDraft | null;
  onChange: (draft: PhotoDraft | null) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const [source, setSource] = useState<{ url: string; file?: File }>();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cropError, setCropError] = useState("");
  useEffect(
    () => () => {
      if (source?.file) URL.revokeObjectURL(source.url);
    },
    [source],
  );

  function openEditor(file?: File) {
    setError("");
    setCropError("");
    if (file && !AVATAR_TYPES.some((type) => type === file.type)) {
      setError(t("preferences.photoInvalid"));
      return;
    }
    if (file && file.size > AVATAR_MAX_BYTES) {
      setError(t("preferences.photoTooLarge"));
      return;
    }
    const original =
      file ?? (draft?.kind === "upload" ? draft.source : undefined);
    const url = original ? URL.createObjectURL(original) : user.avatarUrl;
    if (!url) return;
    const previous = !file && draft?.kind === "upload" ? draft : undefined;
    setCrop(previous?.crop ?? { x: 0, y: 0 });
    setZoom(previous?.zoom ?? 1);
    setArea(undefined);
    setSource({ url, file: original });
  }
  function closeEditor() {
    if (busy) return;
    setSource(undefined);
    // The editor has no Dialog.Trigger: return focus to its explicit entry point.
    requestAnimationFrame(() => editButton.current?.focus());
  }
  async function applyCrop() {
    if (!source || !area || busy || cropError) return;
    setBusy(true);
    try {
      const file = await cropAvatar(source.url, area);
      onChange({
        kind: "upload",
        file,
        previewUrl: URL.createObjectURL(file),
        source: source.file,
        crop,
        zoom,
      });
      setSource(undefined);
      requestAnimationFrame(() => editButton.current?.focus());
    } catch {
      setCropError(t("preferences.photoInvalid"));
    } finally {
      setBusy(false);
    }
  }
  const avatarUrl =
    draft?.kind === "remove"
      ? null
      : draft?.kind === "upload"
        ? draft.previewUrl
        : user.avatarUrl;
  return (
    <div className="profile-photo-control">
      <UserAvatar
        user={{ ...user, avatarUrl }}
        className="profile-photo-preview"
      />
      <div className="profile-photo-controls">
        <input
          ref={input}
          type="file"
          hidden
          accept={AVATAR_TYPES.join(",")}
          aria-label={t("preferences.choosePhoto")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) openEditor(file);
            e.target.value = "";
          }}
        />
        <div className="profile-photo-actions">
          <Button
            ref={editButton}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-describedby="profile-photo-help"
            onClick={() => input.current?.click()}
          >
            <Camera aria-hidden="true" />
            {t("preferences.changePhoto")}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => openEditor()}
            >
              <Crop aria-hidden="true" />
              {t("preferences.adjustPhoto")}
            </Button>
          )}
        </div>
        <p id="profile-photo-help">{t("preferences.photoHint")}</p>
        {avatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="small"
            disabled={disabled}
            onClick={() => {
              onChange(user.avatarUrl ? { kind: "remove" } : null);
              setError("");
            }}
          >
            <Trash2 aria-hidden="true" />
            {t("preferences.removePhoto")}
          </Button>
        )}
        {draft && (
          <p className="profile-photo-pending" role="status">
            {t(
              draft.kind === "remove"
                ? "preferences.photoRemovalPending"
                : "preferences.photoPending",
            )}
          </p>
        )}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <Modal
        open={Boolean(source)}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
        title={t("preferences.adjustPhoto")}
        description={t("preferences.cropHint")}
      >
        {source && (
          <>
            <div className="avatar-crop-stage" aria-busy={busy}>
              <Cropper
                image={source.url}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                minZoom={1}
                maxZoom={3}
                showGrid={false}
                zoomWithScroll={false}
                disableAutomaticStylesInjection
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropAreaChange={(_, pixels) => setArea(pixels)}
                onMediaLoaded={(image) => {
                  if (image.naturalWidth * image.naturalHeight > 20_000_000)
                    setCropError(t("preferences.photoInvalid"));
                }}
                mediaProps={{
                  alt: t("preferences.photo"),
                  onError: () => setCropError(t("preferences.photoInvalid")),
                }}
                cropperProps={{
                  role: "group",
                  "aria-label": t("preferences.cropArea"),
                }}
              />
            </div>
            <div className="avatar-zoom-header">
              <label htmlFor="avatar-zoom">{t("preferences.zoom")}</label>
              <output htmlFor="avatar-zoom">{Math.round(zoom * 100)}%</output>
            </div>
            <div className="avatar-zoom-control">
              <ZoomOut aria-hidden="true" />
              <input
                id="avatar-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                disabled={busy}
                aria-valuetext={`${Math.round(zoom * 100)}%`}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <ZoomIn aria-hidden="true" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="small"
              disabled={busy}
              onClick={() => {
                setCrop({ x: 0, y: 0 });
                setZoom(1);
              }}
            >
              <RotateCcw aria-hidden="true" />
              {t("preferences.resetCrop")}
            </Button>
            {cropError && (
              <p className="field-error" role="alert">
                {cropError}
              </p>
            )}
            <div className="dialog-actions">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={closeEditor}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                disabled={busy || !area || Boolean(cropError)}
                onClick={() => void applyCrop()}
              >
                {t(busy ? "common.loading" : "preferences.applyCrop")}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
