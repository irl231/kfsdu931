import path from "node:path";
import { channel } from "@electron/ipc/channel";
import { getQuitting } from "@electron/main/lifecycle";
import {
  DIST_PATH,
  getMacIconPath,
  getUsedDisplay,
  IS_DEV,
} from "@electron/main/utils";
import { appSettingsStore, storeKey } from "@electron/store";
import { app, BrowserWindow, type Tray } from "electron";
import { applyDock } from "../dock";
import { handleWebRequestInterceptors } from "./intercept";
import { createTray } from "./tray";

const loadUrl: string = IS_DEV
  ? `http://localhost:3020`
  : `file://${path.resolve(DIST_PATH, "web/index.html")}`;

let win: BrowserWindow | null = null;
let _tray: Tray | null = null;

const winSize = {
  width: 960,
  height: 540,
};
winSize.height += 63;

export function createLauncherWindow(opened?: () => void) {
  const { workArea: primaryDisplay } = getUsedDisplay();
  const biggest = Math.max(primaryDisplay.width, primaryDisplay.height) * 0.75;
  const size = {
    width: ~~biggest,
    height: ~~((biggest / 16) * 10),
  };

  win ??= new BrowserWindow({
    icon: getMacIconPath(),
    backgroundColor: "#141517",
    width: size.width,
    height: size.height,
    minWidth: winSize.width,
    minHeight: winSize.height,
    center: true,
    frame: false,
    show: false,
    ...(process.platform === "darwin"
      ? {
          titleBarStyle: "hidden",
          trafficLightPosition: { x: 14, y: 26 },
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      webSecurity: true,
      plugins: true,
      devTools: true, //IS_DEV,
    },
  });

  win.setMenu(null);
  win.setAspectRatio(16 / 10);

  applyDock();
  handleWebRequestInterceptors(win);

  if (process.platform === "win32") {
    // Intercepts WM_INITMENUPOPUP (0x0116) to prevent the app from freezing when the "Alt" key is pressed
    win.hookWindowMessage(0x0116, () => {
      win?.setEnabled(false);
      setTimeout(() => win?.setEnabled(true), 100);
      return true;
    });
  }

  _tray ??= createTray(
    () => win,
    async () => {
      win = await createLauncherWindow();
    },
  );

  return new Promise<BrowserWindow>((resolve) => {
    win!
      .once("ready-to-show", () => {
        opened?.();
        win!.show.call(win);
      })
      .webContents.on("did-finish-load", resolve.bind(null, win!))
      .on("before-input-event", (event, input) => {
        if ((input.control || input.meta) && input.key.toLowerCase() === "r")
          event.preventDefault();
      });

    win!
      .on("maximize", () => win?.webContents.send(channel.window.maximize))
      .on("unmaximize", () => win?.webContents.send(channel.window.unmaximize))
      .on("enter-full-screen", () =>
        win?.webContents.send(channel.window.enterFullScreen),
      )
      .on("leave-full-screen", () =>
        win?.webContents.send(channel.window.leaveFullScreen),
      )
      .on("close", (event) => {
        const closeWindowOption = appSettingsStore.get(
          storeKey.appSettings,
        ).closeWindowOption;
        if (!getQuitting()) {
          if (closeWindowOption === "hide") {
            event.preventDefault();

            if (process.platform === "darwin" && win?.isFullScreen()) {
              win.once("leave-full-screen", () => {
                win?.hide();
                setTimeout(
                  () => win?.once("show", () => win?.setFullScreen(true)),
                  100,
                );
              });
              win.setFullScreen(false);
            } else win?.hide();

            return;
          }
        }

        app.quit();
      })
      .loadURL(loadUrl);
  });
}
