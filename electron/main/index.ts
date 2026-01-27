import "../polyfills/event";
import { registerIpcHandlers } from "@electron/ipc";
import { cleanupDiscordRPC } from "@electron/ipc/discord-rpc";
import {
  appSettingsStore,
  discordActivityStore,
  storeKey,
} from "@electron/store";
import { app, type BrowserWindow } from "electron";
import log from "electron-log";
import { getCurrentDisplayMode } from "win-screen-resolution";
import { registerFlash } from "./flash";
import { setQuitting } from "./lifecycle";
import { initUpdate } from "./update";
import { IS_DEV, sleep } from "./utils";
import { createLauncherWindow } from "./windows/launcher";
import { createSplashWindow } from "./windows/splash";

// Configure logging
log.transports.file.level = IS_DEV ? "debug" : "info";
log.transports.console.level = IS_DEV ? "debug" : "warn";

// Disable renderer backgrounding to prevent the app from unloading when in the background
// https://github.com/electron/electron/issues/2822
// https://github.com/GoogleChrome/chrome-launcher/blob/5a27dd574d47a75fec0fb50f7b774ebf8a9791ba/docs/chrome-flags-for-tools.md#task-throttling
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

if (process.platform === "win32") {
  app.commandLine.appendSwitch("high-dpi-support", "true");

  // fix high-dpi scale factor on Windows (150% scaling)
  try {
    const { scale } = getCurrentDisplayMode();
    const forceScale =
      typeof scale === "number" && scale >= 150
        ? scale >= 250
          ? `${scale / 100 - 0.25}`
          : "1.75"
        : "1";
    app.commandLine.appendSwitch("force-device-scale-factor", forceScale);
    log.debug(`[Main] Applied DPI scaling: ${forceScale}`);
  } catch (error) {
    log.error("[Main] Error setting DPI scale:", error);
  }
}

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
let mainWin: BrowserWindow | null = null;
let isCleaningUp = false;

// Register handlers early
try {
  registerFlash();
  registerIpcHandlers();
  log.debug("[Main] IPC handlers registered successfully");
} catch (error) {
  log.error("[Main] Error registering handlers:", error);
}

// Optimize app startup with proper async handling
app.whenReady().then(async () => {
  discordActivityStore.clear();

  try {
    if (process.platform === "win32") {
      app.setAppUserModelId("dev.lazuee.aqwps");
    }

    log.debug("[Main] App ready, initializing windows...");

    const splash = await createSplashWindow();
    await initUpdate(splash.setState);

    splash.setState("starting application");
    await sleep(2000);

    splash.setState("starting application", false);
    await sleep(500);

    mainWin = await createLauncherWindow(splash.close);
    log.debug("[Main] Launcher window created successfully");
  } catch (error) {
    log.error("[Main] Error during app initialization:", error);
    app.quit();
  }
});

// Graceful shutdown handling
app
  .on("before-quit", async (event) => {
    // Prevent infinite loop by checking if we're already cleaning up
    if (isCleaningUp) {
      log.debug("[Main] Cleanup already in progress, allowing quit");
      return;
    }

    log.debug("[Main] App shutting down...");
    setQuitting(true);
    isCleaningUp = true;

    // Prevent immediate quit to allow cleanup
    event.preventDefault();

    try {
      // Clean up Discord RPC
      await cleanupDiscordRPC();
      log.debug("[Main] Discord RPC cleaned up");
    } catch (error) {
      log.error("[Main] Error cleaning up Discord RPC:", error);
    }

    // Allow some time for cleanup operations
    await sleep(500);

    // Now quit for real
    app.quit();
  })
  .on("will-quit", () => {
    if (IS_DEV) {
      log.debug("[Main] Dev mode - force exit");
      process.exit(0);
    }
  })
  .on("window-all-closed", () => {
    try {
      const closeWindowOption = appSettingsStore.get(
        storeKey.appSettings,
      ).closeWindowOption;

      if (process.platform !== "darwin" || closeWindowOption === "exit") {
        if (mainWin?.isDestroyed() || !mainWin) {
          log.debug("[Main] All windows closed, quitting app");
          app.quit();
        }
      }
    } catch (error) {
      log.error("[Main] Error in window-all-closed:", error);
      app.quit();
    }
  })
  .on("activate", () => {
    // Restore window when app icon is clicked (macOS/Windows)
    if (mainWin) {
      if (mainWin.isDestroyed()) {
        log.warn("[Main] Main window destroyed, cannot restore");
        return;
      }

      if (mainWin.isMinimized()) {
        mainWin.restore();
      }

      if (!mainWin.isVisible()) {
        mainWin.show();
      }

      mainWin.focus();
      log.debug("[Main] Window restored via activate event");
    }
  });

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  log.error("[Main] Uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  log.error("[Main] Unhandled rejection:", reason);
});
