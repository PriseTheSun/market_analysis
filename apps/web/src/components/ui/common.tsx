import { useId, useState, type ReactNode, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Eye,
  EyeOff,
  Inbox,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./button";
import { errorText } from "../../lib/api";
export function Loading() {
  const { t } = useTranslation();
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" />
      <span>{t("common.loading")}</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="error-state" role="alert">
      <AlertCircle />
      <p>{errorText(error)}</p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          <RefreshCw aria-hidden="true" />
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="empty">
      <Inbox />
      <h2>{title ?? t("common.empty")}</h2>
      <p>{description ?? t("common.emptySub")}</p>
      {children}
    </div>
  );
}
export function Success({ children }: { children: ReactNode }) {
  return (
    <div className="success" role="status">
      <CheckCircle2 />
      <div>{children}</div>
    </div>
  );
}
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
export function Password(props: ComponentProps<"input">) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <span className="password-wrap">
      <input
        aria-label={t("auth.password")}
        {...props}
        type={show ? "text" : "password"}
      />
      <button
        type="button"
        className="icon-button"
        aria-label={t(show ? "auth.hidePassword" : "auth.showPassword")}
        aria-pressed={show}
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff /> : <Eye />}
      </button>
    </span>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  variant = "default",
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  variant?: "default" | "confirmation";
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const descriptionId = useId();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content"
          data-variant={variant}
          aria-describedby={description ? descriptionId : undefined}
        >
          <header className="dialog-header">
            <Dialog.Title>{title}</Dialog.Title>
            {description && (
              <Dialog.Description id={descriptionId}>
                {description}
              </Dialog.Description>
            )}
            <Dialog.Close asChild>
              <button
                className="icon-button dialog-close"
                aria-label={t("common.close")}
              >
                <X />
              </button>
            </Dialog.Close>
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ModalBody({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`dialog-body ${className}`} {...props} />;
}
export function ModalFooter({
  className = "",
  ...props
}: ComponentProps<"footer">) {
  return <footer className={`dialog-footer ${className}`} {...props} />;
}
export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>{t("common.page", { page, total: pages })}</span>
      <Button
        variant="outline"
        size="small"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" />
        {t("common.previous")}
      </Button>
      <Button
        variant="outline"
        size="small"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        {t("common.next")}
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}
export function Badge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className={"badge status-" + status}>
      {t("status." + status, { defaultValue: status })}
    </span>
  );
}
