import { app, ipcMain, shell } from "electron";
import log from "electron-log";

import { channel } from "./channel";

// Cache app name to avoid repeated processing
let cachedAppName: string | null = null;

export function registerAppHandlers() {
  // Memoized version getter
  ipcMain.handle(channel.app.getVersion, async () => {
    try {
      return app.getVersion();
    } catch (error) {
      log.error("[IPC:app.getVersion] Error:", error);
      return "unknown";
    }
  });

  // Cached app name with formatting
  ipcMain.handle(channel.app.getName, async () => {
    try {
      if (cachedAppName) return cachedAppName;

      cachedAppName = app
        .getName()
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return cachedAppName;
    } catch (error) {
      log.error("[IPC:app.getName] Error:", error);
      return "Unknown App";
    }
  });

  // Validate URL before opening externally
  ipcMain.handle(channel.shell.openExternal, async (_event, url: string) => {
    try {
      if (!url || typeof url !== "string") {
        log.warn("[IPC:shell.openExternal] Invalid URL provided:", url);
        return { success: false, error: "Invalid URL" };
      }

      // Basic URL validation
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(url)) {
        log.warn("[IPC:shell.openExternal] Invalid URL format:", url);
        return { success: false, error: "Invalid URL format" };
      }

      await shell.openExternal(url, { activate: true });
      return { success: true };
    } catch (error) {
      log.error("[IPC:shell.openExternal] Error opening URL:", url, error);
      return { success: false, error: String(error) };
    }
  });
}
