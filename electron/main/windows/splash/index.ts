import path from "node:path";
import { channel } from "@electron/ipc/channel";
import {
  DIST_PATH,
  getMacIconPath,
  getUsedDisplay,
  IS_DEV,
} from "@electron/main/utils";
import { BrowserWindow, ipcMain } from "electron";

export function createSplashWindow() {
  const { workArea: primaryDisplay } = getUsedDisplay();
  const biggest = Math.max(primaryDisplay.width, primaryDisplay.height) * 0.4;
  const size = {
    width: ~~biggest,
    height: ~~((biggest / 16) * 9),
  };

  const win = new BrowserWindow({
    ...size,
    x: primaryDisplay.x + primaryDisplay.width / 2 - size.width / 2,
    y: primaryDisplay.y + primaryDisplay.height / 2 - size.height / 2,
    icon: getMacIconPath(),
    backgroundColor: "#141517",
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: process.platform !== "darwin",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.setMenu(null);

  const splashUrl = IS_DEV
    ? `http://localhost:3020/#/splash`
    : `file://${path.resolve(DIST_PATH, "web/index.html")}#/splash`;

  const setState = (text: string, isLoading = true, progress = 0) =>
    win.webContents.send(channel.splash.state, text, isLoading, progress);

  return new Promise<{
    setState: (text: string, isLoading?: boolean, progress?: number) => void;
    close: () => void;
  }>((resolve) => {
    ipcMain.on(channel.splash.ready, () =>
      resolve({ setState, close: win.close.bind(win) }),
    );

    win
      .once("ready-to-show", win.show.bind(win))
      .once("close", () => win.isDestroyed() || win.close())
      .loadURL(splashUrl);
  });
}
