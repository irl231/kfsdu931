import { appSettingsStore, storeKey } from "@electron/store";
import { GAMES } from "@web/pages/launcher/constants";
import type { SetActivity } from "@xhayper/discord-rpc";
import { ipcMain } from "electron";
import { parse as parseTLD } from "tldts";
import { channel } from "../channel";
import { DiscordRPC } from "./rpc";

let discordRPC: DiscordRPC | null = null;
let currentDiscordRPCId: string | null = null;
let currentDiscordRPC: Record<string, Record<string, any>> = {};

let isSwitching = false;
let pendingPresence: SetActivity | null = null;
let switchTimeout: NodeJS.Timeout | null = null;

async function processRpcUpdate() {
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
      }
      return;
    }

    if (discordRPC && currentDiscordRPCId === presenceToApply.applicationId) {
      if (!presenceToApply.url) return;
      const parsedUrl = new URL(presenceToApply.url.replace(/\/$/, ""));
      const tld = parseTLD(parsedUrl.hostname);
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
        if (presenceToApply.state) {
          if (presenceToApply.state.startsWith("🌎")) {
            const [mapName] = presenceToApply.state
              .replace("🌎 ", "")
              .toLowerCase()
              .trim()
              .split("-");
            presenceToApply.state = `🌎 ${mapName}`;
          }
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
    console.error(error);
  } finally {
    isSwitching = false;
    if (pendingPresence) {
      setTimeout(() => processRpcUpdate(), 500);
    }
  }
}

export function registerDiscordRPCHandlers() {
  ipcMain.on(
    channel.discordRPC.update,
    (_event, richPresenceOrUrl: Record<string, any> | string) => {
      if (!richPresenceOrUrl) {
        return;
      }

      let richPresence: SetActivity | null = null;
      let tld: ReturnType<typeof parseTLD>;

      if (typeof richPresenceOrUrl === "string") {
        const parsedUrl = new URL(richPresenceOrUrl.replace(/\/$/, ""));
        tld = parseTLD(parsedUrl.hostname);
        richPresence = currentDiscordRPC[tld.domain!]!;
        if (richPresence) richPresence.url = richPresenceOrUrl;
      } else {
        const parsedUrl = new URL(richPresenceOrUrl.url.replace(/\/$/, ""));
        tld = parseTLD(parsedUrl.hostname);
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

      currentDiscordRPC[tld.domain!] = richPresence;
      pendingPresence = richPresence;

      if (switchTimeout) clearTimeout(switchTimeout);
      switchTimeout = setTimeout(() => {
        processRpcUpdate();
      }, 200);
    },
  );

  ipcMain.on(channel.discordRPC.destroy, async (_event, url?: string) => {
    const isDiscordRPCEnabled = appSettingsStore.get(
      storeKey.appSettings,
    ).discordPresence;
    if (!isDiscordRPCEnabled || !discordRPC) {
      return;
    }

    if (!url) {
      pendingPresence = null;
      await discordRPC.destroy();
      discordRPC = null;
      currentDiscordRPCId = null;
      currentDiscordRPC = {};
      return;
    }

    const parsedUrl = new URL(url.replace(/\/$/, ""));
    const tld = parseTLD(parsedUrl.hostname);
    const id = `${tld.domain}-${parsedUrl.pathname}`;

    const lastPresence = currentDiscordRPC[tld.domain!];
    if (!lastPresence) return;

    if (GAMES.some((x) => x.id === id)) {
      pendingPresence = null;
      await discordRPC.destroy();
      discordRPC = null;
      currentDiscordRPCId = null;
      delete currentDiscordRPC[tld.domain!];
    }
  });
}
