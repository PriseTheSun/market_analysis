// Adapted from shadcn/ui (MIT): docs/licenses/shadcn-ui.txt.
import type { CSSProperties } from "react";
import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTranslation } from "react-i18next";
import { useSession } from "../../lib/session";

export function Toaster(props: ToasterProps) {
  const { t } = useTranslation();
  const { session } = useSession();
  return (
    <Sonner
      className="toaster"
      theme={session?.preference.theme ?? "light"}
      position="bottom-left"
      closeButton
      duration={5000}
      offset={{ bottom: "max(24px, env(safe-area-inset-bottom))", left: 24 }}
      mobileOffset={{
        bottom: "max(16px, env(safe-area-inset-bottom))",
        left: 16,
        right: 16,
      }}
      containerAriaLabel={t("shell.notifications")}
      icons={{
        success: <CircleCheck aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
        warning: <TriangleAlert aria-hidden="true" />,
        error: <OctagonX aria-hidden="true" />,
        loading: <LoaderCircle className="toast-spinner" aria-hidden="true" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--text)",
          "--normal-border": "var(--border)",
          "--normal-bg-hover": "var(--soft)",
          "--normal-border-hover": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      toastOptions={{ closeButtonAriaLabel: t("common.close") }}
      {...props}
    />
  );
}
