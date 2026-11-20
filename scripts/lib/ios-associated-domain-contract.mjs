export const IOS_ASSOCIATED_DOMAIN_APP_ID_PATTERN = /^[A-Z0-9]{10}\.com\.zikr\.app$/;

export function getIosAssociatedDomainAppIdStatus({ appId, vercelEnv } = {}) {
  const value = typeof appId === "string" ? appId.trim() : "";
  if (!value) {
    return vercelEnv === "production"
      ? {
          status: "fail",
          detail: "IOS_ASSOCIATED_DOMAIN_APP_ID is required for production Apple Universal Links; provide the real Apple Team ID and bundle ID.",
        }
      : {
          status: "warn",
          detail: "IOS_ASSOCIATED_DOMAIN_APP_ID is optional outside production; Apple Universal Links remain unavailable until it is configured.",
        };
  }

  if (!IOS_ASSOCIATED_DOMAIN_APP_ID_PATTERN.test(value)) {
    return {
      status: "fail",
      detail: "IOS_ASSOCIATED_DOMAIN_APP_ID must be a 10-character Apple Team ID plus .com.zikr.app.",
    };
  }

  return { status: "pass", detail: "Apple Universal Links app identifier is configured." };
}
