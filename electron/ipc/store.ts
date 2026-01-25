import { appSettingsStore } from "@electron/store";
import { ipcMain } from "electron";
import log from "electron-log";
import { channel } from "./channel";

// Validate store name
function isValidStoreName(name: unknown): name is StoreName {
  return typeof name === "string" && name === "app-settings";
}

export function registerStoreHandlers() {
  ipcMain.handle(channel.store.get, async (_, name: StoreName) => {
    try {
      if (!isValidStoreName(name)) {
        log.warn(`[store:get] Invalid store name: ${name}`);
        return null;
      }

      if (name === "app-settings") {
        return appSettingsStore.store;
      }

      return null;
    } catch (error) {
      log.error(`[store:get] Error reading store ${name}:`, error);
      return null;
    }
  });

  ipcMain.handle(channel.store.set, async (_, name: StoreName, value: any) => {
    try {
      // Validate inputs
      if (!isValidStoreName(name)) {
        log.warn(`[store:set] Invalid store name: ${name}`);
        return { success: false, error: "Invalid store name" };
      }

      if (value === null || value === undefined) {
        log.warn(`[store:set] Received invalid value for ${name}:`, value);
        return { success: false, error: "Invalid value" };
      }

      if (typeof value !== "object") {
        log.warn(`[store:set] Expected object for ${name}, got:`, typeof value);
        return { success: false, error: "Expected object value" };
      }

      if (name === "app-settings") {
        appSettingsStore.set(value);
        return { success: true };
      }

      return { success: false, error: "Unknown store" };
    } catch (error) {
      log.error(`[store:set] Error setting store ${name}:`, error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(channel.store.clear, async (_, name: StoreName) => {
    try {
      if (!isValidStoreName(name)) {
        log.warn(`[store:clear] Invalid store name: ${name}`);
        return false;
      }

      if (name === "app-settings") {
        appSettingsStore.clear();
        return true;
      }

      return false;
    } catch (error) {
      log.error(`[store:clear] Error clearing store ${name}:`, error);
      return false;
    }
  });
}
