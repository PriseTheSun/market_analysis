import { useEffect, type Dispatch, type SetStateAction } from "react";
import { driver } from "driver.js";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import {
  Users,
  KeyRound,
  Building2,
  ContactRound,
  ShieldCheck,
  Pencil,
  Archive,
  Search,
  ArrowRight,
  X,
} from "lucide-react";
import type { ManagementKind } from "@market/contracts";
import { Button } from "./ui/button";

type GuideStep = { target?: string; copy: string; form?: boolean };
type Guide = {
  id: string;
  icon: typeof Users;
  kind?: ManagementKind;
  global?: boolean;
  steps: GuideStep[];
};
const create: GuideStep = {
  target: "[data-management-guide='create']",
  copy: "create",
};
const field = (name: string, copy = name): GuideStep => ({
  target: `[data-management-guide='${name}']`,
  copy,
  form: true,
});
const actions: GuideStep = {
  target: ".management-page .record-actions",
  copy: "edit",
};
export const managementGuides: Guide[] = [
  {
    id: "users",
    icon: Users,
    kind: "users",
    global: true,
    steps: [
      create,
      field("identity"),
      field("links"),
      field("save", "saveUser"),
    ],
  },
  {
    id: "direct",
    icon: KeyRound,
    kind: "users",
    global: true,
    steps: [
      create,
      field("direct"),
      field("identity"),
      field("password"),
      field("role"),
      field("links"),
      field("save", "saveUser"),
    ],
  },
  {
    id: "agencies",
    icon: Building2,
    kind: "agencies",
    global: true,
    steps: [create, field("name"), field("slug"), field("save")],
  },
  {
    id: "clients",
    icon: ContactRound,
    kind: "clients",
    global: true,
    steps: [
      create,
      field("name"),
      field("slug"),
      field("clientAgency"),
      field("save"),
    ],
  },
  {
    id: "permissions",
    icon: ShieldCheck,
    kind: "permissions",
    steps: [create, field("permissionUser"), field("scope"), field("save")],
  },
  {
    id: "edit",
    icon: Pencil,
    steps: [
      { target: ".management-toolbar .table-search", copy: "search" },
      actions,
      { copy: "editSave" },
    ],
  },
  {
    id: "archive",
    icon: Archive,
    kind: "users",
    global: true,
    steps: [
      { ...actions, copy: "archive" },
      { target: ".management-view-filter", copy: "archived" },
      { copy: "restore" },
    ],
  },
  {
    id: "browse",
    icon: Search,
    steps: [
      { target: ".management-tabs", copy: "tabs" },
      { target: ".management-toolbar .table-search", copy: "search" },
      { target: ".management-toolbar", copy: "filters" },
      { target: "[data-management-guide='views']", copy: "views" },
    ],
  },
];
export type ManagementTourState = { guide: Guide; step: number } | undefined;

export function ManagementHelp({
  global,
  onStart,
}: {
  global: boolean;
  onStart: (guide: Guide) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="management-overlay" />
      <Dialog.Content className="management-modal management-help-dialog">
        <div className="management-modal-heading">
          <Dialog.Title>{t("managementGuide.title")}</Dialog.Title>
          <Dialog.Description>
            {t("managementGuide.description")}
          </Dialog.Description>
          <Dialog.Close asChild>
            <Button variant="ghost" size="icon" aria-label={t("common.close")}>
              <X aria-hidden="true" />
            </Button>
          </Dialog.Close>
        </div>
        <div className="management-guide-list">
          {managementGuides
            .filter((guide) => global || !guide.global)
            .map((guide) => (
              <button
                type="button"
                className="management-guide-card"
                key={guide.id}
                onClick={() => onStart(guide)}
              >
                <span className="management-guide-icon">
                  <guide.icon aria-hidden="true" />
                </span>
                <span className="management-guide-copy">
                  <strong>{t(`managementGuide.${guide.id}`)}</strong>
                  <span>{t(`managementGuide.${guide.id}Hint`)}</span>
                  <small>
                    {t("managementGuide.steps", { count: guide.steps.length })}
                  </small>
                </span>
                <ArrowRight aria-hidden="true" />
              </button>
            ))}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function ManagementTour({
  tour,
  ready,
  onChange,
}: {
  tour: ManagementTourState;
  ready: boolean;
  onChange: Dispatch<SetStateAction<ManagementTourState>>;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!tour || !ready) return;
    let disposed = false;
    const finish = () => {
      onChange(undefined);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>("[data-management-guide='help']")
          ?.focus(),
      );
    };
    const instance = driver({
      animate: false,
      disableActiveInteraction: true,
      overlayClickBehavior: "none",
      showProgress: true,
      progressText: t("managementGuide.progress", {
        current: "{{current}}",
        total: "{{total}}",
      }),
      nextBtnText: t("common.next"),
      prevBtnText: t("common.previous"),
      doneBtnText: t("tour.done"),
      closeBtnLabel: t("common.close"),
      popoverClass: "management-guide-popover",
      onNextClick: () =>
        tour.step === tour.guide.steps.length - 1
          ? finish()
          : onChange({ ...tour, step: tour.step + 1 }),
      onPrevClick: () =>
        tour.step > 0 && onChange({ ...tour, step: tour.step - 1 }),
      onDestroyStarted: () => {
        if (!disposed) finish();
        instance.destroy();
      },
      onPopoverRender: (popover) => {
        popover.wrapper.setAttribute("role", "dialog");
        popover.wrapper.setAttribute(
          "aria-label",
          t(`managementGuide.${tour.guide.id}`),
        );
        popover.nextButton.focus();
      },
      steps: tour.guide.steps.map((step) => ({
        element: step.target,
        popover: {
          title: t(`managementGuide.${tour.guide.id}`),
          description: t(`managementGuide.step.${step.copy}`),
        },
      })),
    });
    // Start after Radix has released the help dialog's focus and pointer lock.
    const frame = requestAnimationFrame(() => {
      instance.drive(tour.step);
      document
        .querySelector<HTMLButtonElement>(
          ".management-guide-popover .driver-popover-next-btn",
        )
        ?.focus();
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      instance.destroy();
    };
  }, [tour, ready, onChange, t]);
  return null;
}
