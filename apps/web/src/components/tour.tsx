import { Play, SkipForward } from "lucide-react";
import { useEffect, useRef } from "react";
import { driver, type Driver } from "driver.js";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useScope } from "./shell";
import { api, queryClient, errorText } from "../lib/api";
import { toast } from "sonner";
import { Button } from "./ui/button";
export function Tour() {
  const s = useScope();
  const { t, i18n } = useTranslation();
  const active = useRef<Driver | null>(null),
    disposed = useRef(false);
  const q = useQuery({
    queryKey: [...s.key, "tour"],
    queryFn: ({ signal }) =>
      api<{ version: number; status: string }[]>(
        s.prefix + "/tour",
        "GET",
        undefined,
        signal,
      ),
  });
  const seen = q.data?.some((p) => p.version === 1 && p.status !== "started");
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      active.current?.destroy();
      active.current = null;
    };
  }, [s.key, i18n.language]);
  const queue = useRef(Promise.resolve());
  const save = (status: "started" | "completed" | "dismissed", step = 0) =>
    (queue.current = queue.current
      .then(() =>
        s.call(s.prefix + "/tour", "POST", { version: 1, status, step }),
      )
      .then(() =>
        queryClient.invalidateQueries({ queryKey: [...s.key, "tour"] }),
      )
      .catch((error) => {
        if (!disposed.current && error?.name !== "AbortError")
          toast.error(errorText(error));
      }));
  const start = () => {
    active.current?.destroy();
    const names = [
      "context",
      "chat",
      ...(s.tenant?.role !== "USER" ? ["files", "members"] : []),
      "notifications",
    ];
    const steps = names
      .map((name) => ({
        element: [
          ...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`),
        ].find((e) => e.getClientRects().length > 0),
        popover: {
          title: t(name === "context" ? "shell.switch" : "shell." + name),
          description: t("tour." + name),
        },
      }))
      .filter((step) => !!step.element);
    if (!steps.length) return;
    void save("started");
    let completed = false;
    const instance = driver({
      steps,
      onHighlighted: (_element, _step, opts) => {
        void save("started", opts.state.activeIndex ?? 0);
      },
      onNextClick: () => {
        if (instance.isLastStep()) {
          completed = true;
          instance.destroy();
        } else instance.moveNext();
      },
      animate: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      showProgress: true,
      allowClose: true,
      nextBtnText: t("common.next"),
      prevBtnText: t("common.previous"),
      doneBtnText: t("tour.done"),
      onDestroyStarted: () => {
        if (!disposed.current)
          void save(
            completed ? "completed" : "dismissed",
            instance.getActiveIndex() ?? 0,
          );
        instance.destroy();
        active.current = null;
      },
    });
    active.current = instance;
    instance.drive();
  };
  useEffect(() => {
    const handler = () => {
      const button =
        document.querySelector<HTMLButtonElement>("[data-start-tour]");
      button?.click();
    };
    window.addEventListener("ma:tour", handler);
    return () => window.removeEventListener("ma:tour", handler);
  }, []);
  return (
    <div className={"tour-offer" + (seen || !q.data ? " tour-hidden" : "")}>
      {!seen && q.data && (
        <>
          <span>{t("preferences.tour")}</span>
          <Button size="small" variant="outline" onClick={start}>
            <Play aria-hidden="true" />
            {t("tour.start")}
          </Button>
          <Button
            size="small"
            variant="ghost"
            onClick={() => void save("dismissed")}
          >
            <SkipForward aria-hidden="true" />
            {t("tour.skip")}
          </Button>
        </>
      )}
      <button hidden data-start-tour onClick={start} />
    </div>
  );
}
