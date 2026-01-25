import { appSettingsStore, storeKey } from "@electron/store";
import { GAMES } from "@web/pages/launcher/constants";
import type { SetActivity } from "@xhayper/discord-rpc";
import { ipcMain } from "electron";
import log from "electron-log";
import { parse as parseTLD } from "tldts";
import { channel } from "../channel";
import { DiscordRPC } from "./rpc";

let discordRPC: DiscordRPC | null = null;
let currentDiscordRPCId: string | null = null;
const currentDiscordRPC: Map<string, SetActivity> = new Map(); // Use Map for better performance

let isSwitching = false;
let pendingPresence: SetActivity | null = null;
let switchTimeout: NodeJS.Timeout | null = null;

// Debounce time in ms
const DEBOUNCE_DELAY = 200;
const PROCESS_RETRY_DELAY = 500;

// Helper to validate URL
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function processRpcUpdate(): Promise<void> {
  if (isSwitching || !pendingPresence) return;

  isSwitching = true;
  const presenceToApply = pendingPresence;
  pendingPresence = null;

  try {
    const isDiscordRPCEnabled = appSettingsStore.get(
      storeKey.appSettings,
    ).discordPresence;

    if (!isDiscordRPCEnabled) {
      if (discordRPC) {
        await discordRPC.destroy();
        discordRPC = null;
        currentDiscordRPCId = null;
        currentDiscordRPC.clear(); // Clear Map
      }
      return;
    }

    if (discordRPC && currentDiscordRPCId === presenceToApply.applicationId) {
      if (!presenceToApply.url || !isValidUrl(presenceToApply.url)) return;

      const parsedUrl = new URL(presenceToApply.url.replace(/\/$/, ""));
      const tld = parseTLD(parsedUrl.hostname);
      if (!tld.domain) {
        log.warn("[Discord RPC] Invalid domain:", parsedUrl.hostname);
        return;
      }

      const id = `${tld.domain}-${parsedUrl.pathname}`;
      presenceToApply.url = `${parsedUrl.protocol}//${tld.domain}`;

      if (!GAMES.find((x) => x.id === id)) {
        await discordRPC.update({
          ...presenceToApply,
          details: "🧭 Browsing",
          state: `🌐 ${parsedUrl.hostname}${parsedUrl.pathname}`,
          stateUrl: parsedUrl.href,
        });
      } else {
        if (presenceToApply.state?.startsWith("🌎")) {
          const [mapName] = presenceToApply.state
            .replace("🌎 ", "")
            .toLowerCase()
            .trim()
            .split("-");
          presenceToApply.state = `🌎 ${mapName}`;
        }
        await discordRPC.update({ ...presenceToApply });
      }
    } else {
      if (discordRPC) {
        await discordRPC.destroy();
        discordRPC = null;
      }

      if (!presenceToApply.applicationId) return;
      currentDiscordRPCId = presenceToApply.applicationId;

      discordRPC = new DiscordRPC();
      await discordRPC.init(presenceToApply);
    }
  } catch (error) {
    log.error("[Discord RPC] Error updating presence:", error);
  } finally {
    isSwitching = false;
    if (pendingPresence) {
      setTimeout(() => processRpcUpdate(), PROCESS_RETRY_DELAY);
    }
  }
}

