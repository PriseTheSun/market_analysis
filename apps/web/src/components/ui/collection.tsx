import {
  Children,
  Fragment,
  isValidElement,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import { LayoutGrid, List } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSession } from "../../lib/session";
import "./collection.css";

type RecordView = "cards" | "table";
const preferenceEvent = "ma:list-view";
const memoryPreferences = new Map<string, RecordView>();
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memoryPreferences.delete(event.key);
    else memoryPreferences.clear();
    listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(preferenceEvent, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(preferenceEvent, listener);
  };
}

// One preference per signed-in user, shared by all record lists in this browser.
export function useRecordView() {
  const { session } = useSession();
  const key = session?.user.id ? `ma.listView.${session.user.id}` : undefined;
  const view = useSyncExternalStore(
    subscribe,
    (): RecordView => {
      if (!key) return "cards";
      const inMemory = memoryPreferences.get(key);
      if (inMemory) return inMemory;
      try {
        const saved = localStorage.getItem(key);
        if (saved === "table" || saved === "cards") return saved;
      } catch {
        // Keep switching available when browser storage is unavailable.
      }
      return "cards";
    },
    () => "cards" as const,
  );
  function setView(next: RecordView) {
    if (!key) return;
    memoryPreferences.set(key, next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // The in-memory preference still applies for this page session.
    }
    window.dispatchEvent(new Event(preferenceEvent));
  }
  return { view, setView };
}

export function ViewToggle({
  view,
  setView,
}: ReturnType<typeof useRecordView>) {
  const { t } = useTranslation();
  return (
    <div className="view-toggle" role="group" aria-label={t("collection.view")}>
      {(
        [
          ["cards", LayoutGrid],
          ["table", List],
        ] as const
      ).map(([value, Icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => setView(value)}
        >
          <Icon aria-hidden="true" />
          {t(`collection.${value}`)}
        </button>
      ))}
    </div>
  );
}

type Column = {
  label: string;
  role?: "identity" | "detail" | "status" | "actions";
};
type ContentElement = ReactElement<{
  children?: ReactNode;
  "data-selected"?: boolean;
}>;
function elements(children: ReactNode): ContentElement[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<ContentElement["props"]>(child)) return [];
    return child.type === Fragment ? elements(child.props.children) : [child];
  });
}

// Reuse the same row contents and action handlers in both semantic layouts.
// Children are native <tr>/<td> elements (optionally grouped in fragments).
export function RecordCollection({
  view,
  label,
  columns,
  children,
  tableClassName = "",
  kind,
}: {
  view: RecordView;
  label: string;
  columns: Column[];
  children: ReactNode;
  tableClassName?: string;
  kind?: string;
}) {
  if (view === "table")
    return (
      <div
        className="table-scroll collection-scroll"
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        <table
          className={`collection-table record-table ${tableClassName}`}
          aria-label={label}
          data-kind={kind}
        >
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th scope="col" key={index}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    );
  const identity = columns.findIndex((column) => column.role === "identity");
  const actions = columns.findIndex((column) => column.role === "actions");
  const status = columns.findIndex((column) => column.role === "status");
  const details = columns
    .map((column, index) => ({ ...column, index }))
    .filter(
      (column) =>
        column.index !== identity &&
        column.index !== actions &&
        column.index !== status,
    );
  return (
    <ul className="record-grid" role="list" aria-label={label} data-kind={kind}>
      {elements(children).map((row) => {
        const cells = elements(row.props.children);
        return (
          <li
            className="record-card"
            key={row.key}
            data-selected={row.props["data-selected"] || undefined}
          >
            <div className="record-card-header">
              <div className="record-card-identity">
                {cells[identity]?.props.children}
              </div>
              {actions >= 0 && (
                <div className="record-card-actions">
                  {cells[actions]?.props.children}
                </div>
              )}
            </div>
            {details.length > 0 && (
              <dl className="record-card-details">
                {details.map((column) => (
                  <div key={column.index}>
                    <dt>{column.label}</dt>
                    <dd>{cells[column.index]?.props.children}</dd>
                  </div>
                ))}
              </dl>
            )}
            {status >= 0 && (
              <div
                className="record-card-status"
                aria-label={columns[status]!.label}
              >
                {cells[status]?.props.children}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function RecordChips({
  names,
  tone,
  empty,
}: {
  names: string[];
  tone: "agency" | "client";
  empty: string;
}) {
  const unique = [...new Set(names)];
  return unique.length ? (
    <span className={`record-chips ${tone}`}>
      {unique.map((name) => (
        <span key={name}>{name}</span>
      ))}
    </span>
  ) : (
    <span className="record-no-links">{empty}</span>
  );
}
