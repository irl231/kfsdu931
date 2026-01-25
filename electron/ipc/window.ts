import { BrowserWindow, ipcMain } from "electron";
import log from "electron-log";

import { channel } from "./channel";

export function registerWindowHandlers() {
  // Helper function to get window with error handling
  const getWindow = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): BrowserWindow | null => {
    try {
      return BrowserWindow.fromWebContents(event.sender);
    } catch (error) {
      log.error("[IPC:window] Error getting window:", error);
      return null;
    }
  };

  ipcMain.on(channel.window.minimize, (event) => {
    try {
      const win = getWindow(event);
      if (win && !win.isMinimized()) {
        win.minimize();
      }
    } catch (error) {
      log.error("[IPC:window.minimize] Error:", error);
    }
  });

  ipcMain.on(channel.window.toggleMaximize, (event) => {
    try {
      const win = getWindow(event);
      if (!win) return;

      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    } catch (error) {
      log.error("[IPC:window.toggleMaximize] Error:", error);
    }
  });

  ipcMain.on(channel.window.close, (event) => {
    try {
      const win = getWindow(event);
      if (win && !win.isDestroyed()) {
        win.close();
      }
    } catch (error) {
      log.error("[IPC:window.close] Error:", error);
    }
  });

  ipcMain.handle(channel.window.isMaximized, (event) => {
    try {
      const win = getWindow(event);
      return win?.isMaximized() ?? false;
    } catch (error) {
      log.error("[IPC:window.isMaximized] Error:", error);
      return false;
    }
  });

  ipcMain.handle(channel.window.isFullScreen, (event) => {
    try {
      const win = getWindow(event);
      return win?.isFullScreen() ?? false;
    } catch (error) {
      log.error("[IPC:window.isFullScreen] Error:", error);
      return false;
    }
  });
}