export function registerDiscordRPCHandlers() {
  ipcMain.on(
    channel.discordRPC.update,
    (_event, richPresenceOrUrl: Record<string, any> | string) => {
      try {
        if (!richPresenceOrUrl) {
          log.warn("[Discord RPC] Received empty presence data");
          return;
        }

        let richPresence: SetActivity | null = null;
        let tld: ReturnType<typeof parseTLD>;

        if (typeof richPresenceOrUrl === "string") {
          if (!isValidUrl(richPresenceOrUrl)) {
            log.warn("[Discord RPC] Invalid URL:", richPresenceOrUrl);
            return;
          }

          const parsedUrl = new URL(richPresenceOrUrl.replace(/\/$/, ""));
          tld = parseTLD(parsedUrl.hostname);

          if (!tld.domain) {
            log.warn("[Discord RPC] Invalid domain:", parsedUrl.hostname);
            return;
          }

          richPresence = currentDiscordRPC.get(tld.domain) ?? null;
          if (richPresence) {
            richPresence.url = richPresenceOrUrl;
          }
        } else {
          if (!richPresenceOrUrl.url || !isValidUrl(richPresenceOrUrl.url)) {
            log.warn("[Discord RPC] Invalid presence URL:", richPresenceOrUrl.url);
            return;
          }

          const parsedUrl = new URL(richPresenceOrUrl.url.replace(/\/$/, ""));
          tld = parseTLD(parsedUrl.hostname);

          if (!tld.domain) {
            log.warn("[Discord RPC] Invalid domain:", parsedUrl.hostname);
            return;
          }

          richPresence = {
            url: richPresenceOrUrl.url,
            applicationId: richPresenceOrUrl.id,
            details: richPresenceOrUrl.details,
            state: richPresenceOrUrl.state,
            startTimestamp: richPresenceOrUrl.startTimestamp,
            secrets: richPresenceOrUrl.secrets,
            instance: richPresenceOrUrl.instance,
            buttons: richPresenceOrUrl.buttons,
            partyId: richPresenceOrUrl.partyId,
            partySize: richPresenceOrUrl.partySize,
            partyMax: richPresenceOrUrl.partyMax,
            joinSecret: richPresenceOrUrl.joinSecret,
            spectateSecret: richPresenceOrUrl.spectateSecret,
            ...richPresenceOrUrl.assets,
          };
        }

        if (!richPresence) {
          return;
        }

        currentDiscordRPC.set(tld.domain, richPresence);
        pendingPresence = richPresence;

        // Clear existing timeout and set new one (debouncing)
        if (switchTimeout) clearTimeout(switchTimeout);
        switchTimeout = setTimeout(() => {
          processRpcUpdate();
        }, DEBOUNCE_DELAY);
      } catch (error) {
        log.error("[Discord RPC] Error in update handler:", error);
      }
    },
  );

  ipcMain.on(channel.discordRPC.destroy, async (_event, url?: string) => {
    try {
      const isDiscordRPCEnabled = appSettingsStore.get(
        storeKey.appSettings,
      ).discordPresence;

      if (!isDiscordRPCEnabled || !discordRPC) {
        return;
      }

      if (!url) {
        // Clear all
        pendingPresence = null;
        if (switchTimeout) {
          clearTimeout(switchTimeout);
          switchTimeout = null;
        }
        await discordRPC.destroy();
        discordRPC = null;
        currentDiscordRPCId = null;
        currentDiscordRPC.clear();
        return;
      }

      if (!isValidUrl(url)) {
        log.warn("[Discord RPC] Invalid URL for destroy:", url);
        return;
      }

      const parsedUrl = new URL(url.replace(/\/$/, ""));
      const tld = parseTLD(parsedUrl.hostname);

      if (!tld.domain) {
        log.warn("[Discord RPC] Invalid domain for destroy:", parsedUrl.hostname);
        return;
      }

      const id = `${tld.domain}-${parsedUrl.pathname}`;
      const lastPresence = currentDiscordRPC.get(tld.domain);

      if (!lastPresence) return;

      if (GAMES.some((x) => x.id === id)) {
        pendingPresence = null;
        await discordRPC.destroy();
        discordRPC = null;
        currentDiscordRPCId = null;
        currentDiscordRPC.delete(tld.domain);
      }
    } catch (error) {
      log.error("[Discord RPC] Error in destroy handler:", error);
    }
  });
}

// Cleanup function for graceful shutdown
export function cleanupDiscordRPC(): Promise<void> {
  return new Promise((resolve) => {
    if (switchTimeout) {
      clearTimeout(switchTimeout);
      switchTimeout = null;
    }

    if (discordRPC) {
      discordRPC
        .destroy()
        .then(() => {
          discordRPC = null;
          currentDiscordRPCId = null;
          currentDiscordRPC.clear();
          resolve();
        })
        .catch((error) => {
          log.error("[Discord RPC] Error during cleanup:", error);
          resolve();
        });
    } else {
      resolve();
    }
  });
}
