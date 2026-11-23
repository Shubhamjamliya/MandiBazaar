import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    /**
     * Called by the native wrapper when a push notification is tapped, with the
     * notification's `link`/`click_action` (a path or an absolute URL), or the
     * whole data payload. Counterpart to `setNativeFcmToken`.
     */
    openNotificationTarget?: (target: string | { link?: string; click_action?: string; url?: string }) => boolean;
  }
}

/** Reduce a path or absolute URL to an in-app path, or null if it is not ours. */
function toAppPath(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return raw.startsWith("/") ? raw : null;
  }
}

/**
 * Routes the app when a push notification is tapped while the app is already open.
 *
 * Two senders reach us here:
 * - the service worker, which focuses the existing window and posts the target;
 * - the native wrapper, via `window.openNotificationTarget`.
 *
 * Without this, a tap would focus the app on whatever screen the partner was
 * last on instead of the order's accept/decline screen.
 */
const NotificationClickHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const go = (path: string | null): boolean => {
      if (!path) return false;
      const current = `${window.location.pathname}${window.location.search}`;
      if (path !== current) navigate(path);
      return true;
    };

    window.openNotificationTarget = (target) => {
      if (typeof target === "string") return go(toAppPath(target));
      if (!target) return false;
      return go(toAppPath(target.link || target.click_action || target.url));
    };

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== "NOTIFICATION_CLICK") return;
      go(toAppPath(data.path || data.url));
    };

    const hasSW = typeof navigator !== "undefined" && "serviceWorker" in navigator;
    if (hasSW) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
    }

    return () => {
      if (hasSW) {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      }
      delete window.openNotificationTarget;
    };
  }, [navigate]);

  return null;
};

export default NotificationClickHandler;
