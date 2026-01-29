import {
  appSettingsStore,
  discordActivityStore,
  storeKey,
} from "@electron/store";
import { type ActivityPayload, DiscordRPC } from "@lazuee/discord-rpc";
import { GAMES } from "@web/pages/launcher/constants";
import { ipcMain } from "electron";
import log from "electron-log";
import { parse as parseTLD } from "tldts";
import { channel } from "./channel";

export const rpc = new DiscordRPC();
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

// Cache for game domain lookups to avoid repeated URL parsing
const gameDomainCache = new Map<string, ReturnType<typeof GAMES.find>>();

function findGame(domain: string, pathname?: string) {
  if (pathname) {
    const id = `${domain}-${pathname}`;
    return GAMES.find((game) => game.id === id);
  }

  // Check cache first
  if (gameDomainCache.has(domain)) {
    return gameDomainCache.get(domain);
  }

  const game = GAMES.find((game) => {
    const url = new URL(game.url.game.replace(/\/$/, ""));
    const tld = parseTLD(url.hostname);
    return tld.domain === domain;
  });

  // Cache the result (including undefined)
  gameDomainCache.set(domain, game);
  return game;
}

const isEnabled = (): boolean =>
  appSettingsStore.get(storeKey.appSettings).discordPresence ?? false;
const isObjectValueEmpty = (obj?: object): boolean =>
  !obj ||
  Object.values(obj).every(
    (value) => value === null || value === undefined || value === "",
  );

export async function updateActivity(
  payload: RichPresencePayload,
): Promise<ActivityPayload | undefined> {
  if (!isEnabled()) {
    await rpc.updateActivity(true);
    return;
  }

  // Handle full presence payload
  const {
    id: applicationId,
    url,
    details,
    state,
    startTimestamp,
    largeImageKey,
    largeImageText,
    smallImageKey,
    smallImageText,
    partyId,
    partySize,
    partyMax,
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

  // Check active tab URL early to skip unnecessary work
  const activeTabURL = appSettingsStore
    .get(storeKey.appSettings)
    .activeTabURL?.replace(/\/$/, "");
  if (!activeTabURL || activeTabURL !== presenceUrl) {
    log.debug(
      "[Discord RPC] Active tab URL does not match presence URL, skipping update.",
    );
    return;
  }

  activitiesTimestamps[clientId] =
    activitiesTimestamps[clientId] || startTimestamp || Date.now();

  // Build presence data first (before connection attempt)
  const activity: ActivityPayload = {
    details,
    state: formatState(state),
    timestamps: {
      start: activitiesTimestamps[clientId],
    },
    assets: {
      large_image: largeImageKey,
      large_text: largeImageText,
      small_image: smallImageKey,
      small_text: smallImageText,
    },
    ...(partyId && partySize && partyMax
      ? {
        party: {
          id: partyId,
          size: [partySize, partyMax],
        },
      }
      : {}),
    buttons: [
      ...(game?.url.game
        ? [
          {
            label: "Play Now",
            url: game?.url.game,
          },
        ]
        : []),
      ...(buttons || []),
    ],
  };

  if (isObjectValueEmpty(activity.assets)) delete activity.assets;
  if (isObjectValueEmpty(activity.party)) delete activity.party;
  if (isObjectValueEmpty(activity.buttons)) delete activity.buttons;

  if (game) {
    log.debug(`[Discord RPC] Activity associated with game: ${game.name}`);
    discordActivityStore.set(storeKey.discordActivity, {
      ...discordActivityStore.get(storeKey.discordActivity),
      [clientId === rpcId ? "default" : clientId]: payload,
    });
  }

  await rpc.updateActivity(clientId, activity);

  return activity;
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
        updateActivity(payload).catch((error) => {
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

    await rpc.updateActivity(true);
  });
}

export async function cleanupDiscordRPC(): Promise<void> {
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }

  await rpc.updateActivity(null, true);
}
