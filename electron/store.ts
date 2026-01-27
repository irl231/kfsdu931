import Store from "electron-store";

import {
  type AppSettings,
  type DiscordActivity,
  defaultAppSettings,
} from "./config";

export const storeKey = {
  appSettings: "appSettings",
  discordActivity: "discordActivity",
} as const;

export const StoreNameMap: Record<string, StoreName> = {
  AppSettings: "app-settings",
  DiscordActivity: "discord-activity",
} as const;

export const appSettingsStore = new Store<{ appSettings: AppSettings }>({
  name: StoreNameMap.AppSettings,
  defaults: {
    appSettings: {
      ...defaultAppSettings,
    },
  },
});

export const discordActivityStore = new Store<{
  discordActivity: DiscordActivity;
}>({
  name: StoreNameMap.DiscordActivity,
  defaults: {
    discordActivity: {
      default: {},
    },
  },
});
