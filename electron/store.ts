import Store from "electron-store";

import { type AppSettings, defaultAppSettings } from "./config";

export const storeKey = {
  appSettings: "appSettings",
} as const;

export const StoreNameMap: Record<string, StoreName> = {
  AppSettings: "app-settings",
} as const;

export const appSettingsStore = new Store<{ appSettings: AppSettings }>({
  name: StoreNameMap.AppSettings,
  defaults: {
    appSettings: {
      ...defaultAppSettings,
    },
  },
});
