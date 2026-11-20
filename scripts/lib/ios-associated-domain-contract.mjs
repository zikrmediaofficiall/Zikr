export const IOS_ASSOCIATED_DOMAIN_APP_ID_PATTERN = /^[A-Z0-9]{10}\.com\.zikr\.app$/;

export function getIosAssociatedDomainAppIdStatus({ appId, vercelEnv, required = vercelEnv === "production" } = {}) {
  const value = typeof appId === "string" ? appId.trim() : "";
  if (!value) {
    return required
      ? {
          status: "fail",
          detail: "IOS_ASSOCIATED_DOMAIN_APP_ID is required for production Apple Universal Links; provide the real Apple Team ID and bundle ID.",
        }
      : {
          status: "warn",
          detail: "IOS_ASSOCIATED_DOMAIN_APP_ID is optional for web deployments; iOS Universal Links remain unavailable until the real Apple Team ID and bundle ID are configured.",
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
