import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errorText } from "../lib/api";
import { savePreference, useSession } from "../lib/session";
import { Tooltip } from "./ui/tooltip";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [saving, setSaving] = useState(false);
  const [initialTheme] = useState(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const dark = (session?.preference.theme ?? initialTheme) === "dark";

  return (
    <Tooltip
      label={t(dark ? "preferences.useLight" : "preferences.useDark")}
      side="bottom"
    >
      <button
        type="button"
        className="icon-button theme-toggle"
        role="switch"
        aria-label={t("preferences.darkMode")}
        aria-checked={dark}
        aria-busy={saving}
        disabled={saving}
        onClick={() => {
          setSaving(true);
          void savePreference({ theme: dark ? "light" : "dark" })
            .catch((error) => toast.error(errorText(error)))
            .finally(() => setSaving(false));
        }}
      >
        {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </button>
    </Tooltip>
  );
}
