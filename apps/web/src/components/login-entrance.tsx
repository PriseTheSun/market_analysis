import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimatedLoginLogo } from "./animated-login-logo";
import "./login-entrance.css";

type Phase = "playing" | "holding" | "leaving" | "done";

// Replay on a fresh page load, without delaying a return from password recovery.
let introCompleted = false;

export function LoginEntrance({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>(() =>
    introCompleted || matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "done"
      : "playing",
  );
  const active = phase !== "done";
  const finish = useCallback(() => {
    introCompleted = true;
    setPhase("done");
  }, []);
  const leave = useCallback(() => {
    setPhase((current) => (current === "done" ? current : "leaving"));
  }, []);

  useEffect(() => {
    if (phase === "done") {
      introCompleted = true;
      return;
    }
    // The last SVG stroke starts a short hold before fading into login.
    // Keep a fallback so interrupted animation events cannot block the form.
    const timer = window.setTimeout(
      phase === "leaving" ? finish : leave,
      phase === "playing" ? 5000 : phase === "holding" ? 400 : 600,
    );
    return () => window.clearTimeout(timer);
  }, [phase, finish, leave]);

  useEffect(() => {
    if (!active) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (reduced.matches) finish();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") leave();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    reduced.addEventListener("change", update);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      reduced.removeEventListener("change", update);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active, finish, leave]);

  return (
    <div className="login-entrance" data-phase={phase}>
      <div
        className="login-entrance-content"
        inert={active}
        aria-hidden={active || undefined}
      >
        {children}
      </div>
      {active && (
        <div className="login-intro" aria-label={t("auth.intro")}>
          <AnimatedLoginLogo
            onComplete={() =>
              setPhase((current) =>
                current === "playing" ? "holding" : current,
              )
            }
          />
          <button
            className="login-intro-skip"
            type="button"
            onClick={leave}
            disabled={phase === "leaving"}
          >
            {t("auth.skipIntro")}
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
