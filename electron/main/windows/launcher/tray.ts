import { setQuitting } from "@electron/main/lifecycle";
import { getWindowIcon } from "@electron/main/utils";
import { app, type BrowserWindow, Menu, nativeImage, Tray } from "electron";

export function createTray(
  getMainWindow: () => BrowserWindow | null,
  createLauncher: () => void,
) {
  if (process.platform === "darwin") return null;
  const icon = getWindowIcon();
  if (!icon) return null;

  const image = nativeImage.createFromPath(icon);
  const tray = new Tray(image.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Launcher",
      click: () => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.show();
          win.focus();
        } else {
          createLauncher();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        setQuitting(true);
        app.quit();
      },
    },
  ]);

  tray.setToolTip("AQVerse Launcher");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
        win.focus();
      }
    } else {
      createLauncher();
    }
  });

  return tray;
}
