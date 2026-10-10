import { useCallback, useEffect, type ComponentProps } from "react";
import {
  Link,
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
  type NavigateFunction,
  type NavigateOptions,
  type To,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localizedAppPath } from "@market/contracts";

function localize(to: To, language: string): To {
  return typeof to === "string"
    ? localizedAppPath(to, language)
    : {
        ...to,
        ...(to.pathname
          ? { pathname: localizedAppPath(to.pathname, language) }
          : {}),
      };
}

export function LocalizedLink(props: ComponentProps<typeof Link>) {
  const { i18n } = useTranslation();
  return <Link {...props} to={localize(props.to, i18n.language)} />;
}

export function LocalizedNavLink(props: ComponentProps<typeof NavLink>) {
  const { i18n } = useTranslation();
  return <NavLink {...props} to={localize(props.to, i18n.language)} />;
}

export function LocalizedNavigate(props: ComponentProps<typeof Navigate>) {
  const { i18n } = useTranslation();
  return <Navigate {...props} to={localize(props.to, i18n.language)} />;
}

export function useLocalizedNavigate(): NavigateFunction {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const language = i18n.language;
  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") return navigate(to);
      return navigate(localize(to, language), options);
    },
    [navigate, language],
  );
}

export function LocalizedAddress() {
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const { i18n } = useTranslation();
  const pathname = localizedAppPath(location.pathname, i18n.language);
  // BrowserRouter subscribes to history in a layout effect. Redirect after that
  // subscription so its location always stays in sync with the address bar.
  useEffect(() => {
    if (pathname !== location.pathname)
      void navigate(
        { pathname, search: location.search, hash: location.hash },
        {
          replace: true,
          state: location.state,
        },
      );
  }, [location, pathname, navigate]);
  return null;
}
