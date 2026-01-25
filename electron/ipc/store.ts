import { appSettingsStore } from "@electron/store";
import { ipcMain } from "electron";
import log from "electron-log";
import { channel } from "./channel";

export function registerStoreHandlers() {
  ipcMain.handle(channel.store.get, async (_, name: StoreName) => {
    if (name === "app-settings") {
      return appSettingsStore.store;
    }
  });

  ipcMain.handle(channel.store.set, async (_, name: StoreName, value: any) => {
    try {
      if (value === null || value === undefined) {
        log.warn(`[store:set] Received invalid value for ${name}:`, value);
        return;
      }

      if (name === "app-settings") {
        appSettingsStore.set(value);
      }
    } catch (err) {
      log.error(`[store:set] Error setting store ${name}:`, err);
    }
  });

  ipcMain.handle(channel.store.clear, async (_, name: StoreName) => {
    if (name === "app-settings") {
      appSettingsStore.clear();
    }

    return true;
  });
}
