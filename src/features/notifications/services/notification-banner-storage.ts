const DISMISSED_KEY = "zikr_notif_banner_dismissed";

type NotificationBannerStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/**
 * Session storage is optional in privacy-restricted and embedded WebViews.
 * A storage failure must never prevent the notification opt-in from rendering.
 */
export function hasDismissedNotificationBanner(
  getStorage: () => Pick<NotificationBannerStorage, "getItem">,
): boolean {
  try {
    return getStorage().getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Persist dismissal when available, but always allow the UI to close. */
export function persistNotificationBannerDismissal(
  getStorage: () => Pick<NotificationBannerStorage, "setItem">,
): void {
  try {
    getStorage().setItem(DISMISSED_KEY, "1");
  } catch {
    // The banner remains dismissible when session storage is unavailable.
  }
}
