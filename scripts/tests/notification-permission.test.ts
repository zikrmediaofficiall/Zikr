import assert from "node:assert/strict";
import { requestNotificationPermission } from "../../src/features/notifications/services/notifications";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNotification = Object.getOwnPropertyDescriptor(globalThis, "Notification");

function restoreGlobal(name: "window" | "Notification", descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    Reflect.deleteProperty(globalThis, name);
  }
}

try {
  const nativeWindow = {
    zikrNative: {
      requestNotificationPermission: async (): Promise<unknown> => {
        throw new Error("native bridge temporarily unavailable");
      },
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: nativeWindow,
  });

  assert.equal(
    await requestNotificationPermission(),
    "unsupported",
    "a transient native bridge failure must not be reported as a user denial",
  );

  nativeWindow.zikrNative.requestNotificationPermission = async () => ({ display: "denied" });
  assert.equal(
    await requestNotificationPermission(),
    "denied",
    "an explicit native permission denial must remain distinguishable from an operational failure",
  );

  nativeWindow.zikrNative.requestNotificationPermission = async () => ({ display: "prompt" });
  assert.equal(await requestNotificationPermission(), "default");

  nativeWindow.zikrNative.requestNotificationPermission = undefined as never;
  assert.equal(await requestNotificationPermission(), "unsupported");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { Notification: {} },
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    writable: true,
    value: {
      requestPermission: async () => {
        throw new Error("browser permission prompt unavailable");
      },
    },
  });
  assert.equal(
    await requestNotificationPermission(),
    "unsupported",
    "a rejected browser permission prompt must not be misreported as denial",
  );
} finally {
  restoreGlobal("window", originalWindow);
  restoreGlobal("Notification", originalNotification);
}

console.log("Native and browser notification permission failure semantics passed.");
