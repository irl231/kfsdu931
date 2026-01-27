export interface AppSettings {
  lastDisplayId?: number;
  backgroundColor: string;
  contentBackgroundColor: string;
  primaryColor: string;
  borderRadius: number;
  closeWindowOption: "hide" | "exit";
  autoStart: boolean;
  hiddenMenuKeys: string[];
  discordPresence: boolean;
  activeTabURL?: string;
}

export interface DiscordActivity {
  [applicationId: string]: RichPresencePayload;
  ["default"]: RichPresencePayload;
}

export const defaultAppSettings: AppSettings = {
  autoStart: false,
  closeWindowOption: "hide",
  borderRadius: 8,
  backgroundColor: "#18181b",
  contentBackgroundColor: "#1f1f1f",
  primaryColor: "#17c964",
  hiddenMenuKeys: [],
  discordPresence: true,
  activeTabURL: "",
};

export const FLASH_PLUGIN =
  process.platform === "darwin"
    ? "PepperFlashPlayer.plugin"
    : process.platform === "win32"
      ? "pepflashplayer.dll"
      : "libpepflashplayer.so";
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36 Edg/90.0.818.51";
export const ELECTRON_OUT_DIR = ".electron";
export const WHITELISTED_DOMAINS = [
  "localhost",
  "artix.com",
  "wikidot.com",
  "heromart.com",
];
