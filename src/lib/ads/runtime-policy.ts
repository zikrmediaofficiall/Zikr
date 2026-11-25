export function getServiceWorkerScriptUrl(input: {
  isNative: boolean;
  origin?: string;
  productionUrl?: string;
}): string {
  if (input.isNative) return "/sw.js?native=1";

  return "/sw.js";
}
