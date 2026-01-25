import "../polyfills/event";
import { registerIpcHandlers } from "@electron/ipc";
import { appSettingsStore, storeKey } from "@electron/store";
import { app, type BrowserWindow } from "electron";
import { getCurrentDisplayMode } from "win-screen-resolution";
import { registerFlash } from "./flash";
import { setQuitting } from "./lifecycle";
import { initUpdate } from "./update";
import { IS_DEV, sleep } from "./utils";
import { createLauncherWindow } from "./windows/launcher";
import { createSplashWindow } from "./windows/splash";

// Disable renderer backgrounding to prevent the app from unloading when in the background
// https://github.com/electron/electron/issues/2822
// https://github.com/GoogleChrome/chrome-launcher/blob/5a27dd574d47a75fec0fb50f7b774ebf8a9791ba/docs/chrome-flags-for-tools.md#task-throttling
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

if (process.platform === "win32") {
  app.commandLine.appendSwitch("high-dpi-support", "true");

  // fix high-dpi scale factor on Windows (150% scaling)
  const { scale } = getCurrentDisplayMode();
  const forceScale =
    typeof scale === "number" && scale >= 150
      ? scale >= 250
        ? `${scale / 100 - 0.25}`
        : "1.75"
      : "1";
  app.commandLine.appendSwitch("force-device-scale-factor", forceScale);
}

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
let mainWin: BrowserWindow | null = null;

registerFlash();
registerIpcHandlers();

app.whenReady().then(async () => {
  if (process.platform === "win32") app.setAppUserModelId("dev.lazuee.aqwps");

  const splash = await createSplashWindow();
  await initUpdate(splash.setState);
  splash.setState("starting application");
  await sleep(2000);
  splash.setState("starting application", false);
  await sleep(500);

  mainWin = await createLauncherWindow(splash.close);
});

app
  .on("before-quit", () => setQuitting(true))
  .on("will-quit", () => IS_DEV && process.exit(0))
  .on("window-all-closed", () => {
    const closeWindowOption = appSettingsStore.get(
      storeKey.appSettings,
    ).closeWindowOption;
    if (process.platform !== "darwin" || closeWindowOption === "exit") {
      if (mainWin?.isDestroyed()) app.quit();
    }
  });
