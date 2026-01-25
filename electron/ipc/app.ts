import { app, ipcMain, shell } from "electron";

import { channel } from "./channel";

export function registerAppHandlers() {
  ipcMain.handle(channel.app.getVersion, async () => app.getVersion());
  ipcMain.handle(channel.app.getName, async () =>
    app
      .getName()
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  );
  ipcMain.handle(channel.shell.openExternal, async (_event, url: string) => {
    await shell.openExternal(url, { activate: true });
  });
}
