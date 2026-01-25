import { app, nativeImage } from "electron";
import { getMacIconPath } from "../utils";

export function applyDock() {
  if (process.platform === "darwin") {
    const updateDockIcon = () => {
      const iconPath = getMacIconPath();
      const image = nativeImage.createFromPath(iconPath);
      app.dock?.setIcon(image);
    };

    updateDockIcon();
    // nativeTheme.on("updated", updateDockIcon);
  }
}
