import { appSettingsStore, storeKey } from "@electron/store";
import { GAMES } from "@web/pages/launcher/constants";
import { ipcMain } from "electron";
import log from "electron-log";
import { parse as parseTLD } from "tldts";
import { channel } from "../channel";
import { DiscordRPC, type PresenceData } from "./rpc";

const rpc = new DiscordRPC();

// Debounce timer for presence updates
let updateTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 300;

interface RichPresencePayload {
  id?: string;
  url?: string;
  details?: string;
  state?: string;
  startTimestamp?: number;
  assets?: {
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
  };
  buttons?: Array<{ label: string; url: string }>;
}

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

function findGame(domain: string, pathname: string) {
  const id = `${domain}-${pathname}`;
  return GAMES.find((game) => game.id === id);
}

function isEnabled(): boolean {
  return appSettingsStore.get(storeKey.appSettings).discordPresence ?? false;
}

async function updatePresence(
  payload: RichPresencePayload | string,
): Promise<void> {
  if (!isEnabled()) {
    await rpc.disconnect();
    return;
  }

  // Handle URL-only update (tab switch)
  if (typeof payload === "string") {
    const urlInfo = parseUrl(payload);
    if (!urlInfo) return;

    // If we're connected, update with browsing state
    if (rpc.connected) {
      const game = findGame(urlInfo.domain, urlInfo.pathname);
      if (!game) {
        await rpc.setActivity({
          applicationId: rpc.currentClientId!,
          details: "🧭 Browsing",
          state: `🌐 ${urlInfo.hostname}${urlInfo.pathname}`,
          startTimestamp: Date.now(),
        });
      }
    }
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

  if (!url) return;

  const urlInfo = parseUrl(url);
  if (!urlInfo) return;

  const game = findGame(urlInfo.domain, urlInfo.pathname);

  // Determine which Discord application ID to use
  const clientId = applicationId || game?.discordId;
  if (!clientId) {
    log.warn("[Discord RPC] No application ID available");
    return;
  }

  // Connect if needed (handles switching between different apps)
  const connected = await rpc.connect(clientId);
  if (!connected) return;

  // Build presence data
  const presence: PresenceData = {
    applicationId: clientId,
    details,
    state: formatState(state),
    startTimestamp: startTimestamp ?? Date.now(),
    largeImageKey: assets?.largeImageKey,
    largeImageText: assets?.largeImageText,
    smallImageKey: assets?.smallImageKey,
    smallImageText: assets?.smallImageText,
    buttons,
  };

  // For non-game URLs, show browsing status
  if (!game && rpc.connected) {
    presence.details = "🧭 Browsing";
    presence.state = `🌐 ${urlInfo.hostname}${urlInfo.pathname}`;
  }

  await rpc.setActivity(presence);
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
    (_event, payload: RichPresencePayload | string) => {
      if (!payload) return;

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

      const game = findGame(urlInfo.domain, urlInfo.pathname);
      if (game) {
        await rpc.disconnect();
      }
      return;
    }

    // No URL = clear everything
    await rpc.disconnect();
  });
}

export async function cleanupDiscordRPC(): Promise<void> {
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
  await rpc.disconnect();
}
