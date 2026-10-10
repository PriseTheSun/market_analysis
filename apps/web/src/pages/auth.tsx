import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  LocalizedLink as Link,
  useLocalizedNavigate as useNavigate,
} from "../lib/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  Mail,
  UserRound,
  Building2,
} from "lucide-react";
import {
  type SessionView,
  loginSchema,
  accessRequestSchema,
  recoverySchema,
  resetSchema,
  invitationAcceptSchema,
} from "@market/contracts";
import { api, queryClient, resetCsrf, errorText } from "../lib/api";
import { useSession } from "../lib/session";
import { Language } from "../components/language";
import { Button } from "../components/ui/button";
import { Field, Password, Success } from "../components/ui/common";
import { BlurFade } from "../components/magicui/blur-fade";
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const manual = useRef(false);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const update = () => {
      if (reduced.matches || connection?.saveData) {
        setEnabled(false);
        ref.current?.pause();
        setPlaying(false);
      } else setEnabled(true);
    };
    update();
    reduced.addEventListener("change", update);
    return () => reduced.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!enabled || failed) return;
    const video = ref.current;
    if (!video) return;
    const play = () => {
      if (!document.hidden && !manual.current)
        void video
          .play()
          .then(() => setPlaying(true))
          .catch(() => setPlaying(false));
    };
    const visibility = () => {
      if (document.hidden) {
        video.pause();
        setPlaying(false);
      } else play();
    };
    play();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      video.pause();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled, failed]);
  return (
    <div className="auth-layout">
      <aside className="auth-visual">
        <img className="auth-poster" src="/media/auth-poster.jpg" alt="" />
        {enabled && !failed && (
          <video
            ref={ref}
            className="auth-video"
            src="/media/auth-background.mp4"
            muted
            loop
            playsInline
            poster="/media/auth-poster.jpg"
            preload="metadata"
            onError={() => {
              setFailed(true);
              setPlaying(false);
            }}
            aria-hidden="true"
          />
        )}
        <div className="auth-mask" />
        <div className="auth-brand">
          <img src="/brand/logo-light.svg" alt="Market Analysis" />
        </div>
        <div className="auth-pitch">
          <p className="auth-headline">{t("auth.headline")}</p>
          <p>{t("auth.description")}</p>
        </div>
        {enabled && !failed && (
          <button
            className="video-control"
            aria-label={t(playing ? "common.pause" : "common.play")}
            onClick={() => {
              if (playing) {
                manual.current = true;
                ref.current?.pause();
                setPlaying(false);
              } else {
                manual.current = false;
                void ref.current
                  ?.play()
                  .then(() => setPlaying(true))
                  .catch(() => setFailed(true));
              }
            }}
          >
            {playing ? <Pause /> : <Play />}
            <span>{t(playing ? "common.pause" : "common.play")}</span>
          </button>
        )}
      </aside>
      <main className="auth-main">
        <header className="auth-top">
          <img
            className="mobile-brand"
            src="/brand/logo-dark.svg"
            alt="Market Analysis"
          />
          <Language />
        </header>
        <BlurFade className="auth-form-area">{children}</BlurFade>
        <footer>© {new Date().getFullYear()} Market Analysis</footer>
      </main>
    </div>
  );
}
type AuthMode = "login" | "request" | "recover" | "reset" | "invite";
export function AuthPage({ mode }: { mode: AuthMode }) {
  const { t } = useTranslation();
  const { session } = useSession();
  const navigate = useNavigate(),
    location = useLocation();
  const [done, setDone] = useState(false),
    [error, setError] = useState("");
  const [token] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get("token") ?? "",
  );
  useEffect(() => {
    if (token && location.hash)
      void navigate(
        { pathname: location.pathname, search: location.search, hash: "" },
        {
          replace: true,
          state: location.state,
        },
      );
  }, [
    token,
    location.pathname,
    location.search,
    location.hash,
    location.state,
    navigate,
  ]);
  const schema =
    mode === "login"
      ? loginSchema
      : mode === "request"
        ? accessRequestSchema
        : mode === "recover"
          ? recoverySchema
          : mode === "reset"
            ? resetSchema
            : invitationAcceptSchema;
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(
      schema as z.ZodType<Record<string, unknown>, Record<string, unknown>>,
    ),
    defaultValues: {
      ...(mode === "login"
        ? { email: "", password: "", remember: false }
        : mode === "request"
          ? { name: "", email: "", organization: "", message: "" }
          : mode === "recover"
            ? { email: "" }
            : mode === "reset"
              ? { token, password: "" }
              : session
                ? { token }
                : { token, name: "", password: "" }),
    },
  });
  const submit = form.handleSubmit(async (data) => {
    setError("");
    try {
      await api(
        mode === "request"
          ? "/access-requests"
          : mode === "invite"
            ? "/auth/invitations/accept"
            : "/auth/" + mode,
        "POST",
        data,
      );
      if (mode === "login") {
        resetCsrf();
        await queryClient.cancelQueries({ queryKey: ["session"] });
        queryClient.setQueryData(
          ["session"],
          await api<SessionView>("/auth/session"),
        );
        navigate(
          location.state?.inviteToken
            ? "/aceitar-convite#token=" +
                encodeURIComponent(location.state.inviteToken)
            : "/app",
          { replace: true },
        );
      } else setDone(true);
    } catch (e) {
      setError(errorText(e));
    }
  });
  const invalid = (name: string) =>
    form.formState.errors[name] ? t("common.required") : undefined;
  const title =
    mode === "request"
      ? "auth.request"
      : mode === "recover"
        ? "auth.recover"
        : mode === "reset"
          ? "auth.reset"
          : mode === "invite"
            ? "auth.invite"
            : "auth.login";
  const action =
    mode === "login"
      ? "auth.enter"
      : mode === "request"
        ? "auth.send"
        : mode === "recover"
          ? "auth.recoverSend"
          : mode === "reset"
            ? "common.save"
            : "auth.invite";
  if (done)
    return (
      <AuthLayout>
        <Success>
          <h1>
            {t(
              mode === "request"
                ? "auth.received"
                : mode === "recover"
                  ? "auth.recover"
                  : mode === "reset"
                    ? "auth.reset"
                    : "auth.invite",
            )}
          </h1>
          <p>
            {t(
              mode === "request"
                ? "auth.receivedSub"
                : mode === "recover"
                  ? "auth.recoverSuccess"
                  : mode === "reset"
                    ? "auth.resetSuccess"
                    : "auth.inviteSuccess",
            )}
          </p>
        </Success>
        <Link className="back-link" to={session ? "/app" : "/login"}>
          <ArrowLeft />
          {t("auth.back")}
        </Link>
      </AuthLayout>
    );
  return (
    <AuthLayout>
      {mode !== "login" && (
        <Link className="back-link" to="/login">
          <ArrowLeft />
          {t("auth.back")}
        </Link>
      )}
      <h1>{t(title)}</h1>
      <p className="auth-subtitle">
        {t(
          mode === "reset"
            ? "auth.passwordHint"
            : mode === "request"
              ? "auth.requestSub"
              : mode === "recover"
                ? "auth.recoverSub"
                : mode === "invite"
                  ? "auth.inviteSub"
                  : "auth.loginSub",
        )}
      </p>
      <form onSubmit={submit} noValidate className="form-stack">
        {(mode === "request" || (mode === "invite" && !session)) && (
          <Field label={t("auth.name")} error={invalid("name")}>
            <span className="input-icon">
              <UserRound />
              <input
                {...form.register("name")}
                autoComplete="name"
                placeholder={t("auth.namePlaceholder")}
                aria-invalid={!!invalid("name")}
              />
            </span>
          </Field>
        )}
        {["login", "request", "recover"].includes(mode) && (
          <Field label={t("auth.email")} error={invalid("email")}>
            <span className="input-icon">
              <Mail />
              <input
                {...form.register("email")}
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                placeholder={t("auth.emailPlaceholder")}
                aria-invalid={!!invalid("email")}
              />
            </span>
          </Field>
        )}
        {mode === "request" && (
          <>
            <Field
              label={t("auth.organization")}
              error={invalid("organization")}
            >
              <span className="input-icon">
                <Building2 />
                <input
                  {...form.register("organization")}
                  autoComplete="organization"
                  placeholder={t("auth.organizationPlaceholder")}
                  aria-invalid={!!invalid("organization")}
                />
              </span>
            </Field>
            <Field label={t("auth.message")} error={invalid("message")}>
              <textarea
                {...form.register("message")}
                rows={2}
                maxLength={2000}
              />
            </Field>
          </>
        )}
        {(mode === "login" ||
          mode === "reset" ||
          (mode === "invite" && !session)) && (
          <Field label={t("auth.password")} error={invalid("password")}>
            <Password
              {...form.register("password")}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              aria-invalid={!!invalid("password")}
            />
          </Field>
        )}
        {mode === "login" && (
          <div className="remember-row">
            <label className="check-label">
              <input type="checkbox" {...form.register("remember")} />
              {t("auth.remember")}
            </label>
            <Link to="/recuperar-senha">{t("auth.forgot")}</Link>
          </div>
        )}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <Button className="full" disabled={form.formState.isSubmitting}>
          {t(form.formState.isSubmitting ? "common.saving" : action)}
          <ArrowRight />
        </Button>
      </form>
      {mode === "login" && (
        <p className="access-link">
          {t("auth.needAccess")}{" "}
          <Link to="/solicitar-acesso">{t("auth.request")}</Link>
        </p>
      )}
      {mode === "request" && (
        <p className="auth-notice">{t("auth.reviewNotice")}</p>
      )}
      {mode === "invite" && !session && (
        <Link className="back-link" to="/login" state={{ inviteToken: token }}>
          {t("auth.signInExisting")}
        </Link>
      )}
    </AuthLayout>
  );
}
