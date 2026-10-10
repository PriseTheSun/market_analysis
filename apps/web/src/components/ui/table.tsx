import type { ComponentProps, ReactNode } from "react";
import { Circle, MoreHorizontal, Search } from "lucide-react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { useTranslation } from "react-i18next";
import { initials } from "../../lib/initials";

export function RecordActions({
  name,
  disabled = false,
  children,
}: {
  name: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className="icon-button record-actions"
          aria-label={t("common.actionsFor", { name })}
          disabled={disabled}
        >
          <MoreHorizontal aria-hidden="true" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          className="record-action-menu"
          align="end"
          sideOffset={6}
          collisionPadding={12}
        >
          {children}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

export function TableSearch(props: ComponentProps<"input">) {
  const { t } = useTranslation();
  return (
    <label className="table-search">
      <Search aria-hidden="true" />
      <input
        aria-label={t("common.search")}
        placeholder={t("common.search")}
        {...props}
      />
    </label>
  );
}

export function RecordIdentity({
  name,
  detail,
}: {
  name: string;
  detail: string;
}) {
  return (
    <div className="record-identity">
      <span className="record-avatar" aria-hidden="true">
        {initials(name)}
      </span>
      <span>
        <strong>{name}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

export function ActiveStatus({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={`record-status ${active ? "is-active" : "is-inactive"}`}>
      <Circle aria-hidden="true" />
      {t(active ? "common.active" : "common.inactive")}
    </span>
  );
}
