import path from "node:path";
import { appSettingsStore, storeKey } from "@electron/store";
import { app, screen } from "electron";

const isEnvSet = "ELECTRON_IS_DEV" in process.env;
const getFromEnv = Number.parseInt(process.env.ELECTRON_IS_DEV!, 10) === 1;

export const IS_DEV = isEnvSet ? getFromEnv : !app.isPackaged;

export const IS_PACKAGED = app.isPackaged;

export const ASSET_PATH = IS_PACKAGED
  ? process.platform === "win32"
    ? path.join(path.dirname(app.getPath("exe")), "resources", "app", "assets")
    : path.join(app.getAppPath(), "assets")
  : path.join(__dirname, "../assets");

export const DIST_PATH = IS_PACKAGED
  ? path.join(app.getAppPath(), "dist")
  : path.join(process.cwd(), "dist");

export const ICON_PATH = path.join(ASSET_PATH, "icons");
export const PLUGIN_PATH = path.join(ASSET_PATH, "plugins");

export const getWindowIcon = () =>
  process.platform === "darwin"
    ? undefined
    : path.resolve(
        ICON_PATH,
        process.platform === "win32" ? "win/icon.ico" : "icon.png",
      );

export const getMacIconPath = () => path.resolve(ICON_PATH, "mac/icon.png");

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const isObject = (value: any) =>
  value !== null && (typeof value === "object" || typeof value === "function");

export const isPromise = (value: any) =>
  value instanceof Promise ||
  (isObject(value) &&
    typeof value.then === "function" &&
    typeof value.catch === "function");

export const deepClone = <T>(obj: T): T =>
  obj == null ? obj : JSON.parse(JSON.stringify(obj));

export const sortKeys = (value: any): any => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value).sort())
      out[k] = sortKeys((value as any)[k]);
    return out;
  }
  return value;
};

export const getUsedDisplay = () => {
  const displays = screen.getAllDisplays();
  const lastDisplayId = appSettingsStore.get(
    storeKey.appSettings,
  ).lastDisplayId;
  let usedDisplay: Electron.Display;
  if (lastDisplayId) {
    usedDisplay =
      displays.find((d) => d.id === lastDisplayId) ||
      screen.getPrimaryDisplay();
  } else {
    usedDisplay = screen.getPrimaryDisplay();
  }
  return usedDisplay;
};
