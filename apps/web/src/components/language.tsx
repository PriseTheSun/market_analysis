import { ChevronDown, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Locale } from "@market/contracts";
import { useSession, savePreference } from "../lib/session";
import { toast } from "sonner";
import { errorText } from "../lib/api";
export function Language() {
  const { t, i18n } = useTranslation();
  const { session } = useSession();
  return (
    <label className="language">
      <Globe className="language-globe" aria-hidden="true" />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={i18n.language}
        onChange={(e) => {
          const locale = e.target.value as Locale;
          if (session)
            void savePreference({ locale }).catch((e) =>
              toast.error(errorText(e)),
            );
          else void i18n.changeLanguage(locale);
        }}
      >
        <option value="pt-BR">PT-BR</option>
        <option value="en">EN</option>
        <option value="es">ES</option>
      </select>
      <ChevronDown className="language-chevron" aria-hidden="true" />
    </label>
  );
}
