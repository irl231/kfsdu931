import {
  appSettingsStore,
  discordActivityStore,
  storeKey,
} from "@electron/store";
import { GAMES } from "@web/pages/launcher/constants";
import { ipcMain } from "electron";
import log from "electron-log";
import { parse as parseTLD } from "tldts";
import { channel } from "../channel";
import { DiscordRPC, type PresenceData } from "./rpc";

const rpc = new DiscordRPC();
const rpcId = "1465287640944345109";
const activitiesTimestamps: Record<string, number> = {};

// Debounce timer for presence updates
let updateTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 300;

function parseUrl(
  url: string,
): { domain: string; pathname: string; hostname: string } | null {
  try {
    const parsed = new URL(url.replace(/\/$/, ""));
    const tld = parseTLD(parsed.hostname);
    if (!tld.domain) return null;
    return {
      domain: tld.domain,
      pathname: parsed.pathname,
      hostname: parsed.hostname,
    };
  } catch {
    return null;
  }
}

function findGame(domain: string, pathname?: string) {
  if (pathname) {
    const id = `${domain}-${pathname}`;
    return GAMES.find((game) => game.id === id);
  }

  return GAMES.find((game) => {
    const url = new URL(game.url.game.replace(/\/$/, ""));
    const tld = parseTLD(url.hostname);
    return tld.domain === domain;
  });
}

function isEnabled(): boolean {
  return appSettingsStore.get(storeKey.appSettings).discordPresence ?? false;
}

export async function updatePresence(
  payload: RichPresencePayload,
): Promise<PresenceData | undefined> {
  if (!isEnabled()) {
    await rpc.clearActivity();
    return;
  }

  // Handle full presence payload
  const {
    id: applicationId,
    url,
    details,
    state,
    startTimestamp,
    assets,
    buttons,
  } = payload;

  const presenceUrl = url?.replace(/\/$/, "");
  if (!presenceUrl) {
    log.warn("[Discord RPC] No URL provided in presence payload");
    return;
  }

  const urlInfo = parseUrl(presenceUrl);
  if (!urlInfo) {
    log.warn("[Discord RPC] Invalid URL in presence payload:", url);
    return;
  }

  const game = findGame(urlInfo.domain, urlInfo.pathname);

  // Determine which Discord application ID to use
  const clientId = applicationId || game?.discordId || rpcId;
  if (!clientId) {
    log.warn("[Discord RPC] No application ID available");
    return;
  }

  activitiesTimestamps[clientId] =
    activitiesTimestamps[clientId] || startTimestamp || Date.now();

  // Build presence data first (before connection attempt)
  const presence: PresenceData = {
    applicationId: clientId,
    details,
    state: formatState(state),
    startTimestamp: activitiesTimestamps[clientId],
    largeImageKey: assets?.largeImageKey,
    largeImageText: assets?.largeImageText,
    smallImageKey: assets?.smallImageKey,
    smallImageText: assets?.smallImageText,
    buttons,
  };

  if (rpc.compareActivities(presence)) {
    log.debug(
      "[Discord RPC] Presence unchanged, skipping update for payload:",
      presence,
    );
    return presence;
  }

  // Store presence for reconnection (even if connection fails)
  // This ensures presence is restored when Discord becomes available
  rpc.storePresence(presence);

  // Connect if needed (handles switching between different apps)
  if (rpc.currentClientId !== clientId) {
    if (rpc.connected) {
      log.debug(
        "[DiscordRPC] Disconnecting from previous client ID:",
        rpc.currentClientId,
      );
      await rpc.disconnect();
    }
    log.debug(`[DiscordRPC] Connecting with client ID: ${clientId}`);
    await rpc.connect(clientId);
  }

  if (game) {
    log.debug(`[Discord RPC] Activity associated with game: ${game.name}`);
    discordActivityStore.set(storeKey.discordActivity, {
      ...discordActivityStore.get(storeKey.discordActivity),
      [clientId === rpcId ? "default" : clientId]: payload,
    });
  }

  log.debug("[Discord RPC] Setting activity:", presence);

  const activeTabURL = appSettingsStore
    .get(storeKey.appSettings)
    .activeTabURL?.replace(/\/$/, "");
  if (activeTabURL && activeTabURL === presenceUrl) {
    await rpc.setActivity(presence);
  } else {
    rpc.storePresence();
    log.debug(
      "[Discord RPC] Active tab URL does not match presence URL, skipping update.",
    );
  }

  return presence;
}

function formatState(state?: string): string | undefined {
  if (!state) return undefined;

  // Simplify map names (e.g., "🌎 battleon-town" -> "🌎 battleon")
  if (state.startsWith("🌎 ")) {
    const [mapName] = state.replace("🌎 ", "").toLowerCase().trim().split("-");
    return `🌎 ${mapName}`;
  }

  return state;
}

export function registerDiscordRPCHandlers(): void {
  ipcMain.on(
    channel.discordRPC.update,
    (_event, payload: RichPresencePayload) => {
      if (!payload) {
        log.warn("[Discord RPC] Empty payload received in update request");
        return;
      }
      if (typeof payload === "object" && Object.keys(payload).length === 0) {
        log.warn(
          "[Discord RPC] Empty object payload received in update request",
        );
        return;
      }

      // Debounce rapid updates
      if (updateTimer) clearTimeout(updateTimer);
      updateTimer = setTimeout(() => {
        updatePresence(payload).catch((error) => {
          log.error("[Discord RPC] Update error:", error);
        });
      }, DEBOUNCE_MS);
    },
  );

  ipcMain.on(channel.discordRPC.destroy, async (_event, url?: string) => {
    if (!isEnabled()) return;

    // Cancel pending updates
    if (updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }

    // If URL provided, only clear if it's a game URL
    if (url) {
      const urlInfo = parseUrl(url);
      if (!urlInfo) return;

      const game = findGame(urlInfo.domain);
      if (game) {
        if (game.discordId) {
          log.debug(`[DiscordRPC] Clearing activity for game: ${game.name}`);
          delete activitiesTimestamps[game.discordId];
          const existingActivity = discordActivityStore.get(
            storeKey.discordActivity,
          );
          delete existingActivity[game.discordId];

          discordActivityStore.set(storeKey.discordActivity, {
            ...existingActivity,
          });
        }
      }
    }

    await rpc.clearActivity();
  });
}

export async function cleanupDiscordRPC(): Promise<void> {
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
  await rpc.disconnect();
}
