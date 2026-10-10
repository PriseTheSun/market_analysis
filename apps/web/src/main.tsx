import React, { lazy, Suspense } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { appRoutePatterns, type AppRouteTemplate } from "@market/contracts";
import {
  LocalizedAddress,
  LocalizedLink as Link,
  LocalizedNavigate as Navigate,
} from "./lib/navigation";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import "@fontsource-variable/montserrat";
import "driver.js/dist/driver.css";
import "./lib/i18n";
import "./styles.css";
import "./app-layout.css";
import { queryClient } from "./lib/api";
import { SessionProvider } from "./lib/session";
const AuthPage = lazy(() =>
  import("./pages/auth").then((m) => ({ default: m.AuthPage })),
);
import { WorkspaceEntry, Protected, Shell } from "./components/shell";
const Chat = lazy(() =>
  import("./pages/chat").then((m) => ({ default: m.Chat })),
);
const FilesPage = lazy(() =>
  import("./pages/files").then((m) => ({ default: m.FilesPage })),
);
const Members = lazy(() =>
  import("./pages/admin").then((m) => ({ default: m.Members })),
);
const Agencies = lazy(() =>
  import("./pages/admin").then((m) => ({ default: m.Agencies })),
);
const Organizations = lazy(() =>
  import("./pages/admin").then((m) => ({ default: m.Organizations })),
);
const UsersPage = lazy(() =>
  import("./pages/admin").then((m) => ({ default: m.UsersPage })),
);
const Requests = lazy(() =>
  import("./pages/requests").then((m) => ({ default: m.Requests })),
);
const Preferences = lazy(() =>
  import("./pages/personal").then((m) => ({ default: m.Preferences })),
);
const Notifications = lazy(() =>
  import("./pages/personal").then((m) => ({ default: m.Notifications })),
);
const Audit = lazy(() =>
  import("./pages/audit").then((m) => ({ default: m.Audit })),
);
function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="empty">
      <h1>{t("shell.notFound")}</h1>
      <Link to="/app">{t("common.back")}</Link>
    </main>
  );
}
function WorkspaceRedirect() {
  const { tenantId } = useParams();
  return <Navigate to={`/app/${tenantId}/chat`} replace />;
}
function route(template: AppRouteTemplate, element: React.ReactNode) {
  return appRoutePatterns(template).map((path) => (
    <Route key={path} path={path} element={element} />
  ));
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <LocalizedAddress />
          <Suspense
            fallback={
              <div className="state" role="status">
                Market Analysis
              </div>
            }
          >
            <Routes>
              {route("/", <Navigate to="/app" replace />)}
              {route("/login", <AuthPage key="login" mode="login" />)}
              {route(
                "/solicitar-acesso",
                <AuthPage key="request" mode="request" />,
              )}
              {route(
                "/recuperar-senha",
                <AuthPage key="recover" mode="recover" />,
              )}
              {route("/redefinir-senha", <AuthPage key="reset" mode="reset" />)}
              {route(
                "/aceitar-convite",
                <AuthPage key="invite" mode="invite" />,
              )}
              <Route element={<Protected />}>
                {route("/app", <WorkspaceEntry />)}
                <Route element={<Shell />}>
                  {route("/app/:tenantId", <WorkspaceRedirect />)}
                  {route("/app/:tenantId/chat", <Chat />)}
                  {route("/app/:tenantId/files", <FilesPage />)}
                  {route("/app/:tenantId/members", <Members />)}
                  {route("/app/:tenantId/requests", <Requests />)}
                  {route("/app/:tenantId/notifications", <Notifications />)}
                  {route("/app/:tenantId/preferences", <Preferences />)}
                  {route("/app/:tenantId/audit", <Audit />)}
                  {route(
                    "/platform",
                    <Navigate to="/platform/agencies" replace />,
                  )}
                  {route("/platform/agencies", <Agencies />)}
                  {route("/platform/organizations", <Organizations />)}
                  {route("/platform/users", <UsersPage />)}
                  {route("/platform/requests", <Requests />)}
                  {route("/platform/notifications", <Notifications />)}
                  {route("/platform/preferences", <Preferences />)}
                  {route("/agencies/:agencyId", <Organizations />)}
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster
            position="bottom-left"
            closeButton
            richColors
            duration={5000}
          />
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  );
}
// Updates to shared translations can re-execute this entry module during HMR.
// Reuse its root so React retains ownership of the existing DOM container.
const root: Root =
  import.meta.hot?.data.root ?? createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
